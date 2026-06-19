import type { Json } from "@/lib/supabase/types";
import {
  dashboardCardIds,
  defaultDashboardPreferences,
  refreshIntervals,
  type DashboardCardId,
  type DashboardPreferences,
  type DashboardRefreshInterval
} from "./types";

export type DashboardPreferenceRow = {
  visible_cards: Json | null;
  refresh_interval: number | null;
  updated_at?: string | null;
};

export function mapDashboardPreferenceRow(row: DashboardPreferenceRow | null | undefined): DashboardPreferences {
  if (!row) {
    return defaultDashboardPreferences;
  }

  return {
    visibleCards: normalizeVisibleCards(row.visible_cards),
    refreshInterval: normalizeRefreshInterval(row.refresh_interval)
  };
}

export function isDashboardCardVisible(preferences: DashboardPreferences, cardId: DashboardCardId) {
  return preferences.visibleCards.includes(cardId);
}

export function formatRefreshInterval(interval: DashboardRefreshInterval) {
  if (interval >= 60) {
    return `${interval / 60}분`;
  }

  return `${interval}초`;
}

function normalizeVisibleCards(value: Json | null | undefined): DashboardCardId[] {
  if (!Array.isArray(value)) {
    return [...defaultDashboardPreferences.visibleCards];
  }

  const visibleSet = new Set(value.filter(isDashboardCardId));
  const orderedCards = dashboardCardIds.filter((cardId) => visibleSet.has(cardId));

  return orderedCards.length > 0 ? orderedCards : [...defaultDashboardPreferences.visibleCards];
}

function normalizeRefreshInterval(value: number | null | undefined): DashboardRefreshInterval {
  if (refreshIntervals.includes(value as DashboardRefreshInterval)) {
    return value as DashboardRefreshInterval;
  }

  return defaultDashboardPreferences.refreshInterval;
}

function isDashboardCardId(value: Json): value is DashboardCardId {
  return typeof value === "string" && dashboardCardIds.includes(value as DashboardCardId);
}
