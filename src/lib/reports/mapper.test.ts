import { mapReportSummaries, sortReportSummaries } from "./mapper";
import type { FactoryRow, ReportListRow } from "./types";

describe("mapReportSummaries", () => {
  it("공장 정보와 생산 리포트를 결합해 화면용 요약을 만든다", () => {
    const summaries = mapReportSummaries({
      factories: [factory({ id: "factory-a", name: "서울 스마트팩토리" })],
      reports: [
        report({
          id: "report-a",
          factory_id: "factory-a",
          report_date: "2026-06-18",
          total_output: 10000,
          defect_count: 120,
          operation_rate: 94.8
        })
      ]
    });

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      factoryId: "factory-a",
      factoryName: "서울 스마트팩토리",
      reportDateLabel: "2026.06.18",
      totalOutputLabel: "10,000개",
      defectCountLabel: "120건",
      defectRateLabel: "1.2%",
      operationRateLabel: "94.8%",
      status: { value: "good", label: "양호" },
      links: { factory: "/factories/factory-a" }
    });
  });

  it("존재하지 않는 공장을 참조하는 리포트는 제외하고 최신 날짜순으로 정렬한다", () => {
    const summaries = sortReportSummaries(
      mapReportSummaries({
        factories: [
          factory({ id: "factory-a", name: "서울 스마트팩토리" }),
          factory({ id: "factory-b", name: "부산 자동화 공장" })
        ],
        reports: [
          report({ id: "old", factory_id: "factory-b", report_date: "2026-06-17" }),
          report({ id: "orphan", factory_id: "missing", report_date: "2026-06-19" }),
          report({ id: "new", factory_id: "factory-a", report_date: "2026-06-18" })
        ]
      })
    );

    expect(summaries.map((summary) => summary.reportId)).toEqual(["new", "old"]);
  });

  it("생산량 0 또는 저성과 리포트 상태를 안전하게 계산한다", () => {
    const [emptyReport, criticalReport] = mapReportSummaries({
      factories: [factory({ id: "factory-a" })],
      reports: [
        report({ id: "empty", factory_id: "factory-a", total_output: 0, defect_count: 0, operation_rate: 0 }),
        report({ id: "critical", factory_id: "factory-a", total_output: 1000, defect_count: 80, operation_rate: 78.4 })
      ]
    });

    expect(emptyReport.defectRateLabel).toBe("0.0%");
    expect(emptyReport.status.value).toBe("unknown");
    expect(criticalReport.defectRateLabel).toBe("8.0%");
    expect(criticalReport.status.value).toBe("critical");
  });
});

function factory(overrides: Partial<FactoryRow>): FactoryRow {
  return {
    id: "factory",
    name: "테스트 공장",
    location: "서울",
    description: null,
    status: "active",
    created_at: "2026-06-18T00:00:00Z",
    ...overrides
  };
}

function report(overrides: Partial<ReportListRow>): ReportListRow {
  return {
    id: "report",
    factory_id: "factory",
    report_date: "2026-06-18",
    total_output: 1000,
    defect_count: 10,
    operation_rate: 95,
    ...overrides
  };
}
