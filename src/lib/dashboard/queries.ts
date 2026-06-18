import { getAlarmSummaries } from "@/lib/alarms";
import { getMachineSummaries } from "@/lib/machines";
import { getReportSummaries } from "@/lib/reports";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import {
  createDashboardMachineBoard,
  createDashboardRecentAlarms,
  createDashboardSummary,
  createDashboardTrend
} from "./mapper";
import type { DashboardAlarmItem, DashboardMachineCard, DashboardSummary, DashboardTrendPoint } from "./types";

export class DashboardQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardQueryError";
  }
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [machines, alarms, reports] = await Promise.all([getMachineSummaries(), getAlarmSummaries(), getReportSummaries()]);

  return createDashboardSummary({ alarms, machines, reports });
}

export async function getDashboardMachineBoard(): Promise<DashboardMachineCard[]> {
  const [machines, sensorReadings] = await Promise.all([getMachineSummaries(), getRecentSensorReadings()]);

  return createDashboardMachineBoard({ machines, sensorReadings });
}

export async function getDashboardRecentAlarms(): Promise<DashboardAlarmItem[]> {
  const alarms = await getAlarmSummaries();

  return createDashboardRecentAlarms(alarms);
}

export async function getDashboardTrend(): Promise<DashboardTrendPoint[]> {
  const reports = await getReportSummaries();

  return createDashboardTrend(reports);
}

async function getRecentSensorReadings() {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("sensor_readings")
    .select("id,machine_id,temperature,pressure,current_amp,vibration,recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new DashboardQueryError(error.message);
  }

  return data ?? [];
}
