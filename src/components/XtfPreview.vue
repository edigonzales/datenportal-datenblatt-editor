<script setup lang="ts">
import { computed } from "vue";
import type { EditableRootJson } from "../domain/datasetTypes";
import { serializeDataset } from "../services/exportService";

type XmlTokenType = "tag" | "attr-name" | "attr-value" | "punctuation" | "text" | "declaration" | "comment";

const props = defineProps<{
  root: EditableRootJson;
}>();

const preview = computed(() => serializeDataset(props.root));
const highlightedPreview = computed(() => highlightXml(preview.value));

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderToken(type: XmlTokenType, value: string): string {
  return `<span class="xml-token xml-token--${type}">${escapeHtml(value)}</span>`;
}

function renderPlain(value: string): string {
  return escapeHtml(value);
}

function highlightXml(xml: string): string {
  return xml
    .split("\n")
    .map((line) => highlightXmlLine(line))
    .join("\n");
}

function highlightXmlLine(line: string): string {
  const parts: string[] = [];
  const tagPattern = /<[^>]+>/g;
  let cursor = 0;

  for (const match of line.matchAll(tagPattern)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) {
      parts.push(renderTextSegment(line.slice(cursor, matchIndex)));
    }
    parts.push(highlightXmlTag(match[0]));
    cursor = matchIndex + match[0].length;
  }

  if (cursor < line.length) {
    parts.push(renderTextSegment(line.slice(cursor)));
  }

  return parts.join("");
}

function renderTextSegment(value: string): string {
  return value.trim() ? renderToken("text", value) : renderPlain(value);
}

function highlightXmlTag(tag: string): string {
  if (tag.startsWith("<?")) {
    return renderToken("declaration", tag);
  }

  if (tag.startsWith("<!--")) {
    return renderToken("comment", tag);
  }

  if (tag.startsWith("</")) {
    const name = tag.slice(2, -1).trim();
    return `${renderToken("punctuation", "</")}${renderToken("tag", name)}${renderToken("punctuation", ">")}`;
  }

  const match = /^<([^\s/>]+)([\s\S]*?)(\/?)>$/.exec(tag);
  if (!match) {
    return renderPlain(tag);
  }

  const [, name, rawAttributes, selfClosing] = match;
  const parts = [renderToken("punctuation", "<"), renderToken("tag", name)];
  const attributePattern = /(\s+)([^\s=/>]+)(\s*=\s*)(\"[^\"]*\"|'[^']*')/g;
  let cursor = 0;

  for (const attributeMatch of rawAttributes.matchAll(attributePattern)) {
    const matchIndex = attributeMatch.index ?? 0;
    if (matchIndex > cursor) {
      parts.push(renderPlain(rawAttributes.slice(cursor, matchIndex)));
    }
    parts.push(renderPlain(attributeMatch[1]));
    parts.push(renderToken("attr-name", attributeMatch[2]));
    parts.push(renderToken("punctuation", attributeMatch[3]));
    parts.push(renderToken("attr-value", attributeMatch[4]));
    cursor = matchIndex + attributeMatch[0].length;
  }

  if (cursor < rawAttributes.length) {
    parts.push(renderPlain(rawAttributes.slice(cursor)));
  }

  if (selfClosing) {
    parts.push(renderToken("punctuation", "/"));
  }

  parts.push(renderToken("punctuation", ">"));
  return parts.join("");
}
</script>

<template>
  <section class="preview-panel">
    <div class="header-line">
      <div>
        <h2>Vorschau</h2>
        <p class="muted">Readonly-Vorschau des XTF-Exports, der beim Download geschrieben wird.</p>
      </div>
    </div>
    <pre class="mono xml-preview" v-html="highlightedPreview" />
  </section>
</template>
