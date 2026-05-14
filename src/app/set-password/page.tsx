"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Eye,
    EyeOff,
    Loader2,
    CheckCircle,
    ShieldCheck,
    LockKeyhole,
    AlertCircle,
} from "lucide-react";

import { auth, CAPTURED_AUTH_HASH, profiles } from "@/lib/supabase";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";


export default function SetPasswordPage() {
    const router = useRouter();

    const [ready, setReady] = useState(false);
    const [hasSession, setHasSession] = useState(false);

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const [error, setError] = useState("");

    const accessTokenRef = useRef<string | null>(null);
    const userIdRef = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const finish = (
            errMsg?: string,
            sessionOk = false,
        ) => {
            if (cancelled) return;

            if (errMsg) setError(errMsg);

            if (sessionOk) setHasSession(true);

            setReady(true);
        };

        (async () => {
            const hash = CAPTURED_AUTH_HASH.startsWith("#")
                ? CAPTURED_AUTH_HASH.slice(1)
                : CAPTURED_AUTH_HASH;

            const params = new URLSearchParams(hash);

            const access_token =
                params.get("access_token");

            const refresh_token =
                params.get("refresh_token");

            // Caso A: token desde email
            if (access_token && refresh_token) {
                accessTokenRef.current =
                    access_token;

                await auth.signOut("local");

                if (cancelled) return;

                const r =
                    await auth.setSessionFromTokens(
                        access_token,
                        refresh_token,
                    );

                if (cancelled) return;

                if (!r.ok) {
                    finish(
                        "No se pudo verificar la invitación.",
                    );
                    return;
                }

                if (r.data?.user) {
                    userIdRef.current =
                        r.data.user.id;
                }

                finish(undefined, true);
                return;
            }

            // Caso B: sesión ya abierta
            const session =
                await auth.getSession();

            if (cancelled) return;

            if (session.ok && session.data?.user) {
                accessTokenRef.current =
                    session.data.access_token;

                userIdRef.current =
                    session.data.user.id;

                finish(undefined, true);

                return;
            }

            finish(
                "Token inválido o expirado. Solicita una nueva invitación.",
            );
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleSubmit = async (
        e: React.FormEvent,
    ) => {
        e.preventDefault();

        setError("");

        if (password.length < 6) {
            setError(
                "La contraseña debe tener al menos 6 caracteres.",
            );
            return;
        }

        if (password !== confirm) {
            setError(
                "Las contraseñas no coinciden.",
            );
            return;
        }

        const token =
            accessTokenRef.current;

        if (!token) {
            setError(
                "No se encontró el token de invitación.",
            );
            return;
        }

        setLoading(true);

        const r = await auth.updatePassword(
            password,
            token,
        );

        if (!r.ok) {
            setError(r.error.message);
            setLoading(false);
            return;
        }

        // Activar perfil
        if (userIdRef.current) {
            await profiles.updateProfile(
                userIdRef.current,
                {
                    estado: true,
                },
            );
        }

        setLoading(false);
        setDone(true);

        setTimeout(async () => {
            await auth.signOut("local");
            router.replace("/login");
        }, 2000);
    };

    const inputBase =
        "w-full h-12 rounded-[10px] border-[1.2px] bg-white pl-11 pr-11 text-base shadow-sm outline-none transition";

    const inputNormal =
        "border-[#0D0D0D]/15 focus:border-[#F29A2E] focus:ring-2 focus:ring-[#F29A2E]/30";

    const inputError =
        "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200";

    const showError = !!error;

    if (!ready) {
        return (
            <LoadingScreen message="Verificando invitación..." />
        );
    }

    if (!hasSession) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white p-4">
                <div className="w-full max-w-[420px]  bg-white p-8 ">

                    <div className="mb-6 flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>
                    </div>

                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-bold text-[#012340]">
                            Invitación inválida
                        </h1>

                        <p className="mt-2 text-sm text-[#0D0D0D]/60">
                            {error}
                        </p>
                    </div>

                    <Button
                        onClick={() =>
                            router.replace("/login")
                        }
                        className="h-12 w-full rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] hover:bg-[#F28A2E]"
                    >
                        Volver al login
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-white p-[10px]">
            <div className="flex w-full max-w-[420px] flex-col gap-6 px-[16px]">

                {/* Logo */}
                <div className="flex justify-center">
                    <img
                        src="https://i.imgur.com/kBwQizJ.jpeg"
                        alt="Want logo"
                        className="h-20 w-20"
                    />
                </div>

                {/* Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-[#012340]">
                        Crea tu contraseña
                    </h1>

                    <p className="text-base font-medium text-[#0D0D0D]/60">
                        Configura el acceso seguro para tu cuenta.
                    </p>
                </div>

                {/* Success */}
                {done ? (
                    <div className="flex flex-col items-center justify-center gap-4 rounded-[16px] border border-green-200 bg-green-50 p-8">

                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle className="h-9 w-9 text-green-600" />
                        </div>

                        <div className="text-center">
                            <h2 className="text-lg font-semibold text-green-700">
                                Contraseña creada
                            </h2>

                            <p className="mt-1 text-sm text-green-600">
                                Redirigiendo al inicio de sesión...
                            </p>
                        </div>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-5"
                    >
                        {/* Password */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-[#012340]">
                                Nueva contraseña
                            </label>

                            <div className="relative">
                                <ShieldCheck
                                    className={cn(
                                        "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 transition",
                                        showError
                                            ? "text-red-500"
                                            : "text-[#0D0D0D]/40",
                                    )}
                                />

                                <Input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Mínimo 6 caracteres"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(
                                            e.target.value,
                                        )
                                    }
                                    required
                                    className={cn(
                                        inputBase,
                                        showError
                                            ? inputError
                                            : inputNormal,
                                    )}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(
                                            (v) => !v,
                                        )
                                    }
                                    className={cn(
                                        "absolute right-3.5 top-1/2 -translate-y-1/2 transition",
                                        showError
                                            ? "text-red-500 hover:text-red-700"
                                            : "text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70",
                                    )}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirm */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-[#012340]">
                                Confirmar contraseña
                            </label>

                            <div className="relative">
                                <LockKeyhole
                                    className={cn(
                                        "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 transition",
                                        showError
                                            ? "text-red-500"
                                            : "text-[#0D0D0D]/40",
                                    )}
                                />

                                <Input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Repite tu contraseña"
                                    value={confirm}
                                    onChange={(e) =>
                                        setConfirm(
                                            e.target.value,
                                        )
                                    }
                                    required
                                    className={cn(
                                        inputBase,
                                        showError
                                            ? inputError
                                            : inputNormal,
                                    )}
                                />
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

                                <p className="text-sm font-medium text-red-600">
                                    {error}
                                </p>
                            </div>
                        )}

                        {/* Button */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-12 w-full rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E] disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                "Crear contraseña"
                            )}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}