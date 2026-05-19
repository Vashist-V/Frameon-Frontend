"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { searchMovies } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { Search, Loader2, Film, Tv } from "lucide-react";

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const q = searchParams.get("q") || "";
    const { childMode } = useAppStore();

    const [query, setQuery] = useState(q);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<"all" | "movie" | "tv">("all");

    useEffect(() => {
        if (!q) return;
        setLoading(true);
        searchMovies(q, 1, childMode)
            .then((d) => setResults(d.results || []))
            .finally(() => setLoading(false));
    }, [q, childMode]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
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

                {q && (
                    <>
                        {/* Filter tabs */}
                        <div className="flex gap-2 mb-6">
                            {[
                                { val: "all", label: "All Results", icon: null },
                                { val: "movie", label: "Movies", icon: <Film className="w-4 h-4" /> },
                                { val: "tv", label: "Series", icon: <Tv className="w-4 h-4" /> },
                            ].map((f) => (
                                <button
                                    key={f.val}
                                    onClick={() => setFilter(f.val as any)}
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
                                {filtered.length} results for <span className="text-white font-medium">&ldquo;{q}&rdquo;</span>
                            </p>
                        )}

                        {/* Results */}
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-5xl mb-4">🎬</p>
                                <p className="text-gray-400 text-lg">No results found for &ldquo;{q}&rdquo;</p>
                                <p className="text-gray-600 text-sm mt-2">Try different keywords</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                                {filtered.map((movie) => (
                                    <MovieCard key={movie.id} movie={movie} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {!q && (
                    <div className="text-center py-20">
                        <Search className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">Search for movies or series</p>
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
