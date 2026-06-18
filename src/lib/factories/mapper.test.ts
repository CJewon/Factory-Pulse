import { mapFactorySummaries, sortFactorySummaries } from "./mapper";
import type {
  AlarmSummaryRow,
  FactoryRow,
  LineRow,
  MachineRow,
  ProductionReportSummaryRow
} from "./types";

const createdAt = "2026-06-18T00:00:00.000Z";

describe("mapFactorySummaries", () => {
  it("집계, 상태 우선순위, 최신 리포트, fallback 라벨을 계산한다", () => {
    const factories: FactoryRow[] = [
      factory({ id: "factory-a", name: "서울 스마트팩토리", location: "서울 금천구" }),
      factory({ id: "factory-b", name: "부산 자동차 공장", location: "" }),
      factory({ id: "factory-c", name: "대전 테스트 플랜트", status: "inactive" })
    ];
    const lines: LineRow[] = [
      line({ id: "line-a1", factory_id: "factory-a" }),
      line({ id: "line-a2", factory_id: "factory-a", status: "inactive" }),
      line({ id: "line-b1", factory_id: "factory-b" }),
      line({ id: "line-c1", factory_id: "factory-c" })
    ];
    const machines: MachineRow[] = [
      machine({ id: "machine-a1", line_id: "line-a1", status: "normal" }),
      machine({ id: "machine-a2", line_id: "line-a2", status: "maintenance" }),
      machine({ id: "machine-b1", line_id: "line-b1", status: "critical" }),
      machine({ id: "machine-b2", line_id: "line-b1", status: "unknown" }),
      machine({ id: "machine-c1", line_id: "line-c1", status: "stopped" })
    ];
    const alarms: AlarmSummaryRow[] = [
      alarm({ id: "alarm-a1", machine_id: "machine-a2", severity: "warning" }),
      alarm({ id: "alarm-a2", machine_id: "machine-a1", severity: "critical", is_resolved: true }),
      alarm({ id: "alarm-b1", machine_id: "machine-b1", severity: "critical" }),
      alarm({ id: "alarm-orphan", machine_id: "missing-machine", severity: "critical" })
    ];
    const productionReports: ProductionReportSummaryRow[] = [
      report({ id: "report-a1", factory_id: "factory-a", report_date: "2026-06-17" }),
      report({ id: "report-a2", factory_id: "factory-a", report_date: "2026-06-18" })
    ];

    const summaries = mapFactorySummaries({
      alarms,
      factories,
      lines,
      machines,
      productionReports
    });

    expect(summaries).toHaveLength(3);

    const seoul = summaries.find((summary) => summary.factoryId === "factory-a");
    expect(seoul).toMatchObject({
      activeLineCount: 1,
      lineCount: 2,
      machineCount: 2,
      openAlarmCount: 1,
      warningOpenAlarmCount: 1,
      latestReportDateLabel: "2026.06.18"
    });
    expect(seoul?.machineStatusCounts.maintenance).toBe(1);
    expect(seoul?.status).toMatchObject({ label: "주의", value: "warning" });
    expect(seoul?.links.detail).toBe("/factories/factory-a");

    const busan = summaries.find((summary) => summary.factoryId === "factory-b");
    expect(busan?.locationLabel).toBe("위치 정보 없음");
    expect(busan?.machineStatusCounts.other).toBe(1);
    expect(busan?.criticalOpenAlarmCount).toBe(1);
    expect(busan?.status).toMatchObject({ label: "위험", value: "critical" });

    const daejeon = summaries.find((summary) => summary.factoryId === "factory-c");
    expect(daejeon?.latestReportDateLabel).toBe("최근 리포트 없음");
    expect(daejeon?.status).toMatchObject({ label: "오프라인", value: "offline" });
  });
});

describe("sortFactorySummaries", () => {
  it("상태 우선순위, 열린 알람 수, 이름순으로 정렬한다", () => {
    const summaries = mapFactorySummaries({
      factories: [
        factory({ id: "factory-normal", name: "정상 공장" }),
        factory({ id: "factory-warning-a", name: "경고 공장 A" }),
        factory({ id: "factory-warning-b", name: "경고 공장 B" }),
        factory({ id: "factory-critical", name: "위험 공장" })
      ],
      lines: [
        line({ id: "line-normal", factory_id: "factory-normal" }),
        line({ id: "line-warning-a", factory_id: "factory-warning-a" }),
        line({ id: "line-warning-b", factory_id: "factory-warning-b" }),
        line({ id: "line-critical", factory_id: "factory-critical" })
      ],
      machines: [
        machine({ id: "machine-normal", line_id: "line-normal", status: "normal" }),
        machine({ id: "machine-warning-a", line_id: "line-warning-a", status: "warning" }),
        machine({ id: "machine-warning-b", line_id: "line-warning-b", status: "warning" }),
        machine({ id: "machine-critical", line_id: "line-critical", status: "critical" })
      ],
      alarms: [
        alarm({ id: "alarm-warning-a1", machine_id: "machine-warning-a", severity: "warning" }),
        alarm({ id: "alarm-warning-a2", machine_id: "machine-warning-a", severity: "warning" }),
        alarm({ id: "alarm-warning-b1", machine_id: "machine-warning-b", severity: "warning" })
      ],
      productionReports: []
    });

    expect(sortFactorySummaries(summaries).map((summary) => summary.factoryId)).toEqual([
      "factory-critical",
      "factory-warning-a",
      "factory-warning-b",
      "factory-normal"
    ]);
  });
});

function factory(overrides: Partial<FactoryRow>): FactoryRow {
  return {
    created_at: createdAt,
    description: "테스트 공장",
    id: "factory",
    location: "테스트 위치",
    name: "테스트 공장",
    status: "active",
    ...overrides
  };
}

function line(overrides: Partial<LineRow>): LineRow {
  return {
    created_at: createdAt,
    description: "테스트 라인",
    factory_id: "factory",
    id: "line",
    name: "테스트 라인",
    status: "active",
    ...overrides
  };
}

function machine(overrides: Partial<MachineRow>): MachineRow {
  return {
    created_at: createdAt,
    id: "machine",
    installed_at: "2026-01-01",
    line_id: "line",
    model_name: "FP-100",
    name: "테스트 설비",
    status: "normal",
    type: "press",
    ...overrides
  };
}

function alarm(overrides: Partial<AlarmSummaryRow>): AlarmSummaryRow {
  return {
    id: "alarm",
    is_resolved: false,
    machine_id: "machine",
    occurred_at: createdAt,
    severity: "warning",
    ...overrides
  };
}

function report(overrides: Partial<ProductionReportSummaryRow>): ProductionReportSummaryRow {
  return {
    factory_id: "factory",
    id: "report",
    report_date: "2026-06-18",
    ...overrides
  };
}
