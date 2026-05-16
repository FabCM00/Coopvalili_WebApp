"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck, LockKeyhole, AlertCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthIllustrationPage } from "@/components/auth/AuthIllustrationPage";
import { LoadingScreen } from "@/components/LoadingScreen";
import { auth, CAPTURED_AUTH_HASH, profiles } from "@/lib/supabase";

const inputBase =
    "w-full h-12 rounded-[10px] border-[1.2px] bg-white pl-11 pr-11 text-base shadow-sm outline-none transition";
const inputNormal =
    "border-[#0D0D0D]/15 focus:border-[#F29A2E] focus:ring-2 focus:ring-[#F29A2E]/30";
const inputError =
    "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200";

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

        const finish = (errMsg?: string, sessionOk = false) => {
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
            const access_token = params.get("access_token");
            const refresh_token = params.get("refresh_token");

            if (access_token && refresh_token) {
                accessTokenRef.current = access_token;
                // signOutIsolated: solo limpia sessionStorage de esta pestaña,
                // no toca la sesión del admin en otras pestañas (localStorage).
                await auth.signOutIsolated("local");
                if (cancelled) return;

                const r = await auth.setSessionFromTokensIsolated(access_token, refresh_token);
                if (cancelled) return;

                if (!r.ok) { finish("No se pudo verificar la invitación."); return; }
                if (r.data?.user) userIdRef.current = r.data.user.id;
                finish(undefined, true);
                return;
            }

            // Sin hash: busca sesión previa en sessionStorage de esta pestaña.
            const session = await auth.getSessionIsolated();
            if (cancelled) return;

            if (session.ok && session.data?.user) {
                accessTokenRef.current = session.data.access_token;
                userIdRef.current = session.data.user.id;
                finish(undefined, true);
                return;
            }

            finish("Token inválido o expirado. Solicita una nueva invitación.");
        })();

        return () => { cancelled = true; };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
        if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }

        const token = accessTokenRef.current;
        if (!token) { setError("No se encontró el token de invitación."); return; }

        setLoading(true);
        const r = await auth.updatePassword(password, token);

        if (!r.ok) { setError(r.error.message); setLoading(false); return; }

        if (userIdRef.current) {
            await profiles.updateProfileWithToken(userIdRef.current, { estado: true }, token);
        }

        setLoading(false);
        setDone(true);

        setTimeout(async () => {
            await auth.signOut("local");
            router.replace("/login");
        }, 2500);
    };

    if (!ready) return <LoadingScreen message="Verificando invitación..." />;

    if (done) {
        return (
            <AuthIllustrationPage
                imageSrc="/forgot-password-exitoso.png"
                imageAlt="Contraseña creada"
                title="¡Contraseña creada!"
                body="Tu acceso está listo. Serás redirigido al inicio de sesión en un momento."
            >
                <Button onClick={() => router.replace("/login")} variant="outline"
                    className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E]2">
                    <ArrowLeft className="h-4 w-4" />
                    Volver al login
                </Button>
            </AuthIllustrationPage>
        );
    }

    if (!hasSession) {
        return (
            <AuthIllustrationPage
                imageSrc="/forgot-password-error.png"
                imageAlt="Enlace inválido"
                title="Invitación inválida"
                body="Parece que este enlace no es válido o ha expirado. Solicita una nueva invitación para continuar."
            >
                <Button onClick={() => router.replace("/login")} variant="outline"
                    className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E]">
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio de sesión
                </Button>
            </AuthIllustrationPage>
        );
    }

    const showErr = !!error;

    return (
        <AuthShell>
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-[#012340]">
                    Crea tu contraseña
                </h1>
                <p className="text-base font-medium text-[#0D0D0D]/60">
                    Configura el acceso seguro para tu cuenta.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-[#012340]">Nueva contraseña</label>
                    <div className="relative">
                        <ShieldCheck className={cn(
                            "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 transition",
                            showErr ? "text-red-500" : "text-[#0D0D0D]/40",
                        )} />
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={cn(inputBase, showErr ? inputError : inputNormal)}
                        />
                        <button type="button" onClick={() => setShowPassword((v) => !v)}
                            className={cn(
                                "absolute right-3.5 top-1/2 -translate-y-1/2 transition",
                                showErr ? "text-red-500 hover:text-red-700" : "text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70",
                            )}>
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-[#012340]">Confirmar contraseña</label>
                    <div className="relative">
                        <LockKeyhole className={cn(
                            "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 transition",
                            showErr ? "text-red-500" : "text-[#0D0D0D]/40",
                        )} />
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Repite tu contraseña"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            className={cn(inputBase, showErr ? inputError : inputNormal)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <p className="text-sm font-medium text-red-600">{error}</p>
                    </div>
                )}

                <Button type="submit" disabled={loading}
                    className="h-12 w-full rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E] disabled:opacity-50">
                    {loading
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                        : "Crear contraseña"}
                </Button>
            </form>
        </AuthShell>
    );
}
