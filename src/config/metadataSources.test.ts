import { describe, expect, it } from "vitest";
import { defaultSourceIndexUrl, normalizeSourceIndexUrl } from "./metadataSources";

describe("normalizeSourceIndexUrl", () => {
  it("falls back to the default source for empty values", () => {
    expect(normalizeSourceIndexUrl()).toBe(defaultSourceIndexUrl);
    expect(normalizeSourceIndexUrl("")).toBe(defaultSourceIndexUrl);
    expect(normalizeSourceIndexUrl("   ")).toBe(defaultSourceIndexUrl);
  });

  it("keeps local xtf urls unchanged", () => {
    expect(normalizeSourceIndexUrl("/mock-sources/dataset.index.xtf")).toBe(defaultSourceIndexUrl);
  });

  it("keeps absolute xtf urls unchanged", () => {
    expect(normalizeSourceIndexUrl("http://127.0.0.1:4173/mock-sources/dataset.index.xtf")).toBe(
      "http://127.0.0.1:4173/mock-sources/dataset.index.xtf"
    );
  });

  it("keeps unrelated external urls unchanged", () => {
    expect(normalizeSourceIndexUrl("https://example.org/catalog.xtf")).toBe("https://example.org/catalog.xtf");
  });
});
