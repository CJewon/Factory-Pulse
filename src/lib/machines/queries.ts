import { createSupabasePublicClient } from "@/lib/supabase/public";
import { mapMachineDetail, mapMachineSummaries, sortMachineSummaries } from "./mapper";
import type { MachineDetail, MachineSummary } from "./types";

export class MachineSummaryQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MachineSummaryQueryError";
  }
}

export async function getMachineSummaries(): Promise<MachineSummary[]> {
  const supabase = createSupabasePublicClient();

  const [factoriesResult, linesResult, machinesResult, alarmsResult] = await Promise.all([
    supabase.from("factories").select("id,name,location,description,status,created_at").order("name"),
    supabase.from("lines").select("id,factory_id,name,description,status,created_at"),
    supabase.from("machines").select("id,line_id,name,type,status,model_name,installed_at,created_at").order("name"),
    supabase.from("alarms").select("id,machine_id,severity,is_resolved,occurred_at")
  ]);

  const error = factoriesResult.error ?? linesResult.error ?? machinesResult.error ?? alarmsResult.error;

  if (error) {
    throw new MachineSummaryQueryError(error.message);
  }

  const summaries = mapMachineSummaries({
    alarms: alarmsResult.data ?? [],
    factories: factoriesResult.data ?? [],
    lines: linesResult.data ?? [],
    machines: machinesResult.data ?? []
  });

  return sortMachineSummaries(summaries);
}

export async function getMachineDetail(machineId: string): Promise<MachineDetail | null> {
  const supabase = createSupabasePublicClient();

  const [machines, sensorResult, recentAlarmsResult] = await Promise.all([
    getMachineSummaries(),
    supabase
      .from("sensor_readings")
      .select("id,machine_id,temperature,pressure,current_amp,vibration,recorded_at")
      .eq("machine_id", machineId)
      .order("recorded_at", { ascending: false })
      .limit(1),
    supabase
      .from("alarms")
      .select("id,machine_id,severity,message,is_resolved,occurred_at,resolved_at")
      .eq("machine_id", machineId)
      .order("occurred_at", { ascending: false })
      .limit(5)
  ]);

  const error = sensorResult.error ?? recentAlarmsResult.error;

  if (error) {
    throw new MachineSummaryQueryError(error.message);
  }

  const machine = machines.find((item) => item.machineId === machineId);

  if (!machine) {
    return null;
  }

  return mapMachineDetail({
    latestSensorReading: sensorResult.data?.[0] ?? null,
    machine,
    recentAlarms: recentAlarmsResult.data ?? []
  });
}
