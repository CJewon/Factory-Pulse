import {
  createDashboardMachineBoard,
  createDashboardRecentAlarms,
  createDashboardSummary,
  createDashboardTrend
} from "./mapper";
import type { AlarmSummary } from "@/lib/alarms";
import type { MachineDetailSensorRow, MachineSummary } from "@/lib/machines";
import type { ReportSummary } from "@/lib/reports";

describe("dashboard mapper", () => {
  it("요약 KPI를 계산한다", () => {
    const summary = createDashboardSummary({
      alarms: [alarm({ isResolved: false, severity: { value: "critical", priority: 3, label: "위험", tone: "danger" } })],
      machines: [
        machine({ machineId: "normal", status: { value: "normal", label: "정상", tone: "success", priority: 1 } }),
        machine({ machineId: "warning", status: { value: "warning", label: "주의", tone: "warning", priority: 4 } }),
        machine({ machineId: "critical", status: { value: "critical", label: "위험", tone: "danger", priority: 5 } })
      ],
      reports: [
        report({ factoryId: "factory-a", reportDate: "2026-06-17", totalOutput: 900, defectCount: 9, operationRate: 90 }),
        report({ factoryId: "factory-a", reportDate: "2026-06-18", totalOutput: 1000, defectCount: 10, operationRate: 95 }),
        report({ factoryId: "factory-b", reportDate: "2026-06-18", totalOutput: 2000, defectCount: 40, operationRate: 85 })
      ]
    });

    expect(summary.machineCount).toBe(3);
    expect(summary.warningMachineCount).toBe(1);
    expect(summary.criticalMachineCount).toBe(1);
    expect(summary.openAlarmCount).toBe(1);
    expect(summary.totalOutput).toBe(3000);
    expect(summary.averageOperationRateLabel).toBe("90.0%");
    expect(summary.defectRateLabel).toBe("1.7%");
  });

  it("위험 설비 보드와 최신 센서 상태를 만든다", () => {
    const board = createDashboardMachineBoard({
      machines: [
        machine({ machineId: "machine-a", name: "정상 설비", openAlarmCount: 0 }),
        machine({
          machineId: "machine-b",
          name: "위험 설비",
          openAlarmCount: 2,
          status: { value: "critical", label: "위험", tone: "danger", priority: 5 }
        })
      ],
      sensorReadings: [
        sensor({ machine_id: "machine-b", recorded_at: "2026-06-18T01:00:00Z", vibration: 0.05 }),
        sensor({ machine_id: "machine-b", recorded_at: "2026-06-18T02:00:00Z", vibration: 0.2 })
      ]
    });

    expect(board[0]).toMatchObject({
      machineId: "machine-b",
      sensorLabel: "센서 위험",
      sensorTone: "danger"
    });
  });

  it("최근 알람과 생산 추세를 만든다", () => {
    const recentAlarms = createDashboardRecentAlarms([
      alarm({ alarmId: "old", occurredAt: "2026-06-17T00:00:00Z", severity: { value: "warning", label: "주의", tone: "warning", priority: 2 } }),
      alarm({ alarmId: "new", occurredAt: "2026-06-18T00:00:00Z", severity: { value: "critical", label: "위험", tone: "danger", priority: 3 } })
    ]);
    const trend = createDashboardTrend([
      report({ reportDate: "2026-06-17", totalOutput: 1000, defectCount: 10, operationRate: 90 }),
      report({ reportDate: "2026-06-18", totalOutput: 2000, defectCount: 30, operationRate: 94 })
    ]);

    expect(recentAlarms[0].id).toBe("new");
    expect(trend.map((point) => point.date)).toEqual(["2026-06-17", "2026-06-18"]);
    expect(trend[1].defectRateLabel).toBe("1.5%");
  });
});

function machine(overrides: Partial<MachineSummary>): MachineSummary {
  return {
    criticalOpenAlarmCount: 0,
    factoryId: "factory",
    factoryName: "테스트 공장",
    id: "machine",
    installedAt: "2026-01-01",
    installedAtLabel: "2026.01.01",
    lineId: "line",
    lineName: "테스트 라인",
    links: { alarms: "/alarms?machineId=machine", detail: "/machines/machine" },
    machineId: "machine",
    modelName: "FP-100",
    modelNameLabel: "FP-100",
    name: "테스트 설비",
    openAlarmCount: 0,
    status: { label: "정상", priority: 1, tone: "success", value: "normal" },
    type: "CNC",
    warningOpenAlarmCount: 0,
    ...overrides
  };
}

function alarm(overrides: Partial<AlarmSummary>): AlarmSummary {
  return {
    alarmId: "alarm",
    factoryId: "factory",
    factoryName: "테스트 공장",
    id: "alarm",
    isResolved: false,
    lineId: "line",
    lineName: "테스트 라인",
    links: { factory: "/factories/factory", machine: "/machines/machine" },
    machineId: "machine",
    machineName: "테스트 설비",
    machineStatus: "normal",
    machineType: "CNC",
    message: "테스트 알람",
    occurredAt: "2026-06-18T00:00:00Z",
    occurredAtLabel: "26. 6. 18. 오전 9:00",
    resolvedAt: null,
    resolvedAtLabel: "미해결",
    severity: { label: "주의", priority: 2, tone: "warning", value: "warning" },
    status: { label: "미해결", tone: "warning", value: "open" },
    ...overrides
  };
}

function report(overrides: Partial<ReportSummary>): ReportSummary {
  return {
    defectCount: 10,
    defectCountLabel: "10건",
    defectRate: 1,
    defectRateLabel: "1.0%",
    factoryId: "factory",
    factoryLocation: "서울",
    factoryName: "테스트 공장",
    id: "report",
    links: { detail: "/reports/2026-06-18", factory: "/factories/factory" },
    operationRate: 90,
    operationRateLabel: "90.0%",
    reportDate: "2026-06-18",
    reportDateLabel: "2026.06.18",
    reportId: "report",
    status: { label: "양호", priority: 1, tone: "success", value: "good" },
    totalOutput: 1000,
    totalOutputLabel: "1,000개",
    ...overrides
  };
}

function sensor(overrides: Partial<MachineDetailSensorRow>): MachineDetailSensorRow {
  return {
    current_amp: 10,
    id: "sensor",
    machine_id: "machine",
    pressure: 3,
    recorded_at: "2026-06-18T00:00:00Z",
    temperature: 70,
    vibration: 0.04,
    ...overrides
  };
}
