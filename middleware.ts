import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySession } from "./lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/items/new",
    "/admin/:path*",
    "/api/items",
    "/api/items/mine",
    "/api/swaps/:path*",
    "/api/admin/:path*",
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const isAdminApiRoute =
    pathname.startsWith("/api/admin") && pathname !== "/api/admin/login";
  const isAdminPageRoute =
    pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isItemsWriteApi = pathname === "/api/items" && request.method === "POST";
  const isItemsMineApi = pathname === "/api/items/mine";
  const isSwapsApi = pathname.startsWith("/api/swaps");
  const isProtectedPageRoute =
    pathname.startsWith("/dashboard") || pathname === "/items/new";

  if (isAdminApiRoute) {
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (isAdminPageRoute) {
    if (!session || session.role !== "admin") {
      const url = new URL("/admin/login", request.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isItemsWriteApi || isItemsMineApi || isSwapsApi) {
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isProtectedPageRoute) {
    if (!session) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}
