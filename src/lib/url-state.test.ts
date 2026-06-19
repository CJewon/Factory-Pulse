import {
  appendReturnTo,
  getReturnToRouteKind,
  getSafeReturnToHref,
  normalizeSearchQuery,
  readBrowserSearchParams,
  writeBrowserQueryString
} from "./url-state";

describe("url-state", () => {
  it("검색어를 trim하고 길이를 제한한다", () => {
    expect(normalizeSearchQuery("  서울 스마트팩토리  ")).toBe("서울 스마트팩토리");
    expect(normalizeSearchQuery("123456", 3)).toBe("123");
    expect(normalizeSearchQuery(null)).toBe("");
  });

  it("브라우저 query string을 읽고 같은 URL은 다시 쓰지 않는다", () => {
    window.history.replaceState(null, "", "/factories?q=서울");

    expect(readBrowserSearchParams().get("q")).toBe("서울");

    writeBrowserQueryString("q=서울", "replace");
    expect(window.location.pathname).toBe("/factories");
    expect(window.location.search).toBe("?q=%EC%84%9C%EC%9A%B8");
  });

  it("query string을 push 또는 replace로 갱신한다", () => {
    window.history.replaceState(null, "", "/machines");

    writeBrowserQueryString("status=critical", "push");
    expect(window.location.pathname).toBe("/machines");
    expect(window.location.search).toBe("?status=critical");

    writeBrowserQueryString("", "replace");
    expect(window.location.pathname).toBe("/machines");
    expect(window.location.search).toBe("");
  });

  it("상세 링크에 안전한 returnTo를 추가하고 허용된 query만 보존한다", () => {
    const href = appendReturnTo(
      "/machines/10000000-0000-0000-0000-000000000001",
      "/machines?q=프레스&factoryId=factory-1&status=critical&returnTo=https://evil.com&debug=1"
    );

    const params = new URLSearchParams(href.split("?")[1]);

    expect(href.startsWith("/machines/10000000-0000-0000-0000-000000000001?")).toBe(true);
    expect(params.get("returnTo")).toBe("/machines?factoryId=factory-1&q=%ED%94%84%EB%A0%88%EC%8A%A4&status=critical");
  });

  it("returnTo는 허용된 내부 운영 경로만 사용한다", () => {
    expect(getSafeReturnToHref("/factories?q=서울&status=critical&debug=1", "/factories")).toBe(
      "/factories?q=%EC%84%9C%EC%9A%B8&status=critical"
    );
    expect(getSafeReturnToHref("/dashboard", "/factories")).toBe("/dashboard");
    expect(getSafeReturnToHref("/reports/2026-06-18?debug=1", "/reports")).toBe("/reports/2026-06-18");
    expect(getSafeReturnToHref("/reports/2026-99-99", "/reports")).toBe("/reports");
    expect(
      getSafeReturnToHref(
        "/reports/compare?factoryId=factory-1&fromA=2026-06-01&toA=2026-06-07&fromB=2026-05-25&toB=2026-05-31&token=secret",
        "/reports/compare"
      )
    ).toBe("/reports/compare?fromA=2026-06-01&toA=2026-06-07&fromB=2026-05-25&toB=2026-05-31&factoryId=factory-1");
    expect(getSafeReturnToHref("https://evil.com", "/factories")).toBe("/factories");
    expect(getSafeReturnToHref("//evil.com/path", "/factories")).toBe("/factories");
    expect(getSafeReturnToHref("javascript:alert(1)", "/factories")).toBe("/factories");
    expect(getSafeReturnToHref("/reports/%2F%2Fevil.com", "/reports")).toBe("/reports");
    expect(getSafeReturnToHref("/reports/not-a-date", "/reports")).toBe("/reports");
    expect(getSafeReturnToHref("/unknown?q=서울", "/factories")).toBe("/factories");
    expect(getSafeReturnToHref("/machines?returnTo=https://evil.com&status=warning", "/machines")).toBe(
      "/machines?status=warning"
    );
  });

  it("returnTo 목적지 종류를 라벨용으로 분류한다", () => {
    expect(getReturnToRouteKind("/dashboard")).toBe("dashboard");
    expect(getReturnToRouteKind("/reports?sort=output")).toBe("reports");
    expect(getReturnToRouteKind("/reports/2026-06-18")).toBe("reportDate");
    expect(getReturnToRouteKind("/reports/2026-99-99")).toBeNull();
    expect(getReturnToRouteKind("/reports/compare?fromA=2026-06-01")).toBe("reportsCompare");
    expect(getReturnToRouteKind("https://evil.com")).toBeNull();
  });
});
