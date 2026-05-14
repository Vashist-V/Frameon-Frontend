"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
    children: ReactNode;
    className?: string;
    contentClassName?: string;
    ariaLabel?: string;
}

export default function HorizontalScroller({ children, className = "", contentClassName = "", ariaLabel }: Props) {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = () => {
        const el = scrollerRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 8);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };

    useEffect(() => {
        updateScrollState();
        const el = scrollerRef.current;
        if (!el) return;
        const handle = () => updateScrollState();
        el.addEventListener("scroll", handle);
        window.addEventListener("resize", handle);
        return () => {
            el.removeEventListener("scroll", handle);
            window.removeEventListener("resize", handle);
        };
    }, []);

    const scrollBy = (dir: "left" | "right") => {
        const el = scrollerRef.current;
        if (!el) return;
        const amount = Math.max(el.clientWidth * 0.8, 240) * (dir === "left" ? -1 : 1);
        el.scrollBy({ left: amount, behavior: "smooth" });
    };

    return (
        <div className={`relative group ${className}`}>
            <button
                aria-label="Scroll left"
                onClick={() => scrollBy("left")}
                disabled={!canScrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/60 hover:bg-black/80 text-white p-2 shadow-lg transition-opacity duration-200 disabled:opacity-0 opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <div
                aria-label={ariaLabel}
                ref={scrollerRef}
                className={`flex gap-3 overflow-x-auto scrollbar-hide pr-8 ${contentClassName}`}
            >
                {children}
            </div>

            <button
                aria-label="Scroll right"
                onClick={() => scrollBy("right")}
                disabled={!canScrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/60 hover:bg-black/80 text-white p-2 shadow-lg transition-opacity duration-200 disabled:opacity-0 opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            <div
                className="pointer-events-none absolute inset-y-0 right-0 w-10 transition-opacity duration-200"
                style={{
                    opacity: canScrollRight ? 1 : 0,
                    background: "linear-gradient(90deg, rgba(0,0,0,0) 0%, var(--background, #0a0a0a) 100%)",
                }}
            />
        </div>
    );
}
