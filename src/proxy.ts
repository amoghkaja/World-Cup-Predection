import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 "proxy" convention (formerly middleware). Refreshes the Supabase
// session cookie and redirects unauthenticated users to /login.
export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Skip API routes (they auth themselves), Next internals and every static
  // asset — running auth on those wastes 10s of ms per request on mobile.
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|xml|json|map)$).*)",
  ],
};
