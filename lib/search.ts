import type { MediaItem } from "./api";

export function mediaTitle(item: MediaItem) {
    return item.title || item.name || "Untitled";
}

export function mediaYear(item: MediaItem) {
    return (item.release_date || item.first_air_date || "").slice(0, 4);
}

function normalize(value: string) {
    return value.trim().toLowerCase();
}

function matchScore(item: MediaItem, query: string) {
    const q = normalize(query);
    const title = normalize(mediaTitle(item));
    const overview = normalize(item.overview || "");

    if (!q) return 99;
    if (title === q) return 0;
    if (title.startsWith(q)) return 1;
    if (title.includes(q)) return 2;
    if (overview.includes(q)) return 3;
    return 4;
}

export function sortMediaMatches(items: MediaItem[], query: string) {
    return [...items].sort((a, b) => {
        const score = matchScore(a, query) - matchScore(b, query);
        if (score !== 0) return score;
        return (b.vote_average || 0) - (a.vote_average || 0);
    });
}
