import { expect, test } from "@playwright/test";

test.describe("/alarms/live", () => {
  test("실시간 알람 감시 화면에서 polling 제어와 필터 URL 공유가 동작한다", async ({ page }) => {
    await page.goto("/alarms/live");

    await expect(page.getByRole("heading", { level: 1, name: "실시간 알람 감시" })).toBeVisible();
    await expect(page.getByText("CSR + Polling")).toBeVisible();
    await expect(page.getByText("감시 중")).toBeVisible();
    await expect(page.getByRole("button", { name: "새로고침" })).toBeVisible();

    await page.getByRole("button", { name: "일시정지" }).click();
    await expect(page.getByText("일시정지", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "다시 시작" }).click();
    await expect(page.getByText("감시 중", { exact: true })).toBeVisible();

    await page.getByRole("combobox", { name: "심각도" }).selectOption("critical");
    await expect(page).toHaveURL(/severity=critical/);

    await page.getByRole("combobox", { name: "상태" }).selectOption("all");
    await expect(page).toHaveURL(/status=all/);

    await page.getByRole("button", { name: "필터 초기화" }).click();
    await expect(page).toHaveURL(/\/alarms\/live$/);
  });

  test("전체 알람 목록에서 실시간 감시로 이동하고 설비 상세 링크가 유지된다", async ({ page }) => {
    await page.goto("/alarms");

    await page.getByRole("link", { name: "실시간 감시" }).click();
    await expect(page).toHaveURL(/\/alarms\/live$/);
    await expect(page.getByRole("heading", { level: 1, name: "실시간 알람 감시" })).toBeVisible();

    const firstMachineLink = page.getByRole("link", { name: "설비 상세" }).first();
    await expect(firstMachineLink).toBeVisible();
    await firstMachineLink.click();
    await expect(page).toHaveURL(/\/machines\/[^/]+$/);
  });
});
