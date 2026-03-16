"use client";

import { create } from "zustand";
import api from "@/lib/api";
import type { AuthUser, LoginResponse } from "@/lib/auth";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email: string, password: string) => {
    const res = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    const { access_token, user } = res.data;
    localStorage.setItem("access_token", access_token);
    set({ user, token: access_token });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    set({ user: null, token: null });
    window.location.href = "/login";
  },

  hydrate: () => {
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ isLoading: false });
      return;
    }
    api
      .get<AuthUser>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        set({ user: res.data, token, isLoading: false });
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        set({ user: null, token: null, isLoading: false });
      });
  },
}));
