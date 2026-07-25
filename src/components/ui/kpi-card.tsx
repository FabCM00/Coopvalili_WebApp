import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  color: string;
  label: string;
  value: string;
  icon?: LucideIcon;
}

export function KpiCard({ color, label, value, icon: Icon }: KpiCardProps) {
  return (
    <div
      className={`bg-white border border-[#0D0D0D]/10 border-l-4 ${color} p-4 flex items-center justify-between`}
    >
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/50">
          {label}
        </p>
        <p className="mt-2 text-3xl font-bold text-brand-navy">{value}</p>
      </div>
      {Icon && (
        <div className="bg-brand-navy/5 text-brand-navy p-3 rounded-lg">
          <Icon className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}
