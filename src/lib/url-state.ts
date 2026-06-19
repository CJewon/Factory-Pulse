export type BrowserHistoryMode = "push" | "replace";
export type ReturnToRouteKind = "alarms" | "dashboard" | "factories" | "machines" | "reportDate" | "reports" | "reportsCompare";

const INTERNAL_URL_BASE = "https://factory-pulse.local";
const REPORT_DATE_PATH_PATTERN = /^\/reports\/\d{4}-\d{2}-\d{2}$/;
const RETURN_TO_ALLOWED_PARAMS: Record<string, string[]> = {
  "/alarms": ["factoryId", "machineId", "q", "severity", "sort", "status"],
  "/dashboard": [],
  "/factories": ["q", "sort", "status"],
  "/machines": ["factoryId", "lineId", "q", "sort", "status"],
  "/reports": ["factoryId", "from", "q", "sort", "status", "to"],
  "/reports/compare": ["fromA", "toA", "fromB", "toB", "factoryId"]
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

export function getReturnToRouteKind(href: string): ReturnToRouteKind | null {
  try {
    const url = new URL(href, INTERNAL_URL_BASE);

    if (url.origin !== INTERNAL_URL_BASE) {
      return null;
    }

    if (url.pathname === "/alarms") {
      return "alarms";
    }

    if (url.pathname === "/dashboard") {
      return "dashboard";
    }

    if (url.pathname === "/factories") {
      return "factories";
    }

    if (url.pathname === "/machines") {
      return "machines";
    }

    if (url.pathname === "/reports") {
      return "reports";
    }

    if (url.pathname === "/reports/compare") {
      return "reportsCompare";
    }

    if (isReportDatePath(url.pathname)) {
      return "reportDate";
    }
  } catch {
    return null;
  }

  return null;
}

function getSafeInternalPath(value: string | null | undefined) {
  const candidate = value?.trim();

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || /[\r\n]/.test(candidate)) {
    return null;
  }

  try {
    const url = new URL(candidate, INTERNAL_URL_BASE);
    const allowedParams = getAllowedReturnToParams(url.pathname);

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

function getAllowedReturnToParams(pathname: string) {
  if (isReportDatePath(pathname)) {
    return [];
  }

  return RETURN_TO_ALLOWED_PARAMS[pathname];
}

function isReportDatePath(pathname: string) {
  const match = REPORT_DATE_PATH_PATTERN.exec(pathname);

  if (!match) {
    return false;
  }

  const date = pathname.split("/").at(-1);

  if (!date) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
