"use client";

import { useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { WatchMediaState } from "@/components/WatchParty";

type WatchSyncMessage = {
    sender: string;
    state: WatchMediaState;
    sentAt: number;
};

type WatchSyncBridgeProps = {
    roomId: string | null;
    isHost: boolean;
    current: WatchMediaState;
    onApplyState: (state: WatchMediaState, options?: { startPlayback?: boolean }) => void;
};

function makeSenderId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSenderId() {
    const key = "frameon-watch-sync-tab";
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;

    const next = makeSenderId();
    window.sessionStorage.setItem(key, next);
    return next;
}

function channelName(roomId: string) {
    return `watch-party:${roomId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 96)}`;
}

function isWatchSyncMessage(value: unknown): value is WatchSyncMessage {
    if (!value || typeof value !== "object") return false;
    const message = value as Partial<WatchSyncMessage>;
    return typeof message.sender === "string" && !!message.state && typeof message.state === "object";
}

export default function WatchSyncBridge({ roomId, isHost, current, onApplyState }: WatchSyncBridgeProps) {
    const senderRef = useRef("");
    const channelRef = useRef<RealtimeChannel | null>(null);
    const currentRef = useRef(current);

    useEffect(() => {
        currentRef.current = current;
    }, [current]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            senderRef.current = getSenderId();
        }, 0);

        return () => window.clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (!roomId) return;

        const supabase = createClient();
        const channel = supabase.channel(channelName(roomId), {
            config: {
                broadcast: { self: false },
            },
        });

        channelRef.current = channel;
        channel.on("broadcast", { event: "sync" }, ({ payload }) => {
            if (isHost || !isWatchSyncMessage(payload) || payload.sender === senderRef.current) return;

            onApplyState(payload.state);
        });

        channel.subscribe();

        return () => {
            channelRef.current = null;
            supabase.removeChannel(channel);
        };
    }, [isHost, onApplyState, roomId]);

    const broadcast = useCallback(() => {
        if (!isHost || !roomId || !channelRef.current || !senderRef.current) return;

        const message: WatchSyncMessage = {
            sender: senderRef.current,
            state: { ...currentRef.current, updatedAt: Date.now() },
            sentAt: Date.now(),
        };

        channelRef.current.send({
            type: "broadcast",
            event: "sync",
            payload: message,
        }).catch(() => { });
    }, [isHost, roomId]);

    useEffect(() => {
        if (!isHost || !roomId) return;

        const timeout = window.setTimeout(broadcast, 350);
        return () => window.clearTimeout(timeout);
    }, [
        broadcast,
        current.episode,
        current.id,
        current.playing,
        current.season,
        current.source,
        current.syncVersion,
        current.type,
        isHost,
        roomId,
    ]);

    useEffect(() => {
        if (!isHost || !roomId) return;

        const interval = window.setInterval(broadcast, 7000);
        return () => window.clearInterval(interval);
    }, [broadcast, isHost, roomId]);

    return null;
}
