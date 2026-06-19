import { dashboardCardIds, defaultDashboardPreferences } from "./types";
import { formatRefreshInterval, isDashboardCardVisible, mapDashboardPreferenceRow } from "./mapper";
import { parseDashboardSettingsInput } from "./schema";

describe("dashboard settings mapper", () => {
  it("저장된 visible_cards와 refresh_interval을 앱 설정값으로 변환한다", () => {
    const preferences = mapDashboardPreferenceRow({
      visible_cards: ["recentAlarms", "summary"],
      refresh_interval: 60
    });

    expect(preferences).toEqual({
      visibleCards: ["summary", "recentAlarms"],
      refreshInterval: 60
    });
    expect(isDashboardCardVisible(preferences, "summary")).toBe(true);
    expect(isDashboardCardVisible(preferences, "machineBoard")).toBe(false);
  });

  it("깨진 row 값은 기본 설정으로 보정한다", () => {
    const preferences = mapDashboardPreferenceRow({
      visible_cards: ["unknown"],
      refresh_interval: 1
    });

    expect(preferences).toEqual(defaultDashboardPreferences);
  });

  it("설정 입력은 카드 최소 1개와 허용 갱신 주기를 강제한다", () => {
    expect(
      parseDashboardSettingsInput({
        visibleCards: [],
        refreshInterval: 30
      })
    ).toMatchObject({
      ok: false,
      field: "visibleCards"
    });

    expect(
      parseDashboardSettingsInput({
        visibleCards: ["summary"],
        refreshInterval: 5
      })
    ).toMatchObject({
      ok: false,
      field: "refreshInterval"
    });

    expect(
      parseDashboardSettingsInput({
        visibleCards: [...dashboardCardIds],
        refreshInterval: "300"
      })
    ).toMatchObject({
      ok: true,
      preferences: {
        visibleCards: [...dashboardCardIds],
        refreshInterval: 300
      }
    });
  });

  it("갱신 주기 라벨을 한국어 단위로 표시한다", () => {
    expect(formatRefreshInterval(15)).toBe("15초");
    expect(formatRefreshInterval(60)).toBe("1분");
    expect(formatRefreshInterval(300)).toBe("5분");
  });
});
