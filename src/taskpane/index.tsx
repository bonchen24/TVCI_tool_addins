import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";

let isMounted = false;

const mountApp = (info?: unknown) => {
  if (isMounted) return;
  isMounted = true;

  const root = document.getElementById("root");
  if (!root) throw new Error("Missing root element");

  try {
    createRoot(root).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (err) {
    console.error("Failed to render React application:", err);
    root.innerHTML = `
      <div style="padding: 24px; font-family: sans-serif; color: #a80000; background: #fdf3f4; border: 1px solid #f1aeb5; border-radius: 6px; margin: 16px;">
        <h3 style="margin-top: 0;">Lỗi hiển thị TVCI Word Tools</h3>
        <p style="font-size: 13px;">${String(err)}</p>
        <p style="font-size: 11px; color: #666;">Source: ${String(info ?? "normal")}</p>
      </div>
    `;
  }
};

if (typeof Office === "undefined") {
  mountApp("browser");
} else {
  Office.onReady(mountApp).catch((err) => {
    console.warn("Office.onReady failed:", err);
    mountApp("office-error");
  });

  // Failsafe: Never allow Office.onReady delay or hang to cause a permanent blank screen
  setTimeout(() => {
    mountApp("timeout-failsafe");
  }, 2000);
}

