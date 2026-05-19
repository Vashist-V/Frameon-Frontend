"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Film, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const supabase = createClient();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: displayName } },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="text-center max-w-md px-6">
                    <div className="w-16 h-16 bg-green-600/20 border border-green-600/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">✉️</span>
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Check your email</h2>
                    <p className="text-gray-400 text-sm mb-6">
                        We sent a confirmation link to <strong className="text-white">{email}</strong>.
                        Click it to activate your account, then sign in.
                    </p>
                    <Link
                        href="/login"
                        className="inline-block bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-medium px-6 py-3 rounded-xl transition-colors"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-indigo-900/25 pointer-events-none" />

            <div className="w-full max-w-md mx-auto px-6 relative z-10">
                <div className="flex items-center justify-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-[#8b5cf6] rounded-xl flex items-center justify-center">
                        <Film className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight">Frameon</span>
                </div>

                <div className="bg-[#13131a] border border-[#2a2a3a] rounded-2xl p-8">
                    <h1 className="text-2xl font-semibold mb-1">Create account</h1>
                    <p className="text-gray-400 text-sm mb-7">Start streaming in seconds</p>

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                                className="w-full bg-[#1c1c28] border border-[#2a2a3a] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition-colors"
                                placeholder="John Doe"
                            />
                        </div>

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
                                    minLength={6}
                                    className="w-full bg-[#1c1c28] border border-[#2a2a3a] rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition-colors"
                                    placeholder="Min. 6 characters"
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
                            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                            Create Account
                        </button>
                    </form>

                    <p className="text-center text-gray-400 text-sm mt-6">
                        Already have an account?{" "}
                        <Link href="/login" className="text-[#c4b5fd] hover:text-[#e0d4ff] font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
