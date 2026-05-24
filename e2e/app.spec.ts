import { expect, test, type Page } from "@playwright/test";

async function createLocalDraft(page: Page, expectedCount: number): Promise<void> {
  await page.getByRole("button", { name: "Neues Datenblatt anlegen" }).click();
  await expect(page.locator(".context-bar")).toContainText("Neues Datenblatt");
  await page.getByRole("button", { name: "Datenblatt laden" }).click();
  await expect(page.locator(".draft-card")).toHaveCount(expectedCount);
}

test("loads a dataset from the offline source dialog", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Metadaten und Daten lokal bearbeiten" })).toBeVisible();
  await page.getByRole("button", { name: "Quelle öffnen" }).click();

  await page.getByLabel("Datenblatt suchen oder Identifier eingeben").fill("so.afu.nitratmessungen");
  await page.getByRole("button", { name: "Direkt laden" }).click();
  await expect(page.getByRole("button", { name: "In Editor übernehmen" })).toBeVisible();

  await page.getByRole("button", { name: "In Editor übernehmen" }).click();

  await expect(page.getByRole("heading", { name: "Nitratmessungen im Kanton Solothurn" })).toBeVisible();
  await expect(page.getByText("Von Quelle geladen")).toBeVisible();
  await expect(page.locator(".status-pill", { hasText: "Gespeichert lokal" }).first()).toBeVisible();
});

test("deletes all local drafts at once", async ({ page }) => {
  await page.goto("/");

  await createLocalDraft(page, 1);
  await createLocalDraft(page, 2);

  await page.getByRole("button", { name: "Alle löschen" }).click();

  const dialog = page.locator(".dialog--narrow");
  await expect(dialog).toContainText("Möchten Sie wirklich alle 2 lokalen Entwürfe löschen?");
  await expect(dialog).toContainText("Auch der aktuell geladene Entwurf wird gelöscht und der Editor zurückgesetzt.");

  await dialog.getByRole("button", { name: "Löschen" }).click();

  await expect(page.getByRole("heading", { name: "Noch keine lokalen Entwürfe" })).toBeVisible();
  await expect(page.locator(".context-bar")).toHaveCount(0);
  await expect(page.locator(".draft-card")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Datensatz" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Attribute" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Datenblatt-Vorschau" })).toHaveAttribute("href", "/");
});

test("cancels bulk deletion without changing drafts", async ({ page }) => {
  await page.goto("/");

  await createLocalDraft(page, 1);
  await createLocalDraft(page, 2);

  await page.getByRole("button", { name: "Alle löschen" }).click();
  await page.getByRole("button", { name: "Abbrechen" }).click();

  await expect(page.getByRole("heading", { name: "Lokale Entwürfe" })).toBeVisible();
  await expect(page.locator(".draft-card")).toHaveCount(2);
  await expect(page.locator(".context-bar")).toContainText("Neues Datenblatt");
  await expect(page.locator(".dialog--narrow")).toHaveCount(0);
});
