import { createSupabasePublicClient } from "@/lib/supabase/public";
import { mapReportDateDetail, mapReportSummaries, sortReportSummaries } from "./mapper";
import type { ReportDateDetail, ReportSummary } from "./types";

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

export async function getReportDates(): Promise<string[]> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("production_reports")
    .select("report_date")
    .order("report_date", { ascending: false });

  if (error) {
    throw new ReportSummaryQueryError(error.message);
  }

  return [...new Set((data ?? []).map((report) => report.report_date))];
}

export async function getReportDateDetail(reportDate: string): Promise<ReportDateDetail> {
  const summaries = await getReportSummaries();

  return mapReportDateDetail(reportDate, summaries);
}
