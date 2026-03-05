import { test, expect } from "@playwright/test";

test.describe("NSW Rental Price Explorer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("table", { timeout: 15_000 });
  });

  test("loads and displays the app title", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("NSW Rental Price Explorer");
  });

  test("shows stats cards with data", async ({ page }) => {
    await expect(page.getByText("Min Rent")).toBeVisible();
    await expect(page.getByText("Avg Rent")).toBeVisible();
    await expect(page.getByText("Max Rent")).toBeVisible();
  });

  test("renders table with data rows", async ({ page }) => {
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(50);
  });

  test("displays result count", async ({ page }) => {
    const header = page.locator("text=/\\d+ results? out of/");
    await expect(header).toBeVisible();
  });

  test.describe("Filtering", () => {
    test("filters by postcode via tag input", async ({ page }) => {
      const postcodeInput = page.locator('input[placeholder="Type postcode + Enter"]');
      await postcodeInput.fill("2000");
      await postcodeInput.press("Enter");

      await page.waitForTimeout(300);
      const rows = page.locator("table tbody tr");
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);

      const firstPostcode = await rows.first().locator("td:nth-child(2)").textContent();
      expect(firstPostcode?.trim()).toBe("2000");
    });

    test("shows active filter badge when postcode filter is set", async ({ page }) => {
      const postcodeInput = page.locator('input[placeholder="Type postcode + Enter"]');
      await postcodeInput.fill("2000");
      await postcodeInput.press("Enter");

      await expect(page.getByText("Active")).toBeVisible();
    });

    test("resets filters", async ({ page }) => {
      const postcodeInput = page.locator('input[placeholder="Type postcode + Enter"]');
      await postcodeInput.fill("2000");
      await postcodeInput.press("Enter");

      await expect(page.getByText("Active")).toBeVisible();

      const resultsBeforeReset = page.locator("text=/\\d+ results? out of/");
      const countBefore = await resultsBeforeReset.textContent();

      await page.click("text=Reset");
      await expect(page.getByText("Active")).not.toBeVisible();
      await expect(resultsBeforeReset).not.toHaveText(countBefore!);
    });

    test("filters change result count", async ({ page }) => {
      const resultsLocator = page.locator("text=/\\d+ results? out of/");
      const textBefore = await resultsLocator.textContent();

      const postcodeInput = page.locator('input[placeholder="Type postcode + Enter"]');
      await postcodeInput.fill("2000");
      await postcodeInput.press("Enter");

      await expect(resultsLocator).not.toHaveText(textBefore!);
    });
  });

  test.describe("Sorting", () => {
    test("sorts by weekly rent ascending", async ({ page }) => {
      await page.click("th:has-text('Weekly Rent')");
      await page.waitForTimeout(200);

      const rows = page.locator("table tbody tr");
      const first = await rows.first().locator("td:last-child").textContent();
      expect(first).toMatch(/\$/);
    });

    test("toggles sort direction on second click", async ({ page }) => {
      const header = page.locator("th:has-text('Weekly Rent')");
      await header.click();
      await page.waitForTimeout(200);

      const firstAsc = await page.locator("table tbody tr").first().locator("td:last-child").textContent();

      await header.click();
      await page.waitForTimeout(200);

      const firstDesc = await page.locator("table tbody tr").first().locator("td:last-child").textContent();
      expect(firstAsc).not.toBe(firstDesc);
    });
  });

  test.describe("Pagination", () => {
    test("shows pagination controls", async ({ page }) => {
      await expect(page.getByText("Previous")).toBeVisible();
      await expect(page.getByText("Next")).toBeVisible();
    });

    test("navigates to next page", async ({ page }) => {
      const firstRowBefore = await page.locator("table tbody tr").first().locator("td:first-child").textContent();

      await page.click("text=Next");
      await page.waitForTimeout(200);

      const firstRowAfter = await page.locator("table tbody tr").first().locator("td:first-child").textContent();
      expect(firstRowAfter).not.toBe(firstRowBefore);
    });

    test("changes page size", async ({ page }) => {
      await page.selectOption("select:has(option:has-text('10 rows'))", "20");
      await page.waitForTimeout(200);

      const rows = page.locator("table tbody tr");
      const count = await rows.count();
      expect(count).toBe(20);
    });
  });

  test.describe("Grouping", () => {
    test("groups by dwelling type", async ({ page }) => {
      await page.selectOption("select:has(option:has-text('Dwelling Type'))", "dwellingType");
      await page.waitForTimeout(300);

      await expect(page.getByText("Flat / Unit")).toBeVisible();
      await expect(page.locator("h3", { hasText: /^▶\s*House/ })).toBeVisible();
    });

    test("expands a group to show records", async ({ page }) => {
      await page.selectOption("select:has(option:has-text('Dwelling Type'))", "dwellingType");
      await page.waitForTimeout(300);

      await page.locator("h3", { hasText: /^▶\s*House/ }).click();
      await page.waitForTimeout(300);

      const tables = page.locator("table");
      const count = await tables.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe("Theme", () => {
    test("toggles to dark mode", async ({ page }) => {
      const themeButton = page.locator("button", { hasText: /Light|Dark|System/ }).first();
      await themeButton.click();
      await page.locator("button:has-text('Dark')").last().click();

      await expect(page.locator("html")).toHaveClass(/dark/);
    });

    test("toggles back to light mode", async ({ page }) => {
      const themeButton = page.locator("button", { hasText: /Light|Dark|System/ }).first();
      await themeButton.click();
      await page.locator("button:has-text('Dark')").last().click();
      await expect(page.locator("html")).toHaveClass(/dark/);

      const darkButton = page.locator("button", { hasText: /Dark/ }).first();
      await darkButton.click();
      await page.locator("button:has-text('Light')").last().click();
      await expect(page.locator("html")).not.toHaveClass(/dark/);
    });
  });

  test.describe("View tabs", () => {
    test("switches to graphs tab", async ({ page }) => {
      await page.click("button:has-text('Graphs')");
      await expect(page.getByText("Rent Distribution")).toBeVisible();
    });

    test("switches back to table tab", async ({ page }) => {
      await page.click("button:has-text('Graphs')");
      await page.click("button:has-text('Table')");
      await expect(page.locator("table")).toBeVisible();
    });
  });
});
