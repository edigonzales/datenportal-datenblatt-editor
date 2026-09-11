import asyncio
import importlib.util
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

spec = importlib.util.spec_from_file_location("xtf_import", Path(__file__).parents[1] / "xtf_import.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
Tools, ImportErrorDetail = module.Tools, module.ImportErrorDetail


class ToolTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.tool = Tools()
        self.context = {
            "__files__": [{"id": "file-1", "name": "sample.xtf", "type": "file"}],
            "__user__": {"id": "user-1"}, "__metadata__": {"chat_id": "chat-1"},
            "__event_emitter__": AsyncMock(),
        }
        self.tool._read_file = AsyncMock(return_value=("sample.xtf", b'\xef\xbb\xbf<?xml version="1.0" encoding="UTF-8"?><transfer/>'))
        self.tool._call_mcp = AsyncMock(return_value={
            "draft_id": "draft", "revision": 3, "kind": "dataset", "reused": True,
            "data": {"title": "Edited", "description": "Must not reach model"}, "xml": "secret xml",
        })

    async def test_original_utf8_bom_and_compact_output(self):
        result = await self.tool.import_xtf_attachment(**self.context)
        self.assertEqual(set(result), {"file_name", "draft_id", "revision", "kind", "title", "reused"})
        self.assertEqual(result["revision"], 3)
        self.assertTrue(result["reused"])
        xml, key = self.tool._call_mcp.call_args.args
        self.assertTrue(xml.startswith("<?xml"))
        self.assertEqual(len(key), 64)
        self.assertNotIn("Must not reach", json.dumps(result))
        self.assertTrue(self.context["__event_emitter__"].call_args.args[0]["data"]["done"])

    async def test_multiple_candidates_and_explicit_selection(self):
        self.context["__files__"].append({"id": "file-2", "name": "second.xml", "type": "file"})
        result = await self.tool.import_xtf_attachment(**self.context)
        self.assertEqual(result["status"], "selection_required")
        self.assertEqual(len(result["candidates"]), 2)
        self.tool._read_file.assert_not_awaited()
        await self.tool.import_xtf_attachment("file-2", **self.context)
        self.tool._read_file.assert_awaited_once_with("file-2", "user-1")

    async def test_missing_foreign_and_non_xtf_attachments(self):
        self.assertEqual((await self.tool.import_xtf_attachment("foreign", **self.context))["code"], "attachment_not_found")
        self.context["__files__"] = [{"id": "pdf", "name": "source.pdf"}]
        self.assertEqual((await self.tool.import_xtf_attachment(**self.context))["code"], "no_attachment")
        self.tool._read_file.assert_not_awaited()

    async def test_missing_chat_context(self):
        self.context["__metadata__"] = {}
        self.assertEqual((await self.tool.import_xtf_attachment(**self.context))["code"], "missing_context")
        self.tool._read_file.assert_not_awaited()

    async def test_nested_metadata_and_duplicate_references(self):
        reference = {"type": "file", "file": {"id": "file-1", "meta": {"name": "sample.XTF"}}}
        self.context["__files__"] = [reference, reference]
        result = await self.tool.import_xtf_attachment(**self.context)
        self.assertEqual(result["draft_id"], "draft")
        self.tool._read_file.assert_awaited_once()

    async def test_unsupported_encoding(self):
        for raw in [b'\xff\xfe<xml>', b'<?xml version="1.0" encoding="ISO-8859-1"?><transfer/>']:
            self.tool._read_file.return_value = ("sample.xtf", raw)
            self.assertEqual((await self.tool.import_xtf_attachment(**self.context))["code"], "unsupported_encoding")
        self.tool._call_mcp.assert_not_awaited()

    async def test_keys_are_stable_and_scoped(self):
        await self.tool.import_xtf_attachment(**self.context)
        first = self.tool._call_mcp.call_args.args[1]
        await self.tool.import_xtf_attachment(**self.context)
        self.assertEqual(first, self.tool._call_mcp.call_args.args[1])
        self.context["__metadata__"]["chat_id"] = "other-chat"
        await self.tool.import_xtf_attachment(**self.context)
        self.assertNotEqual(first, self.tool._call_mcp.call_args.args[1])
        self.context["__metadata__"]["chat_id"] = "chat-1"
        self.tool._read_file.return_value = ("sample.xtf", b"changed")
        await self.tool.import_xtf_attachment(**self.context)
        self.assertNotEqual(first, self.tool._call_mcp.call_args.args[1])

    async def test_distinct_errors_and_timeout(self):
        for code in ["access_denied", "invalid_xtf", "mcp_unavailable"]:
            self.tool._call_mcp.side_effect = ImportErrorDetail(code, "test error")
            self.assertEqual((await self.tool.import_xtf_attachment(**self.context))["code"], code)
        self.tool._call_mcp.side_effect = asyncio.TimeoutError()
        self.assertEqual((await self.tool.import_xtf_attachment(**self.context))["code"], "timeout")


class StorageTests(unittest.IsolatedAsyncioTestCase):
    async def test_permission_is_checked_before_storage_and_uses_raw_file(self):
        user = types.SimpleNamespace(id="user", role="user")
        file = types.SimpleNamespace(user_id="owner", path="storage-key", filename="file.xtf", meta={}, data={"content": "extracted"})
        files, users, storage = MagicMock(), MagicMock(), MagicMock()
        files.get_file_by_id = AsyncMock(return_value=file)
        users.get_user_by_id = AsyncMock(return_value=user)
        access = AsyncMock(return_value=False)
        modules = {
            "open_webui.models.files": types.SimpleNamespace(Files=files),
            "open_webui.models.users": types.SimpleNamespace(Users=users),
            "open_webui.storage.provider": types.SimpleNamespace(Storage=storage),
            "open_webui.utils.access_control.files": types.SimpleNamespace(has_access_to_file=access),
        }
        with patch.dict(sys.modules, modules):
            with self.assertRaises(ImportErrorDetail) as error:
                await Tools._read_file("file", "user")
            self.assertEqual(error.exception.code, "access_denied")
            storage.get_file.assert_not_called()
            access.return_value = True
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "file.xtf"
                path.write_bytes(b"original bytes")
                storage.get_file.return_value = str(path)
                name, raw = await Tools._read_file("file", "user")
                self.assertEqual(raw, b"original bytes")
                self.assertEqual(name, "file.xtf")
                storage.get_file.assert_called_once_with("storage-key")


class McpTests(unittest.IsolatedAsyncioTestCase):
    async def test_sdk_lifecycle_text_fallback_and_error(self):
        result = types.SimpleNamespace(structuredContent=None, isError=False, content=[types.SimpleNamespace(type="text", text=json.dumps({
            "draft_id": "draft", "revision": 1, "kind": "dataset", "reused": False,
        }))])
        session = MagicMock()
        session.__aenter__ = AsyncMock(return_value=session)
        session.__aexit__ = AsyncMock(return_value=False)
        session.initialize = AsyncMock()
        session.call_tool = AsyncMock(return_value=result)
        transport = MagicMock()
        transport.__aenter__ = AsyncMock(return_value=("read", "write", None))
        transport.__aexit__ = AsyncMock(return_value=False)
        with patch.dict(sys.modules, {
            "mcp": types.SimpleNamespace(ClientSession=MagicMock(return_value=session)),
            "mcp.client.streamable_http": types.SimpleNamespace(streamablehttp_client=MagicMock(return_value=transport)),
        }):
            self.assertEqual((await Tools()._call_mcp("xml", "key"))["draft_id"], "draft")
            session.initialize.assert_awaited_once()
            session.call_tool.assert_awaited_once_with("import_xtf", {"xml": "xml", "import_key": "key"})
            session.__aexit__.assert_awaited_once()
            transport.__aexit__.assert_awaited_once()
            result.isError = True
            result.structuredContent = {"code": "invalid_xtf", "message": "Bad XML"}
            with self.assertRaises(ImportErrorDetail) as error:
                await Tools()._call_mcp("xml", "key")
            self.assertEqual(error.exception.code, "invalid_xtf")
            transport.__aenter__.side_effect = OSError("connection refused")
            with self.assertRaises(ImportErrorDetail) as error:
                await Tools()._call_mcp("xml", "key")
            self.assertEqual(error.exception.code, "mcp_unavailable")


if __name__ == "__main__":
    unittest.main()
