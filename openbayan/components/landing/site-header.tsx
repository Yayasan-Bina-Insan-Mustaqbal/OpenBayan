"use client"

import * as React from "react"
import Link from "next/link"
import { IconArrowRight, IconMenu2, IconX, IconBrandGithub, IconChevronDown } from "@tabler/icons-react"

import { Logo } from "@/components/landing/logo"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
              <ul className="flex flex-col gap-6 text-base lg:flex-row lg:items-center lg:gap-8 lg:text-sm">
                <li>
                  <Link
                    href="/search"
                    className="block font-medium text-muted-foreground duration-150 hover:text-foreground"
                    onClick={() => setMenuState(false)}
                  >
                    Search
                  </Link>
                </li>
                
                <li>
                  <Link
                    href="/browse"
                    className="block font-medium text-muted-foreground duration-150 hover:text-foreground"
                    onClick={() => setMenuState(false)}
                  >
                    Browse
                  </Link>
                </li>
                
                <li>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 font-medium text-muted-foreground duration-150 hover:text-foreground outline-none">
                      Docs <IconChevronDown className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href="/docs/quran_ingestion" className="cursor-pointer w-full" onClick={() => setMenuState(false)}>Quran Ingestion</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/docs/hadith_ingestion" className="cursor-pointer w-full" onClick={() => setMenuState(false)}>Hadith Ingestion</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/docs/books_ingestion" className="cursor-pointer w-full" onClick={() => setMenuState(false)}>Books Ingestion</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/docs/sentences_ingestion" className="cursor-pointer w-full" onClick={() => setMenuState(false)}>Sentences Ingestion</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/docs/dictionary_murad_ingestion" className="cursor-pointer w-full" onClick={() => setMenuState(false)}>MURAD Dictionary</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/docs/search" className="cursor-pointer w-full" onClick={() => setMenuState(false)}>Search Architecture</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
                
                <li>
                  <a
                    href="https://github.com/decaller/OpenBayan-KG"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-medium text-muted-foreground duration-150 hover:text-foreground"
                    onClick={() => setMenuState(false)}
                  >
                    <IconBrandGithub className="size-5" /> GitHub
                  </a>
                </li>
              </ul>

              <div className="flex flex-col gap-3 sm:flex-row lg:border-s lg:ps-6 items-center">
                <div className="hidden lg:block">
                  <ThemeToggle />
                </div>
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link href="/workspace">
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
