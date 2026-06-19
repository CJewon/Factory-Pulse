import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveAlarmAction } from "./actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn()
}));

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn()
}));

const mockedCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);
const mockedRevalidatePath = jest.mocked(revalidatePath);
const alarmId = "00000000-0000-4000-8000-000000000001";

type MockOptions = {
  user?: { id: string } | null;
  userError?: { message: string } | null;
  existingAlarm?: { id: string; machine_id: string; is_resolved: boolean } | null;
  existingError?: { message: string } | null;
  updateData?: { id: string } | null;
  updateError?: { message: string } | null;
};

describe("resolveAlarmAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("빈 alarmId는 Supabase 호출 없이 거절한다", async () => {
    const result = await resolveAlarmAction("   ");

    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_INPUT"
    });
    expect(mockedCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("UUID가 아닌 alarmId는 Supabase 호출 없이 거절한다", async () => {
    const result = await resolveAlarmAction("alarm-1");

    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_INPUT"
    });
    expect(mockedCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("로그인 세션이 없으면 알람 확인을 거절한다", async () => {
    const { client, spies } = createSupabaseMock({ user: null });
    mockedCreateSupabaseServerClient.mockResolvedValue(client);

    const result = await resolveAlarmAction(alarmId);

    expect(result).toMatchObject({
      ok: false,
      code: "UNAUTHENTICATED",
      message: "로그인 후 알람을 확인할 수 있습니다."
    });
    expect(spies.from).not.toHaveBeenCalled();
  });

  it("이미 해결된 알람은 업데이트하지 않는다", async () => {
    const { client, spies } = createSupabaseMock({
      existingAlarm: { id: "alarm-1", machine_id: "machine-1", is_resolved: true }
    });
    mockedCreateSupabaseServerClient.mockResolvedValue(client);

    const result = await resolveAlarmAction(alarmId);

    expect(result).toMatchObject({
      ok: false,
      code: "ALREADY_RESOLVED"
    });
    expect(spies.update).not.toHaveBeenCalled();
  });

  it("미해결 알람을 resolved로 업데이트하고 관련 경로를 재검증한다", async () => {
    const { client, spies } = createSupabaseMock();
    mockedCreateSupabaseServerClient.mockResolvedValue(client);

    const result = await resolveAlarmAction(alarmId);

    expect(result).toMatchObject({
      ok: true,
      alarmId
    });
    expect(spies.update).toHaveBeenCalledWith({
      is_resolved: true,
      resolved_at: expect.any(String),
      resolved_by: "user-1"
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/alarms");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/machines/machine-1");
  });

  it("업데이트 실패 시 기존 상태 유지를 안내한다", async () => {
    const { client } = createSupabaseMock({
      updateData: null,
      updateError: { message: "RLS denied" }
    });
    mockedCreateSupabaseServerClient.mockResolvedValue(client);

    const result = await resolveAlarmAction(alarmId);

    expect(result).toMatchObject({
      ok: false,
      code: "UPDATE_FAILED"
    });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});

function createSupabaseMock({
  user = { id: "user-1" },
  userError = null,
  existingAlarm = { id: alarmId, machine_id: "machine-1", is_resolved: false },
  existingError = null,
  updateData = { id: alarmId },
  updateError = null
}: MockOptions = {}) {
  const getUser = jest.fn().mockResolvedValue({
    data: { user },
    error: userError
  });

  const selectMaybeSingle = jest.fn().mockResolvedValue({
    data: existingAlarm,
    error: existingError
  });
  const updateMaybeSingle = jest.fn().mockResolvedValue({
    data: updateData,
    error: updateError
  });

  const selectEq = jest.fn(() => ({ maybeSingle: selectMaybeSingle }));
  const select = jest.fn(() => ({ eq: selectEq }));
  const updateSelect = jest.fn(() => ({ maybeSingle: updateMaybeSingle }));
  const secondUpdateEq = jest.fn(() => ({ select: updateSelect }));
  const firstUpdateEq = jest.fn(() => ({ eq: secondUpdateEq }));
  const update = jest.fn(() => ({ eq: firstUpdateEq }));
  const from = jest.fn().mockReturnValueOnce({ select }).mockReturnValueOnce({ update });

  const client = {
    auth: { getUser },
    from
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

  return {
    client,
    spies: {
      from,
      getUser,
      select,
      selectEq,
      update,
      firstUpdateEq,
      secondUpdateEq,
      updateSelect
    }
  };
}
