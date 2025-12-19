import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";
import { syncStorageFromPreferences } from "./lib/capacitorStorage";

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
