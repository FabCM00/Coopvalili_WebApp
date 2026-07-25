"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export interface UseLoginFormReturn {
  email: string;
  password: string;
  otp: string;
  otpRequested: boolean;
  showPassword: boolean;
  errorMessage: string | null;
  loading: boolean;
  requestingOtp: boolean;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setOtp: (v: string) => void;
  togglePassword: () => void;
  clearEmail: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useLoginForm(): UseLoginFormReturn {
  const { requestOtp, login, user, error, loading } = useAuth();
  const router = useRouter();

  const [email, setEmailState] = useState("");
  const [password, setPasswordState] = useState("");
  const [otp, setOtpState] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasAuthError, setHasAuthError] = useState(false);

  useEffect(() => {
    if (user) router.push("/");
  }, [user, router]);

  useEffect(() => {
    if (error) setHasAuthError(true);
  }, [error]);

  const clearErrors = useCallback(() => {
    if (formError) setFormError(null);
    if (hasAuthError) setHasAuthError(false);
  }, [formError, hasAuthError]);

  const setEmail = useCallback(
    (v: string) => {
      setEmailState(v);
      clearErrors();
    },
    [clearErrors],
  );

  const setPassword = useCallback(
    (v: string) => {
      setPasswordState(v);
      clearErrors();
    },
    [clearErrors],
  );

  const setOtp = useCallback(
    (v: string) => {
      setOtpState(v);
      clearErrors();
    },
    [clearErrors],
  );

  const togglePassword = useCallback(() => setShowPassword((v) => !v), []);
  const clearEmail = useCallback(() => {
    setEmailState("");
    setOtpState("");
    setOtpRequested(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      setHasAuthError(false);

      if (!email.trim() && !password.trim()) {
        setFormError("Ingresa tu correo y contraseña para continuar.");
        return;
      }
      if (!email.trim()) {
        setFormError("El correo electrónico es obligatorio.");
        return;
      }
      if (!password.trim()) {
        setFormError("La contraseña es obligatoria.");
        return;
      }

      if (!otpRequested) {
        setRequestingOtp(true);
        const result = await requestOtp(email, password);
        setRequestingOtp(false);
        if (!result.ok) {
          setFormError(
            result.message ?? "No se pudo enviar el código. Intenta de nuevo.",
          );
          return;
        }
        setOtpRequested(true);
        return;
      }

      if (!otp.trim()) {
        setFormError("Ingresa el código de verificación.");
        return;
      }

      await login(email, password, otp);
    },
    [email, password, otp, otpRequested, requestOtp, login],
  );

  const errorMessage =
    formError ||
    (hasAuthError ? error || "Código o credenciales incorrectos." : null);

  return {
    email,
    password,
    otp,
    otpRequested,
    showPassword,
    errorMessage,
    loading,
    requestingOtp,
    setEmail,
    setPassword,
    setOtp,
    togglePassword,
    clearEmail,
    handleSubmit,
  };
}
