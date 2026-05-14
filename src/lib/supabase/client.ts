import { createClient } from "@supabase/supabase-js";

let _capturedHash = "";
if (typeof window !== "undefined") {
    const h = window.location.hash || "";
    if (
        h &&
        (h.includes("access_token") ||
            h.includes("type=invite") ||
            h.includes("type=signup") ||
            h.includes("type=recovery") ||
            h.includes("type=magiclink"))
    ) {
        _capturedHash = h;
        try {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
        } catch {
            /* replaceState raramente falla */
        }
    }
}

export const CAPTURED_AUTH_HASH = _capturedHash;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;
