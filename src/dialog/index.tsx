import React from "react";
import { createRoot } from "react-dom/client";
import App from "../taskpane/App";
import ErrorBoundary from "../taskpane/ErrorBoundary";
import "../taskpane/styles.css";

function mount(): void {
  const root = document.getElementById("root");
  if (!root) throw new Error("Missing root element");
  createRoot(root).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
}

if (typeof Office === "undefined") {
  mount();
} else {
  Office.onReady(() => mount()).catch(() => mount());
}
