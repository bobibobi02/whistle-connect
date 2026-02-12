import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";
import { syncStorageFromPreferences } from "./lib/capacitorStorage";

// ========== Supabase Environment Verification ========== //
// Runtime guard: Extract and validate project ref from environment URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const projectRef = typeof supabaseUrl === "string" ? supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] : null;

// Log environment status
console.log("[Whistle] Project Ref:", projectRef || "NOT SET");
console.log("[Whistle] Supabase URL:", supabaseUrl || "NOT SET");

if (!supabaseUrl || !anonKey) {
  console.error("[Whistle] ❌ MISSING ENV VARS - VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set");
}

const initApp = async () => {
  if (Capacitor.isNativePlatform()) {
    await syncStorageFromPreferences();
  }

  createRoot(document.getElementById("root")!).render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>,
  );
};

initApp();
