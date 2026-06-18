import { createSupabasePublicClient } from "@/lib/supabase/public";
import { mapFactorySummaries, sortFactorySummaries } from "./mapper";
import type { FactorySummary } from "./types";

export class FactorySummaryQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FactorySummaryQueryError";
  }
}

export async function getFactorySummaries(): Promise<FactorySummary[]> {
  const supabase = createSupabasePublicClient();

  const [factoriesResult, linesResult, machinesResult, alarmsResult, reportsResult] = await Promise.all([
    supabase.from("factories").select("id,name,location,description,status,created_at").order("name"),
    supabase.from("lines").select("id,factory_id,name,description,status,created_at"),
    supabase.from("machines").select("id,line_id,name,type,status,model_name,installed_at,created_at"),
    supabase.from("alarms").select("id,machine_id,severity,is_resolved,occurred_at"),
    supabase
      .from("production_reports")
      .select("id,factory_id,report_date")
      .order("report_date", { ascending: false })
  ]);

  const error =
    factoriesResult.error ??
    linesResult.error ??
    machinesResult.error ??
    alarmsResult.error ??
    reportsResult.error;

  if (error) {
    throw new FactorySummaryQueryError(error.message);
  }

  const summaries = mapFactorySummaries({
    factories: factoriesResult.data ?? [],
    lines: linesResult.data ?? [],
    machines: machinesResult.data ?? [],
    alarms: alarmsResult.data ?? [],
    productionReports: reportsResult.data ?? []
  });

  return sortFactorySummaries(summaries);
}
