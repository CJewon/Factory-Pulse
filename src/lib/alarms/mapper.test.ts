import { mapAlarmSummaries, sortAlarmSummaries } from "./mapper";
import type { AlarmListRow, FactoryRow, LineRow, MachineRow } from "./types";

const createdAt = "2026-06-18T00:00:00.000Z";

describe("mapAlarmSummaries", () => {
  it("알람을 공장/라인/설비 컨텍스트와 한국어 상태 라벨로 변환한다", () => {
    const summaries = mapAlarmSummaries({
      alarms: [
        alarm({ id: "alarm-critical", machine_id: "machine-a", severity: "critical", message: "진동 한계치 초과" }),
        alarm({ id: "alarm-resolved", machine_id: "machine-a", is_resolved: true, resolved_at: "2026-06-18T01:00:00.000Z" }),
        alarm({ id: "alarm-orphan", machine_id: "missing-machine", severity: "critical" })
      ],
      factories: [factory({ id: "factory-a", name: "서울 스마트팩토리" })],
      lines: [line({ id: "line-a", factory_id: "factory-a", name: "프레스 라인" })],
      machines: [machine({ id: "machine-a", line_id: "line-a", name: "프레스 1호" })]
    });

    expect(summaries).toHaveLength(2);

    const critical = summaries.find((summary) => summary.alarmId === "alarm-critical");
    expect(critical).toMatchObject({
      factoryName: "서울 스마트팩토리",
      lineName: "프레스 라인",
      machineName: "프레스 1호",
      message: "진동 한계치 초과",
      isResolved: false
    });
    expect(critical?.severity).toMatchObject({ label: "위험", value: "critical" });
    expect(critical?.status).toMatchObject({ label: "미해결", value: "open" });
    expect(critical?.links.machine).toBe("/machines/machine-a");

    const resolved = summaries.find((summary) => summary.alarmId === "alarm-resolved");
    expect(resolved?.status).toMatchObject({ label: "해결됨", value: "resolved" });
    expect(resolved?.resolvedAtLabel).not.toBe("미해결");
  });
});

describe("sortAlarmSummaries", () => {
  it("미해결 우선, 심각도 우선, 발생 시각 최신순으로 정렬한다", () => {
    const summaries = mapAlarmSummaries({
      alarms: [
        alarm({ id: "resolved-critical", machine_id: "machine-a", severity: "critical", is_resolved: true }),
        alarm({ id: "open-warning-old", machine_id: "machine-a", severity: "warning", occurred_at: "2026-06-18T01:00:00.000Z" }),
        alarm({ id: "open-warning-new", machine_id: "machine-a", severity: "warning", occurred_at: "2026-06-18T02:00:00.000Z" }),
        alarm({ id: "open-critical", machine_id: "machine-a", severity: "critical", occurred_at: "2026-06-18T00:30:00.000Z" })
      ],
      factories: [factory({ id: "factory-a" })],
      lines: [line({ id: "line-a", factory_id: "factory-a" })],
      machines: [machine({ id: "machine-a", line_id: "line-a" })]
    });

    expect(sortAlarmSummaries(summaries).map((summary) => summary.alarmId)).toEqual([
      "open-critical",
      "open-warning-new",
      "open-warning-old",
      "resolved-critical"
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

function alarm(overrides: Partial<AlarmListRow>): AlarmListRow {
  return {
    id: "alarm",
    is_resolved: false,
    machine_id: "machine",
    message: "테스트 알람",
    occurred_at: createdAt,
    resolved_at: null,
    severity: "warning",
    ...overrides
  };
}
