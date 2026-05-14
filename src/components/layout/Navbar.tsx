"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "./UserMenu";
import { getNavigationByRole } from "@/app/config/navigation";
import { cn } from "@/lib/utils";

interface NavbarProps {
  role: "admin" | "user";
  title?: string;
  subtitle?: string;
}

export function Navbar({ role, title, subtitle }: NavbarProps) {
  const pathname = usePathname();
  const now = new Date();
  const sessionLabel = now.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const sections = getNavigationByRole(role);
  const allItems = sections.flatMap((s) => s.items);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#0D0D0D]/10">
      {/* Brand row */}
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img
            src="/Imagen1.png"
            alt="Logo"
            className="h-8 w-auto object-contain sm:h-9"
          />
          {(title || subtitle) && (
            <div className="hidden sm:flex flex-col justify-center border-l border-[#0D0D0D]/10 pl-3 ml-1">
              {title && (
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35">
                  {title}
                </p>
              )}
              {subtitle && (
                <h1 className="text-sm font-bold text-[#012340] leading-tight">
                  {subtitle}
                </h1>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:block text-[11px] font-mono text-[#0D0D0D]/35">
            {sessionLabel}
          </span>
          <UserMenu />
        </div>
      </div>

      {/* Nav row */}
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] border-t border-[#0D0D0D]/6 px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center min-w-max">
          {allItems.map((item) => {
            const Icon = item.icon;
            const isDashboardOrHome =
              item.href === "/admin" || item.href === "/usuario";
            const isActive = isDashboardOrHome
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 border-b-2 py-2.5 px-4 text-[11px] font-bold tracking-[0.14em] uppercase transition-colors whitespace-nowrap",
                  isActive
                    ? "border-[#012340] text-[#012340]"
                    : "border-transparent text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70 hover:border-[#0D0D0D]/15",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
