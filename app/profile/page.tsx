"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getWatchHistory, getWatchlist, TMDB_IMAGE } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import Image from "next/image";
import Link from "next/link";
import { Clock, Bookmark, LogOut, Baby } from "lucide-react";

export default function ProfilePage() {
    const router = useRouter();
    const { user, childMode, setChildMode, clearUser } = useAppStore();
    const [history, setHistory] = useState<any[]>([]);
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [tab, setTab] = useState<"history" | "watchlist">("history");
    const supabase = createClient();

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) { router.push("/login"); return; }
            try {
                const [h, w] = await Promise.all([getWatchHistory(), getWatchlist()]);
                setHistory(h);
                setWatchlist(w);
            } catch { }
        };
        load();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        clearUser();
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Profile header */}
                <div className="bg-[#13131a] border border-[#2a2a3a] rounded-2xl p-6 mb-6 flex items-center gap-5">
                    <div className="w-16 h-16 bg-red-600/20 border border-red-600/30 rounded-full flex items-center justify-center text-2xl font-bold text-red-300">
                        {user?.display_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-xl font-semibold">{user?.display_name || "User"}</h1>
                        <p className="text-gray-400 text-sm">{user?.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setChildMode(!childMode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors ${childMode
                                    ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300"
                                    : "border-[#2a2a3a] text-gray-400 hover:border-gray-500"
                                }`}
                        >
                            <Baby className="w-4 h-4" />
                            Kids Mode {childMode ? "ON" : "OFF"}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#2a2a3a] text-gray-400 hover:text-red-400 hover:border-red-900/40 text-sm transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-5">
                    <button
                        onClick={() => setTab("history")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors ${tab === "history" ? "bg-red-600 text-white" : "bg-[#13131a] border border-[#2a2a3a] text-gray-400 hover:text-white"
                            }`}
                    >
                        <Clock className="w-4 h-4" />
                        Watch History ({history.length})
                    </button>
                    <button
                        onClick={() => setTab("watchlist")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors ${tab === "watchlist" ? "bg-red-600 text-white" : "bg-[#13131a] border border-[#2a2a3a] text-gray-400 hover:text-white"
                            }`}
                    >
                        <Bookmark className="w-4 h-4" />
                        Watchlist ({watchlist.length})
                    </button>
                </div>

                {/* Content */}
                {tab === "history" && (
                    history.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No watch history yet. Start watching!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                            {history.map((item) => (
                                <Link key={item.id} href={`/player/${item.type}/${item.tmdb_id}`}>
                                    <div className="rounded-xl overflow-hidden bg-[#13131a] border border-[#2a2a3a] hover:border-red-600/40 transition-colors">
                                        <div className="relative aspect-[2/3]">
                                            {item.poster_path ? (
                                                <Image src={TMDB_IMAGE(item.poster_path, "w342")} alt={item.title} fill className="object-cover" sizes="150px" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl bg-[#1c1c28]">🎬</div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 p-2 truncate">{item.title}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )
                )}

                {tab === "watchlist" && (
                    watchlist.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Your watchlist is empty.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                            {watchlist.map((item) => (
                                <Link key={item.id} href={`/player/${item.type}/${item.tmdb_id}`}>
                                    <div className="rounded-xl overflow-hidden bg-[#13131a] border border-[#2a2a3a] hover:border-red-600/40 transition-colors">
                                        <div className="relative aspect-[2/3]">
                                            {item.poster_path ? (
                                                <Image src={TMDB_IMAGE(item.poster_path, "w342")} alt={item.title} fill className="object-cover" sizes="150px" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl bg-[#1c1c28]">🎬</div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 p-2 truncate">{item.title}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
