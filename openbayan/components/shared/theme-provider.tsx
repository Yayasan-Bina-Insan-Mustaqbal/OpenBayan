"use client"

import * as React from "react"

export type Theme = "light" | "dark" | "system" | "midnight" | "hc-light" | "hc-dark"
export type Color = "emerald" | "blue" | "rose" | "amber"

type ResolvedTheme = "light" | "dark" | "midnight" | "hc-light" | "hc-dark"

type ThemeContextValue = {
  theme: Theme
  color: Color
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  setColor: (color: Color) => void
}

const themeStorageKey = "openbayan-theme"
const colorStorageKey = "openbayan-color"
const themeChangeEvent = "openbayan-theme-change"

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function isTheme(value: string | null): value is Theme {
  return ["light", "dark", "system", "midnight", "hc-light", "hc-dark"].includes(value as string)
}

function isColor(value: string | null): value is Color {
  return ["emerald", "blue", "rose", "amber"].includes(value as string)
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark"
  }
  return "light"
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system"
  const savedTheme = localStorage.getItem(themeStorageKey)
  return isTheme(savedTheme) ? savedTheme : "system"
}

function getStoredColor(): Color {
  if (typeof window === "undefined") return "emerald"
  const savedColor = localStorage.getItem(colorStorageKey)
  return isColor(savedColor) ? savedColor : "emerald"
}

function applyTheme(theme: Theme, color: Color, systemTheme: "light" | "dark") {
  const root = document.documentElement
  let resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : (theme as ResolvedTheme)

  // Clear existing theme-related attributes/classes if needed
  root.classList.remove("dark")
  root.removeAttribute("data-theme")
  root.removeAttribute("data-color")

  // Apply resolved theme
  if (resolvedTheme === "dark" || resolvedTheme === "midnight" || resolvedTheme === "hc-dark") {
    root.classList.add("dark")
  }

  root.setAttribute("data-theme", resolvedTheme)
  root.setAttribute("data-color", color)

  // Set color scheme for browser elements
  const colorScheme = (resolvedTheme === "dark" || resolvedTheme === "midnight" || resolvedTheme === "hc-dark") ? "dark" : "light"
  root.style.colorScheme = colorScheme

  return resolvedTheme
}

function getThemeSnapshot() {
  if (typeof window === "undefined") return "system:emerald:light"
  return `${getStoredTheme()}:${getStoredColor()}:${getSystemTheme()}`
}

function subscribeToThemeChange(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {}

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

  function handleStoreChange() {
    applyTheme(getStoredTheme(), getStoredColor(), getSystemTheme())
    onStoreChange()
  }

  window.addEventListener(themeChangeEvent, handleStoreChange)
  window.addEventListener("storage", handleStoreChange)
  mediaQuery.addEventListener("change", handleStoreChange)

  return () => {
    window.removeEventListener(themeChangeEvent, handleStoreChange)
    window.removeEventListener("storage", handleStoreChange)
    mediaQuery.removeEventListener("change", handleStoreChange)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const snapshot = React.useSyncExternalStore(
    subscribeToThemeChange,
    getThemeSnapshot,
    getThemeSnapshot // Server snapshot
  )

  const [theme, color, systemTheme] = snapshot.split(":") as [Theme, Color, "light" | "dark"]

  React.useEffect(() => {
    applyTheme(theme, color, systemTheme)
  }, [theme, color, systemTheme])

  const setTheme = React.useCallback((nextTheme: Theme) => {
    localStorage.setItem(themeStorageKey, nextTheme)
    window.dispatchEvent(new Event(themeChangeEvent))
  }, [])

  const setColor = React.useCallback((nextColor: Color) => {
    localStorage.setItem(colorStorageKey, nextColor)
    window.dispatchEvent(new Event(themeChangeEvent))
  }, [])

  const value = React.useMemo(
    () => ({
      theme,
      color,
      resolvedTheme: theme === "system" ? systemTheme : (theme as ResolvedTheme),
      setTheme,
      setColor,
    }),
    [theme, color, systemTheme, setTheme, setColor]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
