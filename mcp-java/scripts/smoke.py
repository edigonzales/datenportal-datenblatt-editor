#!/usr/bin/env python3
"""Health and MCP lifecycle smoke test against an already running server."""
import json
import sys
from pathlib import Path
import urllib.request

base = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://127.0.0.1:8000"
with urllib.request.urlopen(base + "/actuator/health", timeout=10) as response:
    assert json.load(response)["status"] == "UP"


def call(method, params, request_id):
    body = json.dumps({"jsonrpc": "2.0", "id": request_id, "method": method, "params": params}).encode()
    request = urllib.request.Request(base + "/mcp", body, {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "MCP-Protocol-Version": "2025-11-25",
    })
    with urllib.request.urlopen(request, timeout=10) as response:
        text = response.read().decode()
    if text.lstrip().startswith("{"):
        result = json.loads(text)
    else:
        result = json.loads(next(line[5:].strip() for line in text.splitlines() if line.startswith("data:")))
    assert "error" not in result, result
    return result["result"]


initialized = call("initialize", {
    "protocolVersion": "2025-11-25", "capabilities": {},
    "clientInfo": {"name": "datasheet-smoke", "version": "1.0"},
}, 1)
assert initialized["serverInfo"]["version"] == "0.2.0"
assert len(call("tools/list", {}, 2)["tools"]) == 12
created = call("tools/call", {"name": "create_datasheet", "arguments": {"kind": "dataset", "values": {"title": "Smoke"}}}, 3)
assert not created.get("isError")
draft_id = created["structuredContent"]["draft_id"]
cleared = call("tools/call", {"name": "update_metadata", "arguments": {
    "draft_id": draft_id, "expected_revision": 1, "values": {"title": None},
}}, 4)
assert not cleared.get("isError"), cleared
assert "title" not in cleared["structuredContent"]["data"]
checked = call("tools/call", {"name": "validate_datasheet", "arguments": {
    "draft_id": draft_id, "expected_revision": 2,
}}, 5)
assert checked["structuredContent"]["valid"] is False
discarded = call("tools/call", {"name": "discard_datasheet", "arguments": {
    "draft_id": draft_id, "expected_revision": 2,
}}, 6)
assert discarded["structuredContent"]["discarded"] is True
fixture = Path(__file__).resolve().parents[1] / "src/test/resources/dataset.xtf"
imported = call("tools/call", {"name": "import_xtf", "arguments": {"xml": fixture.read_text()}}, 7)["structuredContent"]
exported = call("tools/call", {"name": "export_xtf", "arguments": {
    "draft_id": imported["draft_id"], "expected_revision": imported["revision"],
}}, 8)["structuredContent"]
assert "xml" not in exported
with urllib.request.urlopen(exported["download_url"], timeout=10) as response:
    download = response.read()
    assert "attachment" in response.headers["Content-Disposition"]
    assert response.headers["Cache-Control"] == "no-store"
explicit = call("tools/call", {"name": "export_xtf", "arguments": {
    "draft_id": imported["draft_id"], "expected_revision": imported["revision"], "include_xml": True,
}}, 9)["structuredContent"]
assert download == explicit["xml"].encode("utf-8")
call("tools/call", {"name": "discard_datasheet", "arguments": {
    "draft_id": imported["draft_id"], "expected_revision": imported["revision"],
}}, 10)
print("JAR smoke passed: health, initialize, 12 tools, create, null patch, validate, discard, exact download.")
