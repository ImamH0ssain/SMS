import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, results.violations.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
}

test("persona picker has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(serious, serious.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
});

test("Staff dashboard and Student home have no accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Amelia Reid Registry Staff/ }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
  await expectAccessible(page);

  await page.goto("/");
  await page.getByRole("button", { name: /Amina Rahman SMS-2026-0001/ }).click();
  await expect(page).toHaveURL(/\/student\/home$/);
  await expectAccessible(page);
});
