"""
title: XTF-Datenblatt importieren
author: AGI
version: 0.2.0
required_open_webui_version: 0.11.3
description: Importiert Original-XTF-Anhänge direkt in den Datenblatt-MCP.
"""

import asyncio
import hashlib
import json
import re
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field


class ImportErrorDetail(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


class Tools:
    class Valves(BaseModel):
        MCP_URL: str = Field(default="http://host.docker.internal:8000/mcp", description="Interne URL derselben Java-MCP-Instanz wie die registrierte MCP-Verbindung.")
        INSTANCE_ID: str = Field(default="openwebui", min_length=1, description="Stabile Kennung dieser Open-WebUI-Installation; bei mehreren Installationen unterschiedlich setzen.")
        TIMEOUT_SECONDS: int = Field(default=60, ge=1, description="Zeitlimit für Dateizugriff und MCP-Import.")

    def __init__(self):
        self.valves = self.Valves()

    async def import_xtf_attachment(
        self,
        file_id: Optional[str] = None,
        __files__: Optional[list] = None,
        __user__: Optional[dict] = None,
        __metadata__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> dict:
        """Importiert einen angehängten XTF/XML-Originalinhalt ohne XML im Modellkontext.

        Ohne file_id wird genau ein XTF/XML-Anhang ausgewählt; bei mehreren Anhängen
        werden Kandidaten zur Auswahl geliefert. Wiederholte Aufrufe verwenden den
        bearbeiteten Entwurf wieder. Danach dessen draft_id und aktuelle revision
        mit den separat registrierten MCP-Werkzeugen verwenden.
        :param file_id: Optionale ID eines XTF/XML-Anhangs dieses Chats; kein Pfad oder URL.
        """
        async def status(message, done=False):
            if __event_emitter__:
                await __event_emitter__({"type": "status", "data": {"description": message, "done": done}})

        try:
            user_id = (__user__ or {}).get("id")
            chat_id = (__metadata__ or {}).get("chat_id")
            if not user_id or not chat_id or str(chat_id).startswith("local:"):
                raise ImportErrorDetail("missing_context", "Ein gespeicherter Chat und ein angemeldeter Benutzer sind erforderlich.")
            references = __files__ if __files__ is not None else (__metadata__ or {}).get("files", [])
            candidates = self._candidates(references)
            if file_id is not None:
                candidates = [item for item in candidates if item["file_id"] == file_id]
                if not candidates:
                    raise ImportErrorDetail("attachment_not_found", "Diese Datei ist kein XTF/XML-Anhang dieses Chats.")
            if not candidates:
                raise ImportErrorDetail("no_attachment", "Bitte eine .xtf- oder .xml-Datei im Chat anhängen.")
            if len(candidates) > 1:
                await status("Mehrere XTF/XML-Anhänge: bitte eine Datei auswählen.", True)
                return {"status": "selection_required", "candidates": candidates}
            selected = candidates[0]
            await status("XTF-Originaldatei wird gelesen und importiert.")
            result = await asyncio.wait_for(
                self._import(selected["file_id"], str(user_id), str(chat_id)), self.valves.TIMEOUT_SECONDS
            )
            await status("Bestehender Entwurf geöffnet." if result["reused"] else "Datenblatt importiert.", True)
            return result
        except ImportErrorDetail as error:
            await status(str(error), True)
            return {"status": "error", "code": error.code, "message": str(error)}
        except (asyncio.TimeoutError, TimeoutError):
            message = "Zeitlimit beim Import erreicht. Erneuter Aufruf verwendet einen bereits angelegten Entwurf wieder."
            await status(message, True)
            return {"status": "error", "code": "timeout", "message": message}
        except Exception:
            message = "Technischer Fehler beim Dateiimport; Open-WebUI-Konfiguration prüfen."
            await status(message, True)
            return {"status": "error", "code": "internal_error", "message": message}

    @staticmethod
    def _candidates(references):
        result = {}
        for reference in references or []:
            if not isinstance(reference, dict) or reference.get("type", "file") != "file":
                continue
            nested = reference.get("file") or {}
            file_id = reference.get("id") or nested.get("id")
            name = reference.get("name") or nested.get("filename") or (nested.get("meta") or {}).get("name")
            if isinstance(file_id, str) and isinstance(name, str) and Path(name).suffix.lower() in {".xtf", ".xml"}:
                result[file_id] = {"file_id": file_id, "file_name": name}
        return list(result.values())

    async def _import(self, file_id, user_id, chat_id):
        name, raw = await self._read_file(file_id, user_id)
        try:
            xml = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise ImportErrorDetail("unsupported_encoding", "Die XTF-Datei muss UTF-8-kodiert sein.")
        declaration = re.match(r'\s*<\?xml\s+[^?]*encoding\s*=\s*[\'"]([^\'"]+)', xml, re.IGNORECASE)
        if declaration and declaration.group(1).lower().replace("_", "-") not in {"utf-8", "utf8"}:
            raise ImportErrorDetail("unsupported_encoding", "Die XML-Deklaration muss UTF-8 angeben.")
        key_parts = [self.valves.INSTANCE_ID, user_id, chat_id, file_id, hashlib.sha256(raw).hexdigest()]
        key = hashlib.sha256(json.dumps(key_parts, ensure_ascii=False).encode("utf-8")).hexdigest()
        result = await self._call_mcp(xml, key)
        return {
            "file_name": name,
            "draft_id": result["draft_id"],
            "revision": result["revision"],
            "kind": result["kind"],
            "title": (result.get("data") or {}).get("title"),
            "reused": result["reused"],
        }

    @staticmethod
    async def _read_file(file_id, user_id):
        # Import lazily so Open WebUI can load/edit the tool without opening connections.
        from open_webui.models.files import Files
        from open_webui.models.users import Users
        from open_webui.storage.provider import Storage
        from open_webui.utils.access_control.files import has_access_to_file

        user = await Users.get_user_by_id(user_id)
        file = await Files.get_file_by_id(file_id)
        if not user or not file:
            raise ImportErrorDetail("file_not_found", "Der Anhang ist nicht mehr verfügbar.")
        if not (file.user_id == user.id or user.role == "admin" or await has_access_to_file(file_id, "read", user)):
            raise ImportErrorDetail("access_denied", "Keine Leseberechtigung für diesen Anhang.")
        name = (file.meta or {}).get("name") or file.filename
        if Path(name).suffix.lower() not in {".xtf", ".xml"}:
            raise ImportErrorDetail("unsupported_file", "Nur .xtf- und .xml-Dateien werden unterstützt.")
        try:
            def read_original():
                return Path(Storage.get_file(file.path)).read_bytes()
            return name, await asyncio.to_thread(read_original)
        except (OSError, ValueError):
            raise ImportErrorDetail("file_unavailable", "Die Originaldatei konnte nicht aus dem Dateispeicher gelesen werden.")

    async def _call_mcp(self, xml, key):
        from mcp import ClientSession
        from mcp.client.streamable_http import streamablehttp_client

        try:
            async with streamablehttp_client(self.valves.MCP_URL) as (read, write, _):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    result = await session.call_tool("import_xtf", {"xml": xml, "import_key": key})
            # Inspect after contexts exit: a tool-level error must not become an exception group.
        except Exception:
            raise ImportErrorDetail("mcp_unavailable", "Der Datenblatt-MCP ist nicht erreichbar oder die Verbindung ist fehlgeschlagen.")
        payload = getattr(result, "structuredContent", None)
        if not isinstance(payload, dict):
            for content in result.content:
                if getattr(content, "type", None) == "text":
                    try:
                        decoded = json.loads(content.text)
                        if isinstance(decoded, dict):
                            payload = decoded
                            break
                    except (ValueError, TypeError):
                        pass
        if result.isError:
            code = (payload or {}).get("code", "import_failed")
            message = (payload or {}).get("message", "Die Datei konnte nicht als Datenblatt importiert werden.")
            raise ImportErrorDetail(code, str(message)[:500])
        if not isinstance(payload, dict) or not {"draft_id", "revision", "kind", "reused"}.issubset(payload):
            raise ImportErrorDetail("incompatible_server", "Unerwartete MCP-Antwort. Datenblatt-MCP ab Version 0.2.0 erforderlich.")
        return payload
