import os
import tempfile
import unittest
from billing.verified_event_bridge import project_verified_event

class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.temp.name, "db.sqlite")

    def tearDown(self):
        self.temp.cleanup()

    def test_valid_event_projection_and_dedup(self):
        event = {"id": "evt_bridge", "type": "invoice.paid", "created": 100,
                 "data": {"object": {"id": "in_123"}}}
        self.assertEqual(project_verified_event(self.path, event), "recorded")
        self.assertEqual(project_verified_event(self.path, event), "duplicate")

    def test_missing_object_is_rejected(self):
        self.assertEqual(project_verified_event(self.path, {"created": 100, "data": {"object": {}}}), "missing_object")

if __name__ == "__main__":
    unittest.main()
