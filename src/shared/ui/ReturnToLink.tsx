"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { getReturnToRouteKind, getSafeReturnToHref, readBrowserSearchParams, type ReturnToRouteKind } from "@/lib/url-state";

export function ReturnToLink({
  children,
  className,
  fallbackHref,
  labelByRoute,
  paramName = "returnTo"
}: {
  children: ReactNode;
  className?: string;
  fallbackHref: string;
  labelByRoute?: Partial<Record<ReturnToRouteKind, ReactNode>>;
  paramName?: string;
}) {
  const href = useSyncExternalStore(
    subscribeToBrowserHistory,
    () => getSafeReturnToHref(readBrowserSearchParams().get(paramName), fallbackHref),
    () => fallbackHref
  );
  const routeKind = getReturnToRouteKind(href);
  const label = routeKind ? labelByRoute?.[routeKind] ?? children : children;

  return (
    <Link className={className} href={href}>
      {label}
    </Link>
  );
}

function subscribeToBrowserHistory(callback: () => void) {
  window.addEventListener("popstate", callback);

  return () => {
    window.removeEventListener("popstate", callback);
  };
}
