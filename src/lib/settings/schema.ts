import { z } from "zod";
import { dashboardCardIds, refreshIntervals, type DashboardPreferences, type DashboardRefreshInterval } from "./types";

export const dashboardSettingsSchema = z.object({
  visibleCards: z
    .array(z.enum(dashboardCardIds))
    .min(1, "대시보드에는 최소 1개의 카드를 표시해야 합니다.")
    .superRefine((cards, context) => {
      if (new Set(cards).size !== cards.length) {
        context.addIssue({
          code: "custom",
          message: "같은 카드는 한 번만 선택할 수 있습니다."
        });
      }
    }),
  refreshInterval: z.coerce
    .number()
    .int("새로고침 주기는 초 단위 정수여야 합니다.")
    .refine((value): value is DashboardRefreshInterval => refreshIntervals.includes(value as DashboardRefreshInterval), {
      message: "새로고침 주기는 15초, 30초, 60초, 300초 중 하나여야 합니다."
    })
});

export type DashboardSettingsInput = z.input<typeof dashboardSettingsSchema>;

export function parseDashboardSettingsInput(input: unknown):
  | {
      ok: true;
      preferences: DashboardPreferences;
    }
  | {
      ok: false;
      message: string;
      field: "visibleCards" | "refreshInterval";
    } {
  const parsed = dashboardSettingsSchema.safeParse(input);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];

    return {
      ok: false,
      field: issue?.path[0] === "refreshInterval" ? "refreshInterval" : "visibleCards",
      message: issue?.message ?? "대시보드 설정값을 확인해 주세요."
    };
  }

  return {
    ok: true,
    preferences: {
      visibleCards: [...parsed.data.visibleCards],
      refreshInterval: parsed.data.refreshInterval
    }
  };
}
