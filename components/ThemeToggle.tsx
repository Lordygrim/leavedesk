"use client";
import { useEffect, useState } from "react";
import { ghostSm } from "./styles";
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);
  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
    setDark(!dark);
  }
  return <button type="button" className={ghostSm} onClick={toggle}>{dark ? "Light mode" : "Dark mode"}</button>;
}
