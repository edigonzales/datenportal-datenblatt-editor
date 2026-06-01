import { render, screen, waitFor, within } from "@testing-library/vue";
import { describe, expect, it, vi } from "vitest";
import type { MetadataSearchRecord } from "../domain/datasetTypes";
import SourceLoadDialog from "./SourceLoadDialog.vue";

const loadSourceIndex = vi.fn<(url: string) => Promise<MetadataSearchRecord[]>>();
const searchSourceIndex = vi.fn<
  (entries: MetadataSearchRecord[], query: string, organizationUnit: string) => MetadataSearchRecord[]
>();
const loadDatasetFromSource = vi.fn();

vi.mock("../services/endpointLoader", () => ({
  loadSourceIndex: (url: string) => loadSourceIndex(url),
  searchSourceIndex: (entries: MetadataSearchRecord[], query: string, organizationUnit: string) =>
    searchSourceIndex(entries, query, organizationUnit),
  loadDatasetFromSource: (...args: unknown[]) => loadDatasetFromSource(...args)
}));

describe("SourceLoadDialog", () => {
  it("normalizes a legacy json initial source url to xtf", async () => {
    loadSourceIndex.mockResolvedValue([
      {
        identifier: "so.afu.nitratmessungen",
        title: "Nitratmessungen",
        description: "Messwerte zur Wasserqualität",
        modified: "2026-05-12",
        creatorRef: "ch.so.afu",
        organizationUnit: "Amt für Umwelt",
        keywords: ["Nitrat"],
        document: {
          type: "Dataset",
          schemaVersion: "2026-05-23",
          dataset: {
            identifier: "so.afu.nitratmessungen"
          }
        }
      }
    ]);
    searchSourceIndex.mockReturnValue([]);

    render(SourceLoadDialog, {
      props: {
        initialSourceUrl: "/mock-sources/dataset.index.json",
        initialOrganizationUnit: "ch.so.afu"
      }
    });

    const sourceInput = screen.getByLabelText("Quelle");

    expect(sourceInput).toHaveValue("/mock-sources/dataset.index.xtf");
    await waitFor(() => expect(loadSourceIndex).toHaveBeenCalledWith("/mock-sources/dataset.index.xtf"));
    await waitFor(() =>
      expect(searchSourceIndex).toHaveBeenCalledWith(
        expect.any(Array),
        "",
        "ch.so.afu"
      )
    );

    const organizationSelect = screen.getByLabelText("Organisationseinheit");
    expect(organizationSelect).toHaveValue("ch.so.afu");
    expect(within(organizationSelect).getByRole("option", { name: "ch.so.afu" })).toBeInTheDocument();
  });
});
