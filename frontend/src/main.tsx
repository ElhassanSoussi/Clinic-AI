import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import App from "./app/App";
import { AuthProvider } from "@/lib/auth-context";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster richColors closeButton position="top-right" />
    </AuthProvider>
  </StrictMode>,
);
