"use client"

import * as React from "react"
import { IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

const themes = ["system", "light", "dark"] as const

const themeLabels = {
  system: "System",
  light: "Light",
  dark: "Dark",
}

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  const Icon =
    theme === "system" ? IconDeviceDesktop : resolvedTheme === "dark" ? IconMoon : IconSun
  const label = `Theme: ${themeLabels[theme]}`

  function cycleTheme() {
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]

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
