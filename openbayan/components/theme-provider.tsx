"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const storageKey = "openbayan-theme"
const themeChangeEvent = "openbayan-theme-change"

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system"
}

function getSystemTheme(): ResolvedTheme {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark"
  }

  return "light"
}

function getTheme(): Theme {
  const savedTheme = localStorage.getItem(storageKey)

  return isTheme(savedTheme) ? savedTheme : "system"
}

function applyTheme(theme: Theme, systemTheme: ResolvedTheme) {
  const resolvedTheme = theme === "system" ? systemTheme : theme

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
  document.documentElement.style.colorScheme = resolvedTheme

  return resolvedTheme
}

function getThemeSnapshot() {
  if (typeof window === "undefined") {
    return "system:light"
  }

  return `${getTheme()}:${getSystemTheme()}`
}

function getServerThemeSnapshot() {
  return "system:light"
}

function subscribeToThemeChange(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

  function handleStoreChange() {
    applyTheme(getTheme(), getSystemTheme())
    onStoreChange()
  }

  window.addEventListener(themeChangeEvent, handleStoreChange)
  window.addEventListener("storage", handleStoreChange)

  if ("addEventListener" in mediaQuery) {
    function handleChange(event: MediaQueryListEvent) {
      applyTheme(getTheme(), event.matches ? "dark" : "light")
      onStoreChange()
    }

    mediaQuery.addEventListener("change", handleChange)

    return () => {
      window.removeEventListener(themeChangeEvent, handleStoreChange)
      window.removeEventListener("storage", handleStoreChange)
      mediaQuery.removeEventListener("change", handleChange)
    }
  }

  return () => {
    window.removeEventListener(themeChangeEvent, handleStoreChange)
    window.removeEventListener("storage", handleStoreChange)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const snapshot = React.useSyncExternalStore(
    subscribeToThemeChange,
    getThemeSnapshot,
    getServerThemeSnapshot
  )
  const [theme, systemTheme] = snapshot.split(":") as [Theme, ResolvedTheme]

  React.useEffect(() => {
    applyTheme(theme, systemTheme)
  }, [theme, systemTheme])

  const setTheme = React.useCallback((nextTheme: Theme) => {
    localStorage.setItem(storageKey, nextTheme)
    applyTheme(nextTheme, getSystemTheme())
    window.dispatchEvent(new Event(themeChangeEvent))
  }, [])

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme: theme === "system" ? systemTheme : theme,
      setTheme,
    }),
    [theme, systemTheme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }

  return context
}
