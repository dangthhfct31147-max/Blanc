"""
Sender: pushes approved data to ContestHub.
- Default: direct database import through the shared Node import handler.
- Optional fallback: POST /api/import through the backend.
"""
import json
import os
import shutil
import subprocess
from pathlib import Path

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:
    def load_dotenv(*_args, **_kwargs):
        return False

TOOL_DIR = Path(__file__).resolve().parent
REPO_ROOT = TOOL_DIR.parent

def _load_env_file(path: Path, override: bool = False) -> None:
    loaded = load_dotenv(path, override=override)
    if loaded:
        return
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'\"")
        if not key or (not override and key in os.environ):
            continue
        os.environ[key] = value


# Load root DB settings first, then allow ai-import-tool/.env to override tool-specific values.
_load_env_file(REPO_ROOT / ".env")
_load_env_file(TOOL_DIR / ".env", override=True)

SERVER_URL = os.getenv("SERVER_URL", "http://localhost:4000")
API_KEY = os.getenv("AI_IMPORT_API_KEY", "")
DELIVERY_MODE = os.getenv("AI_IMPORT_DELIVERY", "direct-db").strip().lower()
NODE_COMMAND = os.getenv("AI_IMPORT_NODE", "node").strip() or "node"
DIRECT_DB_SCRIPT = REPO_ROOT / "server" / "scripts" / "ai-import-direct.js"


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


DIRECT_DB_TIMEOUT_SECONDS = _int_env("AI_IMPORT_DIRECT_TIMEOUT_SECONDS", 60)


def _compact_error(text: str, limit: int = 1200) -> str:
    cleaned = " ".join((text or "").split())
    return cleaned[-limit:] if len(cleaned) > limit else cleaned


def _send_to_database(content_type: str, data: dict) -> dict:
    """Insert through the server's shared import handler without opening an HTTP endpoint."""
    if not any(os.getenv(name) for name in ("DATABASE_URL", "POSTGRES_URL", "COCKROACH_DATABASE_URL", "COCKROACHDB_URL")):
        raise ValueError("DATABASE_URL, POSTGRES_URL, COCKROACH_DATABASE_URL, or COCKROACHDB_URL is required for direct database import")

    if not DIRECT_DB_SCRIPT.exists():
        raise FileNotFoundError(f"Direct import script not found: {DIRECT_DB_SCRIPT}")

    node_bin = shutil.which(NODE_COMMAND) if os.path.basename(NODE_COMMAND) == NODE_COMMAND else NODE_COMMAND
    if not node_bin:
        raise RuntimeError(f"Node.js was not found for AI_IMPORT_NODE='{NODE_COMMAND}'; direct database import requires node")

    payload = json.dumps({"type": content_type, "data": data}, ensure_ascii=False)
    env = os.environ.copy()
    env.setdefault("NODE_ENV", "production")

    try:
        result = subprocess.run(
            [node_bin, str(DIRECT_DB_SCRIPT)],
            input=payload,
            text=True,
            encoding="utf-8",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=REPO_ROOT,
            env=env,
            timeout=DIRECT_DB_TIMEOUT_SECONDS,
            shell=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f"Direct database import timed out after {DIRECT_DB_TIMEOUT_SECONDS}s") from exc

    stdout = (result.stdout or "").strip()
    stderr = (result.stderr or "").strip()
    try:
        response = json.loads(stdout.splitlines()[-1]) if stdout else {}
    except json.JSONDecodeError as exc:
        details = _compact_error(stderr or stdout or "No JSON response from direct import script")
        raise RuntimeError(f"Direct database import returned invalid output: {details}") from exc

    if result.returncode == 0 and response.get("ok"):
        response.pop("ok", None)
        return response

    message = response.get("error") or _compact_error(stderr) or "Direct database import failed"
    raise RuntimeError(message)


def _send_to_api(content_type: str, data: dict) -> dict:
    """POST data to /api/import. Returns {id, url} on success, raises on error."""
    import requests

    if not API_KEY:
        raise ValueError("AI_IMPORT_API_KEY is not set in .env")

    url = f"{SERVER_URL.rstrip('/')}/api/import"
    payload = {"type": content_type, "data": data}

    resp = requests.post(
        url,
        json=payload,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )

    if resp.status_code == 201:
        return resp.json()

    try:
        err = resp.json().get("error", resp.text)
    except Exception:
        err = resp.text

    raise RuntimeError(f"Server returned {resp.status_code}: {err}")


def send_to_server(content_type: str, data: dict) -> dict:
    """Send approved import data using the configured delivery mode."""
    if DELIVERY_MODE in {"direct-db", "direct", "db"}:
        return _send_to_database(content_type, data)

    if DELIVERY_MODE == "api":
        return _send_to_api(content_type, data)

    if DELIVERY_MODE == "auto":
        try:
            return _send_to_database(content_type, data)
        except Exception as direct_error:
            try:
                return _send_to_api(content_type, data)
            except Exception as api_error:
                raise RuntimeError(
                    f"Direct DB import failed: {direct_error}\nAPI import also failed: {api_error}"
                ) from api_error

    raise ValueError("AI_IMPORT_DELIVERY must be one of: direct-db, api, auto")
