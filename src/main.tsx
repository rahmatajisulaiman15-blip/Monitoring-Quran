import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "@/lib/AuthContext";
import { AppDataProvider } from "@/lib/AppDataContext";
import { ClassProvider } from "@/lib/ClassContext";
import { MonthProvider } from "@/lib/MonthContext";
import { ToastProvider } from "@/lib/ToastContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppDataProvider>
            <ClassProvider>
              <MonthProvider>
                <App />
              </MonthProvider>
            </ClassProvider>
          </AppDataProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
