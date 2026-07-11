import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "safecast-location-language";
const DEFAULT_LOCATION = "Mumbai, India";
const DEFAULT_LANGUAGE = "English";

type SafeCastContextValue = {
  location: string;
  setLocation: (value: string) => void;
  language: string;
  setLanguage: (value: string) => void;
};

const SafeCastContext = createContext<SafeCastContextValue | null>(null);

function readStoredValue(): { location: string; language: string } {
  if (typeof window === "undefined") {
    return { location: DEFAULT_LOCATION, language: DEFAULT_LANGUAGE };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { location: DEFAULT_LOCATION, language: DEFAULT_LANGUAGE };
    const parsed = JSON.parse(raw) as { location?: string; language?: string };
    return {
      location: parsed.location || DEFAULT_LOCATION,
      language: parsed.language || DEFAULT_LANGUAGE,
    };
  } catch {
    return { location: DEFAULT_LOCATION, language: DEFAULT_LANGUAGE };
  }
}

export function SafeCastContextProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(() => readStoredValue().location);
  const [language, setLanguage] = useState(() => readStoredValue().language);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ location, language }));
  }, [location, language]);

  const value = useMemo(
    () => ({ location, setLocation, language, setLanguage }),
    [location, language],
  );

  return <SafeCastContext.Provider value={value}>{children}</SafeCastContext.Provider>;
}

export function useSafeCastContext() {
  const context = useContext(SafeCastContext);
  if (!context) {
    throw new Error("useSafeCastContext must be used within a SafeCastContextProvider");
  }
  return context;
}
