import { NextResponse } from "next/server";
import { requireFirmUser } from "@/lib/auth";
import { markNotificationsSeen } from "@/lib/notifications";

export async function POST() {
  const user = await requireFirmUser();
  await markNotificationsSeen(user.id, user.firmId);
  return NextResponse.json({ ok: true });
}
