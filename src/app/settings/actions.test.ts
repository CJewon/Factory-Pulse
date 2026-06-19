import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveDashboardPreferencesAction } from "./actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn()
}));

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn()
}));

const mockedCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);
const mockedRevalidatePath = jest.mocked(revalidatePath);

type MockOptions = {
  user?: { id: string; email?: string } | null;
  userError?: { message: string } | null;
  upsertData?: {
    visible_cards: string[];
    refresh_interval: number;
    updated_at: string;
  } | null;
  upsertError?: { message: string } | null;
};

describe("saveDashboardPreferencesAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("잘못된 카드 선택은 Supabase 호출 없이 거절한다", async () => {
    const result = await saveDashboardPreferencesAction({
      visibleCards: [],
      refreshInterval: 30
    });

    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_INPUT",
      field: "visibleCards"
    });
    expect(mockedCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("허용되지 않은 갱신 주기는 Supabase 호출 없이 거절한다", async () => {
    const result = await saveDashboardPreferencesAction({
      visibleCards: ["summary"],
      refreshInterval: 3
    });

    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_INPUT",
      field: "refreshInterval"
    });
    expect(mockedCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("로그인 세션이 없으면 저장하지 않는다", async () => {
    const { client, spies } = createSupabaseMock({ user: null });
    mockedCreateSupabaseServerClient.mockResolvedValue(client);

    const result = await saveDashboardPreferencesAction({
      visibleCards: ["summary"],
      refreshInterval: 30
    });

    expect(result).toMatchObject({
      ok: false,
      code: "UNAUTHENTICATED"
    });
    expect(spies.from).not.toHaveBeenCalled();
  });

  it("로그인 사용자의 설정을 upsert하고 대시보드를 재검증한다", async () => {
    const { client, spies } = createSupabaseMock();
    mockedCreateSupabaseServerClient.mockResolvedValue(client);

    const result = await saveDashboardPreferencesAction({
      visibleCards: ["summary", "recentAlarms"],
      refreshInterval: 60
    });

    expect(result).toMatchObject({
      ok: true,
      preferences: {
        visibleCards: ["summary", "recentAlarms"],
        refreshInterval: 60
      }
    });
    expect(spies.from).toHaveBeenCalledWith("dashboard_preferences");
    expect(spies.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        visible_cards: ["summary", "recentAlarms"],
        refresh_interval: 60,
        updated_at: expect.any(String)
      }),
      { onConflict: "user_id" }
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/settings");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("Supabase 저장 실패 시 사용자에게 재시도를 안내한다", async () => {
    const { client } = createSupabaseMock({
      upsertData: null,
      upsertError: { message: "RLS denied" }
    });
    mockedCreateSupabaseServerClient.mockResolvedValue(client);

    const result = await saveDashboardPreferencesAction({
      visibleCards: ["summary"],
      refreshInterval: 30
    });

    expect(result).toMatchObject({
      ok: false,
      code: "SAVE_FAILED"
    });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});

function createSupabaseMock({
  user = { id: "user-1", email: "operator@example.com" },
  userError = null,
  upsertData = {
    visible_cards: ["summary", "recentAlarms"],
    refresh_interval: 60,
    updated_at: "2026-06-19T00:00:00.000Z"
  },
  upsertError = null
}: MockOptions = {}) {
  const getUser = jest.fn().mockResolvedValue({
    data: { user },
    error: userError
  });

  const maybeSingle = jest.fn().mockResolvedValue({
    data: upsertData,
    error: upsertError
  });
  const select = jest.fn(() => ({ maybeSingle }));
  const upsert = jest.fn(() => ({ select }));
  const from = jest.fn(() => ({ upsert }));

  const client = {
    auth: { getUser },
    from
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

  return {
    client,
    spies: {
      from,
      getUser,
      maybeSingle,
      select,
      upsert
    }
  };
}
