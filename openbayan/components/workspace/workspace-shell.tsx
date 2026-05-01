"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  IconBook,
  IconChevronRight,
  IconFileText,
  IconLayoutSidebarRight,
  IconX,
} from "@tabler/icons-react"

import { HeroBackground } from "@/components/landing/hero-background"

import { AccountMenu } from "@/components/workspace/account-menu"
import { AppSidebar } from "@/components/workspace/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { EditorTabs, getFile } from "@/components/workspace/workspace-editor-tabs"

type AccountUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

type WorkspaceShellProps = {
  user?: AccountUser | null
}



export function WorkspaceShell({ user }: WorkspaceShellProps) {
  const isMobile = useIsMobile()
  const [openFiles, setOpenFiles] = React.useState<string[]>([
    "Search Editor",
  ])
  const [activeFile, setActiveFile] = React.useState("Search Editor")

  const [rightOpenFiles, setRightOpenFiles] = React.useState<string[]>([
    "Explore",
  ])
  const [rightActiveFile, setRightActiveFile] = React.useState("Explore")
  const [showRightPane, setShowRightPane] = React.useState(true)
  const [savedRightFiles, setSavedRightFiles] = React.useState<{files: string[], active: string} | null>(null)

  function toggleRightPane() {
    if (showRightPane) {
      setSavedRightFiles({ files: rightOpenFiles, active: rightActiveFile })
      setOpenFiles((prev) => Array.from(new Set([...prev, ...rightOpenFiles])))
      setRightOpenFiles([])
      setShowRightPane(false)
    } else {
      if (savedRightFiles && savedRightFiles.files.length > 0) {
        setRightOpenFiles(savedRightFiles.files)
        setRightActiveFile(savedRightFiles.active)
        setOpenFiles((prev) => prev.filter((f) => !savedRightFiles.files.includes(f)))
        if (savedRightFiles.files.includes(activeFile)) {
          setActiveFile((prev) => {
            const remaining = openFiles.filter((f) => !savedRightFiles.files.includes(f))
            return remaining.length > 0 ? remaining[0] : "app/page.tsx"
          })
        }
      } else {
        setRightOpenFiles(["Explore"])
        setRightActiveFile("Explore")
      }
      setShowRightPane(true)
      setSavedRightFiles(null)
    }
  }

  function openRightFile(path: string) {
    if (!showRightPane) {
      setShowRightPane(true)
    }
    setRightOpenFiles((current) =>
      current.includes(path) ? current : [...current, path]
    )
    setRightActiveFile(path)
  }

  function openFile(path: string) {
    setOpenFiles((current) =>
      current.includes(path) ? current : [...current, path]
    )
    setActiveFile(path)
  }

  function closeFile(path: string) {
    setOpenFiles((current) => {
      if (current.length === 1) {
        return current
      }

      const nextFiles = current.filter((file) => file !== path)

      if (activeFile === path) {
        const closedIndex = current.indexOf(path)
        const nextActive =
          nextFiles[Math.min(closedIndex, nextFiles.length - 1)] ?? nextFiles[0]

        setActiveFile(nextActive)
      }

      return nextFiles
    })
  }

  function rightCloseFile(path: string) {
    setRightOpenFiles((current) => {
      if (current.length === 1) {
        return current
      }

      const nextFiles = current.filter((file) => file !== path)

      if (rightActiveFile === path) {
        const closedIndex = current.indexOf(path)
        const nextActive =
          nextFiles[Math.min(closedIndex, nextFiles.length - 1)] ?? nextFiles[0]

        setRightActiveFile(nextActive)
      }

      return nextFiles
    })
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
          <ResizablePanelGroup
            orientation={isMobile ? "vertical" : "horizontal"}
            className="h-[calc(100svh-4.25rem)] min-h-[560px] rounded-lg border border-solid bg-background/95 backdrop-blur shadow-sm"
          >
            <ResizablePanel
              defaultSize={showRightPane ? 50 : 100}
              minSize={20}
              className="min-w-0 overflow-hidden"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const path = e.dataTransfer.getData("text/plain")
                const sourcePane = e.dataTransfer.getData("application/x-tab-source")
                if (path) {
                  if (sourcePane === "right") {
                    rightCloseFile(path)
                  }
                  openFile(path)
                }
              }}
            >
              <EditorTabs
                paneId="left"
                activeFile={activeFile}
                openFiles={openFiles}
                onSelectFile={setActiveFile}
                onCloseFile={closeFile}
                onToggleRightPane={toggleRightPane}
                isRightPaneVisible={showRightPane}
              />
            </ResizablePanel>
            {showRightPane && (
              <>
                <ResizableHandle
                  withHandle
                  className="w-2 bg-border/70 transition-colors hover:bg-primary/40 after:w-3"
                />
                <ResizablePanel
                  defaultSize={50}
                  minSize={20}
                  className="min-w-0 overflow-hidden"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const path = e.dataTransfer.getData("text/plain")
                    const sourcePane = e.dataTransfer.getData("application/x-tab-source")
                    if (path) {
                      if (sourcePane === "left") {
                        closeFile(path)
                      }
                      openRightFile(path)
                    }
                  }}
                >
                  <EditorTabs
                    paneId="right"
                    activeFile={rightActiveFile}
                    openFiles={rightOpenFiles}
                    onSelectFile={setRightActiveFile}
                    onCloseFile={rightCloseFile}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}



