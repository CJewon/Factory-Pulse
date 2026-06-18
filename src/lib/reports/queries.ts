import { createSupabasePublicClient } from "@/lib/supabase/public";
import { mapReportSummaries, sortReportSummaries } from "./mapper";
import type { ReportSummary } from "./types";

export class ReportSummaryQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportSummaryQueryError";
  }
}

export async function getReportSummaries(): Promise<ReportSummary[]> {
  const supabase = createSupabasePublicClient();

  const [factoriesResult, reportsResult] = await Promise.all([
    supabase.from("factories").select("id,name,location,description,status,created_at").order("name"),
    supabase
      .from("production_reports")
      .select("id,factory_id,report_date,total_output,defect_count,operation_rate")
      .order("report_date", { ascending: false })
  ]);

  const error = factoriesResult.error ?? reportsResult.error;

  if (error) {
    throw new ReportSummaryQueryError(error.message);
  }

  const summaries = mapReportSummaries({
    factories: factoriesResult.data ?? [],
    reports: reportsResult.data ?? []
  });

  return sortReportSummaries(summaries);
}
