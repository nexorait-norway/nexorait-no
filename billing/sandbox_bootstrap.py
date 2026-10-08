"""Temporary sandbox bootstrap: health endpoint only, rejects webhook deliveries.

Used before a real Stripe sandbox webhook signing secret is available.
Never processes payment events.
"""
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/health":
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"bootstrap-ready")

    def do_POST(self):
        self.send_response(503)
        self.send_header("Retry-After", "120")
        self.send_header("Content-Length", "0")
        self.end_headers()

if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8080"))), Handler).serve_forever()
