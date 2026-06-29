"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Film, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.replace("/explore");
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-indigo-900/25 pointer-events-none" />

            <div className="w-full max-w-md mx-auto px-6 relative z-10">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-[#8b5cf6] rounded-xl flex items-center justify-center">
                        <Film className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight">Frameon</span>
                </div>

                <div className="bg-[#13131a] border border-[#2a2a3a] rounded-2xl p-8">
                    <h1 className="text-2xl font-semibold mb-1">Welcome back</h1>
                    <p className="text-gray-400 text-sm mb-7">Sign in to continue streaming</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-[#1c1c28] border border-[#2a2a3a] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition-colors"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-[#1c1c28] border border-[#2a2a3a] rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition-colors"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="text-[#d7c3ff] text-sm bg-[#2a1f3d] border border-[#8b5cf6]/30 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                            Sign In
                        </button>
                    </form>

                    <p className="text-center text-gray-400 text-sm mt-6">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-[#c4b5fd] hover:text-[#e0d4ff] font-medium transition-colors">
                            Sign up free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
