"use client";

import { useState, useRef, useEffect } from "react";
import { chatWithAI } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Bot, Send, Loader2, User } from "lucide-react";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function AIPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Hey! I'm Frameon AI 🎬 I can help you find movies and shows, give recommendations based on your mood, or answer anything about cinema. What are you in the mood for?",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = { role: "user", content: input.trim() };
        const history = messages.map((m) => ({ role: m.role, content: m.content }));
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const { response } = await chatWithAI(userMsg.content, history);
            setMessages((prev) => [...prev, { role: "assistant", content: response }]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, I'm having trouble connecting right now. Please try again!" },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const SUGGESTIONS = [
        "Recommend a good thriller for tonight",
        "What should I watch after Breaking Bad?",
        "Best Korean dramas of 2024",
        "Movies similar to Inception",
        "Feel-good movies for the weekend",
        "Best sci-fi series of all time",
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
            <Navbar />

            <div className="flex-1 max-w-3xl w-full mx-auto px-4 flex flex-col py-6">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-purple-600/20 border border-purple-600/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Bot className="w-7 h-7 text-purple-400" />
                    </div>
                    <h1 className="text-xl font-semibold">Frameon AI</h1>
                    <p className="text-gray-500 text-sm mt-1">Your personal movie & series guide</p>
                </div>

                {/* Suggestions (only when no user messages yet) */}
                {messages.length === 1 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => setInput(s)}
                                className="text-left text-sm bg-[#13131a] border border-[#2a2a3a] hover:border-purple-500/40 text-gray-400 hover:text-white px-3 py-2.5 rounded-xl transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 space-y-4 overflow-y-auto mb-4 min-h-0">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "assistant"
                                        ? "bg-purple-600/20 border border-purple-600/30"
                                        : "bg-[#8b5cf6]/15 border border-[#8b5cf6]/25"
                                    }`}
                            >
                                {msg.role === "assistant" ? (
                                    <Bot className="w-4 h-4 text-purple-400" />
                                ) : (
                                    <User className="w-4 h-4 text-[#c4b5fd]" />
                                )}
                            </div>
                            <div
                                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "assistant"
                                        ? "bg-[#13131a] border border-[#2a2a3a] text-gray-200"
                                        : "bg-[#8b5cf6]/15 border border-[#8b5cf6]/25 text-white"
                                    }`}
                            >
                                {msg.content.split("\n").map((line, j) => (
                                    <p key={j} className={j > 0 ? "mt-1" : ""}>{line}</p>
                                ))}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 bg-purple-600/20 border border-purple-600/30 rounded-full flex items-center justify-center">
                                <Bot className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="bg-[#13131a] border border-[#2a2a3a] px-4 py-3 rounded-2xl">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="bg-[#13131a] border border-[#2a2a3a] rounded-2xl flex items-end gap-2 p-3">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me anything about movies or shows..."
                        rows={1}
                        className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm resize-none focus:outline-none max-h-32"
                        style={{ minHeight: "24px" }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="w-8 h-8 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                    >
                        <Send className="w-3.5 h-3.5 text-white" />
                    </button>
                </div>
                <p className="text-center text-xs text-gray-600 mt-2">Press Enter to send · Shift+Enter for new line</p>
            </div>
        </div>
    );
}
