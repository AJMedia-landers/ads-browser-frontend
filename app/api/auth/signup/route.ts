import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API = process.env.API_BASE_URL!;

export async function POST(req: NextRequest) {
    const body = await req.json();

    const res = await fetch(`${API}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.success && data.data?.token) {
        const cookieStore = await cookies();
        cookieStore.set("token", data.data.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
        });
    }

    return NextResponse.json(data, { status: res.status });
}
