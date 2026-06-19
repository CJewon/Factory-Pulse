"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { getSafeReturnToHref, readBrowserSearchParams } from "@/lib/url-state";

export function ReturnToLink({
  children,
  className,
  fallbackHref,
  paramName = "returnTo"
}: {
  children: ReactNode;
  className?: string;
  fallbackHref: string;
  paramName?: string;
}) {
  const href = useSyncExternalStore(
    subscribeToBrowserHistory,
    () => getSafeReturnToHref(readBrowserSearchParams().get(paramName), fallbackHref),
    () => fallbackHref
  );

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

function subscribeToBrowserHistory(callback: () => void) {
  window.addEventListener("popstate", callback);

  return () => {
    window.removeEventListener("popstate", callback);
  };
}
