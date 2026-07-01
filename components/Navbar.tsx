"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Film, Search, Bot, LogOut, Baby, User, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { searchMovies, TMDB_IMAGE, updateChildMode, type MediaItem } from "@/lib/api";
import { mediaTitle, mediaYear, sortMediaMatches } from "@/lib/search";
import { useEffect, useState } from "react";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const { childMode, setChildMode, user, clearUser } = useAppStore();
    const [searchQ, setSearchQ] = useState("");
    const [suggestions, setSuggestions] = useState<MediaItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        clearUser();
        router.push("/login");
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchQ.trim();
        if (trimmed.length >= 2) {
            setSuggestionsOpen(false);
            router.push(`/search?q=${encodeURIComponent(trimmed)}`);
        }
    };

    useEffect(() => {
        const trimmed = searchQ.trim();
        let active = true;

        const timeout = window.setTimeout(() => {
            if (trimmed.length < 2) {
                if (!active) return;
                setSuggestions([]);
                setSearching(false);
                return;
            }

            setSearching(true);
            searchMovies(trimmed, 1, childMode)
                .then((data) => {
                    if (!active) return;
                    setSuggestions(sortMediaMatches(data.results || [], trimmed).slice(0, 6));
                })
                .catch(() => {
                    if (active) setSuggestions([]);
                })
                .finally(() => {
                    if (active) setSearching(false);
                });

            if (pathname === "/search") {
                router.replace(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
            }
        }, 300);

        return () => {
            active = false;
            window.clearTimeout(timeout);
        };
    }, [childMode, pathname, router, searchQ]);

    const toggleChildMode = async () => {
        const newVal = !childMode;
        setChildMode(newVal);
        try {
            await updateChildMode(newVal);
        } catch { }
    };

    return (
        <header className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-[#2a2a3a]">
            <div className="max-w-7xl mx-auto px-4 min-h-16 py-3 sm:py-0 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4">
                {/* Logo */}
                <Link href="/explore" className="order-1 flex items-center gap-2 sm:mr-4 flex-shrink-0">
                    <div className="w-8 h-8 bg-[#8b5cf6] rounded-lg flex items-center justify-center">
                        <Film className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight hidden sm:block">Frameon</span>
                </Link>

                {/* Search bar */}
                <form onSubmit={handleSearch} className="order-3 w-full flex-none sm:order-2 sm:flex-1 sm:max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQ}
                            onChange={(e) => {
                                setSearchQ(e.target.value);
                                setSuggestionsOpen(true);
                            }}
                            onFocus={() => setSuggestionsOpen(true)}
                            onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 120)}
                            placeholder="Search movies, series..."
                            className="w-full bg-[#1c1c28] border border-[#2a2a3a] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition-colors"
                        />
                        {searching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-500" />
                        )}

                        {suggestionsOpen && searchQ.trim().length >= 2 && (
                            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-[#2a2a3a] bg-[#13131a] shadow-2xl shadow-black/40">
                                {suggestions.length > 0 ? (
                                    suggestions.map((item) => {
                                        const title = mediaTitle(item);
                                        const type = item.media_type || "movie";
                                        const year = mediaYear(item);

                                        const href = `/player/${type}/${item.id}`;

                                        return (
                                            <Link
                                                key={`${type}-${item.id}`}
                                                href={href}
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    setSuggestionsOpen(false);
                                                    setSearchQ("");
                                                    router.push(href);
                                                }}
                                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors"
                                            >
                                                <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-[#1c1c28]">
                                                    {item.poster_path ? (
                                                        <Image
                                                            src={TMDB_IMAGE(item.poster_path, "w185")}
                                                            alt={title}
                                                            fill
                                                            sizes="32px"
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center">
                                                            <Film className="h-4 w-4 text-gray-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-white">{title}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {type === "tv" ? "Series" : "Movie"}{year ? ` • ${year}` : ""}
                                                    </p>
                                                </div>
                                            </Link>
                                        );
                                    })
                                ) : (
                                    <div className="px-3 py-3 text-sm text-gray-500">
                                        {searching ? "Searching..." : "No matching titles"}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </form>

                {/* Nav actions */}
                <div className="order-2 sm:order-3 flex items-center gap-1 sm:gap-2 ml-auto">
                    <Link
                        href="/ai"
                        className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-colors ${pathname === "/ai"
                                ? "bg-purple-600/20 text-purple-300"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        <Bot className="w-4 h-4" />
                        <span className="hidden sm:block">Ask AI</span>
                    </Link>

                    {/* Child mode toggle */}
                    <button
                        onClick={toggleChildMode}
                        title={childMode ? "Child mode ON – click to disable" : "Enable child mode"}
                        className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-colors ${childMode
                                ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        <Baby className="w-4 h-4" />
                        <span className="hidden sm:block">{childMode ? "Kids ON" : "Kids"}</span>
                    </button>

                    {user ? (
                        <>
                            <Link
                                href="/profile"
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-2 py-2 rounded-xl hover:bg-white/5 transition-colors"
                            >
                                <div className="w-7 h-7 bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 rounded-full flex items-center justify-center text-xs font-medium text-[#d7c3ff]">
                                    {user.display_name?.[0]?.toUpperCase() || <User className="w-3 h-3" />}
                                </div>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="text-gray-400 hover:text-[#c4b5fd] p-2 rounded-xl hover:bg-white/5 transition-colors"
                                title="Sign out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                        >
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
