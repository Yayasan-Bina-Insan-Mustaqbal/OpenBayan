"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  IconBook,
  IconFileText,
  IconGitBranch,
  IconSearch,
  IconTerminal2,
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
  const [openFiles, setOpenFiles] = React.useState<string[]>([
    "components/ui/button.tsx",
    "app/page.tsx",
  ])
  const [activeFile, setActiveFile] = React.useState("components/ui/button.tsx")

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

  const active = getFile(activeFile)
  const breadcrumbParts = active.path.split("/")

  return (
    <SidebarProvider>
      <AppSidebar activeFile={activeFile} onOpenFile={openFile} />
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
            orientation="horizontal"
            className="h-[calc(100svh-5.5rem)] min-h-[560px] rounded-lg border bg-background"
          >
            <ResizablePanel defaultSize={65} minSize={20} className="min-w-0 overflow-hidden">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel defaultSize={72} minSize={35} className="min-w-0 overflow-hidden">
                  <EditorTabs
                    activeFile={activeFile}
                    openFiles={openFiles}
                    onSelectFile={setActiveFile}
                    onCloseFile={closeFile}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={28} minSize={16} className="min-w-0 overflow-hidden">
                  <BottomPanel activeFile={activeFile} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle
              withHandle
              className="w-2 bg-border/70 transition-colors hover:bg-primary/40 after:w-3"
            />
            <ResizablePanel
              defaultSize={35}
              minSize={16}
              className="min-w-0 overflow-hidden"
            >
              <InspectorPanel file={active} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}

function EditorTabs({
  activeFile,
  openFiles,
  onSelectFile,
  onCloseFile,
}: {
  activeFile: string
  openFiles: string[]
  onSelectFile: (file: string) => void
  onCloseFile: (file: string) => void
}) {
  return (
    <Tabs value={activeFile} onValueChange={onSelectFile} className="h-full gap-0">
      <div className="flex min-h-10 items-end border-b bg-muted/30 px-2">
        <TabsList variant="line" className="h-10 gap-1 overflow-x-auto">
          {openFiles.map((path) => {
            const file = getFile(path)

            return (
              <div key={path} className="group/tab relative flex">
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

function InspectorPanel({ file }: { file: EditorFile }) {
  return (
    <aside className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <div className="text-sm font-medium">Inspector</div>
        <div className="mt-1 truncate text-xs text-muted-foreground">
          {file.path}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-auto p-4 text-sm">
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground">Type</div>
          <div className="mt-1 font-medium capitalize">{file.kind}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconSearch />
            Search context
          </div>
          <p className="mt-2 text-muted-foreground">
            Placeholder for source matches, roots, entities, and saved alamat.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconGitBranch />
            Connections
          </div>
          <p className="mt-2 text-muted-foreground">
            Graph links will appear here once research data is connected.
          </p>
        </div>
      </div>
    </aside>
  )
}

function BottomPanel({ activeFile }: { activeFile: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 items-center gap-2 border-b px-4 text-xs font-medium">
        <IconTerminal2 />
        Panel
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-4 text-sm text-muted-foreground">
        <p>Active file: {activeFile}</p>
        <p>Use this area later for logs, source previews, search results, or notes.</p>
      </div>
    </div>
  )
}
