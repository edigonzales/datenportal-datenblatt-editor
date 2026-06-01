import { describe, expect, it } from "vitest";
import { formatDateTime, formatTime } from "./dateFormat";

describe("dateFormat", () => {
  it("formats date times with an explicit Swiss locale", () => {
    expect(formatDateTime("2026-06-01T16:08:00.000Z")).toBe("01.06.26, 18:08");
  });

  it("formats times with an explicit Swiss locale", () => {
    expect(formatTime("2026-06-01T16:08:00.000Z")).toBe("18:08");
  });
});
