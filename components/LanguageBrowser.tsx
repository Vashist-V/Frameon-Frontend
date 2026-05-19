"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getByLanguage } from "@/lib/api";
import MovieCard from "./MovieCard";
import { Loader2 } from "lucide-react";
import HorizontalScroller from "./HorizontalScroller";

const LANGUAGES = [
    { code: "en", label: "🇺🇸 English" },
    { code: "hi", label: "🇮🇳 Hindi" },
    { code: "ta", label: "🎬 Tamil" },
    { code: "te", label: "🎬 Telugu" },
    { code: "ml", label: "🎬 Malayalam" },
    { code: "ko", label: "🇰🇷 Korean" },
    { code: "ja", label: "🇯🇵 Japanese" },
    { code: "fr", label: "🇫🇷 French" },
    { code: "es", label: "🇪🇸 Spanish" },
    { code: "de", label: "🇩🇪 German" },
    { code: "it", label: "🇮🇹 Italian" },
    { code: "pt", label: "🇧🇷 Portuguese" },
    { code: "zh", label: "🇨🇳 Chinese" },
    { code: "tr", label: "🇹🇷 Turkish" },
    { code: "ar", label: "🇸🇦 Arabic" },
];

interface Props {
    childMode?: boolean;
}

export default function LanguageBrowser({ childMode = false }: Props) {
    const [selected, setSelected] = useState("hi");
    const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");

    const { data, isLoading } = useQuery({
        queryKey: ["language", selected, mediaType, childMode],
        queryFn: () => getByLanguage(selected, mediaType, 1, childMode).then((d) => d.results),
    });

    return (
        <div>
            {/* Language pills */}
            <HorizontalScroller contentClassName="pb-3 mb-4" ariaLabel="Browse by language">
                {LANGUAGES.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setSelected(lang.code)}
                        className={`flex-shrink-0 text-sm px-3 py-1.5 rounded-full border transition-colors ${selected === lang.code
                            ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                            : "bg-transparent border-[#2a2a3a] text-gray-400 hover:border-gray-500 hover:text-white"
                            }`}
                    >
                        {lang.label}
                    </button>
                ))}
            </HorizontalScroller>

            {/* Movie / TV toggle */}
            <div className="flex gap-2 mb-5">
                {(["movie", "tv"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setMediaType(t)}
                        className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${mediaType === t
                            ? "bg-[#2a2a3a] text-white"
                            : "text-gray-500 hover:text-white"
                            }`}
                    >
                        {t === "movie" ? "🎬 Movies" : "📺 Series"}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-[#8b5cf6]" />
                </div>
            ) : (
                <HorizontalScroller contentClassName="pb-2" ariaLabel="Titles in selected language">
                    {(data || []).slice(0, 20).map((movie: any) => (
                        <div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[160px]">
                            <MovieCard movie={movie} mediaType={mediaType} />
                        </div>
                    ))}
                </HorizontalScroller>
            )}
        </div>
    );
}
