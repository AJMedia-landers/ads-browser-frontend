import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/signup"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (publicPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Check for auth token
    const token = request.cookies.get("token")?.value;

    if (!token) {
        // Redirect to login for page requests
        if (!pathname.startsWith("/api/")) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
        // Return 401 for API requests
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Match all paths except static files and _next
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
