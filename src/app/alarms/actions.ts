"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const alarmIdSchema = z.string().trim().uuid();

export type ResolveAlarmActionResult =
  | {
      ok: true;
      alarmId: string;
      message: string;
    }
  | {
      ok: false;
      alarmId?: string;
      code: "INVALID_INPUT" | "UNAUTHENTICATED" | "NOT_FOUND_OR_FORBIDDEN" | "ALREADY_RESOLVED" | "UPDATE_FAILED";
      message: string;
    };

export async function resolveAlarmAction(alarmId: string): Promise<ResolveAlarmActionResult> {
  const parsedAlarmId = alarmIdSchema.safeParse(alarmId);

  if (!parsedAlarmId.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "확인할 알람을 찾을 수 없습니다."
    };
  }

  const normalizedAlarmId = parsedAlarmId.data;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      alarmId: normalizedAlarmId,
      code: "UNAUTHENTICATED",
      message: "로그인 후 알람을 확인할 수 있습니다."
    };
  }

  const existingAlarmResult = await supabase
    .from("alarms")
    .select("id,machine_id,is_resolved")
    .eq("id", normalizedAlarmId)
    .maybeSingle();

  if (existingAlarmResult.error || !existingAlarmResult.data) {
    return {
      ok: false,
      alarmId: normalizedAlarmId,
      code: "NOT_FOUND_OR_FORBIDDEN",
      message: "알람을 찾을 수 없거나 확인 권한이 없습니다."
    };
  }

  if (existingAlarmResult.data.is_resolved) {
    return {
      ok: false,
      alarmId: normalizedAlarmId,
      code: "ALREADY_RESOLVED",
      message: "이미 해결 처리된 알람입니다."
    };
  }

  const updateResult = await supabase
    .from("alarms")
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id
    })
    .eq("id", normalizedAlarmId)
    .eq("is_resolved", false)
    .select("id")
    .maybeSingle();

  if (updateResult.error || !updateResult.data) {
    return {
      ok: false,
      alarmId: normalizedAlarmId,
      code: "UPDATE_FAILED",
      message: "알람 확인 처리에 실패했습니다. 잠시 후 다시 시도해 주세요."
    };
  }

  revalidatePath("/alarms");
  revalidatePath("/dashboard");
  revalidatePath("/machines");
  revalidatePath(`/machines/${existingAlarmResult.data.machine_id}`);
  revalidatePath("/factories");

  return {
    ok: true,
    alarmId: normalizedAlarmId,
    message: "알람을 해결됨으로 표시했습니다."
  };
}
