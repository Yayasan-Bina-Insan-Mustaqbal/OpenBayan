"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  IconBook,
  IconFileText,
  IconLayoutSidebarRight,
  IconX,
} from "@tabler/icons-react"

import { AccountMenu } from "@/components/account-menu"
import { AppSidebar } from "@/components/app-sidebar"
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

type AccountUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

type DashboardWorkspaceProps = {
  user?: AccountUser | null
}

type EditorFile = {
  path: string
  title: string
  kind: "document" | "source" | "config"
  summary: string
  content: string[]
}

const editorFiles: Record<string, EditorFile> = {
  "components/ui/button.tsx": {
    path: "components/ui/button.tsx",
    title: "button.tsx",
    kind: "config",
    summary: "Reusable button primitive for dashboard actions.",
    content: [
      "This tab stands in for source-backed editor content.",
      "Later, this area can host a Sahifah editor, source preview, or saved Alamat note.",
      "The important foundation is already here: sidebar selection opens a stable editor tab.",
    ],
  },
  "app/page.tsx": {
    path: "app/page.tsx",
    title: "page.tsx",
    kind: "document",
    summary: "Landing page route mapped as a basic editable document.",
    content: [
      "Use this first editor surface to model how OpenBayan documents feel.",
      "Tabs should stay lightweight, fast to switch, and tied to file explorer selection.",
    ],
  },
  "README.md": {
    path: "README.md",
    title: "README.md",
    kind: "document",
    summary: "Workspace notes and project-level overview.",
    content: [
      "# OpenBayan Workspace",
      "A VS Code-like shell should make research objects feel file-based without becoming complex.",
      "Resizable panes give users control while keeping the first implementation simple.",
    ],
  },
}

function getFile(path: string): EditorFile {
  return (
    editorFiles[path] ?? {
      path,
      title: path.split("/").at(-1) ?? path,
      kind: path.endsWith(".md") ? "document" : "source",
      summary: "Basic placeholder content for this workspace item.",
      content: [
        "This file is linked from the explorer.",
        "Detailed OpenBayan content can be wired here after the shell behavior is stable.",
      ],
    }
  )
}

export function DashboardWorkspace({ user }: DashboardWorkspaceProps) {
  const isMobile = useIsMobile()
  const [openFiles, setOpenFiles] = React.useState<string[]>([
    "components/ui/button.tsx",
    "app/page.tsx",
  ])
  const [activeFile, setActiveFile] = React.useState("components/ui/button.tsx")

  const [rightOpenFiles, setRightOpenFiles] = React.useState<string[]>([
    "README.md",
  ])
  const [rightActiveFile, setRightActiveFile] = React.useState("README.md")
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
        setRightOpenFiles(["README.md"])
        setRightActiveFile("README.md")
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

  const active = getFile(activeFile)
  const breadcrumbParts = active.path.split("/")

  return (
    <SidebarProvider>
      <AppSidebar activeFile={activeFile} onOpenFile={openFile} onOpenRightFile={openRightFile} />
      <SidebarInset className="min-h-svh">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ms-1" />
          <Separator
            orientation="vertical"
            className="me-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbParts.map((part, index) => (
                <React.Fragment key={`${part}-${index}`}>
                  {index > 0 ? (
                    <BreadcrumbSeparator className="hidden md:block" />
                  ) : null}
                  <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                    <BreadcrumbPage>{part}</BreadcrumbPage>
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ms-auto">
            <AccountMenu user={user} />
          </div>
        </header>

        <section className="min-h-0 flex-1 p-3">
          <ResizablePanelGroup
            orientation={isMobile ? "vertical" : "horizontal"}
            className="h-[calc(100svh-5.5rem)] min-h-[560px] rounded-lg border bg-background"
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

function EditorTabs({
  paneId,
  activeFile,
  openFiles,
  onSelectFile,
  onCloseFile,
  onToggleRightPane,
  isRightPaneVisible,
}: {
  paneId: string
  activeFile: string
  openFiles: string[]
  onSelectFile: (file: string) => void
  onCloseFile: (file: string) => void
  onToggleRightPane?: () => void
  isRightPaneVisible?: boolean
}) {
  return (
    <Tabs value={activeFile} onValueChange={onSelectFile} className="h-full gap-0">
      <div className="flex min-h-10 items-end border-b bg-muted/30 px-2">
        <TabsList
          variant="line"
          className="h-10 gap-1 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden"
          onWheel={(e) => {
            if (e.deltaY !== 0 && e.deltaX === 0) {
              e.currentTarget.scrollLeft += e.deltaY
            }
          }}
        >
          {openFiles.map((path) => {
            const file = getFile(path)

            return (
              <div
                key={path}
                className="group/tab relative flex shrink-0"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", path)
                  e.dataTransfer.setData("application/x-tab-source", paneId)
                }}
              >
                <TabsTrigger
                  value={path}
                  className="h-9 min-w-32 justify-start px-3 pe-8 text-xs"
                >
                  <IconFileText data-icon="inline-start" />
                  <span className="truncate">{file.title}</span>
                </TabsTrigger>
                <button
                  type="button"
                  aria-label={`Close ${file.title}`}
                  className={cn(
                    "absolute end-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 opacity-0 outline-none transition-[opacity,background-color] duration-150 hover:bg-muted-foreground/15 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5",
                    "group-hover/tab:opacity-100",
                    activeFile === path && "opacity-100"
                  )}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onCloseFile(path)
                  }}
                >
                  <IconX />
                </button>
              </div>
            )
          })}
        </TabsList>
        {onToggleRightPane && (
          <div className="ml-auto flex items-center mb-1">
            <button
              type="button"
              onClick={onToggleRightPane}
              className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-sm transition-colors"
              title={isRightPaneVisible ? "Hide second pane" : "Show second pane"}
            >
              <IconLayoutSidebarRight size={18} />
            </button>
          </div>
        )}
      </div>

      {openFiles.map((path) => {
        const file = getFile(path)

        return (
          <TabsContent key={path} value={path} className="h-[calc(100%-2.5rem)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={path}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex h-full flex-col"
              >
                <div className="border-b px-5 py-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IconBook />
                    {file.path}
                  </div>
                  <h1 className="mt-2 text-lg font-semibold">{file.title}</h1>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    {file.summary}
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-5">
                  <div className="mx-auto max-w-3xl rounded-lg border bg-card p-5">
                    <div className="flex flex-col gap-4 font-mono text-sm leading-7">
                      {file.content.map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}

