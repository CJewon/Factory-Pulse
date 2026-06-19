export type BrowserHistoryMode = "push" | "replace";

const INTERNAL_URL_BASE = "https://factory-pulse.local";
const RETURN_TO_ALLOWED_PARAMS: Record<string, string[]> = {
  "/alarms": ["factoryId", "machineId", "q", "severity", "sort", "status"],
  "/factories": ["q", "sort", "status"],
  "/machines": ["factoryId", "lineId", "q", "sort", "status"],
  "/reports": ["factoryId", "from", "q", "sort", "status", "to"],
  "/reports/compare": ["factoryId", "fromA", "fromB", "toA", "toB"]
};

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

export function appendReturnTo(href: string, returnTo: string) {
  const url = new URL(href, INTERNAL_URL_BASE);
  const safeReturnTo = getSafeInternalPath(returnTo);

  if (safeReturnTo) {
    url.searchParams.set("returnTo", safeReturnTo);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function getSafeReturnToHref(value: string | null | undefined, fallbackHref: string) {
  return getSafeInternalPath(value) ?? fallbackHref;
}

function getSafeInternalPath(value: string | null | undefined) {
  const candidate = value?.trim();

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || /[\r\n]/.test(candidate)) {
    return null;
  }

  try {
    const url = new URL(candidate, INTERNAL_URL_BASE);
    const allowedParams = RETURN_TO_ALLOWED_PARAMS[url.pathname];

    if (url.origin !== INTERNAL_URL_BASE || !allowedParams) {
      return null;
    }

    const params = new URLSearchParams();

    for (const key of allowedParams) {
      const value = url.searchParams.get(key);

      if (value) {
        params.set(key, value);
      }
    }

    const queryString = params.toString();

    return queryString ? `${url.pathname}?${queryString}` : url.pathname;
  } catch {
    return null;
  }
}
