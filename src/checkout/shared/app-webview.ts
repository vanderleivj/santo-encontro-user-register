import { useEffect, useSyncExternalStore } from "react";
import { useRouterState } from "@tanstack/react-router";

const STORAGE_KEY = "santo_app_webview";

declare global {
  interface Window {
    __SANTO_APP_WEBVIEW__?: boolean;
  }
}

function hasAppWebViewFlag(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

export function isAppWebViewSearch(
  search: Record<string, unknown> | string | undefined
): boolean {
  if (!search) return false;

  if (typeof search === "string") {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search
    );
    return (
      hasAppWebViewFlag(params.get("app")) ||
      hasAppWebViewFlag(params.get("embed"))
    );
  }

  return hasAppWebViewFlag(search.app) || hasAppWebViewFlag(search.embed);
}

function persistAppWebViewFlag(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}

function readPersistedAppWebViewFlag(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function detectAppWebView(): boolean {
  if (typeof window === "undefined") return false;

  if (window.__SANTO_APP_WEBVIEW__ === true) return true;
  if (readPersistedAppWebViewFlag()) return true;
  if (isAppWebViewSearch(window.location.search)) return true;

  return false;
}

function subscribeAppWebView(onStoreChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function useIsAppWebView(): boolean {
  const fromRouter = useRouterState({
    select: (state) => {
      const search = state.location.search as Record<string, unknown>;
      if (isAppWebViewSearch(search)) return true;
      return isAppWebViewSearch(state.location.searchStr);
    },
  });

  const fromWindow = useSyncExternalStore(
    subscribeAppWebView,
    detectAppWebView,
    () => false
  );

  const isAppWebView = fromRouter || fromWindow;

  useEffect(() => {
    if (isAppWebView) persistAppWebViewFlag();
  }, [isAppWebView]);

  return isAppWebView;
}

export function parseAppWebViewSearch(search: Record<string, unknown>): {
  app: string | undefined;
  embed: string | undefined;
} {
  return {
    app: hasAppWebViewFlag(search.app)
      ? "1"
      : typeof search.app === "string"
        ? search.app
        : undefined,
    embed: hasAppWebViewFlag(search.embed)
      ? "1"
      : typeof search.embed === "string"
        ? search.embed
        : undefined,
  };
}

export const APP_WEBVIEW_SEARCH = {
  app: "1" as const,
  embed: undefined as string | undefined,
};
