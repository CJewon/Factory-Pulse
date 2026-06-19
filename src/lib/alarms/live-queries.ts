import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createLiveAlarmSnapshot, type LiveAlarmFilters, type LiveAlarmSnapshot } from "./live";

export class LiveAlarmQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LiveAlarmQueryError";
  }
}

export async function getLiveAlarmSnapshot(filters: LiveAlarmFilters): Promise<LiveAlarmSnapshot> {
  const supabase = createSupabasePublicClient();

  const [factoriesResult, linesResult, machinesResult] = await Promise.all([
    supabase.from("factories").select("id,name,location,description,status,created_at").order("name"),
    supabase.from("lines").select("id,factory_id,name,description,status,created_at"),
    supabase.from("machines").select("id,line_id,name,type,status,model_name,installed_at,created_at").order("name")
  ]);

  const contextError = factoriesResult.error ?? linesResult.error ?? machinesResult.error;

  if (contextError) {
    throw new LiveAlarmQueryError(contextError.message);
  }

  let alarmsQuery = supabase
    .from("alarms")
    .select("id,machine_id,severity,message,is_resolved,occurred_at,resolved_at")
    .order("occurred_at", { ascending: false })
    .limit(filters.limit);

  if (filters.status === "open") {
    alarmsQuery = alarmsQuery.eq("is_resolved", false);
  }

  if (filters.status === "resolved") {
    alarmsQuery = alarmsQuery.eq("is_resolved", true);
  }

  if (filters.severity !== "all") {
    alarmsQuery = alarmsQuery.eq("severity", filters.severity);
  }

  if (filters.machineId) {
    alarmsQuery = alarmsQuery.eq("machine_id", filters.machineId);
  } else if (filters.factoryId) {
    const lineIds = new Set((linesResult.data ?? []).filter((line) => line.factory_id === filters.factoryId).map((line) => line.id));
    const machineIds = (machinesResult.data ?? []).filter((machine) => lineIds.has(machine.line_id)).map((machine) => machine.id);

    if (machineIds.length === 0) {
      return createLiveAlarmSnapshot(
        {
          alarms: [],
          factories: factoriesResult.data ?? [],
          lines: linesResult.data ?? [],
          machines: machinesResult.data ?? []
        },
        filters
      );
    }

    alarmsQuery = alarmsQuery.in("machine_id", machineIds);
  }

  const alarmsResult = await alarmsQuery;

  if (alarmsResult.error) {
    throw new LiveAlarmQueryError(alarmsResult.error.message);
  }

  return createLiveAlarmSnapshot({
    alarms: alarmsResult.data ?? [],
    factories: factoriesResult.data ?? [],
    lines: linesResult.data ?? [],
    machines: machinesResult.data ?? []
  }, filters);
}
