"use client";

import {
    DisconnectButton,
    LiveKitRoom,
    ParticipantTile,
    RoomAudioRenderer,
    StartAudio,
    TrackToggle,
    useDataChannel,
    useLocalParticipant,
    useParticipants,
    useTracks,
} from "@livekit/components-react";
import { Copy, Loader2, Mic, MonitorUp, Pause, PhoneOff, Play, Radio, Users, Video, X } from "lucide-react";
import { Track } from "livekit-client";
import { useCallback, useEffect, useMemo, useState } from "react";

export type WatchMediaState = {
    type: string;
    id: string;
    title: string;
    source: string;
    season: number;
    episode: number;
    playing: boolean;
    syncVersion: number;
    updatedAt: number;
};

type WatchPartyProps = {
    roomId: string | null;
    shareUrl: string;
    isHost: boolean;
    defaultName: string;
    current: WatchMediaState;
    sidebar?: boolean;
    onCreateRoom: () => string;
    onEndRoom: () => void;
    onApplyState: (state: WatchMediaState, options?: { startPlayback?: boolean }) => void;
    onStartPlayback: () => void;
    onPausePlayback: () => void;
};

type TokenResponse = {
    token: string;
    url: string;
    room: string;
    error?: string;
};

type WatchMessage =
    | { kind: "state"; sender: string; state: WatchMediaState }
    | { kind: "start"; sender: string; state: WatchMediaState }
    | { kind: "pause"; sender: string; state: WatchMediaState };

const WATCH_TOPIC = "frameon-watch-state";

