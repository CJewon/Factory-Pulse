import { getLiveAlarmSnapshot } from "@/lib/alarms/live-queries";
import { parseLiveAlarmSearchParams } from "@/lib/alarms/live";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const filters = parseLiveAlarmSearchParams(new URL(request.url).searchParams);

  try {
    const snapshot = await getLiveAlarmSnapshot(filters);

    return Response.json(snapshot, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return Response.json(
      {
        message: "실시간 알람 스냅샷을 불러오지 못했습니다."
      },
      {
        headers: {
          "Cache-Control": "no-store"
        },
        status: 500
      }
    );
  }
}
