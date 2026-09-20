import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("task pane mounts safely when Office.js is not available yet", () => {
  const source = fs.readFileSync("src/taskpane/index.tsx", "utf8");
  assert.match(source, /typeof Office\s*===\s*["']undefined["']/);
  assert.match(source, /Office\.onReady\(mountApp\)/);
  assert.match(source, /function mountApp|const mountApp/);
  assert.match(source, /ErrorBoundary/);
  assert.match(source, /<ErrorBoundary>[\s\S]*?<App\s*\/>[\s\S]*?<\/ErrorBoundary>/);
});

test("task pane declares the packaged favicon asset", () => {
  const source = fs.readFileSync("src/taskpane/index.html", "utf8");
  assert.match(source, /rel=["']icon["'][^>]+assets\/icon-16\.png/);
});

test("task pane error boundary exposes recovery without showing a stack trace", () => {
  const source = fs.readFileSync("src/taskpane/ErrorBoundary.tsx", "utf8");
  assert.match(source, /Không thể mở TVCI Word Tools/);
  assert.match(source, /Tải lại/);
  assert.doesNotMatch(source, /componentStack|stack\b|error\.stack/i);
});
