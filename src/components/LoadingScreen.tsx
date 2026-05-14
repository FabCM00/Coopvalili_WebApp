"use client";

interface LoadingScreenProps {
    message?: string;
}

export function LoadingScreen({ message = "Cargando..." }: LoadingScreenProps) {
    return (
        <div className="flex h-[100dvh] w-full items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-5">
                <div className="relative h-10 w-10">
                    <div className="absolute inset-0 rounded-full border-[3px] border-[#F29A2E]/20" />
                    <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[#F29A2E]" />
                </div>
                <p className="text-sm font-medium text-[#0D0D0D]/60">{message}</p>
            </div>
        </div>
    );
}
