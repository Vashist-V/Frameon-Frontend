"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Info } from "lucide-react";
import { TMDB_IMAGE } from "@/lib/api";

interface Props {
    item: {
        id: number;
        title?: string;
        name?: string;
        overview?: string;
        backdrop_path?: string;
        media_type?: string;
        vote_average?: number;
        release_date?: string;
        first_air_date?: string;
    };
}

export default function HeroBanner({ item }: Props) {
    const title = item.title || item.name;
    const type = item.media_type || "movie";
    const year = (item.release_date || item.first_air_date || "").slice(0, 4);

    return (
        <div className="relative w-full h-[55vh] min-h-[350px] max-h-[600px] overflow-hidden">
            {/* Backdrop */}
            {item.backdrop_path ? (
                <Image
                    src={TMDB_IMAGE(item.backdrop_path, "original")}
                    alt={title || ""}
                    fill
                    className="object-cover object-top"
                    priority
                />
            ) : (
                <div className="w-full h-full bg-[#1c1c28]" />
            )}

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 flex items-center">
                <div className="max-w-7xl mx-auto px-6 w-full">
                    <div className="max-w-lg">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 bg-white/10 px-2 py-1 rounded-md">
                                {type === "tv" ? "Series" : "Movie"}
                            </span>
                            {year && <span className="text-xs text-gray-400">{year}</span>}
                            {item.vote_average && (
                                <span className="text-xs text-yellow-400">⭐ {item.vote_average.toFixed(1)}</span>
                            )}
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">{title}</h1>

                        {item.overview && (
                            <p className="text-sm text-gray-300 mb-6 line-clamp-3 max-w-sm">{item.overview}</p>
                        )}

                        <div className="flex items-center gap-3">
                            <Link
                                href={`/player/${type}/${item.id}`}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                            >
                                <Play className="w-5 h-5" fill="white" />
                                Play Now
                            </Link>
                            <Link
                                href={`/player/${type}/${item.id}`}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-3 rounded-xl transition-colors backdrop-blur-sm"
                            >
                                <Info className="w-4 h-4" />
                                More Info
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
