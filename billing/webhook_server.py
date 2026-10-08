"""Nexorait Stripe webhook receiver: safe ingestion only, not payment fulfillment.

Requires STRIPE_WEBHOOK_SECRET, persistent BILLING_DB_PATH and TLS reverse proxy.
Run: python -m billing.webhook_server
"""
import hashlib
import hmac
import json
import os
import sqlite3
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_BODY = 256 * 1024
ALLOWED_EVENTS = {
    "checkout.session.completed", "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed", "invoice.paid",
    "invoice.payment_failed", "customer.subscription.updated",
    "customer.subscription.deleted", "charge.refunded",
    "charge.dispute.created",
}

def verify_signature(payload: bytes, header: str, secret: str, now=None, tolerance=300):
    """Verify Stripe v1 HMAC using exact raw bytes and a bounded timestamp."""
    if not secret or not header:
        return False
    fields = {}
    for part in header.split(","):
        key, sep, value = part.strip().partition("=")
        if sep:
            fields.setdefault(key, []).append(value)
    try:
        timestamp = int(fields.get("t", [""])[0])
    except (ValueError, TypeError):
        return False
    if abs(int(time.time() if now is None else now) - timestamp) > tolerance:
        return False
    expected = hmac.new(secret.encode(), str(timestamp).encode() + b"." + payload, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, signature) for signature in fields.get("v1", []))

def init_db(path):
    with sqlite3.connect(path, timeout=15) as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("""CREATE TABLE IF NOT EXISTS stripe_events (
            event_id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            object_id TEXT,
            received_at INTEGER NOT NULL,
            state TEXT NOT NULL DEFAULT 'pending'
        )""")

def ingest(payload, signature, secret, db_path, now=None):
    if len(payload) > MAX_BODY:
        return 413, "payload too large"
    if not verify_signature(payload, signature, secret, now):
        return 400, "invalid signature"
    try:
        event = json.loads(payload)
        event_id, event_type = event["id"], event["type"]
        if not isinstance(event_id, str) or not event_id.startswith("evt_"):
            raise ValueError("invalid event id")
        if not isinstance(event_type, str):
            raise ValueError("invalid type")
        obj = event.get("data", {}).get("object", {})
        object_id = obj.get("id") if isinstance(obj, dict) else None
    except (ValueError, TypeError, KeyError, AttributeError):
        return 400, "invalid event"
    if event_type not in ALLOWED_EVENTS:
        return 200, "ignored"
    try:
        with sqlite3.connect(db_path, timeout=15) as db:
            db.execute("INSERT OR IGNORE INTO stripe_events(event_id,event_type,object_id,received_at) VALUES(?,?,?,?)",
                       (event_id, event_type, object_id, int(time.time())))
    except sqlite3.Error:
        return 503, "storage unavailable"
    # Events are only queued. A separate verified, idempotent worker must process them.
    return 200, "received"

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")
        else:
            self.send_error(404)

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
        status, message = ingest(body, self.headers.get("Stripe-Signature", ""),
                                 os.environ["STRIPE_WEBHOOK_SECRET"], os.environ["BILLING_DB_PATH"])
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
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8080"))), Handler).serve_forever()
