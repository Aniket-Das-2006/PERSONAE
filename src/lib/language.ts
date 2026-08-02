import { useEffect, useState } from "react";
import { getLanguage, setLanguage } from "./archive-store";

export const LANGUAGES = [
  "English",
  "हिन्दी (Hindi)",
  "Español",
  "Français",
  "Deutsch",
  "Português",
  "Italiano",
  "العربية (Arabic)",
  "中文 (Chinese)",
  "日本語 (Japanese)",
  "한국어 (Korean)",
  "Русский",
  "বাংলা (Bengali)",
  "தமிழ் (Tamil)",
  "తెలుగు (Telugu)",
  "मराठी (Marathi)",
  "ગુજરાતી (Gujarati)",
  "ਪੰਜਾਬੀ (Punjabi)",
  "Türkçe",
  "Bahasa Indonesia",
  "Kiswahili",
  "Nederlands",
  "Polski",
  "Tiếng Việt",
  "ไทย (Thai)",
  "Ελληνικά",
  "עברית (Hebrew)",
  "فارسی (Persian)",
  "Latina",
];

const EVENT = "personae:language";

export function useLanguage(): [string, (l: string) => void] {
  const [lang, setLang] = useState("English");

  useEffect(() => {
    setLang(getLanguage());
    const onChange = (e: Event) => setLang((e as CustomEvent<string>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const change = (l: string) => {
    setLanguage(l);
    setLang(l);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: l }));
  };

  return [lang, change];
}

/** Strip the parenthetical romanisation so the model gets a clean target. */
export const plainLanguage = (l: string) => l.replace(/\s*\(.*\)$/, "").trim();
