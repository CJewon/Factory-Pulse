import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapDashboardPreferenceRow } from "./mapper";
import { defaultDashboardPreferences, type DashboardPreferenceContext } from "./types";

export async function getDashboardPreferenceContext(): Promise<DashboardPreferenceContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      preferences: defaultDashboardPreferences,
      isAuthenticated: false,
      userLabel: null,
      source: "default",
      updatedAt: null,
      loadError: null
    };
  }

  const { data, error } = await supabase
    .from("dashboard_preferences")
    .select("visible_cards,refresh_interval,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    preferences: mapDashboardPreferenceRow(data),
    isAuthenticated: true,
    userLabel: user.email ?? user.id,
    source: data ? "saved" : "default",
    updatedAt: data?.updated_at ?? null,
    loadError: error ? "저장된 대시보드 설정을 불러오지 못해 기본값을 표시합니다." : null
  };
}
