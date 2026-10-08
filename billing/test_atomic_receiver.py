"""End-to-end local HTTP test for the atomic webhook receiver.

No Stripe credentials, internet connection, or live charges required.
"""
import hashlib
import hmac
import http.client
import json
import os
import tempfile
import threading
import time
import unittest
from http.server import ThreadingHTTPServer
from unittest.mock import patch
from billing.atomic_receiver import Handler

class HTTPReceiverTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.secret = "whsec_local_testing_only"
        self.env = patch.dict(os.environ, {
            "STRIPE_WEBHOOK_SECRET": self.secret,
            "BILLING_DB_PATH": os.path.join(self.temp.name, "test.sqlite")
        })
        self.env.start()
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.env.stop()
        self.temp.cleanup()

    def post(self, valid=True):
        event = {"id":"evt_http_1","type":"invoice.paid","created":int(time.time()),
                 "data":{"object":{"id":"in_http_1"}}}
        body = json.dumps(event).encode()
        stamp = int(time.time())
        digest = hmac.new(self.secret.encode(), str(stamp).encode()+b"."+body, hashlib.sha256).hexdigest()
        signature = f"t={stamp},v1={digest if valid else 'invalid'}"
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        conn.request("POST", "/stripe/webhook", body, {"Stripe-Signature": signature})
        response = conn.getresponse()
        result = response.status, response.read().decode()
        conn.close()
        return result

    def test_valid_and_duplicate_http(self):
        self.assertEqual(self.post(), (200, "received"))
        self.assertEqual(self.post(), (200, "duplicate"))

    def test_invalid_signature_http(self):
        self.assertEqual(self.post(valid=False)[0], 400)

if __name__ == "__main__":
    unittest.main()
