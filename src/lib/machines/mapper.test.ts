import { mapMachineDetail, mapMachineSummaries, sortMachineSummaries } from "./mapper";
import type { AlarmSummaryRow, FactoryRow, LineRow, MachineDetailAlarmRow, MachineDetailSensorRow, MachineRow } from "./types";

const createdAt = "2026-06-18T00:00:00.000Z";

describe("mapMachineSummaries", () => {
  it("공장/라인 연결, 상태 라벨, 미해결 알람을 설비 요약으로 변환한다", () => {
    const summaries = mapMachineSummaries({
      factories: [factory({ id: "factory-a", name: "서울 스마트팩토리" })],
      lines: [line({ id: "line-a", factory_id: "factory-a", name: "프레스 라인" })],
      machines: [
        machine({ id: "machine-a", line_id: "line-a", name: "프레스 1호", status: "critical" }),
        machine({ id: "machine-b", line_id: "line-a", name: "검사 1호", status: "unknown", model_name: null, installed_at: null }),
        machine({ id: "orphan", line_id: "missing-line", name: "고아 설비" })
      ],
      alarms: [
        alarm({ id: "alarm-a1", machine_id: "machine-a", severity: "critical" }),
        alarm({ id: "alarm-a2", machine_id: "machine-a", severity: "warning" }),
        alarm({ id: "alarm-a3", machine_id: "machine-a", severity: "warning", is_resolved: true })
      ]
    });

    expect(summaries).toHaveLength(2);

    const press = summaries.find((summary) => summary.machineId === "machine-a");
    expect(press).toMatchObject({
      criticalOpenAlarmCount: 1,
      factoryName: "서울 스마트팩토리",
      lineName: "프레스 라인",
      openAlarmCount: 2,
      warningOpenAlarmCount: 1
    });
    expect(press?.status).toMatchObject({ label: "위험", value: "critical" });
    expect(press?.links.detail).toBe("/machines/machine-a");

    const inspection = summaries.find((summary) => summary.machineId === "machine-b");
    expect(inspection?.modelNameLabel).toBe("모델 정보 없음");
    expect(inspection?.installedAtLabel).toBe("설치일 없음");
    expect(inspection?.status).toMatchObject({ label: "확인 필요", value: "unknown" });
  });
});

describe("sortMachineSummaries", () => {
  it("상태 우선순위, 알람 수, 이름순으로 정렬한다", () => {
    const summaries = mapMachineSummaries({
      factories: [factory({ id: "factory-a" })],
      lines: [line({ id: "line-a", factory_id: "factory-a" })],
      machines: [
        machine({ id: "normal", line_id: "line-a", name: "정상 설비", status: "normal" }),
        machine({ id: "warning-a", line_id: "line-a", name: "주의 설비 A", status: "warning" }),
        machine({ id: "warning-b", line_id: "line-a", name: "주의 설비 B", status: "warning" }),
        machine({ id: "critical", line_id: "line-a", name: "위험 설비", status: "critical" })
      ],
      alarms: [
        alarm({ id: "alarm-a1", machine_id: "warning-a", severity: "warning" }),
        alarm({ id: "alarm-a2", machine_id: "warning-a", severity: "warning" }),
        alarm({ id: "alarm-b1", machine_id: "warning-b", severity: "warning" })
      ]
    });

    expect(sortMachineSummaries(summaries).map((summary) => summary.machineId)).toEqual([
      "critical",
      "warning-a",
      "warning-b",
      "normal"
    ]);
  });
});

describe("mapMachineDetail", () => {
  it("최신 센서 스냅샷과 최근 알람을 설비 상세 정보로 변환한다", () => {
    const summary = mapMachineSummaries({
      factories: [factory({ id: "factory-a", name: "서울 스마트팩토리" })],
      lines: [line({ id: "line-a", factory_id: "factory-a", name: "A-1 정밀가공 라인" })],
      machines: [machine({ id: "machine-a", line_id: "line-a", name: "CNC-101" })],
      alarms: [alarm({ id: "alarm-open", machine_id: "machine-a", severity: "critical" })]
    })[0]!;

    const detail = mapMachineDetail({
      latestSensorReading: sensorReading({
        machine_id: "machine-a",
        temperature: 88.5,
        pressure: 3.2,
        current_amp: 12.4,
        vibration: 0.14
      }),
      machine: summary,
      recentAlarms: [
        detailAlarm({
          id: "alarm-recent",
          machine_id: "machine-a",
          message: "진동 값이 기준치를 초과했습니다.",
          severity: "critical"
        })
      ]
    });

    expect(detail.sensorSnapshot?.metrics.map((metric) => [metric.label, metric.status.value])).toEqual([
      ["온도", "warning"],
      ["압력", "normal"],
      ["전류", "normal"],
      ["진동", "critical"]
    ]);
    expect(detail.sensorSnapshot?.recordedAtLabel).toContain("26");
    expect(detail.recentAlarms[0]).toMatchObject({
      message: "진동 값이 기준치를 초과했습니다.",
      severity: { label: "위험", value: "critical" },
      status: { label: "미해결", value: "open" }
    });
  });

  it("센서 데이터가 없어도 상세 화면 fallback 데이터를 유지한다", () => {
    const summary = mapMachineSummaries({
      factories: [factory({ id: "factory-a" })],
      lines: [line({ id: "line-a", factory_id: "factory-a" })],
      machines: [machine({ id: "machine-a", line_id: "line-a" })],
      alarms: []
    })[0]!;

    const detail = mapMachineDetail({
      latestSensorReading: null,
      machine: summary,
      recentAlarms: [detailAlarm({ id: "resolved", is_resolved: true, severity: "info" })]
    });

    expect(detail.sensorSnapshot).toBeNull();
    expect(detail.recentAlarms[0].status.value).toBe("resolved");
    expect(detail.recentAlarms[0].severity.value).toBe("info");
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

function sensorReading(overrides: Partial<MachineDetailSensorRow>): MachineDetailSensorRow {
  return {
    current_amp: 10,
    id: "reading",
    machine_id: "machine",
    pressure: 3,
    recorded_at: createdAt,
    temperature: 70,
    vibration: 0.04,
    ...overrides
  };
}

function detailAlarm(overrides: Partial<MachineDetailAlarmRow>): MachineDetailAlarmRow {
  return {
    id: "detail-alarm",
    is_resolved: false,
    machine_id: "machine",
    message: "테스트 알람",
    occurred_at: createdAt,
    resolved_at: null,
    severity: "warning",
    ...overrides
  };
}
