"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export interface UseLoginFormReturn {
  email: string;
  password: string;
  showPassword: boolean;
  errorMessage: string | null;
  loading: boolean;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  togglePassword: () => void;
  clearEmail: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useLoginForm(): UseLoginFormReturn {
  const { login, user, error, loading } = useAuth();
  const router = useRouter();

  const [email, setEmailState] = useState("");
  const [password, setPasswordState] = useState("");
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

  const togglePassword = useCallback(() => setShowPassword((v) => !v), []);
  const clearEmail = useCallback(() => setEmailState(""), []);

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

      await login(email, password);
    },
    [email, password, login],
  );

  const errorMessage =
    formError || (hasAuthError ? error || "Correo o contraseña incorrectos." : null);

  return {
    email,
    password,
    showPassword,
    errorMessage,
    loading,
    setEmail,
    setPassword,
    togglePassword,
    clearEmail,
    handleSubmit,
  };
}
