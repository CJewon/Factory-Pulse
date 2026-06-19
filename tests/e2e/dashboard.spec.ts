import { expect, test } from "@playwright/test";

test.describe("/dashboard", () => {
  test("대시보드 KPI, 위젯, 위험 설비 이동이 실제 Chrome에서 동작한다", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 1, name: "대시보드" })).toBeVisible();
    await expect(page.getByText("Dynamic + Streaming")).toBeVisible();
    await expect(page.getByText("전체 가동률")).toBeVisible();
    await expect(page.getByText("가동 설비")).toBeVisible();
    await expect(page.getByText("미해결 알람")).toBeVisible();
    await expect(page.getByText("위험 설비")).toBeVisible();

    await expect(page.getByRole("heading", { name: "설비 상태 보드" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "최근 알람" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "생산량 추이" })).toBeVisible();

    const firstMachineName = await page
      .locator("section")
      .filter({ hasText: "설비 상태 보드" })
      .getByRole("heading", { level: 3 })
      .first()
      .innerText();
    await page
      .locator("section")
      .filter({ hasText: "설비 상태 보드" })
      .getByRole("link", { name: "상세 보기" })
      .first()
      .click();

    await expect(page).toHaveURL(/\/machines\/[^/]+\?returnTo=%2Fdashboard$/);
    await expect(page.getByRole("heading", { level: 1, name: firstMachineName })).toBeVisible();

    await page.getByRole("link", { name: "대시보드로" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("홈에서 대시보드로 이동하고 주요 목록 버튼이 실제 route로 연결된다", async ({ page }) => {
    await page.goto("/");

    const primaryNav = page.getByRole("navigation", { name: "주요 화면" });
    const dashboardLink = primaryNav.getByRole("link", { name: "대시보드" });
    await expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    await Promise.all([page.waitForURL(/\/dashboard$/), dashboardLink.click()]);

    await page.getByRole("link", { name: "공장 목록" }).first().click();
    await expect(page).toHaveURL(/\/factories$/);

    await page.goto("/dashboard");
    await page.getByRole("link", { name: "알람 목록" }).first().click();
    await expect(page).toHaveURL(/\/alarms$/);

    await page.goto("/dashboard");
    await page.getByRole("link", { name: "리포트 목록" }).first().click();
    await expect(page).toHaveURL(/\/reports$/);
  });
});
