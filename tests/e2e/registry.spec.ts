import { expect, test } from "@playwright/test";

test("Staff persona reaches the database-backed dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Amelia Reid Registry Staff/ }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Good morning, Registry" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Staff navigation" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Work queue counts" })).toBeVisible();
});

test("Student persona sees published results without Staff navigation or draft secrecy", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Amina Rahman SMS-2026-0001/ }).click();
  await expect(page).toHaveURL(/\/student\/home$/);
  await expect(page.getByRole("heading", { name: "Welcome, Amina" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Student navigation" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Staff navigation" })).toHaveCount(0);

  await page.getByRole("navigation", { name: "Student navigation" }).getByRole("link", { name: "My results" }).click();
  await expect(page).toHaveURL(/\/student\/results$/);
  await expect(page.getByText("Programming project")).toBeVisible();
  await expect(page.getByText("Academic integrity review")).toHaveCount(0);
});
