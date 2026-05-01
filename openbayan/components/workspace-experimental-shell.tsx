"use client"

import * as React from "react"
import { AccountMenu } from "@/components/account-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

type AccountUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

type WorkspaceExperimentalShellProps = {
  user?: AccountUser | null
}

export function WorkspaceExperimentalShell({ user }: WorkspaceExperimentalShellProps) {
  const [activeFile, setActiveFile] = React.useState("Search Editor")

  function openFile(path: string) {
    setActiveFile(path)
  }

  function openRightFile(path: string) {
    // Keep it empty for now, or add to openRightFiles if needed
  }

  return (
    <SidebarProvider>
      <AppSidebar activeFile={activeFile} onOpenFile={openFile} onOpenRightFile={openRightFile} />
      <SidebarInset className="relative min-h-svh bg-muted/15">
        <header className="relative z-10 flex flex-col shrink-0 bg-background/80 backdrop-blur">
          <div className="flex h-14 items-center gap-2 border-b border-solid px-4">
            <SidebarTrigger className="-ms-1" />
            <Separator
              orientation="vertical"
              className="me-2 border-solid data-vertical:h-4 data-vertical:self-auto"
            />
            <div className="ms-auto">
              <AccountMenu user={user} />
            </div>
          </div>
        </header>

        <section className="relative z-10 min-h-0 flex-1 p-3">
          <div className="h-[calc(100svh-5rem)] rounded-lg border border-solid bg-background/95 backdrop-blur shadow-sm overflow-hidden">
            <ScrollArea className="h-full w-full shadcn-scroll-viewport">
              <div className="max-w-prose mx-auto py-12 px-6">
                <h1 className="text-3xl font-bold mb-6 text-foreground">Experimental Workspace Scroll Test</h1>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Welcome to the experimental workspace scroll test. This page demonstrates the layout with only the sidebar and topbar, containing a large scrollable area.
                </p>
                {Array.from({ length: 20 }).map((_, i) => (
                  <p key={i} className="text-muted-foreground mb-6 leading-relaxed">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. Vivamus hendrerit arcu sed erat molestie vehicula. Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor. Ut in nulla enim. Phasellus molestie magna non est bibendum non venenatis nisl tempor. Suspendisse dictum feugiat nisl ut dapibus. Mauris iaculis porttitor posuere. Praesent id metus massa, ut blandit odio. Proin quis tortor orci. Etiam at risus et justo dignissim congue. Donec congue lacinia dui, a porttitor lectus condimentum laoreet.
                  </p>
                ))}
              </div>
            </ScrollArea>
          </div>
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}
