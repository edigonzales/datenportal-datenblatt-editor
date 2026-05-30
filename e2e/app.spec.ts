import { expect, test, type Page } from "@playwright/test";

async function createLocalDraft(page: Page, expectedCount: number): Promise<void> {
  await page.getByRole("button", { name: "Neues Datenblatt anlegen" }).click();
  const contextBar = page.locator(".context-bar");
  await expect(contextBar).toContainText("Neues Datenblatt");
  await expect(contextBar).toHaveCSS("position", "sticky");
  await expect(contextBar).toHaveCSS("top", "0px");
  await expect(contextBar).toHaveCSS("background-color", "rgb(247, 245, 241)");
  await expect(contextBar.locator(".status-pill")).toHaveCount(0);
  await page.getByRole("link", { name: "Start" }).click();
  await expect(page.locator(".draft-card")).toHaveCount(expectedCount);
  await expect(page.locator(".draft-card").first()).toHaveCSS("border-radius", "6px");
  await page.locator(".draft-card").first().getByRole("button", { name: "Öffnen", exact: true }).click();
  await expect(page.locator(".context-bar")).toContainText("Lokaler Entwurf");
  await page.getByRole("link", { name: "Start" }).click();
  await expect(page.locator(".draft-card")).toHaveCount(expectedCount);
}

test("shows the simplified start screen", async ({ page }) => {
  await page.goto("/");

  const newDatasetCard = page.locator(".action-card").filter({ has: page.getByRole("heading", { name: "Neues Datenblatt anlegen" }) });
  const draftCard = page.locator(".action-card").filter({ has: page.getByRole("heading", { name: "Lokalen Entwurf öffnen" }) });
  const primaryButton = newDatasetCard.getByRole("button", { name: "Neues Datenblatt anlegen" });
  const activeTab = page.getByRole("link", { name: "Start" });
  const inactiveTab = page.getByRole("link", { name: "Datensatz" });

  await expect(page.getByRole("heading", { name: "Metadaten lokal bearbeiten" })).toBeVisible();
  await expect(page.locator(".action-card")).toHaveCount(6);
  await expect(newDatasetCard).toHaveCSS("border-radius", "6px");
  await expect(primaryButton).toBeVisible();
  await expect(draftCard.getByRole("button", { name: "Zu den Entwürfen" })).toBeVisible();
  await expect(draftCard.getByRole("button", { name: "Neues Datenblatt anlegen" })).toHaveCount(0);
  await expect(page.locator(".eyebrow")).toHaveCount(0);
  await expect(page.locator(".toolbar-actions")).toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(250, 248, 245)");
  await expect(primaryButton).toHaveCSS("background-color", "rgb(211, 18, 27)");
  await expect(primaryButton).toHaveCSS("border-radius", "5px");
  await expect(activeTab).toHaveCSS("border-bottom-color", "rgb(211, 18, 27)");
  await expect(inactiveTab).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const inactiveTabIdleColor = await inactiveTab.evaluate((element) => window.getComputedStyle(element).color);
  await inactiveTab.hover();
  await expect(inactiveTab).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(inactiveTab).toHaveCSS("color", "rgb(47, 72, 88)");
  const inactiveTabHoverColor = await inactiveTab.evaluate((element) => window.getComputedStyle(element).color);
  expect(inactiveTabHoverColor).not.toBe(inactiveTabIdleColor);
});

