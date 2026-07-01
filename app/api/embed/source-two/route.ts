import { NextRequest, NextResponse } from "next/server";

const SOURCE_TWO_ORIGIN = "https://www.2embed.cc";

function positiveInt(value: string | null) {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildSourceUrl(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const type = params.get("type");
    const id = params.get("id");

    if ((type !== "movie" && type !== "tv") || !id || !/^\d+$/.test(id)) {
        return null;
    }

    if (type === "movie") return `${SOURCE_TWO_ORIGIN}/embed/${id}`;

    const season = positiveInt(params.get("season"));
    const episode = positiveInt(params.get("episode"));
    if (!season || !episode) return null;

    return `${SOURCE_TWO_ORIGIN}/embedtv/${id}&s=${season}&e=${episode}`;
}

function removeBetween(html: string, startPattern: RegExp, endPattern: RegExp) {
    const start = html.search(startPattern);
    if (start === -1) return html;

    const rest = html.slice(start);
    const end = rest.search(endPattern);
    if (end === -1) return html;

    return `${html.slice(0, start)}${html.slice(start + end)}`;
}

function disableSandboxWarning(html: string) {
    const start = html.indexOf("function isReallySandboxed()");
    if (start === -1) return html;

    const nextScriptBlock = html.indexOf("(function(){", start);
    const startPlayer = html.indexOf("function startPlayer", start);
    const end = [nextScriptBlock, startPlayer].filter((index) => index > start).sort((a, b) => a - b)[0];
    if (!end) return html;

    return `${html.slice(0, start)}function isReallySandboxed() { return false; }\n\n${html.slice(end)}`;
}

function cleanSourceHtml(html: string) {
    let cleaned = html.replace(/<head([^>]*)>/i, `<head$1>\n<base href="${SOURCE_TWO_ORIGIN}/">\n`);
    cleaned = cleaned.replace(/<script\b[^>]*disable-devtool-auto[^>]*><\/script>/i, "");

    // Source 2 puts server/share/download actions in the outer embed HTML.
    cleaned = removeBetween(cleaned, /<div\s+class=["']dropdown["'][\s\S]*?>/i, /<div\s+id=["']content["']/i);
    cleaned = removeBetween(
        cleaned,
        /<div\s+style=["'][^"']*top:\s*90px;left:\s*10px;[^"']*["']\s+title=["']Embed Video["']>/i,
        /<div\s+style=["'][^"']*top:\s*150px;left:\s*5px;[^"']*["']\s+title=["']Download Video["']>/i
    );
    cleaned = removeBetween(
        cleaned,
        /<div\s+style=["'][^"']*top:\s*150px;left:\s*5px;[^"']*["']\s+title=["']Download Video["']>/i,
        /<div\s+id=["']bgImage["']/i
    );

    cleaned = cleaned.replace(/\$\(["']\.dropdown["']\)\.show\(\);?/g, "");
    cleaned = cleaned.replace(/\sonclick=["']bgImage\(\);?["']/i, "");
    return disableSandboxWarning(cleaned);
}

export async function GET(request: NextRequest) {
    const sourceUrl = buildSourceUrl(request);
    if (!sourceUrl) {
        return NextResponse.json({ error: "Invalid source parameters" }, { status: 400 });
    }

    try {
        const response = await fetch(sourceUrl, {
            headers: {
                accept: "text/html,application/xhtml+xml",
                "user-agent": "Mozilla/5.0 Frameon Embed Cleaner",
            },
            next: { revalidate: 60 * 60 * 6 },
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Source unavailable" }, { status: response.status });
        }

        return new NextResponse(cleanSourceHtml(await response.text()), {
            headers: {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "public, s-maxage=21600, stale-while-revalidate=86400",
                "x-robots-tag": "noindex, nofollow",
            },
        });
    } catch {
        return NextResponse.json({ error: "Source unavailable" }, { status: 502 });
    }
}
