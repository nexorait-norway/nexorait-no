"""Integrated Stripe webhook entrypoint; production deployment is intentionally disabled.

Run with python -m billing.integrated_receiver once env vars and durable DB are set.
Signature verification and ingestion are provided by webhook_server; the bridge
only projects verified events and does not grant customer entitlements.
"""
import json
import os
import sqlite3
from http.server import ThreadingHTTPServer
from billing.webhook_server import Handler, MAX_BODY, init_db, ingest
from billing.verified_event_bridge import project_verified_event

class IntegratedHandler(Handler):
    def do_POST(self):
        if self.path != "/stripe/webhook":
            return super().do_POST()
        try:
            length = int(self.headers.get("Content-Length", "-1"))
        except ValueError:
            self.send_error(400)
            return
        if length < 0 or length > MAX_BODY:
            self.send_error(413)
            return
        body = self.rfile.read(length)
        status, message = ingest(body, self.headers.get("Stripe-Signature", ""),
                                 os.environ["STRIPE_WEBHOOK_SECRET"], os.environ["BILLING_DB_PATH"])
        if status == 200 and message == "received":
            try:
                project_verified_event(os.environ["BILLING_DB_PATH"], json.loads(body))
            except (sqlite3.Error, ValueError, KeyError, TypeError):
                status, message = 503, "projection unavailable"
        self.send_response(status)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(message.encode())

if __name__ == "__main__":
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    path = os.environ.get("BILLING_DB_PATH", "")
    if not secret.startswith("whsec_") or not path:
        raise SystemExit("Set STRIPE_WEBHOOK_SECRET and persistent BILLING_DB_PATH")
    init_db(path)
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8080"))), IntegratedHandler).serve_forever()
