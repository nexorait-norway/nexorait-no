"""Standalone atomic Stripe webhook receiver. No payment fulfillment.

Set STRIPE_WEBHOOK_SECRET and a persistent BILLING_DB_PATH. TLS must be
terminated by the hosting platform.
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


def private_startup_audit(db_path):
    """Optional read-only diagnostics in server logs, never an HTTP endpoint.

    This is enabled only when BILLING_VERIFY_EVENT_ID is set. It never prints
    the event ID, any personal information, signing secrets, or event payload.
    Audit errors do not interrupt reception of legitimate Stripe webhooks.
    """
    event_id = os.environ.get("BILLING_VERIFY_EVENT_ID", "").strip()
    if not event_id:
        return
    try:
        from billing.verify_event_storage import verify
        result = verify(db_path, event_id)
    except (OSError, ValueError, ImportError) as exc:
        print(f"BILLING_STORAGE_AUDIT unavailable={type(exc).__name__}", flush=True)
        return
    print("BILLING_STORAGE_AUDIT "
          f"receipt_count={result['receipt_count']} "
          f"projection_count={result['projection_count']} "
          f"expected_event_type={result['expected_event_type']} "
          f"verified_once={result['verified_once']}", flush=True)


if __name__ == "__main__":
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    path = os.environ.get("BILLING_DB_PATH", "")
    if not secret.startswith("whsec_") or not path:
        raise SystemExit("Set STRIPE_WEBHOOK_SECRET and persistent BILLING_DB_PATH")
    private_startup_audit(path)
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8080"))), Handler).serve_forever()
