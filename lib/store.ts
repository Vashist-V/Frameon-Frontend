import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
    childMode: boolean;
    setChildMode: (val: boolean) => void;
    user: { id: string; email: string; display_name: string; avatar_url?: string } | null;
    setUser: (user: AppState["user"]) => void;
    clearUser: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            childMode: false,
            setChildMode: (val) => set({ childMode: val }),
            user: null,
            setUser: (user) => set({ user }),
            clearUser: () => set({ user: null }),
        }),
        {
            name: "frameon-store",
        }
    )
);
