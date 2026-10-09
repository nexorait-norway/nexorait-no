"""Connect verified Stripe event ingestion to the idempotent projection.

No entitlements or payments are triggered here.
"""
import sqlite3
from billing.projection import init_projection, record_event

def project_verified_event(db_path, event):
    """Project a webhook event only after signature verification upstream."""
    if not isinstance(event.get("created"), int):
        return "missing_created"
    obj = event.get("data", {}).get("object", {})
    if not isinstance(obj, dict) or not isinstance(obj.get("id"), str):
        return "missing_object"
    init_projection(db_path)
    return record_event(db_path, event)
