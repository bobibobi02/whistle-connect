import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";
import { syncStorageFromPreferences } from "./lib/capacitorStorage";

// ========== Supabase Environment Verification ==========
// Log at startup (dev only) to confirm correct project is in use
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const expectedProject = "sdtuywnesmsanuazqgqx";

if (import.meta.env.DEV) {
  console.log("[Whistle] SUPABASE_URL =", supabaseUrl);
  if (supabaseUrl && supabaseUrl.includes(expectedProject)) {
    console.log("[Whistle] ✅ Connected to correct Supabase project");
  } else {
    console.error("[Whistle] ⚠️ WARNING: Supabase URL does not match expected project!", {
      expected: expectedProject,
      actual: supabaseUrl,
    });
  }
}

// Initialize storage sync for native platforms
const initApp = async () => {
  if (Capacitor.isNativePlatform()) {
    await syncStorageFromPreferences();
  }
  
  createRoot(document.getElementById("root")!).render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  );
};

initApp();
