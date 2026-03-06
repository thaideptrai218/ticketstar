import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "../_proxy-helpers";
import { decodeUser } from "@/lib/auth/auth-token-manager";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  const user = decodeUser(token);
  if (!user) {
    return NextResponse.json({ success: false, error: "Invalid or expired token" }, { status: 401 });
  }

  return NextResponse.json({ success: true, data: user });
}
