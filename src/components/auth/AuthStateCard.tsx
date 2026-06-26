import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AuthStateCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function AuthStateCard({
  icon,
  iconBg,
  title,
  description,
  children,
  backHref = "/login",
  backLabel = "Volver al inicio de sesión",
}: AuthStateCardProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F9FAFB] p-6">
      <div className="flex w-full max-w-[400px] flex-col items-center gap-6 text-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full ${iconBg}`}
        >
          {icon}
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-[#012340]">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-[#0D0D0D]/55">
            {description}
          </p>
        </div>

        {children && (
          <div className="flex w-full flex-col gap-3">{children}</div>
        )}

        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-[#0D0D0D]/40 transition-colors hover:text-[#0D0D0D]/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
