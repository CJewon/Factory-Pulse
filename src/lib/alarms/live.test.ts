import {
  buildLiveAlarmQueryString,
  createLiveAlarmSnapshot,
  defaultLiveAlarmFilters,
  parseLiveAlarmSearchParams
} from "./live";
import type { AlarmListRow, FactoryRow, LineRow, MachineRow } from "./types";

const createdAt = "2026-06-18T00:00:00.000Z";

describe("parseLiveAlarmSearchParams", () => {
  it("live 알람 query 값을 허용 범위로 정규화한다", () => {
    const filters = parseLiveAlarmSearchParams(
      new URLSearchParams({
        factoryId: "factory-a",
        machineId: "machine-a",
        severity: "critical",
        status: "resolved",
        limit: "50"
      })
    );

    expect(filters).toEqual({
      factoryId: "factory-a",
      machineId: "machine-a",
      severity: "critical",
      status: "resolved",
      limit: 50
    });
  });

  it("잘못된 severity/status/limit은 안전한 기본값으로 돌린다", () => {
    const filters = parseLiveAlarmSearchParams(
      new URLSearchParams({
        severity: "urgent",
        status: "bad",
        limit: "999"
      })
    );

    expect(filters).toEqual(defaultLiveAlarmFilters);
  });
});

describe("createLiveAlarmSnapshot", () => {
  it("기본값은 미해결 알람만 위험도 우선으로 반환한다", () => {
    const snapshot = createLiveAlarmSnapshot(
      input({
        alarms: [
          alarm({ id: "resolved-critical", is_resolved: true, severity: "critical" }),
          alarm({ id: "open-warning", severity: "warning", occurred_at: "2026-06-18T02:00:00.000Z" }),
          alarm({ id: "open-critical", severity: "critical", occurred_at: "2026-06-18T01:00:00.000Z" })
        ]
      }),
      defaultLiveAlarmFilters,
      new Date("2026-06-18T02:05:00.000Z")
    );

    expect(snapshot.alarms.map((summary) => summary.alarmId)).toEqual(["open-critical", "open-warning"]);
    expect(snapshot.totals).toMatchObject({
      openCount: 2,
      openCriticalCount: 1,
      openWarningCount: 1,
      recentOpenCount: 1
    });
  });

  it("공장, 설비, 심각도, 상태 필터를 조합해 적용한다", () => {
    const snapshot = createLiveAlarmSnapshot(
      input({
        factories: [factory({ id: "factory-a" }), factory({ id: "factory-b" })],
        lines: [line({ id: "line-a", factory_id: "factory-a" }), line({ id: "line-b", factory_id: "factory-b" })],
        machines: [machine({ id: "machine-a", line_id: "line-a" }), machine({ id: "machine-b", line_id: "line-b" })],
        alarms: [
          alarm({ id: "a-open-critical", machine_id: "machine-a", severity: "critical" }),
          alarm({ id: "b-open-critical", machine_id: "machine-b", severity: "critical" }),
          alarm({ id: "a-open-warning", machine_id: "machine-a", severity: "warning" })
        ]
      }),
      {
        factoryId: "factory-a",
        machineId: "machine-a",
        severity: "critical",
        status: "open",
        limit: 20
      }
    );

    expect(snapshot.filterIssue).toBeNull();
    expect(snapshot.alarms.map((summary) => summary.alarmId)).toEqual(["a-open-critical"]);
  });

  it("존재하지 않는 공장/설비 조합은 명시적인 filterIssue로 반환한다", () => {
    const snapshot = createLiveAlarmSnapshot(
      input({
        factories: [factory({ id: "factory-a" })],
        lines: [line({ id: "line-a", factory_id: "factory-a" })],
        machines: [machine({ id: "machine-a", line_id: "line-a" })],
        alarms: [alarm({ id: "open-critical", machine_id: "machine-a", severity: "critical" })]
      }),
      {
        factoryId: "factory-missing",
        machineId: null,
        severity: "all",
        status: "open",
        limit: 20
      }
    );

    expect(snapshot.filterIssue).toContain("공장");
    expect(snapshot.alarms).toHaveLength(0);
  });
});

describe("buildLiveAlarmQueryString", () => {
  it("기본값과 다른 필터만 URL query로 만든다", () => {
    expect(buildLiveAlarmQueryString(defaultLiveAlarmFilters)).toBe("");
    expect(
      buildLiveAlarmQueryString({
        ...defaultLiveAlarmFilters,
        severity: "critical",
        status: "all",
        limit: 50
      })
    ).toBe("severity=critical&status=all&limit=50");
  });
});

function input(overrides: Partial<{ alarms: AlarmListRow[]; factories: FactoryRow[]; lines: LineRow[]; machines: MachineRow[] }> = {}) {
  return {
    alarms: [alarm({ id: "alarm", machine_id: "machine-a" })],
    factories: [factory({ id: "factory-a" })],
    lines: [line({ id: "line-a", factory_id: "factory-a" })],
    machines: [machine({ id: "machine-a", line_id: "line-a" })],
    ...overrides
  };
}

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

function alarm(overrides: Partial<AlarmListRow>): AlarmListRow {
  return {
    id: "alarm",
    is_resolved: false,
    machine_id: "machine-a",
    message: "테스트 알람",
    occurred_at: createdAt,
    resolved_at: null,
    severity: "warning",
    ...overrides
  };
}
