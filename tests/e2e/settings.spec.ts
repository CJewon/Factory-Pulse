import { expect, test } from "@playwright/test";

test.describe("/settings", () => {
  test("설정 화면 기본값, 초기화, 취소 이동이 실제 Chrome에서 동작한다", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("heading", { level: 1, name: "대시보드 설정" })).toBeVisible();
    await expect(page.getByText("로그인 후 저장할 수 있습니다.")).toBeVisible();

    const recentAlarms = page.getByLabel("카드 표시: 최근 알람");
    await expect(recentAlarms).toBeChecked();

    await recentAlarms.uncheck();
    await expect(recentAlarms).not.toBeChecked();
    await expect(page.getByText("저장되지 않은 변경 사항이 있습니다.")).toBeVisible();

    await page.getByRole("button", { name: "초기화" }).click();
    await expect(recentAlarms).toBeChecked();

    await page.getByRole("combobox", { name: "새로고침 주기" }).selectOption("60");
    await expect(page.getByRole("button", { name: "저장" })).toBeDisabled();

    await page.getByRole("link", { name: "취소" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("대시보드에서 설정 화면으로 이동할 수 있다", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", { name: "설정" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { level: 1, name: "대시보드 설정" })).toBeVisible();
  });
});
