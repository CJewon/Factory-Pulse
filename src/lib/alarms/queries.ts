import { createSupabasePublicClient } from "@/lib/supabase/public";
import { mapAlarmSummaries, sortAlarmSummaries } from "./mapper";
import type { AlarmSummary } from "./types";

export class AlarmSummaryQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlarmSummaryQueryError";
  }
}

export async function getAlarmSummaries(): Promise<AlarmSummary[]> {
  const supabase = createSupabasePublicClient();

  const [factoriesResult, linesResult, machinesResult, alarmsResult] = await Promise.all([
    supabase.from("factories").select("id,name,location,description,status,created_at").order("name"),
    supabase.from("lines").select("id,factory_id,name,description,status,created_at"),
    supabase.from("machines").select("id,line_id,name,type,status,model_name,installed_at,created_at").order("name"),
    supabase
      .from("alarms")
      .select("id,machine_id,severity,message,is_resolved,occurred_at,resolved_at")
      .order("occurred_at", { ascending: false })
  ]);

  const error = factoriesResult.error ?? linesResult.error ?? machinesResult.error ?? alarmsResult.error;

  if (error) {
    throw new AlarmSummaryQueryError(error.message);
  }

  const summaries = mapAlarmSummaries({
    alarms: alarmsResult.data ?? [],
    factories: factoriesResult.data ?? [],
    lines: linesResult.data ?? [],
    machines: machinesResult.data ?? []
  });

  return sortAlarmSummaries(summaries);
}
