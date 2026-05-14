"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Play } from "lucide-react";
import { TMDB_IMAGE } from "@/lib/api";

interface Movie {
    id: number;
    title?: string;
    name?: string;
    poster_path?: string;
    backdrop_path?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    media_type?: string;
    overview?: string;
}

interface Props {
    movie: Movie;
    mediaType?: string;
}

export default function MovieCard({ movie, mediaType }: Props) {
    const title = movie.title || movie.name || "Unknown";
    const type = mediaType || movie.media_type || "movie";
    const year = (movie.release_date || movie.first_air_date || "").slice(0, 4);
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;

    return (
        <Link href={`/player/${type}/${movie.id}`} className="group block">
            <div className="relative rounded-xl overflow-hidden bg-[#1c1c28] border border-[#2a2a3a] transition-all duration-300 group-hover:border-red-600/40 group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-red-600/10">
                {/* Poster */}
                <div className="relative aspect-[2/3] overflow-hidden">
                    {movie.poster_path ? (
                        <Image
                            src={TMDB_IMAGE(movie.poster_path, "w342")}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 16vw"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#2a2a3a]">
                            <span className="text-4xl">🎬</span>
                        </div>
                    )}

                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                        </div>
                    </div>

                    {/* Type badge */}
                    {type === "tv" && (
                        <div className="absolute top-2 left-2 bg-blue-600/80 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-md">
                            Series
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="p-2.5">
                    <h3 className="text-sm font-medium text-white truncate">{title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        {year && <span className="text-xs text-gray-500">{year}</span>}
                        {rating && (
                            <span className="flex items-center gap-0.5 text-xs text-yellow-400">
                                <Star className="w-3 h-3 fill-yellow-400" />
                                {rating}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
