export type BrowserHistoryMode = "push" | "replace";

export function normalizeSearchQuery(value: string | null | undefined, maxLength = 80) {
  return (value ?? "").trim().slice(0, maxLength);
}

export function readBrowserSearchParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

export function writeBrowserQueryString(queryString: string, mode: BrowserHistoryMode = "replace") {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
  const currentUrl = `${window.location.pathname}${window.location.search}`;

  if (currentUrl === nextUrl) {
    return;
  }

  window.history[mode === "push" ? "pushState" : "replaceState"](null, "", nextUrl);
}
