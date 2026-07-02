import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

type TokenRequest = {
    room?: string;
    identity?: string;
    name?: string;
    role?: "host" | "guest";
};

function cleanRoom(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 96);
}

function cleanIdentity(value: string) {
    return value.replace(/[^a-zA-Z0-9_.@-]/g, "-").slice(0, 96);
}

export async function POST(request: NextRequest) {
    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !apiKey || !apiSecret) {
        return NextResponse.json({ error: "LiveKit is not configured" }, { status: 500 });
    }

    let body: TokenRequest;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const room = cleanRoom(body.room || "");
    const identity = cleanIdentity(body.identity || "");
    const name = (body.name || "Guest").trim().slice(0, 80) || "Guest";

    if (!room || !identity) {
        return NextResponse.json({ error: "Missing room or identity" }, { status: 400 });
    }

    const token = new AccessToken(apiKey, apiSecret, {
        identity,
        name,
        ttl: "6h",
        metadata: JSON.stringify({ role: body.role === "host" ? "host" : "guest" }),
    });

    token.addGrant({
        room,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
    });

    return NextResponse.json({
        token: await token.toJwt(),
        url: livekitUrl,
        room,
    });
}
