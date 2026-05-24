import { expect, test } from "@playwright/test";

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
