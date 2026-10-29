"""Demo message relay: policy makers send a short message, the residents side picks it up (standard library only).

DEMO ONLY. Messages live in memory and disappear when the server stops. Sending needs the code given in
RELAY_CODE when the server starts; the code is never stored in the app or the repo. In a real system this
role belongs to the authorities' own channel (BE-Alert), with real identity checks.

    RELAY_CODE=choose-a-code python3 tools/relay_server.py        # listens on 127.0.0.1:8765

Phones reach it over USB with `adb reverse tcp:8765 tcp:8765` (install-phone.sh does this).
  POST /api/messages      {"code": "...", "text": "..."}  -> 201 {"id": ...} | 403 wrong code | 400 bad text
  GET  /api/messages?after=<id>                           -> {"messages": [{"id", "time", "text"}, ...]}
  POST /api/check         {"code": "..."}                  -> 200 | 403
  POST /api/status        {"code", "municipality", "water", "electricity", "gas", "note"}
                          each utility: "ok" | "restricted" | "no" (as set by the authority)
  GET  /api/status                                         -> {"status": {municipality: {...}}}
  POST /api/chat          {"code", "from", "text"}         -> 201 | 403   crisis chat between policy makers
  POST /api/chat/list     {"code", "after"}                -> {"chat": [{"id", "time", "from", "text"}]} | 403
                          (the chat is private: reading needs the code too; "from" is a role/place, not a name)
"""
import hmac
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

CODE = os.environ.get("RELAY_CODE", "")
PORT = int(os.environ.get("RELAY_PORT", "8765"))
MAX_TEXT = 280
MAX_KEEP = 50
UTILITIES = ("water", "electricity", "gas")
STATES = ("ok", "restricted", "no")
messages = []
chat = []      # policy makers only
status = {}    # municipality -> {"water", "electricity", "gas", "note", "time"}; nothing until an authority sets it
lock = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def end_headers(self):
        # The app runs from another origin (the Android asset host or the local web server).
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def read_body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 4096:
            return None
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            return None

    def code_ok(self, body):
        return bool(CODE) and isinstance(body, dict) and hmac.compare_digest(str(body.get("code", "")), CODE)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/status":
            with lock:
                return self.send_json(200, {"status": dict(status)})
        if url.path != "/api/messages":
            return self.send_json(404, {"error": "not found"})
        try:
            after = int(parse_qs(url.query).get("after", ["0"])[0])
        except ValueError:
            after = 0
        with lock:
            newer = [m for m in messages if m["id"] > after]
        self.send_json(200, {"messages": newer})

    def do_POST(self):
        path = urlparse(self.path).path
        body = self.read_body()
        if path == "/api/check":
            return self.send_json(200 if self.code_ok(body) else 403, {})
        if path in ("/api/chat", "/api/chat/list"):
            if not self.code_ok(body):
                return self.send_json(403, {"error": "wrong code"})
            if path == "/api/chat/list":
                try:
                    after = int(body.get("after", 0))
                except (TypeError, ValueError):
                    after = 0
                with lock:
                    return self.send_json(200, {"chat": [m for m in chat if m["id"] > after]})
            sender = " ".join(str(body.get("from", "")).split())[:80]
            text = " ".join(str(body.get("text", "")).split())
            if not sender or not text or len(text) > MAX_TEXT:
                return self.send_json(400, {"error": f"sender and a 1-{MAX_TEXT} character message needed"})
            with lock:
                msg = {"id": (chat[-1]["id"] + 1) if chat else 1, "time": int(time.time()), "from": sender, "text": text}
                chat.append(msg)
                del chat[:-MAX_KEEP * 4]
            return self.send_json(201, {"id": msg["id"]})
        if path == "/api/status":
            if not self.code_ok(body):
                return self.send_json(403, {"error": "wrong code"})
            place = " ".join(str(body.get("municipality", "")).split())[:80]
            values = {u: body.get(u) for u in UTILITIES}
            if not place or any(v not in STATES for v in values.values()):
                return self.send_json(400, {"error": "municipality and a state per utility (ok/restricted/no) needed"})
            note = " ".join(str(body.get("note", "")).split())[:MAX_TEXT]
            with lock:
                status[place] = {**values, "note": note, "time": int(time.time())}
            print(f"status set for {place}: {values}", flush=True)
            return self.send_json(200, {})
        if path != "/api/messages":
            return self.send_json(404, {"error": "not found"})
        if not self.code_ok(body):
            return self.send_json(403, {"error": "wrong code"})
        text = " ".join(str(body.get("text", "")).split())
        if not text or len(text) > MAX_TEXT:
            return self.send_json(400, {"error": f"message must be 1-{MAX_TEXT} characters"})
        with lock:
            msg = {"id": (messages[-1]["id"] + 1) if messages else 1, "time": int(time.time()), "text": text}
            messages.append(msg)
            del messages[:-MAX_KEEP]
        print(f"message {msg['id']} sent ({len(text)} characters)", flush=True)
        self.send_json(201, {"id": msg["id"]})

    def log_message(self, *args):
        pass  # keep the console quiet; sends are printed above


if __name__ == "__main__":
    if not CODE:
        sys.exit("Set RELAY_CODE first, e.g.  RELAY_CODE=choose-a-code python3 tools/relay_server.py")
    print(f"Demo relay on http://127.0.0.1:{PORT}  (messages in memory only)", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
