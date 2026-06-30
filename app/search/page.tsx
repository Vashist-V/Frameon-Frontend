"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { searchMovies, type MediaItem } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { sortMediaMatches } from "@/lib/search";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { Search, Loader2, Film, Tv } from "lucide-react";

type ResultFilter = "all" | "movie" | "tv";

const filters: { val: ResultFilter; label: string; icon: React.ReactNode }[] = [
    { val: "all", label: "All Results", icon: null },
    { val: "movie", label: "Movies", icon: <Film className="w-4 h-4" /> },
    { val: "tv", label: "Series", icon: <Tv className="w-4 h-4" /> },
];

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const q = searchParams.get("q") || "";
    const { childMode } = useAppStore();

    const [query, setQuery] = useState(q);
    const [results, setResults] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<ResultFilter>("all");
    const displayQuery = query.trim();
    const hasSearch = displayQuery.length >= 2;

    useEffect(() => {
        const nextQuery = q.trim();
        const timeout = window.setTimeout(() => {
            setQuery((current) => (current === nextQuery ? current : nextQuery));
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [q]);

    useEffect(() => {
        const trimmed = query.trim();
        let active = true;

        const timeout = window.setTimeout(() => {
            if (trimmed.length < 2) {
                if (!active) return;
                setResults([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            searchMovies(trimmed, 1, childMode)
                .then((data) => {
                    if (!active) return;
                    setResults(sortMediaMatches(data.results || [], trimmed));
                })
                .catch(() => {
                    if (active) setResults([]);
                })
                .finally(() => {
                    if (active) setLoading(false);
                });
        }, 300);

        return () => {
            active = false;
            window.clearTimeout(timeout);
        };
    }, [childMode, query]);

    useEffect(() => {
        const trimmed = query.trim();
        const timeout = window.setTimeout(() => {
            if (trimmed.length >= 2 && q !== trimmed) {
                router.replace(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
            } else if (trimmed.length === 0 && q) {
                router.replace("/search", { scroll: false });
            }
        }, 350);

        return () => window.clearTimeout(timeout);
    }, [q, query, router]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed.length >= 2) {
            router.push(`/search?q=${encodeURIComponent(trimmed)}`);
        }
    };

    const filtered = filter === "all" ? results : results.filter((r) => r.media_type === filter);

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Search box */}
                <form onSubmit={handleSearch} className="mb-8">
                    <div className="relative max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search movies, series, shows..."
                            className="w-full bg-[#13131a] border border-[#2a2a3a] rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition-colors text-lg"
                        />
                    </div>
                </form>

                {hasSearch && (
                    <>
                        {/* Filter tabs */}
                        <div className="flex gap-2 mb-6">
                            {filters.map((f) => (
                                <button
                                    key={f.val}
                                    onClick={() => setFilter(f.val)}
                                    className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl transition-colors ${filter === f.val
                                            ? "bg-[#8b5cf6] text-white"
                                            : "bg-[#13131a] border border-[#2a2a3a] text-gray-400 hover:text-white"
                                        }`}
                                >
                                    {f.icon}
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Results count */}
                        {!loading && (
                            <p className="text-gray-500 text-sm mb-5">
                                {filtered.length} results for <span className="text-white font-medium">&ldquo;{displayQuery}&rdquo;</span>
                            </p>
                        )}

                        {/* Results */}
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-20">
                                <Film className="w-14 h-14 text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-400 text-lg">No results found for &ldquo;{displayQuery}&rdquo;</p>
                                <p className="text-gray-600 text-sm mt-2">Try different keywords</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                                {filtered.map((movie) => (
                                    <MovieCard key={`${movie.media_type || "movie"}-${movie.id}`} movie={movie} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {!hasSearch && (
                    <div className="text-center py-20">
                        <Search className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">Search for movies or series</p>
                        <p className="text-gray-600 text-sm mt-2">Type at least 2 characters to see matches</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" /></div>}>
            <SearchContent />
        </Suspense>
    );
}
