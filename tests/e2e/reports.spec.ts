import { expect, test } from "@playwright/test";

test.describe("/reports", () => {
  test("전체 생산 리포트와 필터 적용, 초기화가 실제 Chrome에서 동작한다", async ({ page }) => {
    await page.goto("/reports");

    await expect(page.getByRole("heading", { level: 1, name: "생산 리포트" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /리포트 \d+건/ })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "총 생산량" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "생산 추세" })).toBeVisible();

    await page.getByLabel("정렬").selectOption("output");
    await page.getByRole("button", { name: "필터 적용" }).click();
    await expect(page.getByText("현재 정렬 생산량 높은순")).toBeVisible();

    await page.getByPlaceholder("공장명, 위치 검색").fill("없는공장");
    await page.getByRole("button", { name: "필터 적용" }).click();
    await expect(page.getByText("조건에 맞는 리포트가 없습니다.")).toBeVisible();

    await page.getByRole("button", { name: "필터 초기화" }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole("heading", { name: /리포트 \d+건/ })).toBeVisible();
  });

  test("공장 상세에서 리포트 보기로 이동하고 factoryId 필터를 적용한다", async ({ page }) => {
    await page.goto("/factories");

    await page.getByPlaceholder("공장명, 위치, 설명 검색").fill("서울");
    await page.getByRole("table").getByRole("link", { name: "상세 보기" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "서울 스마트팩토리" })).toBeVisible();

    await page.getByRole("link", { name: "리포트 보기" }).click();

    await expect(page).toHaveURL(/\/reports\?factoryId=/);
    await expect(page.getByRole("heading", { level: 1, name: "생산 리포트" })).toBeVisible();
    await expect(page.getByText("선택 공장: 서울 스마트팩토리")).toBeVisible();
    await expect(page.getByRole("heading", { name: /리포트 \d+건/ })).toBeVisible();

    await page.getByRole("link", { name: "공장 상세" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "서울 스마트팩토리" })).toBeVisible();
  });

  test("잘못된 query는 404 대신 초기화 가능한 상태로 표시한다", async ({ page }) => {
    await page.goto("/reports?factoryId=invalid-factory");

    await expect(page.getByText("필터 조건을 확인해 주세요.")).toBeVisible();
    await expect(page.getByText(/선택한 공장 ID/)).toBeVisible();
    await page.getByRole("link", { name: "전체 리포트로 초기화" }).click();
    await expect(page).toHaveURL(/\/reports$/);

    await page.goto("/reports?from=2026-06-19&to=2026-06-18");
    await expect(page.getByText("시작일은 종료일보다 늦을 수 없습니다.")).toBeVisible();
  });
});
