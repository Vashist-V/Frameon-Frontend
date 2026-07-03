"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    addToWatchlist,
    getMovieDetails,
    getTVDetails,
    getTVSeasonDetails,
    getWatchlist,
    logWatch,
    removeFromWatchlist,
    TMDB_IMAGE,
    type EpisodeSummary,
    type MediaDetails,
    type SeasonSummary,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import WatchParty, { type WatchMediaState } from "@/components/WatchParty";
import WatchSyncBridge from "@/components/WatchSyncBridge";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft,
    BookmarkPlus,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Maximize,
    Minimize,
    Play,
    RefreshCw,
    Star,
    Tv,
    Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";

interface Params {
    type: string;
    id: string;
}

type EmbedSource = {
    label: string;
    id: string;
    recommended?: boolean;
};

type EmbedLoadState = "idle" | "loading" | "loaded" | "slow" | "failed";

type FullscreenElement = HTMLDivElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
};

const DEFAULT_SOURCE_ID = "2embed.cc";
const EMBED_LOAD_SLOW_MS = 10000;

const EMBED_SOURCES: EmbedSource[] = [
    { label: "Source 2", id: "2embed.cc", recommended: true },
    { label: "Source 1", id: "vidsrc.me" },
    { label: "Source 3", id: "multiembed" },
    { label: "Source 4", id: "smashystream" },
    { label: "Source 5", id: "nontongo" },
];

function buildEmbedUrl(source: string, type: string, tmdbId: string, season: number, episode: number) {
    if (type === "movie") {
        switch (source) {
            case "2embed.cc":
                return `https://streamsrcs.2embed.cc/vnest?tmdb=${tmdbId}`;
            case "vidsrc.me":
                return `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`;
            case "multiembed":
                return `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`;
            case "smashystream":
                return `https://player.smashystream.com/movie/${tmdbId}`;
            case "nontongo":
                return `https://www.nontongo.win/embed/movie/${tmdbId}`;
            default:
                return `https://www.2embed.cc/embed/${tmdbId}`;
        }
    }

    switch (source) {
        case "2embed.cc":
            return `https://streamsrcs.2embed.cc/xps-tv?tmdb=${tmdbId}&s=${season}&e=${episode}`;
        case "vidsrc.me":
            return `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
        case "multiembed":
            return `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`;
        case "smashystream":
            return `https://player.smashystream.com/tv/${tmdbId}/${season}/${episode}`;
        case "nontongo":
            return `https://www.nontongo.win/embed/tv/${tmdbId}/${season}/${episode}`;
        default:
            return `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`;
    }
}

function positiveInt(value: string | null) {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readRequestedEpisode() {
    if (typeof window === "undefined") return { season: null, episode: null };
    const params = new URLSearchParams(window.location.search);
    return {
        season: positiveInt(params.get("s") ?? params.get("season")),
        episode: positiveInt(params.get("e") ?? params.get("episode")),
    };
}

function readWatchRoom() {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("watch");
}

function createWatchRoomId(type: string, id: string) {
    const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 8)
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    return `frameon-${type}-${id}-${suffix}`;
}

function getPlayableSeasons(details: MediaDetails | null) {
    const seasons = (details?.seasons ?? [])
        .filter((item): item is SeasonSummary => item.episode_count > 0 && Number.isFinite(item.season_number))
        .sort((a, b) => a.season_number - b.season_number);
    const regularSeasons = seasons.filter((item) => item.season_number > 0);
    return regularSeasons.length > 0 ? regularSeasons : seasons;
}

function fallbackEpisodes(season: number, count: number): EpisodeSummary[] {
    return Array.from({ length: Math.max(1, count) }, (_, index) => ({
        id: season * 1000 + index + 1,
        season_number: season,
        episode_number: index + 1,
        name: `Episode ${index + 1}`,
    }));
}

