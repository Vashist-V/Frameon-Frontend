import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const ADULT_CERTIFICATIONS = new Set(["R", "NC-17", "18+", "16+", "TV-MA", "TV-14", "A"]);

const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  ko: "Korean",
  ja: "Japanese",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  ar: "Arabic",
  ru: "Russian",
  tr: "Turkish",
  th: "Thai",
};

type TmdbItem = {
  id: number;
  media_type?: string;
  title?: string;
  adult?: boolean;
  certification?: string;
  [key: string]: unknown;
};

type CertificationEntry = {
  iso_3166_1?: string;
  rating?: string;
  release_dates?: { certification?: string; rating?: string }[];
};

function headers() {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) {
    throw new Error("TMDB_READ_ACCESS_TOKEN is not configured");
  }

  return {
    Authorization: `Bearer ${token}`,
    accept: "application/json",
  };
}

async function tmdb(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(`${TMDB_BASE}/${path}`);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, { headers: headers() });
  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  return response.json();
}

function preferredCertification(entries: CertificationEntry[], key: "release_dates" | null = "release_dates") {
  const extract = (entry: CertificationEntry) => {
    if (entry.rating) return entry.rating;
    if (!key) return "";
    for (const release of entry[key] ?? []) {
      const cert = release.certification || release.rating;
      if (cert) return cert;
    }
    return "";
  };

  for (const country of ["US", "IN", "GB", "CA"]) {
    for (const entry of entries) {
      if (entry.iso_3166_1 !== country) continue;
      const cert = extract(entry);
      if (cert) return cert;
    }
  }

  for (const entry of entries) {
    const cert = extract(entry);
    if (cert) return cert;
  }
  return "";
}

function isChildSafe(result: TmdbItem) {
  if (result.adult) return false;
  return !ADULT_CERTIFICATIONS.has(result.certification || "");
}

async function attachCertification(result: TmdbItem) {
  const copy = { ...result };
  const mediaType = copy.media_type || ("title" in copy ? "movie" : "tv");

  try {
    if (mediaType === "movie") {
      const data = await tmdb(`movie/${copy.id}/release_dates`);
      copy.certification = preferredCertification(data.results ?? []);
    } else {
      const data = await tmdb(`tv/${copy.id}/content_ratings`);
      copy.certification = preferredCertification(data.results ?? [], null);
    }
  } catch {
    return copy;
  }

  return copy;
}

async function filterChildSafe(results: TmdbItem[]) {
  const enriched = await Promise.all(results.map(attachCertification));
  return enriched.filter(isChildSafe);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const childMode = searchParams.get("child_mode") === "true";
    const [resource, subtype, id] = path;

    if (resource === "languages") {
      return NextResponse.json(SUPPORTED_LANGUAGES);
    }

    if (resource === "trending") {
      const mediaType = searchParams.get("media_type") || "all";
      const timeWindow = searchParams.get("time_window") || "week";
      const data = await tmdb(`trending/${mediaType}/${timeWindow}`);
      const results = childMode ? await filterChildSafe(data.results ?? []) : data.results ?? [];
      return NextResponse.json(results);
    }

    if (resource === "popular") {
      const mediaType = searchParams.get("media_type") || "movie";
      const page = searchParams.get("page") || "1";
      const data = await tmdb(`${mediaType}/popular`, { page });
      const results = childMode ? await filterChildSafe(data.results ?? []) : data.results ?? [];
      return NextResponse.json({ results, total_pages: data.total_pages ?? 1 });
    }

    if (resource === "search") {
      const query = searchParams.get("q");
      if (!query) return NextResponse.json({ error: "Missing q" }, { status: 400 });

      const data = await tmdb("search/multi", {
        query,
        page: searchParams.get("page") || "1",
        include_adult: "false",
      });
      let results = ((data.results ?? []) as TmdbItem[]).filter((item) => ["movie", "tv"].includes(item.media_type ?? ""));
      if (childMode) results = await filterChildSafe(results);
      return NextResponse.json({ results, total_pages: data.total_pages ?? 1, page: data.page ?? 1 });
    }

    if (resource === "details" && subtype === "movie" && id) {
      const data = await tmdb(`movie/${id}`, {
        append_to_response: "external_ids,credits,similar,videos,release_dates",
      });
      return NextResponse.json(data);
    }

    if (resource === "details" && subtype === "tv" && id) {
      const data = await tmdb(`tv/${id}`, {
        append_to_response: "external_ids,credits,similar,videos,content_ratings",
      });
      return NextResponse.json(data);
    }

    if (resource === "season" && subtype && id) {
      const data = await tmdb(`tv/${subtype}/season/${id}`);
      return NextResponse.json(data);
    }

    if (resource === "by-language") {
      const lang = searchParams.get("lang");
      if (!lang) return NextResponse.json({ error: "Missing lang" }, { status: 400 });

      const mediaType = searchParams.get("media_type") || "movie";
      const endpoint = mediaType === "movie" ? "discover/movie" : "discover/tv";
      const data = await tmdb(endpoint, {
        with_original_language: lang,
        sort_by: "popularity.desc",
        page: searchParams.get("page") || "1",
        include_adult: "false",
        certification_country: childMode ? "US" : undefined,
        "certification.lte": childMode ? (mediaType === "movie" ? "PG-13" : "TV-PG") : undefined,
      });
      const results = childMode ? await filterChildSafe(data.results ?? []) : data.results ?? [];
      return NextResponse.json({ results, total_pages: data.total_pages ?? 1 });
    }

    if (resource === "genres") {
      const mediaType = searchParams.get("media_type") || "movie";
      const data = await tmdb(`genre/${mediaType}/list`);
      return NextResponse.json(data.genres ?? []);
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
