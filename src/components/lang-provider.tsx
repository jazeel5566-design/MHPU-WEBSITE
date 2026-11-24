"use client";
import { createContext, useContext } from "react";
import { makeT } from "@/lib/dv";

const LangContext = createContext<string>("en");

export function LangProvider({ lang, children }: { lang: string; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** In client components: `const T = useT(); T("Submit application")` */
export function useT() {
  return makeT(useContext(LangContext));
}
