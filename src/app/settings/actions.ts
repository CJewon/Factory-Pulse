"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapDashboardPreferenceRow } from "@/lib/settings/mapper";
import { parseDashboardSettingsInput } from "@/lib/settings/schema";
import type { DashboardPreferences } from "@/lib/settings/types";

export type SaveDashboardPreferencesActionResult =
  | {
      ok: true;
      message: string;
      preferences: DashboardPreferences;
    }
  | {
      ok: false;
      code: "INVALID_INPUT" | "UNAUTHENTICATED" | "SAVE_FAILED";
      message: string;
      field?: "visibleCards" | "refreshInterval";
    };

export async function saveDashboardPreferencesAction(input: unknown): Promise<SaveDashboardPreferencesActionResult> {
  const parsedInput = parseDashboardSettingsInput(input);

  if (!parsedInput.ok) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      field: parsedInput.field,
      message: parsedInput.message
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "로그인 후 대시보드 설정을 저장할 수 있습니다."
    };
  }

  const { data, error } = await supabase
    .from("dashboard_preferences")
    .upsert(
      {
        user_id: user.id,
        visible_cards: parsedInput.preferences.visibleCards,
        refresh_interval: parsedInput.preferences.refreshInterval,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    )
    .select("visible_cards,refresh_interval,updated_at")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      code: "SAVE_FAILED",
      message: "대시보드 설정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요."
    };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: "대시보드 설정을 저장했습니다.",
    preferences: mapDashboardPreferenceRow(data)
  };
}