function formatSeasonLabel(season: SeasonSummary) {
    const title = season.season_number === 0 ? "Specials" : season.name || `Season ${season.season_number}`;
    const count = season.episode_count === 1 ? "1 episode" : `${season.episode_count} episodes`;
    return `${title} (${count})`;
}

function formatEpisodeLabel(episode: EpisodeSummary) {
    const title = episode.name && episode.name !== `Episode ${episode.episode_number}` ? ` - ${episode.name}` : "";
    return `Episode ${episode.episode_number}${title}`;
}

export default function PlayerPage({ params }: { params: Promise<Params> }) {
    const { type, id } = use(params);
    const mediaId = Number.parseInt(id, 10);
    const isTv = type === "tv";
    const { user } = useAppStore();

    const [details, setDetails] = useState<MediaDetails | null>(null);
    const [seasonDetails, setSeasonDetails] = useState<{ season: number; episodes: EpisodeSummary[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [seasonLoading, setSeasonLoading] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [season, setSeason] = useState(1);
    const [episode, setEpisode] = useState(1);
    const [activeSource, setActiveSource] = useState(DEFAULT_SOURCE_ID);
    const [embedLoadState, setEmbedLoadState] = useState<EmbedLoadState>("idle");
    const [reloadKey, setReloadKey] = useState(0);
    const [watchlistLoading, setWatchlistLoading] = useState(false);
    const [inWatchlist, setInWatchlist] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [watchPanelOpen, setWatchPanelOpen] = useState(false);
    const [watchRoomId, setWatchRoomId] = useState<string | null>(null);
    const [watchShareUrl, setWatchShareUrl] = useState("");
    const [watchIsHost, setWatchIsHost] = useState(false);
    const [watchSyncVersion, setWatchSyncVersion] = useState(0);
    const watchStageRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<HTMLDivElement>(null);
    const lastAppliedWatchSyncRef = useRef(0);

    const playableSeasons = useMemo(() => getPlayableSeasons(details), [details]);
    const selectedSeason = playableSeasons.find((item) => item.season_number === season) ?? playableSeasons[0];
    const episodeOptions = useMemo(() => {
        if (seasonDetails?.season === season && seasonDetails.episodes.length > 0) {
            return seasonDetails.episodes;
        }
        return fallbackEpisodes(season, selectedSeason?.episode_count ?? 1);
    }, [season, seasonDetails, selectedSeason?.episode_count]);
    const selectedEpisode = episodeOptions.find((item) => item.episode_number === episode) ?? episodeOptions[0];
    const activeSourceMeta = EMBED_SOURCES.find((source) => source.id === activeSource) ?? EMBED_SOURCES[0];

    const previousEpisode = useMemo(() => {
        if (!isTv || playableSeasons.length === 0 || episodeOptions.length === 0) return null;
        const currentEpisodeIndex = episodeOptions.findIndex((item) => item.episode_number === episode);
        if (currentEpisodeIndex > 0) {
            return { season, episode: episodeOptions[currentEpisodeIndex - 1].episode_number };
        }

        const currentSeasonIndex = playableSeasons.findIndex((item) => item.season_number === season);
        const previousSeason = currentSeasonIndex > 0 ? playableSeasons[currentSeasonIndex - 1] : null;
        if (!previousSeason) return null;
        return {
            season: previousSeason.season_number,
            episode: Math.max(1, previousSeason.episode_count),
        };
    }, [episode, episodeOptions, isTv, playableSeasons, season]);

    const nextEpisode = useMemo(() => {
        if (!isTv || playableSeasons.length === 0 || episodeOptions.length === 0) return null;
        const currentEpisodeIndex = episodeOptions.findIndex((item) => item.episode_number === episode);
        if (currentEpisodeIndex >= 0 && currentEpisodeIndex < episodeOptions.length - 1) {
            return { season, episode: episodeOptions[currentEpisodeIndex + 1].episode_number };
        }

        const currentSeasonIndex = playableSeasons.findIndex((item) => item.season_number === season);
        const nextSeason = currentSeasonIndex >= 0 ? playableSeasons[currentSeasonIndex + 1] : null;
        if (!nextSeason) return null;
        return { season: nextSeason.season_number, episode: 1 };
    }, [episode, episodeOptions, isTv, playableSeasons, season]);

    useEffect(() => {
        let mounted = true;

        const fetchDetails = async () => {
            setLoading(true);
            setDetails(null);
            setSeasonDetails(null);
            setPlaying(false);
            setEmbedLoadState("idle");

            try {
                if (!Number.isFinite(mediaId)) return;
                const data = isTv ? await getTVDetails(mediaId) : await getMovieDetails(mediaId);
                if (!mounted) return;

                setDetails(data);

                if (isTv) {
                    const seasons = getPlayableSeasons(data);
                    const requested = readRequestedEpisode();
                    const requestedSeason = seasons.find((item) => item.season_number === requested.season);
                    const initialSeason = requestedSeason ?? seasons[0];
                    const initialEpisodeCount = Math.max(1, initialSeason?.episode_count ?? 1);
                    setSeason(initialSeason?.season_number ?? 1);
                    setEpisode(Math.min(requested.episode ?? 1, initialEpisodeCount));
                } else {
                    setSeason(1);
                    setEpisode(1);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchDetails();
        return () => {
            mounted = false;
        };
    }, [isTv, mediaId]);

    useEffect(() => {
        if (!details || !isTv || !Number.isFinite(mediaId)) return;
        let mounted = true;

        const fetchSeason = async () => {
            setSeasonLoading(true);
            try {
                const data = await getTVSeasonDetails(mediaId, season);
                if (!mounted) return;
                const episodes = (data.episodes ?? [])
                    .filter((item) => item.episode_number > 0)
                    .sort((a, b) => a.episode_number - b.episode_number);

                setSeasonDetails({ season, episodes });
                if (episodes.length > 0) {
                    setEpisode((current) => (
                        episodes.some((item) => item.episode_number === current)
                            ? current
                            : episodes[0].episode_number
                    ));
                }
            } catch {
                if (mounted) setSeasonDetails(null);
            } finally {
                if (mounted) setSeasonLoading(false);
            }
        };

        fetchSeason();
        return () => {
            mounted = false;
        };
    }, [details, isTv, mediaId, season]);

    useEffect(() => {
        if (!details || !isTv) return;
        const url = new URL(window.location.href);
        url.searchParams.set("s", String(season));
        url.searchParams.set("e", String(episode));
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }, [details, episode, isTv, season]);

    useEffect(() => {
        const room = readWatchRoom();
        if (!room) return;

        const shareUrl = window.location.href;
        const timeout = window.setTimeout(() => {
            setWatchRoomId(room);
            setWatchPanelOpen(true);
            setWatchIsHost(false);
            setWatchShareUrl(shareUrl);
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [id, type]);

    useEffect(() => {
        if (!details) return;
        let mounted = true;

        const check = async () => {
            try {
                setWatchlistLoading(true);
                const list = await getWatchlist();
                if (!mounted) return;
                setInWatchlist(list?.some((item) => Number.parseInt(String(item.tmdb_id), 10) === mediaId));
            } catch {
                // The user may be signed out; watchlist state should not block playback.
            } finally {
                if (mounted) setWatchlistLoading(false);
            }
        };

        check();
        return () => {
            mounted = false;
        };
    }, [details, mediaId]);

    useEffect(() => {
        const onChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onChange);
        document.addEventListener("webkitfullscreenchange", onChange);
        return () => {
            document.removeEventListener("fullscreenchange", onChange);
            document.removeEventListener("webkitfullscreenchange", onChange);
        };
    }, []);

    useEffect(() => {
        if (!playing) return;

        const timeout = window.setTimeout(() => {
            setEmbedLoadState((state) => (state === "loading" ? "slow" : state));
        }, EMBED_LOAD_SLOW_MS);

        return () => window.clearTimeout(timeout);
    }, [activeSource, episode, playing, reloadKey, season]);

    const logCurrentWatch = useCallback(() => {
        if (!details) return;
        const title = details.title || details.name || "Untitled";
        const supabase = createClient();

        supabase.auth.getSession().then(({ data: session }) => {
            if (!session.session) return;
            logWatch({
                tmdb_id: mediaId,
                imdb_id: details.external_ids?.imdb_id || details.imdb_id,
                title,
                type,
                poster_path: details.poster_path,
                season: isTv ? season : undefined,
                episode: isTv ? episode : undefined,
            }).catch(() => { });
        }).catch(() => { });
    }, [details, episode, isTv, mediaId, season, type]);

    useEffect(() => {
        if (playing) logCurrentWatch();
    }, [logCurrentWatch, playing]);

    const markHostSync = useCallback(() => {
        if (!watchIsHost) return;
        setWatchSyncVersion((version) => version + 1);
    }, [watchIsHost]);

    const handleFullscreen = useCallback(() => {
        const el = (watchStageRef.current ?? playerRef.current) as FullscreenElement | null;
        if (!el) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
            return;
        }

        const requestFullscreen = el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.mozRequestFullScreen;
        requestFullscreen?.call(el);
    }, []);

    const handlePlay = useCallback(() => {
        setPlaying(true);
        setEmbedLoadState("loading");
        setReloadKey((key) => key + 1);
        markHostSync();
    }, [markHostSync]);

    const handlePause = useCallback(() => {
        setPlaying(false);
        setEmbedLoadState("idle");
        markHostSync();
    }, [markHostSync]);

    const selectSource = useCallback((sourceId: string) => {
        setActiveSource(sourceId);
        if (playing) {
            setEmbedLoadState("loading");
            setReloadKey((key) => key + 1);
        }
        markHostSync();
    }, [markHostSync, playing]);

    const rotateToNextSource = useCallback(() => {
        const index = EMBED_SOURCES.findIndex((source) => source.id === activeSource);
        const next = EMBED_SOURCES[(index + 1) % EMBED_SOURCES.length] ?? EMBED_SOURCES[0];
        setActiveSource(next.id);
        setPlaying(true);
        setEmbedLoadState("loading");
        setReloadKey((key) => key + 1);
        markHostSync();
    }, [activeSource, markHostSync]);

    const goToEpisode = useCallback((targetSeason: number, targetEpisode: number) => {
        setSeason(targetSeason);
        setEpisode(targetEpisode);
        if (playing) setEmbedLoadState("loading");
        markHostSync();
    }, [markHostSync, playing]);

    const handleSeasonChange = useCallback((targetSeason: number) => {
        setSeason(targetSeason);
        setEpisode(1);
        setSeasonDetails(null);
        if (playing) setEmbedLoadState("loading");
        markHostSync();
    }, [markHostSync, playing]);

    const buildWatchShareUrl = useCallback((room: string) => {
        const url = new URL(window.location.href);
        url.searchParams.set("watch", room);
        if (isTv) {
            url.searchParams.set("s", String(season));
            url.searchParams.set("e", String(episode));
        }
        return url;
    }, [episode, isTv, season]);

    const createWatchRoom = useCallback(() => {
        const nextRoom = watchRoomId || createWatchRoomId(type, id);
        const url = buildWatchShareUrl(nextRoom);

        setWatchRoomId(nextRoom);
        setWatchShareUrl(url.toString());
        setWatchPanelOpen(true);
        if (!watchRoomId) setWatchIsHost(true);
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

        return nextRoom;
    }, [buildWatchShareUrl, id, type, watchRoomId]);

    const endWatchRoom = useCallback(() => {
        setWatchPanelOpen(false);
        setWatchRoomId(null);
        setWatchShareUrl("");
        setWatchIsHost(false);

        const url = new URL(window.location.href);
        url.searchParams.delete("watch");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }, []);

    useEffect(() => {
        if (!watchRoomId) return;

        const timeout = window.setTimeout(() => {
            const url = buildWatchShareUrl(watchRoomId);
            setWatchShareUrl(url.toString());
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [buildWatchShareUrl, watchRoomId]);

    const applyWatchState = useCallback((state: WatchMediaState, options?: { startPlayback?: boolean }) => {
        if (state.type !== type || state.id !== id) {
            const url = new URL(`/player/${state.type}/${state.id}`, window.location.origin);
            if (watchRoomId) url.searchParams.set("watch", watchRoomId);
            if (state.type === "tv") {
                url.searchParams.set("s", String(state.season));
                url.searchParams.set("e", String(state.episode));
            }
            window.location.href = `${url.pathname}${url.search}`;
            return;
        }

        const incomingVersion = state.syncVersion || 0;
        const isNewSyncCommand = incomingVersion > lastAppliedWatchSyncRef.current;
        if (incomingVersion > 0 && incomingVersion < lastAppliedWatchSyncRef.current) return;
        if (isNewSyncCommand) lastAppliedWatchSyncRef.current = incomingVersion;

        let shouldReload = !!options?.startPlayback || (state.playing && (!playing || isNewSyncCommand));
        const shouldStop = !state.playing && (playing || isNewSyncCommand);

        if (EMBED_SOURCES.some((source) => source.id === state.source) && state.source !== activeSource) {
            setActiveSource(state.source);
            shouldReload = shouldReload || playing || state.playing;
        }

        if (isTv && state.season > 0 && state.episode > 0 && (state.season !== season || state.episode !== episode)) {
            setSeason(state.season);
            setEpisode(state.episode);
            setSeasonDetails(null);
            shouldReload = shouldReload || playing || state.playing;
        }

        if (shouldReload) {
            setPlaying(true);
            setEmbedLoadState("loading");
            setReloadKey((key) => key + 1);
        } else if (shouldStop) {
            setPlaying(false);
            setEmbedLoadState("idle");
        }
    }, [activeSource, episode, id, isTv, playing, season, type, watchRoomId]);

    const toggleWatchlist = async () => {
        if (watchlistLoading || !details || !Number.isFinite(mediaId)) return;

        try {
            setWatchlistLoading(true);
            if (inWatchlist) {
                await removeFromWatchlist(mediaId);
                setInWatchlist(false);
            } else {
                await addToWatchlist({
                    tmdb_id: mediaId,
                    title: details.title || details.name || "Untitled",
                    type,
                    poster_path: details.poster_path,
                });
                setInWatchlist(true);
            }
        } catch {
            // Ignore signed-out or network failures here; playback remains available.
        } finally {
            setWatchlistLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f]">
                <Navbar />
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="text-center">
                        <div className="w-10 h-10 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!details) {
        return (
            <div className="min-h-screen bg-[#0a0a0f]">
                <Navbar />
                <div className="flex items-center justify-center h-[60vh]">
                    <p className="text-gray-400">Content not found</p>
                </div>
            </div>
        );
    }

    const title = details.title || details.name || "Untitled";
    const year = (details.release_date || details.first_air_date || "").slice(0, 4);
    const runtimeValue = isTv ? selectedEpisode?.runtime || details.episode_run_time?.[0] : details.runtime;
    const runtime = runtimeValue ? `${runtimeValue} min` : null;
    const embedUrl = buildEmbedUrl(activeSource, type, id, season, episode);
    const iframeKey = `${activeSource}-${season}-${episode}-${reloadKey}`;
    const watchState: WatchMediaState = {
        type,
        id,
        title,
        source: activeSource,
        season,
        episode,
        playing,
        syncVersion: watchSyncVersion,
        updatedAt: 0,
    };
    const watchDefaultName = user?.display_name || user?.email?.split("@")[0] || "Guest";
    const showWatchPanel = watchPanelOpen && !!watchRoomId;
    const playerFrameClass = isFullscreen ? "relative w-full h-full min-h-0" : "relative w-full";
    const playerFrameStyle = isFullscreen ? undefined : { paddingBottom: "56.25%" };
    const watchStageClass = [
        "mb-6 min-h-0",
        showWatchPanel ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]" : "",
        isFullscreen ? "h-screen max-h-screen overflow-hidden bg-[#050507] p-3 xl:grid-cols-[minmax(0,1fr)_340px]" : "",
    ].filter(Boolean).join(" ");
    const playerShellClass = [
        "bg-black rounded-2xl overflow-hidden relative min-w-0",
        isFullscreen ? "h-full min-h-0 rounded-xl" : "",
    ].filter(Boolean).join(" ");

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-6">
                <button
                    onClick={() => history.back()}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-xs text-gray-500 mr-1">Source</span>
                    {EMBED_SOURCES.map((source) => (
                        <button
                            key={source.id}
                            onClick={() => selectSource(source.id)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                activeSource === source.id
                                    ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                                    : "border-[#2a2a3a] text-gray-400 hover:border-gray-500 hover:text-white"
                            }`}
                        >
                            {source.label}
                            {source.recommended && <span className="ml-1 text-[10px] opacity-80">Recommended</span>}
                        </button>
                    ))}
                    {playing && (
                        <button
                            onClick={handlePlay}
                            className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#2a2a3a] text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reload
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (!watchRoomId) {
                                createWatchRoom();
                            } else {
                                setWatchPanelOpen((open) => !open);
                            }
                        }}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            watchRoomId
                                ? "border-[#8b5cf6] bg-[#8b5cf6]/15 text-[#d7c3ff]"
                                : "border-[#2a2a3a] text-gray-300 hover:border-gray-500 hover:text-white"
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        Watch Along
                    </button>
                </div>

                {watchRoomId && (
                    <WatchSyncBridge
                        roomId={watchRoomId}
                        isHost={watchIsHost}
                        current={watchState}
                        onApplyState={applyWatchState}
                    />
                )}

                <div ref={watchStageRef} className={watchStageClass} data-testid="watch-stage">
                    <div ref={playerRef} className={playerShellClass} data-testid="player-shell">
                        {playing ? (
                            <div className={playerFrameClass} style={playerFrameStyle}>
                                <div className="absolute inset-0 bg-black">
                                    <iframe
                                        key={iframeKey}
                                        title={`${title} player`}
                                        src={embedUrl}
                                        className="absolute inset-0 w-full h-full"
                                        allowFullScreen={true}
                                        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                                        referrerPolicy="origin"
                                        onLoad={() => setEmbedLoadState("loaded")}
                                        onError={() => setEmbedLoadState("failed")}
                                        frameBorder="0"
                                    />
                                </div>

                                {embedLoadState !== "loaded" && (
                                    <div className="absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] rounded-lg border border-white/10 bg-black/75 px-3 py-2 text-xs text-white backdrop-blur-sm">
                                        {embedLoadState === "loading" && (
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 border border-white/70 border-t-transparent rounded-full animate-spin" />
                                                Loading {activeSourceMeta.label}...
                                            </div>
                                        )}

                                        {embedLoadState === "slow" && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span>{activeSourceMeta.label} is taking longer than usual.</span>
                                                <button onClick={handlePlay} className="text-[#d8c9ff] hover:text-white">Reload</button>
                                                <button onClick={rotateToNextSource} className="text-[#d8c9ff] hover:text-white">Try next</button>
                                            </div>
                                        )}

                                        {embedLoadState === "failed" && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span>{activeSourceMeta.label} failed to load.</span>
                                                <button onClick={rotateToNextSource} className="text-[#d8c9ff] hover:text-white">Try next</button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleFullscreen}
                                    className="player-fullscreen-control absolute bottom-3 right-3 z-10 bg-black/60 hover:bg-black/90 text-white p-2 rounded-lg backdrop-blur-sm transition-all opacity-60 hover:opacity-100"
                                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                                >
                                    {isFullscreen
                                        ? <Minimize className="w-4 h-4" />
                                        : <Maximize className="w-4 h-4" />
                                    }
                                </button>
                            </div>
                        ) : (
                            <div
                                className={`${playerFrameClass} cursor-pointer group`}
                                style={playerFrameStyle}
                                onClick={handlePlay}
                            >
                                {details.backdrop_path ? (
                                    <Image
                                        src={TMDB_IMAGE(details.backdrop_path, "original")}
                                        alt={title}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-[#1c1c28]" />
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                                    <div className="w-20 h-20 bg-[#8b5cf6] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl shadow-[#8b5cf6]/35">
                                        <Play className="w-9 h-9 text-white ml-1" fill="white" />
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 text-white text-sm font-medium bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                                    Play {isTv ? `S${season}:E${episode}` : title}
                                </div>
                            </div>
                        )}
                    </div>

                    {showWatchPanel && (
                        <WatchParty
                            roomId={watchRoomId}
                            shareUrl={watchShareUrl}
                            isHost={watchIsHost}
                            defaultName={watchDefaultName}
                            current={watchState}
                            sidebar
                            onCreateRoom={createWatchRoom}
                            onEndRoom={endWatchRoom}
                            onApplyState={applyWatchState}
                            onStartPlayback={handlePlay}
                            onPausePlayback={handlePause}
                        />
                    )}
                </div>

                {isTv && playableSeasons.length > 0 && (
                    <div className="bg-[#13131a] border border-[#2a2a3a] rounded-xl p-4 mb-6">
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="flex items-center gap-2">
                                <Tv className="w-4 h-4 text-blue-400" />
                                <label className="text-sm text-gray-400">Season</label>
                                <select
                                    value={season}
                                    onChange={(event) => handleSeasonChange(Number.parseInt(event.target.value, 10))}
                                    className="bg-[#1c1c28] border border-[#2a2a3a] text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#8b5cf6] max-w-[220px]"
                                >
                                    {playableSeasons.map((item) => (
                                        <option key={item.season_number} value={item.season_number}>
                                            {formatSeasonLabel(item)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2 min-w-0">
                                <label className="text-sm text-gray-400">Episode</label>
                                <select
                                    value={episode}
                                    onChange={(event) => goToEpisode(season, Number.parseInt(event.target.value, 10))}
                                    className="bg-[#1c1c28] border border-[#2a2a3a] text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#8b5cf6] max-w-[280px]"
                                >
                                    {episodeOptions.map((item) => (
                                        <option key={item.episode_number} value={item.episode_number}>
                                            {formatEpisodeLabel(item)}
                                        </option>
                                    ))}
                                </select>
                                {seasonLoading && (
                                    <span className="w-3.5 h-3.5 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                                )}
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                                <button
                                    onClick={() => previousEpisode && goToEpisode(previousEpisode.season, previousEpisode.episode)}
                                    disabled={!previousEpisode}
                                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-[#2a2a3a] text-gray-300 hover:border-gray-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>
                                <button
                                    onClick={() => nextEpisode && goToEpisode(nextEpisode.season, nextEpisode.episode)}
                                    disabled={!nextEpisode}
                                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-[#2a2a3a] text-gray-300 hover:border-gray-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {selectedEpisode && (
                            <div className="mt-4 border-t border-[#2a2a3a] pt-4">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className="text-white font-medium">
                                        S{season}:E{selectedEpisode.episode_number}
                                    </span>
                                    <span className="text-gray-300">{selectedEpisode.name || `Episode ${selectedEpisode.episode_number}`}</span>
                                    {selectedEpisode.air_date && <span className="text-gray-500">{selectedEpisode.air_date}</span>}
                                </div>
                                {selectedEpisode.overview && (
                                    <p className="text-sm text-gray-400 mt-2 line-clamp-2 max-w-4xl">
                                        {selectedEpisode.overview}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-8">
                    <div className="w-48 flex-shrink-0 hidden md:block">
                        {details.poster_path ? (
                            <Image
                                src={TMDB_IMAGE(details.poster_path, "w342")}
                                alt={title}
                                width={192}
                                height={288}
                                className="rounded-xl w-full"
                            />
                        ) : (
                            <div className="w-full aspect-[2/3] bg-[#1c1c28] rounded-xl flex items-center justify-center">
                                <span className="text-4xl">🎬</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold mb-2">{title}</h1>

                        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-gray-400">
                            {year && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {year}
                                </span>
                            )}
                            {runtime && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {runtime}
                                </span>
                            )}
                            {typeof details.vote_average === "number" && details.vote_average > 0 && (
                                <span className="flex items-center gap-1 text-yellow-400">
                                    <Star className="w-3.5 h-3.5 fill-yellow-400" />
                                    {details.vote_average.toFixed(1)}
                                </span>
                            )}
                            {details.genres?.slice(0, 3).map((genre) => (
                                <span key={genre.id} className="bg-[#2a2a3a] px-2 py-0.5 rounded-md text-xs">
                                    {genre.name}
                                </span>
                            ))}
                        </div>

                        <p className="text-gray-300 text-sm leading-relaxed mb-6 max-w-2xl">
                            {details.overview || "No description available."}
                        </p>

                        {details.credits?.cast && details.credits.cast.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Cast</h3>
                                <div className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400/40 pb-1">
                                    {details.credits.cast.slice(0, 10).map((person) => (
                                        <div key={person.id} className="flex-shrink-0 text-center w-16">
                                            <div className="w-12 h-12 bg-[#2a2a3a] rounded-full overflow-hidden mx-auto mb-1">
                                                {person.profile_path ? (
                                                    <Image
                                                        src={TMDB_IMAGE(person.profile_path, "w185")}
                                                        alt={person.name}
                                                        width={48}
                                                        height={48}
                                                        className="object-cover w-full h-full"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 truncate">{person.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handlePlay}
                                className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
                            >
                                <Play className="w-4 h-4" fill="white" />
                                {playing ? "Reload" : "Play"}
                            </button>
                            <button
                                onClick={toggleWatchlist}
                                disabled={watchlistLoading}
                                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-colors ${
                                    inWatchlist
                                        ? "bg-white/10 text-white"
                                        : "bg-transparent text-gray-300 border border-[#2a2a3a] hover:border-gray-500 hover:text-white"
                                }`}
                                title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                            >
                                <BookmarkPlus className="w-4 h-4" />
                                {inWatchlist ? "Saved" : "Watchlist"}
                            </button>
                        </div>
                    </div>
                </div>

                {details.similar?.results && details.similar.results.length > 0 && (
                    <div className="mt-10">
                        <h2 className="text-lg font-semibold mb-4">More Like This</h2>
                        <div className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400/40 pb-2">
                            {details.similar.results.slice(0, 12).map((item) => {
                                const similarTitle = item.title || item.name || "Untitled";
                                const similarType = item.media_type || type;

                                return (
                                    <div key={item.id} className="flex-shrink-0 w-[140px]">
                                        <Link href={`/player/${similarType}/${item.id}`}>
                                            <div className="rounded-xl overflow-hidden bg-[#1c1c28] border border-[#2a2a3a] hover:border-[#8b5cf6]/40 transition-colors group">
                                                <div className="relative aspect-[2/3]">
                                                    {item.poster_path ? (
                                                        <Image
                                                            src={TMDB_IMAGE(item.poster_path, "w342")}
                                                            alt={similarTitle}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 p-2 truncate">{similarTitle}</p>
                                            </div>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
