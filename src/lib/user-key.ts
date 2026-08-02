import { useEffect, useState } from "react";

/**
 * Each reader's own Gemini API key.
 *
 * Privacy model: the key is stored ONLY in this browser's localStorage, is
 * never written to the database, never logged, and never shared between
 * readers. It travels with a single request to our server, is used once to
 * call Gemini on that reader's behalf, and is then discarded — the server
 * keeps no copy and holds no per-user state, so any number of readers can use
 * the archive in parallel with complete isolation.
 */
const KEY = "personae:gemini-key:v1";
const EVENT = "personae:gemini-key";

/**
 * Accepts every Google AI Studio key format: legacy `AIza…`, the newer `AQ…`
 * keys, and any future prefix. We only insist on a plausible opaque token —
 * the real verdict comes from Google when the key is first used.
 */
export const isLikelyGeminiKey = (k: string) => {
  const v = k.trim();
  if (/\s/.test(v)) return false;
  return /^[A-Za-z0-9][A-Za-z0-9._\-]{19,}$/.test(v);
};

export function getUserKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setUserKey(k: string) {
  if (typeof window === "undefined") return;
  try {
    const v = k.trim();
    if (v) window.localStorage.setItem(KEY, v);
    else window.localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: v }));
  } catch {
    /* storage unavailable — the archive still works on the shared allowance */
  }
}

export const clearUserKey = () => setUserKey("");

/** Reactive access to the reader's own key. */
export function useUserKey(): [string, (k: string) => void] {
  const [key, setKey] = useState("");

  useEffect(() => {
    setKey(getUserKey());
    const onChange = (e: Event) => setKey((e as CustomEvent<string>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return [key, (k: string) => setUserKey(k)];
}

/** Spread into any server-function payload: `{ ...withKey(), ...rest }`. */
export const withKey = () => {
  const k = getUserKey();
  return k ? { userKey: k } : {};
};

/** Masked form for display — never render the raw key. */
export const maskKey = (k: string) => (k ? `${k.slice(0, 6)}••••••••${k.slice(-4)}` : "");
