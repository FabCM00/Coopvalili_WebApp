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
import { supabase, auth, profiles } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";

interface AuthContextType {
    user: any;
    profile: Profile | null;
    loading: boolean;
    error: string | null;
    isLoggingOut: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (
        email: string,
        password: string,
        username: string,
    ) => Promise<boolean>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Memoria viva para no machacar el perfil cuando hay errores transitorios.
    const profileRef = useRef<Profile | null>(null);
    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    // Deduplicacion de fetch de profile por userId.
    const inflightRef = useRef<{
        userId: string;
        promise: Promise<Profile | null>;
    } | null>(null);
    const profileCacheRef = useRef<{ userId: string; at: number } | null>(null);
    const PROFILE_CACHE_TTL = 5 * 60 * 1000;

    const fetchProfile = useCallback(
        async (userId: string): Promise<Profile | null> => {
            // Devuelve el perfil cacheado si fue obtenido hace menos de 5 minutos
            const cache = profileCacheRef.current;
            if (
                cache?.userId === userId &&
                Date.now() - cache.at < PROFILE_CACHE_TTL &&
                profileRef.current
            ) {
                return profileRef.current;
            }

            const inflight = inflightRef.current;
            if (inflight && inflight.userId === userId) {
                return inflight.promise;
            }

            const promise = (async () => {
                const r = await profiles.getProfile(userId);
                if (!r.ok) {
                    if (!profileRef.current) {
                        setError(r.error.message);
                        setProfile(null);
                    }
                    return null;
                }
                setError(null);
                setProfile(r.data);
                profileCacheRef.current = { userId, at: Date.now() };
                return r.data;
            })();

            inflightRef.current = { userId, promise };
            try {
                return await promise;
            } finally {
                if (inflightRef.current?.userId === userId) {
                    inflightRef.current = null;
                }
            }
        },
        [],
    );

    const refreshProfile = useCallback(async (): Promise<Profile | null> => {
        if (!user?.id) return null;
        setError(null);
        profileCacheRef.current = null;
        return fetchProfile(user.id);
    }, [user?.id, fetchProfile]);

    /**
     * IMPORTANTE: el callback de onAuthStateChange NO es async y NO usa
     * await en su cuerpo principal. El SDK mantiene un lock interno mientras
     * este callback corre; si dentro hacemos otra llamada al cliente
     * (fetchProfile consulta profiles), se produce un deadlock que cuelga
     * otras operaciones del SDK (p.ej. updateUser nunca resuelve).
     *
     * La forma correcta: actualizar estado sincronamente y diferir cualquier
     * llamada async con setTimeout(..., 0), asi el lock se libera primero.
     */
    useEffect(() => {
        let mounted = true;

        // Bootstrap inicial.
        (async () => {
            const r = await auth.getSession();
            if (!mounted) return;
            const sessionUser = r.ok ? r.data?.user ?? null : null;
            setUser(sessionUser);
            if (sessionUser) {
                await fetchProfile(sessionUser.id);
            }
            setLoading(false);
        })();

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                const sessionUser = session?.user ?? null;
                setUser(sessionUser);
                if (!sessionUser) {
                    setProfile(null);
                    setLoading(false);
                    return;
                }
                setTimeout(() => {
                    if (!mounted) return;
                    fetchProfile(sessionUser.id).finally(() => {
                        if (mounted) setLoading(false);
                    });
                }, 0);
            },
        );

        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const login = useCallback(
        async (email: string, password: string) => {
            setLoading(true);
            setError(null);
            const r = await auth.signIn(email, password);
            if (!r.ok) {
                setError(r.error.message);
                setLoading(false);
                return;
            }
            const p = await fetchProfile(r.data.user.id);

            // Verificamos si el usuario tiene el estado activo
            if (p && p.estado !== true) {
                await auth.signOut();
                setError("Tu cuenta está inactiva. Asegúrate de configurar tu contraseña usando el enlace de invitación.");
                setLoading(false);
                return;
            }

            setUser(r.data.user);
            setLoading(false);
        },
        [fetchProfile],
    );

    const register = useCallback(
        async (
            email: string,
            password: string,
            username: string,
        ): Promise<boolean> => {
            setLoading(true);
            setError(null);
            const r = await auth.signUp(email, password, username);
            if (!r.ok) {
                setError(r.error.message);
                setLoading(false);
                return false;
            }
            if (r.data.user) await fetchProfile(r.data.user.id);
            setLoading(false);
            return true;
        },
        [fetchProfile],
    );

    const logout = useCallback(async () => {
        setError(null);
        setIsLoggingOut(true);
        setUser(null);
        setProfile(null);
        const r = await auth.signOut();
        if (!r.ok) setError(r.error.message);
        setIsLoggingOut(false);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                error,
                isLoggingOut,
                login,
                register,
                logout,
                refreshProfile,
            }}
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
