import { render, screen } from "@testing-library/vue";
import { describe, expect, it } from "vitest";
import ValidationPanel from "./ValidationPanel.vue";

describe("ValidationPanel", () => {
  it("renders validation entries", () => {
    render(ValidationPanel, {
      props: {
        validation: {
          errorCount: 1,
          warningCount: 1,
          issues: [
            { severity: "warning", code: "warn", path: "$.dataset.attributes", message: "1 Attribute ohne Beschreibung." },
            { severity: "error", code: "required", path: "$.dataset.identifier", message: "Identifier ist ein Pflichtfeld." },
            { severity: "success", code: "ok", path: "$", message: "Genau ein Datensatz im Datenblatt" }
          ]
        }
      }
    });

    expect(screen.getByText("Identifier ist ein Pflichtfeld.")).toBeInTheDocument();
    expect(screen.getByText("1 Attribute ohne Beschreibung.")).toBeInTheDocument();
    expect(screen.getByText("Genau ein Datensatz im Datenblatt")).toBeInTheDocument();
  });
});
