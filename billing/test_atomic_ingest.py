import hashlib
import hmac
import json
import os
import sqlite3
import tempfile
import unittest
from billing.atomic_ingest import ingest_atomic

SECRET = "whsec_test_local_only"
NOW = 1700000000

def signed(event, timestamp=NOW):
    body = json.dumps(event).encode()
    sig = hmac.new(SECRET.encode(), str(timestamp).encode() + b"." + body, hashlib.sha256).hexdigest()
    return body, f"t={timestamp},v1={sig}"

def event(event_id="evt_a", created=10):
    return {"id":event_id,"type":"invoice.paid","created":created,"data":{"object":{"id":"in_1"}}}

class AtomicIngestTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.temp.name, "events.sqlite")
    def tearDown(self):
        self.temp.cleanup()
    def send(self, ev, timestamp=NOW):
        body, sig = signed(ev, timestamp)
        return ingest_atomic(body, sig, SECRET, self.path, now=NOW)
    def test_first_and_duplicate(self):
        self.assertEqual(self.send(event()), (200,"received"))
        self.assertEqual(self.send(event()), (200,"duplicate"))
        with sqlite3.connect(self.path) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM stripe_events").fetchone()[0], 1)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM billing_object_events").fetchone()[0], 1)
    def test_out_of_order(self):
        self.send(event("evt_new", 20))
        self.send(event("evt_old", 10))
        with sqlite3.connect(self.path) as db:
            self.assertEqual(db.execute("SELECT latest_event_id FROM billing_object_status").fetchone()[0], "evt_new")
    def test_bad_signature(self):
        body, _ = signed(event())
        self.assertEqual(ingest_atomic(body,"t=1700000000,v1=bad",SECRET,self.path,now=NOW)[0],400)
    def test_stale_signature(self):
        body, sig = signed(event(), NOW-1000)
        self.assertEqual(ingest_atomic(body,sig,SECRET,self.path,now=NOW)[0],400)
    def test_invalid_payload(self):
        body, sig = signed({"id":"evt_a","type":"invoice.paid"})
        self.assertEqual(ingest_atomic(body,sig,SECRET,self.path,now=NOW)[0],400)

if __name__ == "__main__":
    unittest.main()
