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
          exportable: false,
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

  it("uses a clear label for clean groups and keeps error and warning labels", () => {
    render(ValidationPanel, {
      props: {
        validation: {
          errorCount: 1,
          warningCount: 1,
          exportable: false,
          issues: [],
          groups: [
            {
              id: "series",
              title: "Serie",
              scope: "series",
              issues: [
                { severity: "error", code: "required", path: "$.series.title", message: "Titel ist ein Pflichtfeld." }
              ],
              errorCount: 1,
              warningCount: 0
            },
            {
              id: "issue-1",
              title: "Ausgabe 2026",
              scope: "issue",
              issueId: "issue-1",
              active: true,
              issues: [{ severity: "success", code: "issue-ok", path: "$.series.issues[0]", message: "Ausgabe vollständig." }],
              errorCount: 0,
              warningCount: 0
            },
            {
              id: "issue-2",
              title: "Ausgabe 2025",
              scope: "issue",
              issueId: "issue-2",
              issues: [{ severity: "warning", code: "warning", path: "$.series.issues[1]", message: "Ausgabe hat einen Hinweis." }],
              errorCount: 0,
              warningCount: 1
            }
          ]
        }
      }
    });

    expect(screen.getByText("Keine offenen Probleme")).toBeInTheDocument();
    expect(screen.queryByText("OK")).not.toBeInTheDocument();
    expect(screen.getByText("1 Fehler")).toBeInTheDocument();
    expect(screen.getByText("1 Warnungen")).toBeInTheDocument();
  });
});
