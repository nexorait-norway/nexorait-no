"""Atomic verified Stripe webhook ingestion and advisory event projection.

Signature is verified against the exact raw body before parsing. The same
transaction records both queue receipt and projection, so retries are safe.
This module never grants service access or initiates charges.
"""
import json
import sqlite3
import time
from billing.webhook_server import ALLOWED_EVENTS, MAX_BODY, verify_signature
from billing.projection import init_projection
from billing.webhook_server import init_db

def ingest_atomic(payload, signature, secret, db_path, now=None):
    if len(payload) > MAX_BODY:
        return 413, "payload too large"
    if not verify_signature(payload, signature, secret, now=now):
        return 400, "invalid signature"
    try:
        event = json.loads(payload)
        event_id, event_type, created = event["id"], event["type"], event["created"]
        object_id = event["data"]["object"]["id"]
        if not isinstance(event_id, str) or not event_id.startswith("evt_"):
            raise ValueError("invalid id")
        if not isinstance(event_type, str) or not isinstance(object_id, str) or not object_id:
            raise ValueError("invalid type/object")
        if type(created) is not int or created < 0:
            raise ValueError("invalid created")
    except (KeyError, TypeError, ValueError, AttributeError):
        return 400, "invalid event"
    if event_type not in ALLOWED_EVENTS:
        return 200, "ignored"
    try:
        init_db(db_path)
        init_projection(db_path)
        with sqlite3.connect(db_path, timeout=15) as db:
            db.execute("BEGIN IMMEDIATE")
            inserted = db.execute(
                "INSERT OR IGNORE INTO stripe_events(event_id,event_type,object_id,received_at) VALUES (?,?,?,?)",
                (event_id, event_type, object_id, int(time.time())))
            if inserted.rowcount == 0:
                return 200, "duplicate"
            db.execute(
                "INSERT INTO billing_object_events(event_id,object_id,event_type,stripe_created,received_at) VALUES (?,?,?,?,?)",
                (event_id, object_id, event_type, created, int(time.time())))
            db.execute("""INSERT INTO billing_object_status
              (object_id,latest_event_id,latest_created,latest_type)
              VALUES (?,?,?,?)
              ON CONFLICT(object_id) DO UPDATE SET
                latest_event_id=excluded.latest_event_id,
                latest_created=excluded.latest_created,
                latest_type=excluded.latest_type
              WHERE excluded.latest_created > billing_object_status.latest_created""",
              (object_id, event_id, created, event_type))
    except sqlite3.Error:
        return 503, "storage unavailable"
    return 200, "received"
