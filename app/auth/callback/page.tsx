"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

function safeNextPath(value: string | null) {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return "/explore";
    return value;
}

export default function AuthCallbackPage() {
    const router = useRouter();
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;

        const finishAuth = async () => {
            const supabase = createClient();
            const url = new URL(window.location.href);
            const code = url.searchParams.get("code");
            const next = safeNextPath(url.searchParams.get("next"));

            if (!code && !window.location.hash.includes("access_token")) {
                if (mounted) setError("The authentication link is missing or expired.");
                return;
            }

            if (code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    if (mounted) setError(error.message);
                    return;
                }
            } else {
                const { data } = await supabase.auth.getSession();
                if (!data.session) {
                    if (mounted) setError("Unable to finish authentication. Please sign in again.");
                    return;
                }
            }

            router.replace(next);
            router.refresh();
        };

        finishAuth();
        return () => {
            mounted = false;
        };
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-6">
            <div className="w-full max-w-md rounded-2xl border border-[#2a2a3a] bg-[#13131a] p-8 text-center">
                {error ? (
                    <>
                        <h1 className="text-xl font-semibold text-white mb-2">Sign in failed</h1>
                        <p className="text-sm text-gray-400 mb-6">{error}</p>
                        <Link
                            href="/login"
                            className="inline-flex justify-center rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#7c3aed]"
                        >
                            Back to Login
                        </Link>
                    </>
                ) : (
                    <>
                        <Loader2 className="w-8 h-8 animate-spin text-[#c4b5fd] mx-auto mb-4" />
                        <h1 className="text-xl font-semibold text-white mb-2">Finishing sign in</h1>
                        <p className="text-sm text-gray-400">You will be redirected in a moment.</p>
                    </>
                )}
            </div>
        </div>
    );
}
