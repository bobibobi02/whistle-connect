import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";
import { syncStorageFromPreferences } from "./lib/capacitorStorage";

// ========== Supabase Environment Verification ==========
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const expectedProject = "sdtuywnesmsanuazqgqx";

// Extract project ref from URL
const projectRef = typeof supabaseUrl === "string" ? supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] : null;

console.log("[Debug] Supabase Project Ref:", projectRef || "NOT SET");

if (import.meta.env.DEV) {
  console.log("=".repeat(60));
  console.log("[Whistle] 🚀 STARTUP ENVIRONMENT CHECK");
  console.log("[Whistle] VITE_SUPABASE_URL:", supabaseUrl || "NOT SET");
  console.log(
    "[Whistle] VITE_SUPABASE_ANON_KEY (or PUBLISHABLE_KEY):",
    anonKey ? `${anonKey.substring(0, 20)}...` : "NOT SET",
  );
  console.log("[Whistle] Extracted Project Ref:", projectRef);
  console.log("[Whistle] Expected Project Ref:", expectedProject);

  if (!supabaseUrl || !anonKey) {
    console.error("[Whistle] ❌ MISSING ENV VARS - App may not function correctly!");
  } else if (projectRef === expectedProject) {
    console.log("[Whistle] ✅ Using correct Supabase project:", projectRef);
  } else {
    console.error("[Whistle] ❌ PROJECT MISMATCH!");
    console.error("[Whistle] Expected:", expectedProject);
    console.error("[Whistle] Actual:", projectRef);
  }
  console.log("=".repeat(60));
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
