import { expect, test } from "@playwright/test";

test.describe("/factories", () => {
  test("검색, empty, 초기화, 상세 이동이 실제 Chrome에서 동작한다", async ({ page }) => {
    await page.goto("/factories");

    await expect(page.getByRole("heading", { level: 1, name: "공장 목록" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "공장 3곳" })).toBeVisible();

    const searchInput = page.getByPlaceholder("공장명, 위치, 설명 검색");
    await searchInput.fill("서울");
    expect(new URL(page.url()).searchParams.get("q")).toBe("서울");
    await expect(page.getByRole("heading", { name: "공장 1곳" })).toBeVisible();
    await expect(page.getByRole("table").getByText("서울 스마트팩토리")).toBeVisible();

    await searchInput.fill("없는공장");
    expect(new URL(page.url()).searchParams.get("q")).toBe("없는공장");
    await expect(page.getByText("조건에 맞는 공장이 없습니다.")).toBeVisible();
    await page
      .locator("section")
      .filter({ hasText: "조건에 맞는 공장이 없습니다." })
      .getByRole("button", { name: "필터 초기화" })
      .click();
    await expect(page).toHaveURL(/\/factories$/);
    await expect(page.getByRole("heading", { name: "공장 3곳" })).toBeVisible();

    await page.getByLabel("상태").selectOption("critical");
    expect(new URL(page.url()).searchParams.get("status")).toBe("critical");
    await expect(page.getByRole("heading", { name: "공장 1곳" })).toBeVisible();
    await page.getByLabel("상태").selectOption("all");
    expect(new URL(page.url()).searchParams.get("status")).toBeNull();

    await page.getByLabel("정렬").selectOption("name");
    expect(new URL(page.url()).searchParams.get("sort")).toBe("name");
    await expect(page.getByText("현재 정렬 공장명순")).toBeVisible();

    const firstFactoryName = await page.locator("tbody tr").first().locator("td").first().locator("p").first().innerText();
    await page.getByRole("link", { name: "상세 보기" }).first().click();

    await expect(page).toHaveURL(/\/factories\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1, name: firstFactoryName })).toBeVisible();

    await page.getByRole("link", { name: "목록으로" }).click();
    await expect(page).toHaveURL(/\/factories$/);
  });

  test("공장 목록 공유 URL이 검색, 상태, 정렬을 복원한다", async ({ page }) => {
    await page.goto("/factories?q=서울&status=critical&sort=name");

    await expect(page.getByPlaceholder("공장명, 위치, 설명 검색")).toHaveValue("서울");
    await expect(page.getByLabel("상태")).toHaveValue("critical");
    await expect(page.getByLabel("정렬")).toHaveValue("name");
    await expect(page.getByText("현재 정렬 공장명순")).toBeVisible();
  });

  test("공장 상세에서 설비 목록으로 이동하고 factoryId 필터를 적용한다", async ({ page }) => {
    await page.goto("/factories");

    await page.getByPlaceholder("공장명, 위치, 설명 검색").fill("서울");
    await page.getByRole("table").getByRole("link", { name: "상세 보기" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "서울 스마트팩토리" })).toBeVisible();

    await page.getByRole("link", { name: "설비 목록" }).click();

    await expect(page).toHaveURL(/\/machines\?factoryId=/);
    await expect(page.getByRole("heading", { level: 1, name: "설비 목록" })).toBeVisible();
    await expect(page.getByText("선택 공장: 서울 스마트팩토리")).toBeVisible();
    await expect(page.getByRole("heading", { name: "설비 4대" })).toBeVisible();

    await page.getByPlaceholder("설비명, 모델명 검색").fill("없는설비");
    expect(new URL(page.url()).searchParams.get("q")).toBe("없는설비");
    expect(new URL(page.url()).searchParams.get("factoryId")).toBeTruthy();
    await expect(page.getByText("조건에 맞는 설비가 없습니다.")).toBeVisible();
    await page
      .locator("section")
      .filter({ hasText: "조건에 맞는 설비가 없습니다." })
      .getByRole("button", { name: "초기화" })
      .click();
    await expect(page).toHaveURL(/\/machines$/);
    await expect(page.getByRole("heading", { name: "설비 12대" })).toBeVisible();
  });

  test("설비 목록 공유 URL이 검색, 상태, 정렬을 복원한다", async ({ page }) => {
    await page.goto("/machines?q=프레스&status=warning&sort=name");

    await expect(page.getByPlaceholder("설비명, 모델명 검색")).toHaveValue("프레스");
    await expect(page.getByLabel("상태")).toHaveValue("warning");
    await expect(page.getByLabel("정렬")).toHaveValue("name");
    await expect(page.getByText("현재 정렬 설비명순")).toBeVisible();
  });

  test("설비 상세에서 알람 목록으로 이동하고 machineId 필터를 적용한다", async ({ page }) => {
    await page.goto("/machines?factoryId=10000000-0000-0000-0000-000000000001");

    await expect(page.getByRole("heading", { level: 1, name: "설비 목록" })).toBeVisible();
    await expect(page.getByText("선택 공장: 서울 스마트팩토리")).toBeVisible();

    const firstMachineName = await page.locator("tbody tr").first().locator("td").first().locator("p").first().innerText();
    await page.getByRole("table").getByRole("link", { name: "상세 보기" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: firstMachineName })).toBeVisible();
    await expect(page.getByRole("heading", { name: "현재 센서 상태" })).toBeVisible();
    await expect(page.getByText("온도").first()).toBeVisible();
    await expect(page.getByText("압력").first()).toBeVisible();
    await expect(page.getByText("전류").first()).toBeVisible();
    await expect(page.getByText("진동").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "최근 알람" })).toBeVisible();
    await expect(page.getByRole("link", { name: "전체 알람 보기" })).toBeVisible();

    await page.getByRole("link", { name: "알람 보기", exact: true }).click();

    await expect(page).toHaveURL(/\/alarms\?machineId=/);
    await expect(page.getByRole("heading", { level: 1, name: "알람 목록" })).toBeVisible();
    await expect(page.getByText(`선택 설비: ${firstMachineName}`)).toBeVisible();
    await expect(page.getByRole("heading", { name: /알람 \d+건/ })).toBeVisible();

    await page.getByPlaceholder("알람 메시지, 설비명 검색").fill("없는알람");
    expect(new URL(page.url()).searchParams.get("q")).toBe("없는알람");
    expect(new URL(page.url()).searchParams.get("machineId")).toBeTruthy();
    await expect(page.getByText("조건에 맞는 알람이 없습니다.")).toBeVisible();
    await page
      .locator("section")
      .filter({ hasText: "조건에 맞는 알람이 없습니다." })
      .getByRole("button", { name: "초기화" })
      .click();
    await expect(page).toHaveURL(/\/alarms$/);
    await expect(page.getByRole("heading", { name: "알람 10건" })).toBeVisible();

    await page.getByLabel("상태").selectOption("open");
    expect(new URL(page.url()).searchParams.get("status")).toBe("open");
    await expect(page.getByRole("heading", { name: /알람 \d+건/ })).toBeVisible();
    await page.getByLabel("심각도").selectOption("critical");
    expect(new URL(page.url()).searchParams.get("severity")).toBe("critical");
    await expect(page.getByRole("heading", { name: /알람 \d+건/ })).toBeVisible();
  });

  test("알람 목록 공유 URL이 검색, 상태, 심각도, 정렬을 복원한다", async ({ page }) => {
    await page.goto("/alarms?q=온도&severity=critical&status=open&sort=latest");

    await expect(page.getByPlaceholder("알람 메시지, 설비명 검색")).toHaveValue("온도");
    await expect(page.getByLabel("심각도")).toHaveValue("critical");
    await expect(page.getByLabel("상태")).toHaveValue("open");
    await expect(page.getByLabel("정렬")).toHaveValue("latest");
    await expect(page.getByText("현재 정렬 최신순")).toBeVisible();
  });
});
