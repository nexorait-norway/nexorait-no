"""Standalone atomic Stripe webhook receiver. No payment fulfillment.

Set STRIPE_WEBHOOK_SECRET and a persistent BILLING_DB_PATH. TLS must be
terminated by the hosting platform. Do not expose this until configured.
Run: python -m billing.atomic_receiver
"""
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from billing.atomic_ingest import ingest_atomic
from billing.webhook_server import MAX_BODY

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/health":
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"ok")

    def do_POST(self):
        if self.path != "/stripe/webhook":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "-1"))
        except ValueError:
            self.send_error(400)
            return
        if length < 0 or length > MAX_BODY:
            self.send_error(413)
            return
        body = self.rfile.read(length)
        status, message = ingest_atomic(
            body, self.headers.get("Stripe-Signature", ""),
            os.environ["STRIPE_WEBHOOK_SECRET"],
            os.environ["BILLING_DB_PATH"])
        self.send_response(status)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(message.encode())

if __name__ == "__main__":
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    path = os.environ.get("BILLING_DB_PATH", "")
    if not secret.startswith("whsec_") or not path:
        raise SystemExit("Set STRIPE_WEBHOOK_SECRET and persistent BILLING_DB_PATH")
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8080"))), Handler).serve_forever()
