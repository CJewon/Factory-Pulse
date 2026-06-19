export const dashboardCardIds = ["summary", "machineBoard", "recentAlarms", "productionTrend"] as const;

export type DashboardCardId = (typeof dashboardCardIds)[number];

export const refreshIntervals = [15, 30, 60, 300] as const;

export type DashboardRefreshInterval = (typeof refreshIntervals)[number];

export type DashboardPreferences = {
  visibleCards: DashboardCardId[];
  refreshInterval: DashboardRefreshInterval;
};

export type DashboardPreferenceSource = "saved" | "default";

export type DashboardPreferenceContext = {
  preferences: DashboardPreferences;
  isAuthenticated: boolean;
  userLabel: string | null;
  source: DashboardPreferenceSource;
  updatedAt: string | null;
  loadError: string | null;
};

export type DashboardCardOption = {
  id: DashboardCardId;
  label: string;
  description: string;
};

export const dashboardCardOptions: DashboardCardOption[] = [
  {
    id: "summary",
    label: "요약 KPI",
    description: "전체 가동률, 가동 설비, 미해결 알람, 위험 설비를 한 줄로 표시합니다."
  },
  {
    id: "machineBoard",
    label: "설비 상태 보드",
    description: "위험도와 최근 센서 상태가 높은 설비를 우선 표시합니다."
  },
  {
    id: "recentAlarms",
    label: "최근 알람",
    description: "미해결 위험 알람과 관련 설비 이동 링크를 표시합니다."
  },
  {
    id: "productionTrend",
    label: "생산량 추이",
    description: "최근 생산 리포트 기준 일자별 생산량 차트를 표시합니다."
  }
];

export const defaultDashboardPreferences: DashboardPreferences = {
  visibleCards: [...dashboardCardIds],
  refreshInterval: 30
};
