import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.hostname === "www.clinicaireply.com") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.hostname = "clinicaireply.com";
    return NextResponse.redirect(redirectUrl, 308);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
