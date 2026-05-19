"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Film, Search, Bot, LogOut, Baby, User } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { updateChildMode } from "@/lib/api";
import { useState } from "react";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const { childMode, setChildMode, user, clearUser } = useAppStore();
    const [searchQ, setSearchQ] = useState("");
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        clearUser();
        router.push("/login");
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQ.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQ.trim())}`);
        }
    };

    const toggleChildMode = async () => {
        const newVal = !childMode;
        setChildMode(newVal);
        try {
            await updateChildMode(newVal);
        } catch { }
    };

    return (
        <header className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-[#2a2a3a]">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
                {/* Logo */}
                <Link href="/explore" className="flex items-center gap-2 mr-4 flex-shrink-0">
                    <div className="w-8 h-8 bg-[#8b5cf6] rounded-lg flex items-center justify-center">
                        <Film className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight hidden sm:block">Frameon</span>
                </Link>

                {/* Search bar */}
                <form onSubmit={handleSearch} className="flex-1 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQ}
                            onChange={(e) => setSearchQ(e.target.value)}
                            placeholder="Search movies, series..."
                            className="w-full bg-[#1c1c28] border border-[#2a2a3a] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition-colors"
                        />
                    </div>
                </form>

                {/* Nav actions */}
                <div className="flex items-center gap-2 ml-auto">
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
