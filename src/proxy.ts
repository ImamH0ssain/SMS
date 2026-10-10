import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if ((request.nextUrl.pathname.startsWith("/staff") || request.nextUrl.pathname.startsWith("/student")) && !request.cookies.get("sms_demo_session")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/staff/:path*", "/student/:path*"] };
