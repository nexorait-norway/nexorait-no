"""Run with: python -m unittest discover -s billing -p 'test_*.py'"""
import hashlib
import hmac
import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
from billing.webhook_server import ingest, init_db, verify_signature

SECRET = "whsec_test"
NOW = 1791500000

def signed(body, ts=NOW):
    mac = hmac.new(SECRET.encode(), str(ts).encode() + b"." + body, hashlib.sha256).hexdigest()
    return f"t={ts},v1={mac}"

class WebhookTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.tmp.name, "events.sqlite")
        init_db(self.path)
        self.body = json.dumps({"id": "evt_123", "type": "invoice.paid",
                                "data": {"object": {"id": "in_123"}}}).encode()

    def tearDown(self):
        self.tmp.cleanup()

    def test_valid_signature(self):
        self.assertTrue(verify_signature(self.body, signed(self.body), SECRET, now=NOW))

    def test_bad_signature(self):
        self.assertFalse(verify_signature(self.body + b"x", signed(self.body), SECRET, now=NOW))

    def test_old_signature(self):
        self.assertFalse(verify_signature(self.body, signed(self.body, NOW-301), SECRET, now=NOW))

    def test_duplicate_event_only_once(self):
        with patch("billing.webhook_server.time.time", return_value=NOW):
            self.assertEqual(ingest(self.body, signed(self.body), SECRET, self.path)[0], 200)
            self.assertEqual(ingest(self.body, signed(self.body), SECRET, self.path)[0], 200)
        with sqlite3.connect(self.path) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM stripe_events").fetchone()[0], 1)

    def test_invalid_signature_not_saved(self):
        self.assertEqual(ingest(self.body, "t=1,v1=bad", SECRET, self.path)[0], 400)
        with sqlite3.connect(self.path) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM stripe_events").fetchone()[0], 0)

    def test_unknown_event_ignored(self):
        body = json.dumps({"id": "evt_other", "type": "random.event"}).encode()
        with patch("billing.webhook_server.time.time", return_value=NOW):
            self.assertEqual(ingest(body, signed(body), SECRET, self.path)[0], 200)
        with sqlite3.connect(self.path) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM stripe_events").fetchone()[0], 0)

    def test_storage_error_retries(self):
        with patch("billing.webhook_server.time.time", return_value=NOW):
            status, _ = ingest(self.body, signed(self.body), SECRET, os.path.join(self.tmp.name, "missing", "db"))
        self.assertEqual(status, 503)

if __name__ == "__main__":
    unittest.main()
