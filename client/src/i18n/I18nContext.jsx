// client/src/i18n/I18nContext.jsx
/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useMemo, useState } from "react";
import PropTypes from "prop-types";
import es from "./es.json";
import en from "./en.json";
import pt from "./pt.json";

const I18nContext = createContext(null);

const dictionaries = { es, en, pt };

export function I18nProvider({ children }) {
  const [lang, setLang] = useState("es");

  const value = useMemo(() => {
    const dict = dictionaries[lang] || dictionaries.es;

    const t = (key, fallback) => {
      const parts = key.split(".");
      let node = dict;
      for (const p of parts) {
        if (node && typeof node === "object" && p in node) {
          node = node[p];
        } else {
          return fallback ?? key;
        }
      }
      if (typeof node !== "string") return fallback ?? key;
      return node;
    };

    // helper simple para interpolar {{var}}
    const tFmt = (key, vars = {}, fallback) => {
      const base = t(key, fallback);
      return Object.entries(vars).reduce(
        (acc, [k, v]) =>
          acc.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v)),
        base
      );
    };

    return { lang, setLang, t, tFmt };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

I18nProvider.propTypes = {
  children: PropTypes.node
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
