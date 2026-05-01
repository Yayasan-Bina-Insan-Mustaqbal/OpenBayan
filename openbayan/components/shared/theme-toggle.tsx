"use client"

import * as React from "react"
import { IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react"

import { Theme, useTheme } from "@/components/shared/theme-provider"
import { Button } from "@/components/ui/button"

const mainThemes: Theme[] = ["system", "light", "dark"]

const themeLabels: Record<string, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
  midnight: "Midnight",
  "hc-light": "High Contrast (L)",
  "hc-dark": "High Contrast (D)",
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const Icon =
    theme === "light" ? IconSun : theme === "dark" ? IconMoon : IconDeviceDesktop
  
  const label = `Theme: ${themeLabels[theme] || theme}`

  function cycleTheme() {
    const currentIndex = mainThemes.indexOf(theme as any)
    const nextTheme = mainThemes[(currentIndex + 1) % mainThemes.length]
    setTheme(nextTheme)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={cycleTheme}
    >
      <Icon data-icon="inline-start" />
      <span className="sr-only">{label}</span>
    </Button>
  )
}
