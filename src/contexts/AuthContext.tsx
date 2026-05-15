"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useRef,
    useCallback,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, auth, profiles } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";

// Fuera del componente: no se recrea en cada render.
const PROFILE_CACHE_TTL = 5 * 60 * 1000;

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    error: string | null;
    isLoggingOut: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Ref espejo del perfil — se mantiene sincronizado de forma inmediata
    // sin depender de un useEffect. Impide perder datos con errores transitorios.
    const profileRef = useRef<Profile | null>(null);
    const setProfileSynced = useCallback((p: Profile | null) => {
        profileRef.current = p;
        setProfile(p);
    }, []);

    // Deduplicación: evita llamadas paralelas a la DB para el mismo userId.
    const inflightRef = useRef<{
        userId: string;
        promise: Promise<Profile | null>;
    } | null>(null);
    const profileCacheRef = useRef<{ userId: string; at: number } | null>(null);

    const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
        const cache = profileCacheRef.current;
        if (
            cache?.userId === userId &&
            Date.now() - cache.at < PROFILE_CACHE_TTL &&
            profileRef.current
        ) {
            return profileRef.current;
        }

        if (inflightRef.current?.userId === userId) {
            return inflightRef.current.promise;
        }

        const promise = (async () => {
            const r = await profiles.getProfile(userId);
            if (!r.ok) {
                if (!profileRef.current) {
                    setError(r.error.message);
                    setProfileSynced(null);
                }
                return null;
            }
            setError(null);
            setProfileSynced(r.data);
            profileCacheRef.current = { userId, at: Date.now() };
            return r.data;
        })();

        inflightRef.current = { userId, promise };
        try {
            return await promise;
        } finally {
            if (inflightRef.current?.userId === userId) inflightRef.current = null;
        }
    }, [setProfileSynced]);

    const refreshProfile = useCallback(async (): Promise<Profile | null> => {
        if (!user?.id) return null;
        setError(null);
        profileCacheRef.current = null;
        return fetchProfile(user.id);
    }, [user?.id, fetchProfile]);

    useEffect(() => {
        let mounted = true;

        /*
         * onAuthStateChange recibe INITIAL_SESSION al montar con la sesión
         * existente (o null). Esto elimina la necesidad de un bootstrap IIFE
         * separado con auth.getSession().
         *
         * Cualquier llamada async se difiere con setTimeout(0) para liberar
         * el lock interno del SDK antes de consultar la DB, evitando deadlocks.
         */
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);

            if (!sessionUser) {
                setProfileSynced(null);
                if (mounted) setLoading(false);
                return;
            }

            setTimeout(() => {
                if (!mounted) return;
                fetchProfile(sessionUser.id).finally(() => {
                    if (mounted) setLoading(false);
                });
            }, 0);
        });

        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, [fetchProfile, setProfileSynced]);

    const login = useCallback(async (email: string, password: string) => {
        setLoading(true);
        setError(null);

        const r = await auth.signIn(email, password);
        if (!r.ok) {
            // onAuthStateChange no dispara en signIn fallido.
            setError(r.error.message);
            setLoading(false);
            return;
        }

        // fetchProfile comparte el inflight con el setTimeout(0) de onAuthStateChange,
        // por lo que solo se hace una llamada a la DB.
        const p = await fetchProfile(r.data.user.id);

        if (p && p.estado !== true) {
            // signOut dispara onAuthStateChange → setUser(null), setProfileSynced(null), setLoading(false).
            await auth.signOut();
            setError("Tu cuenta está inactiva. Asegúrate de configurar tu contraseña usando el enlace de invitación.");
            return;
        }

        // Happy path: onAuthStateChange ya llamó setUser y su .finally() llamará setLoading(false).
    }, [fetchProfile]);

    const logout = useCallback(async () => {
        setError(null);
        setIsLoggingOut(true);
        setUser(null);
        setProfileSynced(null);
        const r = await auth.signOut();
        if (!r.ok) setError(r.error.message);
        setIsLoggingOut(false);
    }, [setProfileSynced]);

    return (
        <AuthContext.Provider
            value={{ user, profile, loading, error, isLoggingOut, login, logout, refreshProfile }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};
