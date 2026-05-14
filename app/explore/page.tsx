"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTrending, getPopular, getAISuggestions, TMDB_IMAGE, getProfile } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import Navbar from "@/components/Navbar";
import MovieRow from "@/components/MovieRow";
import LanguageBrowser from "@/components/LanguageBrowser";
import HeroBanner from "@/components/HeroBanner";
import { Flame, TrendingUp, Sparkles, Globe, Tv } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

export default function ExplorePage() {
    const { childMode, setUser, user, setChildMode } = useAppStore();
    const supabase = createClient();
    const [aiSuggestions, setAiSuggestions] = useState<{ title: string; type: string; reason: string }[]>([]);

    // Sync user from Supabase session and load profile (child mode)
    useEffect(() => {
        const syncUser = async () => {
            const { data } = await supabase.auth.getUser();
            if (data.user) {
                setUser({
                    id: data.user.id,
                    email: data.user.email || "",
                    display_name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "User",
                });

                // fetch profile (contains child_mode) and apply to store
                try {
                    const prof = await getProfile();
                    if (prof && typeof prof.child_mode === "boolean") {
                        setChildMode(!!prof.child_mode);
                    }
                } catch (e) {
                    // ignore profile fetch errors
                }
            }
        };
        syncUser();
    }, []);

    const { data: trending } = useQuery({
        queryKey: ["trending", childMode],
        queryFn: () => getTrending("all", childMode),
    });

    const { data: popularMovies } = useQuery({
        queryKey: ["popular-movies", childMode],
        queryFn: () => getPopular("movie", 1, childMode).then((d) => d.results),
    });

    const { data: popularTV } = useQuery({
        queryKey: ["popular-tv", childMode],
        queryFn: () => getPopular("tv", 1, childMode).then((d) => d.results),
    });

    // Fetch AI suggestions if logged in
    useEffect(() => {
        if (user?.id) {
            getAISuggestions(user.id, childMode)
                .then((d) => setAiSuggestions(d.suggestions || []))
                .catch(() => { });
        }
    }, [user?.id, childMode]);

    const hero = trending?.[0];

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <Navbar />

            {/* Hero Banner */}
            {hero && <HeroBanner item={hero} />}

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Child mode banner */}
                {childMode && (
                    <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                        <span className="text-2xl">👶</span>
                        <div>
                            <p className="text-yellow-300 font-medium text-sm">Child Mode is ON</p>
                            <p className="text-yellow-400/70 text-xs">Content is filtered to family-friendly only</p>
                        </div>
                    </div>
                )}

                {/* AI Suggestions */}
                {aiSuggestions.length > 0 && (
                    <section className="mb-10">
                        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                            AI Picks For You
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {aiSuggestions.slice(0, 6).map((s, i) => (
                                <Link
                                    key={i}
                                    href={`/search?q=${encodeURIComponent(s.title)}`}
                                    className="bg-[#13131a] border border-[#2a2a3a] hover:border-purple-500/40 rounded-xl p-4 transition-colors group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                            {s.type === "tv" ? <Tv className="w-4 h-4 text-purple-400" /> : <span className="text-sm">🎬</span>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">{s.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.reason}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Trending */}
                <MovieRow
                    title="Trending Now"
                    movies={trending || []}
                    icon={<Flame className="w-5 h-5 text-orange-400" />}
                />

                {/* Popular Movies */}
                <MovieRow
                    title="Popular Movies"
                    movies={popularMovies || []}
                    mediaType="movie"
                    icon={<TrendingUp className="w-5 h-5 text-red-400" />}
                    viewAllHref="/search?q=popular&type=movie"
                />

                {/* Popular TV */}
                <MovieRow
                    title="Popular Series"
                    movies={popularTV || []}
                    mediaType="tv"
                    icon={<Tv className="w-5 h-5 text-blue-400" />}
                    viewAllHref="/search?q=popular&type=tv"
                />

                {/* Browse by Language */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Globe className="w-5 h-5 text-green-400" />
                        Browse by Language
                    </h2>
                    <LanguageBrowser childMode={childMode} />
                </section>
            </div>
        </div>
    );
}
