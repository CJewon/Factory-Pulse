import { normalizeSearchQuery, readBrowserSearchParams, writeBrowserQueryString } from "./url-state";

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
});
