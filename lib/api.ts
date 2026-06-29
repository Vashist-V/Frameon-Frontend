import { createClient } from "./supabase";

type WatchHistoryRow = {
    tmdb_id: number;
    season: number | null;
    episode: number | null;
    watched_at: string | null;
    [key: string]: unknown;
};

export type MediaItem = {
    id: number;
    title?: string;
    name?: string;
    media_type?: string;
    poster_path?: string;
    backdrop_path?: string;
    overview?: string;
    release_date?: string;
    first_air_date?: string;
    vote_average?: number;
    [key: string]: unknown;
};

export type SeasonSummary = {
    id: number;
    name?: string;
    season_number: number;
    episode_count: number;
    air_date?: string | null;
    poster_path?: string | null;
    overview?: string;
};

export type EpisodeSummary = {
    id: number;
    name?: string;
    overview?: string;
    air_date?: string | null;
    episode_number: number;
    season_number: number;
    runtime?: number | null;
    still_path?: string | null;
    vote_average?: number;
};

export type TVSeasonDetails = {
    id: number;
    name?: string;
    season_number: number;
    episodes?: EpisodeSummary[];
};

export type MediaDetails = MediaItem & {
    imdb_id?: string;
    runtime?: number;
    episode_run_time?: number[];
    number_of_seasons?: number;
    number_of_episodes?: number;
    seasons?: SeasonSummary[];
    external_ids?: {
        imdb_id?: string | null;
        [key: string]: unknown;
    };
    credits?: {
        cast?: {
            id: number;
            name: string;
            profile_path?: string | null;
        }[];
    };
    genres?: {
        id: number;
        name: string;
    }[];
    similar?: {
        results?: MediaItem[];
    };
};

type MediaListResponse = {
    results: MediaItem[];
    total_pages?: number;
    page?: number;
};

type ChatResponse = {
    response: string;
};

type SuggestionsResponse = {
    suggestions: { title: string; type: string; reason: string }[];
};

const apiGet = async <T = unknown>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
};

const apiPost = async <T = unknown>(url: string, body: unknown): Promise<T> => {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
};

const getCurrentUserId = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error("Unauthorized");
    return data.user.id;
};

// ── Movies ──────────────────────────────────────────────────
export const getTrending = (mediaType = "all", childMode = false) =>
    apiGet<MediaItem[]>(`/api/movies/trending?media_type=${encodeURIComponent(mediaType)}&child_mode=${childMode}`);

export const getPopular = (mediaType = "movie", page = 1, childMode = false) =>
    apiGet<MediaListResponse>(`/api/movies/popular?media_type=${encodeURIComponent(mediaType)}&page=${page}&child_mode=${childMode}`);

export const searchMovies = (q: string, page = 1, childMode = false) =>
    apiGet<MediaListResponse>(`/api/movies/search?q=${encodeURIComponent(q)}&page=${page}&child_mode=${childMode}`);

export const getMovieDetails = (id: number) =>
    apiGet<MediaDetails>(`/api/movies/details/movie/${id}`);

export const getTVDetails = (id: number) =>
    apiGet<MediaDetails>(`/api/movies/details/tv/${id}`);

export const getTVSeasonDetails = (id: number, season: number) =>
    apiGet<TVSeasonDetails>(`/api/movies/season/${id}/${season}`);

export const getLanguages = () =>
    apiGet<Record<string, string>>(`/api/movies/languages`);

export const getByLanguage = (lang: string, mediaType = "movie", page = 1, childMode = false) =>
    apiGet<MediaListResponse>(`/api/movies/by-language?lang=${encodeURIComponent(lang)}&media_type=${encodeURIComponent(mediaType)}&page=${page}&child_mode=${childMode}`);

// ── User ──────────────────────────────────────────────────────
export const getProfile = async () => {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) throw error;
    return data;
};

export const getWatchHistory = async (limit = 50) => {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
        .from("watch_history")
        .select("*")
        .eq("user_id", userId)
        .order("watched_at", { ascending: false })
        .limit(limit * 3);

    if (error) throw error;

    const seen = new Set<string>();
    const deduped: WatchHistoryRow[] = [];
    for (const row of (data || []) as WatchHistoryRow[]) {
        const key = `${row.tmdb_id}:${row.season ?? ""}:${row.episode ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(row);
        if (deduped.length >= limit) break;
    }

    return deduped;
};

export const logWatch = (entry: {
    tmdb_id: number;
    imdb_id?: string;
    title: string;
    type: string;
    poster_path?: string;
    season?: number;
    episode?: number;
}) => (async () => {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data: existing } = await supabase
        .from("watch_history")
        .select("id, watched_at, season, episode")
        .eq("user_id", userId)
        .eq("tmdb_id", entry.tmdb_id)
        .order("watched_at", { ascending: false })
        .limit(1);

    const previous = existing?.[0];
    const sameEpisode = previous?.season === (entry.season ?? null) && previous?.episode === (entry.episode ?? null);
    const watchedAt = previous?.watched_at ? new Date(previous.watched_at).getTime() : 0;
    if (previous && sameEpisode && Date.now() - watchedAt <= 10 * 60 * 1000) {
        return { success: true, data: [], note: "duplicate skipped" };
    }

    const { data, error } = await supabase
        .from("watch_history")
        .insert({
            user_id: userId,
            tmdb_id: entry.tmdb_id,
            imdb_id: entry.imdb_id,
            title: entry.title,
            type: entry.type,
            poster_path: entry.poster_path,
            season: entry.season,
            episode: entry.episode,
        })
        .select();

    if (error) throw error;
    return { success: true, data };
})();

export const updateChildMode = async (childMode: boolean) => {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { error } = await supabase.from("profiles").upsert({ id: userId, child_mode: childMode });
    if (error) throw error;
    return { success: true, child_mode: childMode };
};

export const getWatchlist = async () => {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .eq("user_id", userId)
        .order("added_at", { ascending: false });
    if (error) throw error;
    return data || [];
};

export const addToWatchlist = async (entry: { tmdb_id: number; title: string; type: string; poster_path?: string }) => {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { error } = await supabase
        .from("watchlist")
        .upsert({ ...entry, user_id: userId }, { onConflict: "user_id,tmdb_id" });
    if (error) throw error;
    return { success: true };
};

export const removeFromWatchlist = async (tmdbId: number) => {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { error } = await supabase.from("watchlist").delete().eq("user_id", userId).eq("tmdb_id", tmdbId);
    if (error) throw error;
    return { success: true };
};

// ── AI ────────────────────────────────────────────────────────
export const chatWithAI = (message: string, conversation_history: { role: string; content: string }[] = []) =>
    apiPost<ChatResponse>(`/api/ai/chat`, { message, conversation_history });

export const getAISuggestions = (userId: string, childMode = false) =>
    apiPost<SuggestionsResponse>(`/api/ai/suggestions`, { user_id: userId, child_mode: childMode });

export const TMDB_IMAGE = (path: string, size = "w500") =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : "/placeholder.png";
