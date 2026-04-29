"use client"

import * as React from "react"
import Link from "next/link"
import { IconArrowRight, IconMenu2, IconX } from "@tabler/icons-react"

import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

const menuItems = [
  { name: "Search", href: "/#features" },
  { name: "Connections", href: "/#connections" },
  { name: "Pipeline", href: "/#pipeline" },
  { name: "Sahifah", href: "/#sahifah" },
  { name: "Future", href: "/#future" },
]

export function SiteHeader() {
  const [menuState, setMenuState] = React.useState(false)

  return (
    <header>
      <nav
        data-state={menuState ? "active" : "inactive"}
        className="fixed z-20 w-full border-b border-solid bg-background/95 backdrop-blur md:relative"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-6 py-3 lg:flex-nowrap lg:py-4">
            <div className="flex w-full items-center justify-between lg:w-auto">
              <Link href="/" aria-label="OpenBayan home" className="flex items-center gap-2">
                <Logo />
              </Link>

              <div className="flex items-center gap-2 lg:hidden">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setMenuState((open) => !open)}
                  aria-label={menuState ? "Close menu" : "Open menu"}
                  aria-expanded={menuState}
                  className="relative -m-2.5 -me-4 block cursor-pointer p-2.5"
                >
                  <IconMenu2 className="m-auto size-6 duration-200 in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0" />
                  <IconX className="absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200 in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100" />
                </button>
              </div>
            </div>

            <div className="hidden w-full flex-col gap-6 rounded-lg border bg-background p-6 shadow-lg shadow-muted lg:flex lg:w-fit lg:flex-row lg:items-center lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none in-data-[state=active]:flex">
              <ul className="flex flex-col gap-6 text-base lg:flex-row lg:gap-8 lg:text-sm">
                {menuItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="block text-muted-foreground duration-150 hover:text-foreground"
                      onClick={() => setMenuState(false)}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 sm:flex-row lg:border-s lg:ps-6">
                <div className="hidden lg:block">
                  <ThemeToggle />
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/dashboard">
                    Open workspace
                    <IconArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
