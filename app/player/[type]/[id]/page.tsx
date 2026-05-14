"use client";

import { use, useEffect, useState } from "react";
import { getMovieDetails, getTVDetails, logWatch, TMDB_IMAGE, getWatchlist, addToWatchlist, removeFromWatchlist } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { Star, Clock, Calendar, Play, BookmarkPlus, ArrowLeft, Tv } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Params {
    type: string;
    id: string;
}

const EMBED_SOURCES = [
    { label: "Source 1", id: "vidsrc.xyz" },
    { label: "Source 2", id: "vidsrc.me" },
    { label: "Source 3", id: "autoembed" },
    { label: "Source 4", id: "2embed.cc" },
    { label: "Source 5", id: "embed.su" },
];

function buildEmbedUrl(source: string, type: string, imdbId: string | null, tmdbId: string, season: number, episode: number) {
    if (type === "movie") {
        switch (source) {
            case "vidsrc.me": return `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`;
            case "embed.su": return `https://embed.su/embed/movie/${tmdbId}`;
            case "vidsrc.xyz": return imdbId ? `https://vidsrc.xyz/embed/movie?imdb=${imdbId}` : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`;
            case "2embed.cc": return `https://www.2embed.cc/embed/${tmdbId}`;
            case "autoembed": return `https://player.autoembed.cc/embed/movie/${tmdbId}`;
            default: return `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`;
        }
    } else {
        switch (source) {
            case "vidsrc.me": return `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
            case "embed.su": return `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`;
            case "vidsrc.xyz": return `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
            case "2embed.cc": return `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`;
            case "autoembed": return `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`;
            default: return `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
        }
    }
}

export default function PlayerPage({ params }: { params: Promise<Params> }) {
    const { type, id } = use(params);
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [season, setSeason] = useState(1);
    const [episode, setEpisode] = useState(1);
    const [activeSource, setActiveSource] = useState("vidsrc.xyz");
    const [iframeFailed, setIframeFailed] = useState(false);
    const supabase = createClient();
    const [watchlistLoading, setWatchlistLoading] = useState(false);
    const [inWatchlist, setInWatchlist] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = type === "movie"
                    ? await getMovieDetails(parseInt(id))
                    : await getTVDetails(parseInt(id));
                setDetails(data);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id, type]);

    // Load watchlist membership once we have details (and user session attached via api client)
    useEffect(() => {
        if (!details) return;
        let mounted = true;
        const check = async () => {
            try {
                setWatchlistLoading(true);
                const list = await getWatchlist();
                if (!mounted) return;
                const tmdbId = parseInt(id);
                setInWatchlist(list?.some((it: any) => parseInt(it.tmdb_id) === tmdbId));
            } catch (e) {
                // ignore errors (not signed in or network)
            } finally {
                if (mounted) setWatchlistLoading(false);
            }
        };
        check();
        return () => { mounted = false; };
    }, [details, id]);



    const handlePlay = () => {
        setPlaying(true);
        setIframeFailed(false);
        // Fire-and-forget: never let this affect playback or auth
        supabase.auth.getSession().then(({ data: session }) => {
            if (!session.session) return;
            logWatch({
                tmdb_id: parseInt(id),
                imdb_id: details?.external_ids?.imdb_id || details?.imdb_id,
                title: details?.title || details?.name,
                type,
                poster_path: details?.poster_path,
                season: type === "tv" ? season : undefined,
                episode: type === "tv" ? episode : undefined,
            }).catch(() => { /* silently ignore */ });
        }).catch(() => { /* silently ignore */ });
    };

    const getEmbedUrl = () => {
        const imdbId = details?.external_ids?.imdb_id || details?.imdb_id || null;
        return buildEmbedUrl(activeSource, type, imdbId, id, season, episode);
    };

    const rotateToNextSource = () => {
        const idx = EMBED_SOURCES.findIndex((s) => s.id === activeSource);
        const next = EMBED_SOURCES[(idx + 1) % EMBED_SOURCES.length]?.id || activeSource;
        if (next !== activeSource) {
            setActiveSource(next);
            setPlaying(false);
            setTimeout(() => setPlaying(true), 200);
        }
    };

    const toggleWatchlist = async () => {
        if (watchlistLoading || !details) return;
        const tmdbId = parseInt(id);
        try {
            setWatchlistLoading(true);
            if (inWatchlist) {
                await removeFromWatchlist(tmdbId);
                setInWatchlist(false);
            } else {
                await addToWatchlist({ tmdb_id: tmdbId, title: details.title || details.name, type, poster_path: details.poster_path });
                setInWatchlist(true);
            }
        } catch (e) {
            // ignore errors; could show toast later
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
                        <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">Loading...</p>
                    </div>
                </div>

                {/* Inline playback failed fallback */}
                {iframeFailed && (
                    <div className="mb-6 px-4 py-5 bg-[#111116] border border-[#2a2a3a] rounded-xl text-center">
                        <p className="text-sm text-gray-300 mb-3">This source blocked embedding or failed to load.</p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => {
                                    // Open embed directly in new tab as a reliable fallback
                                    const url = getEmbedUrl();
                                    window.open(url, "_blank", "noopener,noreferrer");
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl"
                            >
                                Open in new tab
                            </button>
                            <button
                                onClick={() => {
                                    // Try next source inline
                                    setIframeFailed(false);
                                    rotateToNextSource();
                                }}
                                className="bg-transparent border border-[#2a2a3a] text-gray-300 px-3 py-2 rounded-xl"
                            >
                                Try next source
                            </button>
                        </div>
                    </div>
                )}
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

    const title = details.title || details.name;
    const year = (details.release_date || details.first_air_date || "").slice(0, 4);
    const runtime = details.runtime ? `${details.runtime} min` : null;
    const seasons = details.number_of_seasons;

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Back button */}
                <button
                    onClick={() => history.back()}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                {/* Source switcher */}
                {playing && (
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="text-xs text-gray-500 mr-1">Not playing?</span>
                        {EMBED_SOURCES.map((src) => (
                            <button
                                key={src.id}
                                onClick={() => { setActiveSource(src.id); setPlaying(false); setTimeout(() => setPlaying(true), 100); }}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${activeSource === src.id
                                    ? "bg-red-600 border-red-600 text-white"
                                    : "border-[#2a2a3a] text-gray-400 hover:border-gray-500 hover:text-white"
                                    }`}
                            >
                                {src.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Video player */}
                <div className="bg-black rounded-2xl overflow-hidden mb-8 relative">
                    {playing ? (
                        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                            <iframe
                                key={`${activeSource}-${season}-${episode}`}
                                src={getEmbedUrl()}
                                className="absolute inset-0 w-full h-full"
                                allowFullScreen
                                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                                referrerPolicy="no-referrer"
                                onLoad={() => {
                                    // iframe loaded; we keep playback inline if possible
                                    setIframeFailed(false);
                                }}
                                onError={() => {
                                    // fallback to open in new tab if iframe fails
                                    setIframeFailed(true);
                                    rotateToNextSource();
                                }}
                                frameBorder="0"
                            />
                        </div>
                    ) : (
                        <div
                            className="relative cursor-pointer group"
                            style={{ paddingBottom: "56.25%" }}
                            onClick={handlePlay}
                        >
                            {details.backdrop_path ? (
                                <Image
                                    src={TMDB_IMAGE(details.backdrop_path, "original")}
                                    alt={title}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-[#1c1c28]" />
                            )}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl shadow-red-600/40">
                                    <Play className="w-9 h-9 text-white ml-1" fill="white" />
                                </div>
                            </div>
                            <div className="absolute bottom-4 left-4 text-white text-sm font-medium bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                                Click to Play
                            </div>
                        </div>
                    )}
                </div>

                {/* Inline playback failed fallback (visible during normal playback too) */}
                {iframeFailed && (
                    <div className="mb-6 px-4 py-5 bg-[#111116] border border-[#2a2a3a] rounded-xl text-center">
                        <p className="text-sm text-gray-300 mb-3">This source blocked embedding or failed to load.</p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => {
                                    const url = getEmbedUrl();
                                    window.open(url, "_blank", "noopener,noreferrer");
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl"
                            >
                                Open in new tab
                            </button>
                            <button
                                onClick={() => {
                                    // Try next source inline
                                    setIframeFailed(false);
                                    rotateToNextSource();
                                }}
                                className="bg-transparent border border-[#2a2a3a] text-gray-300 px-3 py-2 rounded-xl"
                            >
                                Try next source
                            </button>
                        </div>
                    </div>
                )}

                {/* TV Season/Episode selector */}
                {type === "tv" && seasons && (
                    <div className="bg-[#13131a] border border-[#2a2a3a] rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <Tv className="w-4 h-4 text-blue-400" />
                            <label className="text-sm text-gray-400">Season</label>
                            <select
                                value={season}
                                onChange={(e) => { setSeason(parseInt(e.target.value)); setPlaying(false); }}
                                className="bg-[#1c1c28] border border-[#2a2a3a] text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-red-500"
                            >
                                {Array.from({ length: seasons }, (_, i) => i + 1).map((s) => (
                                    <option key={s} value={s}>Season {s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-400">Episode</label>
                            <select
                                value={episode}
                                onChange={(e) => { setEpisode(parseInt(e.target.value)); setPlaying(false); }}
                                className="bg-[#1c1c28] border border-[#2a2a3a] text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-red-500"
                            >
                                {Array.from({ length: 30 }, (_, i) => i + 1).map((ep) => (
                                    <option key={ep} value={ep}>Episode {ep}</option>
                                ))}
                            </select>
                        </div>
                        {playing && (
                            <button
                                onClick={() => setPlaying(false)}
                                className="text-sm text-red-400 hover:text-red-300 transition-colors ml-auto"
                            >
                                Change episode
                            </button>
                        )}
                    </div>
                )}

                {/* Movie info */}
                <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-8">
                    {/* Poster */}
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

                    {/* Details */}
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
                            {details.vote_average > 0 && (
                                <span className="flex items-center gap-1 text-yellow-400">
                                    <Star className="w-3.5 h-3.5 fill-yellow-400" />
                                    {details.vote_average.toFixed(1)}
                                </span>
                            )}
                            {details.genres?.slice(0, 3).map((g: any) => (
                                <span key={g.id} className="bg-[#2a2a3a] px-2 py-0.5 rounded-md text-xs">
                                    {g.name}
                                </span>
                            ))}
                        </div>

                        <p className="text-gray-300 text-sm leading-relaxed mb-6 max-w-2xl">
                            {details.overview || "No description available."}
                        </p>

                        {/* Cast */}
                        {details.credits?.cast?.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Cast</h3>
                                <div className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400/40 pb-1">
                                    {details.credits.cast.slice(0, 10).map((person: any) => (
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

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handlePlay}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
                            >
                                <Play className="w-4 h-4" fill="white" />
                                {playing ? "Reload" : "Play"}
                            </button>
                            <button
                                onClick={toggleWatchlist}
                                disabled={watchlistLoading}
                                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-colors ${inWatchlist ? "bg-white/6 text-white" : "bg-transparent text-gray-300 border border-[#2a2a3a] hover:border-gray-500 hover:text-white"}`}
                                title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                            >
                                <BookmarkPlus className="w-4 h-4" />
                                {inWatchlist ? "Saved" : "Watchlist"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Similar */}
                {details.similar?.results?.length > 0 && (
                    <div className="mt-10">
                        <h2 className="text-lg font-semibold mb-4">More Like This</h2>
                        <div className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400/40 pb-2">
                            {details.similar.results.slice(0, 12).map((movie: any) => (
                                <div key={movie.id} className="flex-shrink-0 w-[140px]">
                                    <Link href={`/player/${type}/${movie.id}`}>
                                        <div className="rounded-xl overflow-hidden bg-[#1c1c28] border border-[#2a2a3a] hover:border-red-600/40 transition-colors group">
                                            <div className="relative aspect-[2/3]">
                                                {movie.poster_path ? (
                                                    <Image
                                                        src={TMDB_IMAGE(movie.poster_path, "w342")}
                                                        alt={movie.title || movie.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 p-2 truncate">{movie.title || movie.name}</p>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
