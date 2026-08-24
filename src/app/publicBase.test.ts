import { afterEach, describe, expect, it } from "vitest";
import { getPublicBasePath } from "./publicBase";

describe("getPublicBasePath", () => {
  afterEach(() => {
    document.head.querySelector("base")?.remove();
  });

  it("uses the root path when no runtime base is injected", () => {
    expect(getPublicBasePath()).toBe("/");
  });

  it("normalizes the gateway prefix from the base element", () => {
    const base = document.createElement("base");
    base.href = "/metadaten-editor";
    document.head.append(base);

    expect(getPublicBasePath()).toBe("/metadaten-editor/");
  });

  it("ignores unsafe base values", () => {
    const base = document.createElement("base");
    base.setAttribute("href", "/bad prefix/");
    document.head.append(base);

    expect(getPublicBasePath()).toBe("/");
  });
});
