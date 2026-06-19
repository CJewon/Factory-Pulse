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

    await Promise.all([
      page.waitForURL(/\/reports\?factoryId=/),
      page.getByRole("link", { name: "리포트 보기" }).click()
    ]);
    await expect(page.getByRole("heading", { level: 1, name: "생산 리포트" })).toBeVisible();
    await expect(page.getByText("선택 공장: 서울 스마트팩토리")).toBeVisible();
    await expect(page.getByRole("heading", { name: /리포트 \d+건/ })).toBeVisible();

    await page.getByRole("link", { name: "공장 상세" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "서울 스마트팩토리" })).toBeVisible();
  });

  test("리포트 목록에서 날짜별 상세로 이동하고 empty, 404 상태를 확인한다", async ({ page }) => {
    await page.goto("/reports");

    await page.getByRole("link", { name: "리포트 상세" }).first().click();

    await expect(page).toHaveURL(/\/reports\/\d{4}-\d{2}-\d{2}/);
    await expect(page.getByRole("heading", { level: 1, name: "일별 생산 리포트" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "공장별 리포트" })).toBeVisible();
    await expect(page.getByRole("link", { name: "리포트 목록" })).toBeVisible();
    await expect(page.getByRole("link", { name: "공장 상세" }).first()).toBeVisible();

    await page.getByRole("link", { name: "리포트 목록" }).click();
    await expect(page).toHaveURL(/\/reports$/);

    await page.goto("/reports/2099-01-01");
    await expect(page.getByText("2099.01.01 리포트가 없습니다.")).toBeVisible();
    await page.getByRole("link", { name: "리포트 목록으로" }).click();
    await expect(page).toHaveURL(/\/reports$/);

    await page.goto("/reports/not-a-date");
    await expect(page.getByRole("heading", { level: 1, name: "요청한 화면을 찾을 수 없습니다." })).toBeVisible();
  });

  test("기간 비교 화면에서 A/B 기간 비교, invalid, empty 상태를 확인한다", async ({ page }) => {
    await page.goto("/reports");

    await page.getByRole("link", { name: "기간 비교" }).click();
    await expect(page).toHaveURL(/\/reports\/compare/);
    await expect(page.getByRole("heading", { level: 1, name: "기간 비교" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "비교 조건" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "공장별 비교" })).toBeVisible();

    await page.goto("/reports/compare?fromA=2026-06-18&toA=2026-06-18&fromB=2026-06-17&toB=2026-06-17");
    await expect(page.getByLabel("기간 A 시작")).toHaveValue("2026-06-18");
    await expect(page.getByLabel("기간 B 시작")).toHaveValue("2026-06-17");
    await expect(page.getByText("기간 B 2026.06.17 - 2026.06.17")).toBeVisible();

    await page.getByLabel("기간 A 시작").fill("2026-06-19");
    await page.getByRole("button", { name: "비교 적용" }).click();
    await expect(page.getByText("비교 조건을 확인해 주세요.")).toBeVisible();
    await expect(page.getByText("기간 A 시작일은 종료일보다 늦을 수 없습니다.")).toBeVisible();

    await page.goto("/reports/compare?fromA=2099-01-01&toA=2099-01-07&fromB=2098-12-25&toB=2098-12-31");
    await expect(page.getByText("비교할 리포트가 없습니다.")).toBeVisible();
  });

  test("잘못된 query는 404 대신 초기화 가능한 상태로 표시한다", async ({ page }) => {
    await page.goto("/reports?factoryId=invalid-factory");

    await expect(page.getByText("필터 조건을 확인해 주세요.")).toBeVisible();
    await expect(page.getByText(/선택한 공장 ID/)).toBeVisible();
    await page.getByRole("button", { name: "전체 리포트로 초기화" }).click();
    await expect(page).toHaveURL(/\/reports$/);

    await page.goto("/reports?from=2026-06-19&to=2026-06-18");
    await expect(page.getByText("시작일은 종료일보다 늦을 수 없습니다.")).toBeVisible();
  });
});