function randomId(prefix: string) {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getStableIdentity() {
    if (typeof window === "undefined") return randomId("guest");

    const key = "frameon-watch-identity";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;

    const next = randomId("guest");
    window.localStorage.setItem(key, next);
    return next;
}

function decodeMessage(payload: Uint8Array) {
    try {
        return JSON.parse(new TextDecoder().decode(payload)) as WatchMessage;
    } catch {
        return null;
    }
}

function WatchPartyRoom({
    current,
    isHost,
    onApplyState,
    onStartPlayback,
    onPausePlayback,
    sidebar = false,
}: {
    current: WatchMediaState;
    isHost: boolean;
    onApplyState: WatchPartyProps["onApplyState"];
    onStartPlayback: () => void;
    onPausePlayback: () => void;
    sidebar?: boolean;
}) {
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();
    const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

    const onMessage = useCallback((message: { payload: Uint8Array; from?: { identity?: string } }) => {
        const parsed = decodeMessage(message.payload);
        if (!parsed || parsed.sender === localParticipant.identity) return;

        setLastSyncAt(Date.now());
        onApplyState(parsed.state, { startPlayback: parsed.kind === "start" });
    }, [localParticipant.identity, onApplyState]);

    const { send, isSending } = useDataChannel(WATCH_TOPIC, onMessage);
    const encoder = useMemo(() => new TextEncoder(), []);
    const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);

    const sendState = useCallback(async (kind: WatchMessage["kind"], overrides?: Partial<WatchMediaState>) => {
        const payload: WatchMessage = {
            kind,
            sender: localParticipant.identity,
            state: { ...current, ...overrides, updatedAt: Date.now() },
        };

        await send(encoder.encode(JSON.stringify(payload)), { reliable: true });
        setLastSyncAt(Date.now());
    }, [current, encoder, localParticipant.identity, send]);

    useEffect(() => {
        if (!isHost) return;

        const timeout = window.setTimeout(() => {
            sendState("state").catch(() => { });
        }, 600);

        return () => window.clearTimeout(timeout);
    }, [current.episode, current.id, current.playing, current.season, current.source, current.syncVersion, current.type, isHost, sendState]);

    useEffect(() => {
        if (!isHost) return;

        const interval = window.setInterval(() => {
            sendState("state").catch(() => { });
        }, 8000);

        return () => window.clearInterval(interval);
    }, [isHost, sendState]);

    useEffect(() => {
        if (!isHost || participants.length < 2) return;

        const timeout = window.setTimeout(() => {
            sendState("state").catch(() => { });
        }, 400);

        return () => window.clearTimeout(timeout);
    }, [isHost, participants.length, sendState]);

    const syncStart = () => {
        onStartPlayback();
        sendState("start", { playing: true }).catch(() => { });
    };

    const syncPause = () => {
        onPausePlayback();
        sendState("pause", { playing: false }).catch(() => { });
    };

    const tileGridClass = sidebar
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 gap-2"
        : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2";

    return (
        <div className="space-y-3">
            <div className={tileGridClass}>
                {tracks.slice(0, 4).map((trackRef) => (
                    <ParticipantTile
                        key={`${trackRef.participant.identity}-${trackRef.source}`}
                        trackRef={trackRef}
                        className="!rounded-lg !border !border-[#2a2a3a] !bg-[#0d0d14] !min-h-[108px] overflow-hidden"
                    />
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <TrackToggle
                    source={Track.Source.Microphone}
                    showIcon={false}
                    className="flex items-center gap-1.5 rounded-lg border border-[#2a2a3a] px-3 py-2 text-xs text-gray-200 hover:border-gray-500"
                >
                    <Mic className="h-3.5 w-3.5" />
                    Mic
                </TrackToggle>
                <TrackToggle
                    source={Track.Source.Camera}
                    showIcon={false}
                    className="flex items-center gap-1.5 rounded-lg border border-[#2a2a3a] px-3 py-2 text-xs text-gray-200 hover:border-gray-500"
                >
                    <Video className="h-3.5 w-3.5" />
                    Camera
                </TrackToggle>
                <TrackToggle
                    source={Track.Source.ScreenShare}
                    showIcon={false}
                    className="flex items-center gap-1.5 rounded-lg border border-[#2a2a3a] px-3 py-2 text-xs text-gray-200 hover:border-gray-500"
                >
                    <MonitorUp className="h-3.5 w-3.5" />
                    Screen
                </TrackToggle>
                {isHost && (
                    <>
                        <button
                            onClick={syncStart}
                            disabled={isSending}
                            className="flex items-center gap-1.5 rounded-lg bg-[#8b5cf6] px-3 py-2 text-xs font-medium text-white hover:bg-[#7c3aed] disabled:opacity-60"
                        >
                            {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            Start All
                        </button>
                        <button
                            onClick={syncPause}
                            disabled={isSending}
                            className="flex items-center gap-1.5 rounded-lg border border-[#2a2a3a] px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500 disabled:opacity-60"
                        >
                            <Pause className="h-3.5 w-3.5" />
                            Pause All
                        </button>
                    </>
                )}
                <DisconnectButton
                    className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-2 text-xs text-red-200 hover:bg-red-500/10"
                    stopTracks
                >
                    <PhoneOff className="h-3.5 w-3.5" />
                    Leave
                </DisconnectButton>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span>{participants.length} in room</span>
                <span>{isHost ? "Host controls sync" : "Following host sync"}</span>
                {!isHost && <span>Playback follows the host</span>}
                {lastSyncAt && <span>Synced {new Date(lastSyncAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            </div>

            <StartAudio
                label="Enable room audio"
                className="rounded-lg border border-[#2a2a3a] px-3 py-2 text-xs text-gray-200 hover:border-gray-500"
            />
            <RoomAudioRenderer />
        </div>
    );
}

export default function WatchParty({
    roomId,
    shareUrl,
    isHost,
    defaultName,
    current,
    sidebar = false,
    onCreateRoom,
    onEndRoom,
    onApplyState,
    onStartPlayback,
    onPausePlayback,
}: WatchPartyProps) {
    const [name, setName] = useState(defaultName || "Guest");
    const [identity, setIdentity] = useState("");
    const [token, setToken] = useState<string | null>(null);
    const [serverUrl, setServerUrl] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);
    const [joined, setJoined] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setIdentity(getStableIdentity());
        }, 0);

        return () => window.clearTimeout(timeout);
    }, []);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setName((currentName) => (
                !currentName || currentName === "Guest" ? defaultName || "Guest" : currentName
            ));
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [defaultName]);

    useEffect(() => {
        if (roomId) return;

        const timeout = window.setTimeout(() => {
            setToken(null);
            setServerUrl(null);
            setJoined(false);
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [roomId]);

    const copyLink = async () => {
        if (!shareUrl) return;

        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
    };

    const joinRoom = async () => {
        const activeRoom = roomId || onCreateRoom();
        if (!activeRoom || !identity) return;

        setJoining(true);
        setError(null);

        try {
            const response = await fetch("/api/livekit/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    room: activeRoom,
                    identity,
                    name,
                    role: isHost ? "host" : "guest",
                }),
            });

            const data = (await response.json()) as TokenResponse;
            if (!response.ok) throw new Error(data.error || "Unable to join room");

            setToken(data.token);
            setServerUrl(data.url);
            setJoined(true);
        } catch (joinError) {
            setError(joinError instanceof Error ? joinError.message : "Unable to join room");
        } finally {
            setJoining(false);
        }
    };

    const endRoom = () => {
        setJoined(false);
        setToken(null);
        setServerUrl(null);
        onEndRoom();
    };

    const sectionClass = sidebar
        ? "bg-[#13131a] border border-[#2a2a3a] rounded-xl p-4 h-full min-h-0 overflow-hidden flex flex-col"
        : "bg-[#13131a] border border-[#2a2a3a] rounded-xl p-4 mb-6";
    const bodyClass = sidebar ? "space-y-4 flex-1 min-h-0 overflow-y-auto pr-1" : "space-y-4";
    const formRowClass = sidebar ? "flex flex-col gap-2" : "flex flex-col gap-2 sm:flex-row";

    return (
        <section className={sectionClass} data-testid="watch-party-panel">
            <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center">
                        <Users className="h-4 w-4 text-[#d7c3ff]" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-white">Watch Along</h2>
                        <p className="text-xs text-gray-500">{current.title}</p>
                    </div>
                </div>

                <button
                    onClick={endRoom}
                    className="ml-auto rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-white"
                    title="Close watch along"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {!roomId && (
                <button
                    onClick={onCreateRoom}
                    className="flex items-center gap-2 rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7c3aed]"
                >
                    <Radio className="h-4 w-4" />
                    Start Room
                </button>
            )}

            {roomId && (
                <div className={bodyClass}>
                    <div className={formRowClass}>
                        <input
                            value={shareUrl}
                            readOnly
                            className="min-w-0 flex-1 rounded-lg border border-[#2a2a3a] bg-[#0d0d14] px-3 py-2 text-xs text-gray-300 outline-none"
                        />
                        <button
                            onClick={copyLink}
                            className="flex items-center justify-center gap-1.5 rounded-lg border border-[#2a2a3a] px-3 py-2 text-xs text-gray-200 hover:border-gray-500"
                        >
                            <Copy className="h-3.5 w-3.5" />
                            {copied ? "Copied" : "Copy Link"}
                        </button>
                    </div>

                    {!joined && (
                        <div className={formRowClass}>
                            <input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Display name"
                                className="min-w-0 flex-1 rounded-lg border border-[#2a2a3a] bg-[#0d0d14] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#8b5cf6]"
                            />
                            <button
                                onClick={joinRoom}
                                disabled={joining || !identity}
                                className="flex items-center justify-center gap-1.5 rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7c3aed] disabled:opacity-60"
                            >
                                {joining && <Loader2 className="h-4 w-4 animate-spin" />}
                                Join Room
                            </button>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-300">{error}</p>}

                    {joined && token && serverUrl && (
                        <LiveKitRoom
                            token={token}
                            serverUrl={serverUrl}
                            connect
                            audio={false}
                            video={false}
                            onDisconnected={() => setJoined(false)}
                            onError={(roomError) => setError(roomError.message)}
                            className="block"
                        >
                            <WatchPartyRoom
                                current={current}
                                isHost={isHost}
                            onApplyState={onApplyState}
                            onStartPlayback={onStartPlayback}
                            onPausePlayback={onPausePlayback}
                            sidebar={sidebar}
                        />
                    </LiveKitRoom>
                    )}
                </div>
            )}
        </section>
    );
}
