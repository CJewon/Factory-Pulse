import { mapReportDateDetail, mapReportSummaries, sortReportSummaries } from "./mapper";
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
      links: { detail: "/reports/2026-06-18", factory: "/factories/factory-a" }
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

describe("mapReportDateDetail", () => {
  it("같은 날짜의 여러 공장 리포트를 집계하고 위험도 순으로 정렬한다", () => {
    const summaries = mapReportSummaries({
      factories: [
        factory({ id: "factory-a", name: "서울 스마트팩토리" }),
        factory({ id: "factory-b", name: "부산 자동화 공장" }),
        factory({ id: "factory-c", name: "광주 정밀 공장" })
      ],
      reports: [
        report({
          id: "report-a",
          factory_id: "factory-a",
          report_date: "2026-06-18",
          total_output: 10000,
          defect_count: 100,
          operation_rate: 95
        }),
        report({
          id: "report-b",
          factory_id: "factory-b",
          report_date: "2026-06-18",
          total_output: 20000,
          defect_count: 800,
          operation_rate: 85
        }),
        report({
          id: "report-c",
          factory_id: "factory-c",
          report_date: "2026-06-18",
          total_output: 5000,
          defect_count: 400,
          operation_rate: 78
        }),
        report({ id: "other-date", factory_id: "factory-a", report_date: "2026-06-17" })
      ]
    });

    const detail = mapReportDateDetail("2026-06-18", summaries);

    expect(detail.reportDateLabel).toBe("2026.06.18");
    expect(detail.reports.map((summary) => summary.reportId)).toEqual(["report-c", "report-b", "report-a"]);
    expect(detail.totals).toMatchObject({
      reportCount: 3,
      totalOutput: 35000,
      totalDefects: 1300,
      averageOperationRate: 86,
      riskCount: 2
    });
    expect(detail.totals.defectRate).toBeCloseTo(3.714, 3);
    expect(detail.statusCounts).toEqual({ critical: 1, good: 1, unknown: 0, warning: 1 });
    expect(detail.topOutputReport?.reportId).toBe("report-b");
    expect(detail.lowestOperationReport?.reportId).toBe("report-c");
    expect(detail.highestDefectReport?.reportId).toBe("report-c");
  });

  it("해당 날짜 리포트가 없으면 빈 상세 상태를 만든다", () => {
    const detail = mapReportDateDetail("2099-01-01", []);

    expect(detail.reportDateLabel).toBe("2099.01.01");
    expect(detail.reports).toHaveLength(0);
    expect(detail.totals).toMatchObject({
      reportCount: 0,
      totalOutput: 0,
      totalDefects: 0,
      averageOperationRate: 0,
      defectRate: 0,
      riskCount: 0
    });
    expect(detail.statusCounts).toEqual({ critical: 0, good: 0, unknown: 0, warning: 0 });
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
