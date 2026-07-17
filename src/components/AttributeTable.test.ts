import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { reactive } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import type { DatasetAttribute } from "../domain/datasetTypes";
import AttributeTable from "./AttributeTable.vue";

afterEach(cleanup);

function attribute(name: string): DatasetAttribute {
  return { name, dataType: "TEXT", description: `${name} Beschreibung`, mandatory: false };
}

describe("AttributeTable", () => {
  it("adds a new dataset attribute", async () => {
    const attributes: DatasetAttribute[] = [];
    const user = userEvent.setup();

    render(AttributeTable, { props: { attributes, title: "Datensatzattribute" } });

    await user.click(screen.getByRole("button", { name: "Attribut hinzufügen" }));

    expect(attributes).toEqual([
      {
        name: "",
        dataType: "",
        description: "",
        unit: "",
        codeList: "",
        mandatory: false
      }
    ]);
    expect(screen.getByRole("heading", { name: "Datensatzattribute" })).toBeInTheDocument();
  });

  it("reorders attributes", async () => {
    const attributes = reactive([attribute("A"), attribute("B")]);
    const user = userEvent.setup();

    render(AttributeTable, { props: { attributes } });

    const moveDownButton = screen
      .getAllByRole("button", { name: "Nach unten" })
      .find((button) => !(button as HTMLButtonElement).disabled);
    if (!moveDownButton) {
      throw new Error("Expected an enabled move-down button");
    }
    await user.click(moveDownButton);
    expect(attributes.map((entry) => entry.name)).toEqual(["B", "A"]);
  });

  it("duplicates and deletes attributes", async () => {
    const attributes = reactive([attribute("A"), attribute("B")]);
    const user = userEvent.setup();

    render(AttributeTable, { props: { attributes } });

    const duplicateButton = screen.getAllByRole("button", { name: "Duplizieren" })[0]!;
    expect(duplicateButton).not.toBeDisabled();
    await user.click(duplicateButton);
    expect(attributes.map((entry) => entry.name)).toEqual(["A", "A", "B"]);

    await user.click(screen.getAllByRole("button", { name: "Löschen" })[0]!);
    expect(attributes.map((entry) => entry.name)).toEqual(["A", "B"]);
  });
});