test("loads a dataset from the offline source dialog", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Metadaten lokal bearbeiten" })).toBeVisible();
  await page.getByRole("button", { name: "Quelle öffnen" }).click();
  const sourceDialog = page.locator(".dialog");
  await expect(sourceDialog).toHaveCSS("border-radius", "6px");
  const closeButton = page.getByRole("button", { name: "Schließen" });
  await expect(closeButton).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(closeButton).toHaveCSS("border-color", "rgb(214, 210, 204)");
  await expect(page.getByLabel("Quelle")).toHaveValue("/mock-sources/dataset.index.json");
  await expect(page.getByLabel("Quelle")).toHaveCSS("height", "40px");
  await expect(page.getByLabel("Organisationseinheit")).toHaveCSS("height", "40px");
  await expect(page.getByRole("heading", { name: "Vorschau" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Identifier auswählen" })).toHaveCount(0);
  const importButton = page.getByRole("button", { name: "In Editor übernehmen" });
  await expect(importButton).toBeDisabled();

  await page.getByLabel("Quelle").fill("/missing/dataset.index.json");
  await page.getByRole("button", { name: "Quelle laden" }).click();
  const errorNotice = page.locator(".notice");
  await expect(errorNotice).toBeVisible();
  await expect(errorNotice).toHaveCSS("border-radius", "5px");
  await expect(errorNotice).toContainText("Die Quelle konnte nicht geladen werden.");

  await page.getByLabel("Quelle").fill("/mock-sources/dataset.index.json");
  await page.getByRole("button", { name: "Quelle laden" }).click();
  await expect(sourceDialog).toContainText("3 Einträge gefunden");

  await page.getByLabel("Eintrag suchen oder Identifier eingeben").fill("so.afu.nitratmessungen");
  await page.getByRole("button", { name: "Suchen" }).click();
  const nitratCard = sourceDialog.locator(".draft-card").filter({ hasText: "Nitratmessungen im Kanton Solothurn" }).first();
  await nitratCard.click();
  const selectedCard = sourceDialog.locator('.draft-card[data-selected="true"]');
  await expect(selectedCard).toContainText("Nitratmessungen im Kanton Solothurn");
  await expect(importButton).toBeEnabled();

  await importButton.click();

  const contextBar = page.locator(".context-bar");
  await expect(contextBar).toContainText("Nitratmessungen im Kanton Solothurn");
  await expect(page.getByText("Von Quelle geladen")).toBeVisible();
  await expect(contextBar).toHaveCSS("position", "sticky");
  await expect(contextBar).toHaveCSS("top", "0px");
  await expect(contextBar).toHaveCSS("background-color", "rgb(247, 245, 241)");
  await expect(contextBar.locator(".status-pill")).toHaveCount(0);
  await expect(page.locator(".surface").first()).toHaveCSS("border-radius", "6px");
  await expect(page.locator(".sidebar-panel")).toHaveCSS("border-radius", "6px");

  await page.getByRole("link", { name: "Attribute" }).click();
  await expect(page.locator(".table-wrap")).toHaveCSS("border-radius", "6px");

  await page.getByRole("link", { name: "Datenblatt-Vorschau" }).click();
  await expect(page.locator(".json-panel")).toHaveCSS("border-radius", "6px");
  await expect(page.locator(".json-panel pre")).toHaveCSS("border-radius", "5px");
});

test("creates and navigates a dataset series workspace", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Neue Datensatzserie anlegen" }).click();

  await expect(page.locator(".context-bar")).toContainText("Neue Datensatzserie");
  await expect(page.getByRole("link", { name: "Serie", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ausgaben", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Serien-Vorschau", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "JSON exportieren" })).toBeDisabled();

  await page.getByLabel("Identifier *").fill("ch.foo");
  await page.getByLabel("Titel *").fill("Ch Foo");
  await page.getByLabel("Beschreibung *").fill("Serienbeschreibung");
  await page.getByLabel("PublisherRef *").fill("pub");
  await page.getByLabel("CreatorRef *").fill("creator");
  await page.getByLabel("E-Mail *").fill("kontakt@example.org");

  await page.getByRole("link", { name: "Ausgaben", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ausgaben" })).toBeVisible();
  await expect(page.getByText("Serienkontext")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ausgabe hinzufügen" })).toBeVisible();
  await expect(page.getByLabel("PublisherRef")).toHaveValue("pub");
  await expect(page.getByLabel("E-Mail *")).toHaveValue("kontakt@example.org");

  const issueListBox = await page.locator(".series-issue-list").boundingBox();
  const issueEditorBox = await page.locator(".series-workspace__editor").boundingBox();
  expect(issueListBox?.y ?? 0).toBeLessThan(issueEditorBox?.y ?? 0);

  await page.getByLabel("IssueLabel *").fill("2026");
  await expect(page.getByLabel("Identifier *")).toHaveValue("ch.foo_2026");
  await expect(page.getByLabel("Titel *")).toHaveValue("Ch Foo 2026");

  await page.getByRole("button", { name: "Ausgabe hinzufügen" }).click();
  await expect(page.locator(".series-issue-card")).toHaveCount(2);

  await page.getByRole("link", { name: "Serie", exact: true }).click();
  await page.getByLabel("Titel *").fill("Ch Bar");
  await page.getByRole("link", { name: "Ausgaben", exact: true }).click();
  await expect(page.getByLabel("Titel *")).toHaveValue("Ch Bar 2026");

  await page.getByRole("link", { name: "Serien-Vorschau", exact: true }).click();
  await expect(page.locator(".json-panel")).toContainText("\"type\": \"DatasetSeries\"");
});

test("shows 6px radius on empty state and file import surfaces", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Datenblatt importieren" }).click();
  await expect(page.locator(".dialog")).toHaveCSS("border-radius", "6px");
  await expect(page.locator(".drop-zone")).toHaveCSS("border-radius", "6px");
  await page.getByRole("button", { name: "Schließen" }).click();

  await createLocalDraft(page, 1);
  await page.getByRole("link", { name: "Attribute" }).click();
  const emptyState = page.locator(".empty-state");
  await expect(emptyState).toContainText("Noch keine Attribute");
  await expect(emptyState).toHaveCSS("border-radius", "6px");
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
  await expect(page.locator(".context-bar")).toContainText("Lokaler Entwurf");
  await expect(page.locator(".dialog--narrow")).toHaveCount(0);
});
