"use client";
import { useEffect, useState } from "react";
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const d = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = d ? "dark" : "light";
    setDark(d);
  }, []);
  function toggle() {
    const n = dark ? "light" : "dark";
    document.documentElement.dataset.theme = n;
    localStorage.setItem("theme", n);
    setDark(!dark);
  }
  return <button type="button" className="inline-flex items-center justify-center rounded-xl font-medium no-underline cursor-pointer h-9 px-3.5 text-sm border border-ac bg-transparent text-ac" onClick={toggle}>{dark ? "Light mode" : "Dark mode"}</button>;
}
