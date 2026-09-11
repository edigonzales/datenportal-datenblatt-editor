"""Run INSIDE a disposable Open WebUI 0.11.3 container with a running Java MCP.
Installs the real workspace tool, uploads an original XTF, creates a saved chat,
and invokes Open WebUI's tool executor with that chat's attachment/context.
No LLM/provider credentials are needed; model tool selection is not simulated.
"""
import asyncio
import json
import os
import uuid
from pathlib import Path

import httpx
from fastapi import FastAPI, Request
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client


async def main():
    base = os.environ.get("OPENWEBUI_URL", "http://127.0.0.1:8080")
    mcp_url = os.environ.get("DATASHEET_TEST_MCP_URL", "http://host.docker.internal:18080/mcp")
    tool_id = "datasheet_xtf_import_" + uuid.uuid4().hex[:8]
    code = (Path(__file__).parents[1] / "xtf_import.py").read_text()
    fixture = Path(os.environ.get("DATASHEET_TEST_XTF", "/tmp/dataset.xtf")).read_bytes()
    async with httpx.AsyncClient(base_url=base, timeout=60) as http:
        credentials = {"email": "datasheet-test@example.invalid", "password": "Disposable-integration-test-2026!"}
        response = await http.post("/api/v1/auths/signin", json=credentials)
        if response.status_code != 200:
            response = await http.post("/api/v1/auths/signup", json={**credentials, "name": "Datasheet test"})
        response.raise_for_status()
        auth = response.json()
        assert auth["role"] == "admin", "Run against a fresh disposable instance"
        http.headers["Authorization"] = "Bearer " + auth["token"]
        installed = await http.post("/api/v1/tools/create", json={
            "id": tool_id, "name": "XTF import", "content": code, "meta": {"description": "Integration test"},
        })
        installed.raise_for_status()
        valves = await http.post(f"/api/v1/tools/id/{tool_id}/valves/update", json={
            "MCP_URL": mcp_url, "INSTANCE_ID": "integration", "TIMEOUT_SECONDS": 60,
        })
        valves.raise_for_status()
        # Normal browser uploads still run document extraction even with File Context off.
        # Skip embeddings in this isolated instance; the plugin must still read original bytes.
        configured = await http.post("/api/v1/retrieval/config/update", json={"BYPASS_EMBEDDING_AND_RETRIEVAL": True})
        configured.raise_for_status()
        upload = await http.post("/api/v1/files/?process_in_background=false", files={"file": ("dataset.xtf", fixture, "application/xml")})
        upload.raise_for_status()
        file = upload.json()
        # Upload response may carry the pre-processing snapshot; read the persisted result.
        persisted = await http.get("/api/v1/files/" + file["id"])
        persisted.raise_for_status()
        file = persisted.json()
        assert (file.get("data") or {}).get("status") == "completed", file.get("data")
        attachment = {"type": "file", "id": file["id"], "name": "dataset.xtf", "file": file}
        chat = await http.post("/api/v1/chats/new", json={"chat": {
            "title": "XTF integration", "messages": [{"id": "message", "role": "user", "content": "Importiere die XTF", "files": [attachment]}],
            "history": {"messages": {"message": {"id": "message", "role": "user", "content": "Importiere die XTF", "files": [attachment]}}, "currentId": "message"},
        }})
        chat.raise_for_status()
        saved = chat.json()
        chat_id = saved["id"]
        saved_files = saved["chat"]["messages"][0]["files"]

        from open_webui.models.users import Users
        from open_webui.utils.tools import get_tools
        user = await Users.get_user_by_id(auth["id"])
        events = []
        async def emit(event):
            events.append(event)
        request = Request({"type": "http", "app": FastAPI()})
        resolved = await get_tools(request, [tool_id], user, {
            "__user__": user.model_dump(), "__files__": saved_files,
            "__metadata__": {"chat_id": chat_id, "files": saved_files}, "__event_emitter__": emit,
        })
        assert list(resolved) == ["import_xtf_attachment"], list(resolved)
        tool = resolved["import_xtf_attachment"]["callable"]
        first = await tool()
        assert "draft_id" in first, first
        assert first["reused"] is False, first
        assert set(first) == {"file_name", "draft_id", "revision", "kind", "title", "reused"}
        async with streamablehttp_client(mcp_url) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                changed = await session.call_tool("upsert_attribute", {
                    "draft_id": first["draft_id"], "expected_revision": first["revision"],
                    "values": {"name": "FOO", "data_type": "Text", "description": "Flächenmass in Quadratmeter", "mandatory": False},
                })
                assert not changed.isError, changed
                changed = changed.structuredContent
                reused = await tool()
                assert reused["draft_id"] == first["draft_id"] and reused["reused"] is True
                assert reused["revision"] == changed["revision"]
                exported = await session.call_tool("export_xtf", {
                    "draft_id": first["draft_id"], "expected_revision": reused["revision"], "include_xml": True,
                })
                assert not exported.isError, exported
                exported = exported.structuredContent
                url = exported["download_url"].replace("http://127.0.0.1:18080", "http://host.docker.internal:18080")
                async with httpx.AsyncClient() as downloads:
                    download = await downloads.get(url)
                download.raise_for_status()
                assert download.content == exported["xml"].encode("utf-8")
                assert "attachment" in download.headers["content-disposition"]
                assert "FOO" in download.text
                # Reimport downloaded bytes through the same strict XTF parser, then validate.
                imported = await session.call_tool("import_xtf", {"xml": download.text})
                assert not imported.isError
                imported = imported.structuredContent
                validated = await session.call_tool("validate_datasheet", {
                    "draft_id": imported["draft_id"], "expected_revision": imported["revision"],
                })
                assert validated.structuredContent["valid"] is True
        assert events[-1]["data"]["done"] is True
        print("Open WebUI 0.11.3 integration passed: installed tool, original upload, saved chat, executor, repeat import, MCP edit, exact validated download.")


asyncio.run(main())
