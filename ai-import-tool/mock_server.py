"""
Mock server for testing the AI Import Tool locally.
Accepts POST /api/import, validates the payload, prints it, returns 201.
No database — safe to test against without touching production.

Run: python mock_server.py
Then set SERVER_URL=http://localhost:9999 in ai-import-tool/.env
"""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime

PORT = int(os.getenv("MOCK_PORT", 9999))
API_KEY = os.getenv("AI_IMPORT_API_KEY", "")

VALID_TYPES = {"contest", "scholarship", "document", "news", "course"}
URL_PATHS = {
    "contest": "contests",
    "scholarship": "scholarships",
    "document": "documents",
    "news": "news",
    "course": "courses",
}
REQUIRED_FIELDS = {
    "contest":     ["title", "organizer", "dateStart", "deadline"],
    "scholarship": ["title", "organizer", "deadline"],
    "document":    ["title", "author", "category", "link"],
    "news":        ["title", "body"],
    "course":      ["title", "instructor", "price"],
}

COUNTER = {"n": 0}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # suppress default access log; we print our own

    def send_json(self, status, body):
        data = json.dumps(body, ensure_ascii=False, indent=2).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/api/import/types":
            self.send_json(200, {
                "types": {t: {"required": f} for t, f in REQUIRED_FIELDS.items()}
            })
        elif self.path in ("/", "/health"):
            self.send_json(200, {"status": "mock server running", "port": PORT})
        else:
            self.send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/api/import":
            self.send_json(404, {"error": "not found"})
            return

        # Auth check
        if API_KEY:
            auth = self.headers.get("Authorization", "")
            provided = auth[7:].strip() if auth.startswith("Bearer ") else ""
            if provided != API_KEY:
                print(f"  [AUTH FAIL] bad key: '{provided[:8]}...'")
                self.send_json(401, {"error": "Invalid or missing API key"})
                return

        # Read body
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)
        try:
            body = json.loads(raw)
        except json.JSONDecodeError as e:
            self.send_json(400, {"error": f"Invalid JSON: {e}"})
            return

        content_type = body.get("type", "")
        data = body.get("data", {})

        # Validate type
        if content_type not in VALID_TYPES:
            self.send_json(400, {"error": f"Invalid type '{content_type}'. Must be: {', '.join(VALID_TYPES)}"})
            return

        # Validate required fields
        missing = [
            f for f in REQUIRED_FIELDS[content_type]
            if data.get(f) is None or data.get(f) == ""
        ]
        if missing:
            self.send_json(400, {"error": f"Missing required fields: {', '.join(missing)}"})
            return

        # Success — print and return fake ID
        COUNTER["n"] += 1
        fake_id = f"mock_{COUNTER['n']:04d}"
        url = f"/{URL_PATHS[content_type]}/{fake_id}"

        ts = datetime.now().strftime("%H:%M:%S")
        print(f"\n{'='*60}")
        print(f"  [{ts}] ✅ IMPORT #{COUNTER['n']} — type: {content_type}")
        print(f"  ID: {fake_id}  →  {url}")
        print(f"{'─'*60}")
        print(json.dumps(data, ensure_ascii=False, indent=2))
        print(f"{'='*60}\n")

        self.send_json(201, {"type": content_type, "id": fake_id, "url": url})


if __name__ == "__main__":
    print(f"Mock ContestHub Import Server")
    print(f"  Listening on http://localhost:{PORT}")
    print(f"  Auth: {'API key required (' + API_KEY[:8] + '...)' if API_KEY else 'NO AUTH (set AI_IMPORT_API_KEY to enable)'}")
    print(f"  Endpoint: POST http://localhost:{PORT}/api/import")
    print(f"\nSet in ai-import-tool/.env:")
    print(f"  SERVER_URL=http://localhost:{PORT}")
    print(f"\nWaiting for requests...\n")
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
