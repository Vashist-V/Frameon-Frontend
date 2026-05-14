import axios from "axios";
import { createClient } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: API_URL });

// Attach Supabase JWT to every request automatically
api.interceptors.request.use(async (config) => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
        config.headers.Authorization = `Bearer ${data.session.access_token}`;
    }
    return config;
});

// ── Movies ──────────────────────────────────────────────────
export const getTrending = (mediaType = "all", childMode = false) =>
    api.get(`/movies/trending`, { params: { media_type: mediaType, child_mode: childMode } }).then((r) => r.data);

export const getPopular = (mediaType = "movie", page = 1, childMode = false) =>
    api.get(`/movies/popular`, { params: { media_type: mediaType, page, child_mode: childMode } }).then((r) => r.data);

export const searchMovies = (q: string, page = 1, childMode = false) =>
    api.get(`/movies/search`, { params: { q, page, child_mode: childMode } }).then((r) => r.data);

export const getMovieDetails = (id: number) =>
    api.get(`/movies/details/movie/${id}`).then((r) => r.data);

export const getTVDetails = (id: number) =>
    api.get(`/movies/details/tv/${id}`).then((r) => r.data);

export const getLanguages = () =>
    api.get(`/movies/languages`).then((r) => r.data);

export const getByLanguage = (lang: string, mediaType = "movie", page = 1, childMode = false) =>
    api.get(`/movies/by-language`, { params: { lang, media_type: mediaType, page, child_mode: childMode } }).then((r) => r.data);

// ── User ──────────────────────────────────────────────────────
export const getProfile = () =>
    api.get(`/user/profile`).then((r) => r.data);

export const getWatchHistory = () =>
    api.get(`/user/watch-history`).then((r) => r.data);

export const logWatch = (entry: {
    tmdb_id: number;
    imdb_id?: string;
    title: string;
    type: string;
    poster_path?: string;
    season?: number;
    episode?: number;
}) => api.post(`/user/watch-history`, entry).then((r) => r.data);

export const updateChildMode = (childMode: boolean) =>
    api.patch(`/user/child-mode`, { child_mode: childMode }).then((r) => r.data);

export const getWatchlist = () =>
    api.get(`/user/watchlist`).then((r) => r.data);

export const addToWatchlist = (entry: { tmdb_id: number; title: string; type: string; poster_path?: string }) =>
    api.post(`/user/watchlist`, entry).then((r) => r.data);

export const removeFromWatchlist = (tmdbId: number) =>
    api.delete(`/user/watchlist/${tmdbId}`).then((r) => r.data);

// ── AI ────────────────────────────────────────────────────────
export const chatWithAI = (message: string, conversation_history: { role: string; content: string }[] = []) =>
    api.post(`/ai/chat`, { message, conversation_history }).then((r) => r.data);

export const getAISuggestions = (userId: string, childMode = false) =>
    api.post(`/ai/suggestions`, { user_id: userId, child_mode: childMode }).then((r) => r.data);

export const TMDB_IMAGE = (path: string, size = "w500") =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : "/placeholder.png";
