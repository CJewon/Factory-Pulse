import { expect, test } from "@playwright/test";

test.describe("/alarms", () => {
  test("비로그인 세션에서는 알람 확인 버튼이 비활성화되고 설비 상세 이동은 유지된다", async ({ page }) => {
    await page.goto("/alarms");

    await expect(page.getByRole("heading", { level: 1, name: "알람 목록" })).toBeVisible();
    await expect(page.getByText("알람 확인은 로그인 후 사용할 수 있습니다.")).toBeVisible();

    const loginRequiredButton = page.getByRole("button", { name: /로그인 필요/ }).first();
    await expect(loginRequiredButton).toBeVisible();
    await expect(loginRequiredButton).toBeDisabled();

    await expect(page.getByRole("link", { name: "설비 상세" }).first()).toBeVisible();
  });
});
