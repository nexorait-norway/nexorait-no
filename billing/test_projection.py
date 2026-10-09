import os
import sqlite3
import tempfile
import unittest
from billing.projection import init_projection, record_event

def event(event_id, created, kind="invoice.paid"):
    return {"id": event_id, "type": kind, "created": created,
            "data": {"object": {"id": "in_abc"}}}

class ProjectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = os.path.join(self.temp.name, "billing.sqlite")
        init_projection(self.db)

    def tearDown(self):
        self.temp.cleanup()

    def state(self):
        with sqlite3.connect(self.db) as db:
            return db.execute("SELECT latest_event_id,latest_created FROM billing_object_status").fetchone()

    def test_duplicate_is_ignored(self):
        self.assertEqual(record_event(self.db, event("evt_one", 10)), "recorded")
        self.assertEqual(record_event(self.db, event("evt_one", 10)), "duplicate")
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM billing_object_events").fetchone()[0], 1)

    def test_out_of_order_event_does_not_overwrite(self):
        record_event(self.db, event("evt_new", 20))
        record_event(self.db, event("evt_old", 10))
        self.assertEqual(self.state(), ("evt_new", 20))

    def test_newer_event_overwrites(self):
        record_event(self.db, event("evt_old", 10))
        record_event(self.db, event("evt_new", 20))
        self.assertEqual(self.state(), ("evt_new", 20))

    def test_equal_timestamp_keeps_first(self):
        record_event(self.db, event("evt_one", 10))
        record_event(self.db, event("evt_two", 10))
        self.assertEqual(self.state(), ("evt_one", 10))

    def test_invalid_event_does_not_write(self):
        with self.assertRaises(ValueError):
            record_event(self.db, event("bad", 10))
        self.assertIsNone(self.state())

if __name__ == "__main__":
    unittest.main()
