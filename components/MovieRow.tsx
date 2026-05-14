"use client";

import MovieCard from "./MovieCard";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import HorizontalScroller from "./HorizontalScroller";

interface Movie {
    id: number;
    title?: string;
    name?: string;
    poster_path?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    media_type?: string;
}

interface Props {
    title: string;
    movies: Movie[];
    mediaType?: string;
    viewAllHref?: string;
    icon?: React.ReactNode;
}

export default function MovieRow({ title, movies, mediaType, viewAllHref, icon }: Props) {
    if (!movies?.length) return null;

    return (
        <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    {icon}
                    {title}
                </h2>
                {viewAllHref && (
                    <Link
                        href={viewAllHref}
                        className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                        See all <ChevronRight className="w-4 h-4" />
                    </Link>
                )}
            </div>

            <HorizontalScroller contentClassName="pb-2">
                {movies.slice(0, 20).map((movie) => (
                    <div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[160px]">
                        <MovieCard movie={movie} mediaType={mediaType || movie.media_type} />
                    </div>
                ))}
            </HorizontalScroller>
        </section>
    );
}
