import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loggedApiError } from "@/lib/error-logging";
import { postLoginDestination } from "@/lib/security-policy";

async function handleGET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const destination = postLoginDestination(user);
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      firmId: user.firmId,
      firmStatus: user.firm?.status ?? null
    },
    destination
  });
}

export async function GET(request: Request) {
  try {
    return await handleGET(request);
  } catch (error) {
    return loggedApiError(error, request);
  }
}
