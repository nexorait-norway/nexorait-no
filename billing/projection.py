"""Idempotent event projections for the Nexorait billing queue.

Projection only: never grants customer access or initiates money movement.
An upstream worker must validate event account, mode and Stripe object state.
"""
import json
import sqlite3
import time

def init_projection(db_path):
    with sqlite3.connect(db_path, timeout=15) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS billing_object_events (
          event_id TEXT PRIMARY KEY,
          object_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          stripe_created INTEGER NOT NULL,
          received_at INTEGER NOT NULL
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS billing_object_status (
          object_id TEXT PRIMARY KEY,
          latest_event_id TEXT NOT NULL,
          latest_created INTEGER NOT NULL,
          latest_type TEXT NOT NULL
        )""")

def record_event(db_path, event):
    """Record event once. Newer Stripe-created events update projection.

    Equal timestamps do not overwrite existing projection because ordering
    cannot be inferred. Always fetch Stripe's current object before granting
    service access or sending customer notifications.
    """
    event_id = event["id"]
    event_type = event["type"]
    created = event["created"]
    obj = event["data"]["object"]
    object_id = obj["id"]
    if not isinstance(event_id, str) or not event_id.startswith("evt_"):
        raise ValueError("invalid event ID")
    if not isinstance(object_id, str) or not object_id:
        raise ValueError("invalid object ID")
    if not isinstance(created, int) or isinstance(created, bool) or created < 0:
        raise ValueError("invalid timestamp")
    if not isinstance(event_type, str):
        raise ValueError("invalid event type")
    with sqlite3.connect(db_path, timeout=15) as db:
        db.execute("BEGIN IMMEDIATE")
        cursor = db.execute(
          "INSERT OR IGNORE INTO billing_object_events VALUES (?,?,?,?,?)",
          (event_id, object_id, event_type, created, int(time.time())))
        if cursor.rowcount == 0:
            return "duplicate"
        db.execute("""INSERT INTO billing_object_status
          (object_id, latest_event_id, latest_created, latest_type)
          VALUES (?,?,?,?)
          ON CONFLICT(object_id) DO UPDATE SET
            latest_event_id=excluded.latest_event_id,
            latest_created=excluded.latest_created,
            latest_type=excluded.latest_type
          WHERE excluded.latest_created > billing_object_status.latest_created""",
          (object_id, event_id, created, event_type))
    return "recorded"
