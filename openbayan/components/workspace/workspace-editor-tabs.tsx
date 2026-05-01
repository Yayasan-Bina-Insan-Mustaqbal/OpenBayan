"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  IconBook,
  IconFileText,
  IconLayoutSidebarRight,
  IconX,
} from "@tabler/icons-react"
import dynamic from "next/dynamic"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { SearchEditor } from "@/components/workspace/search-editor"
import { ExploreEditor } from "@/components/workspace/explore-editor"

const BlockNoteEditor = dynamic(() => import("@/components/workspace/blocknote-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted/5">
      <div className="flex flex-col items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs text-muted-foreground">Initializing Sahifah...</span>
      </div>
    </div>
  ),
})

export type EditorFile = {
  path: string
  title: string
  kind: "document" | "source" | "config"
  summary: string
  content: string[]
}

export const editorFiles: Record<string, EditorFile> = {
  "Search Editor": {
    path: "Search Editor",
    title: "Search Editor",
    kind: "config",
    summary: "Search Islamic knowledge through sources.",
    content: [],
  },
  "components/ui/button.tsx": {
    path: "components/ui/button.tsx",
    title: "button.tsx",
    kind: "config",
    summary: "Reusable button primitive for workspace actions.",
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
      "Line 1 of scroll test",
      "Line 2 of scroll test",
      "Line 3 of scroll test",
      "Line 4 of scroll test",
      "Line 5 of scroll test",
      "Line 6 of scroll test",
      "Line 7 of scroll test",
      "Line 8 of scroll test",
      "Line 9 of scroll test",
      "Line 10 of scroll test",
      "Line 11 of scroll test",
      "Line 12 of scroll test",
      "Line 13 of scroll test",
      "Line 14 of scroll test",
      "Line 15 of scroll test",
      "Line 16 of scroll test",
      "Line 17 of scroll test",
      "Line 18 of scroll test",
      "Line 19 of scroll test",
      "Line 20 of scroll test",
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
  "Explore": {
    path: "Explore",
    title: "Explore",
    kind: "config",
    summary: "Trending, recent, and news dashboard.",
    content: [],
  },
}

export function getFile(path: string): EditorFile {
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

export function EditorTabs({
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
    <Tabs value={activeFile} onValueChange={onSelectFile} className="flex h-full flex-col gap-0">
      <div className="flex h-[44px]! items-end bg-muted/15 px-2 z-10 -mb-px">
        <TabsList
          className="h-[38px]! gap-0 justify-start rounded-none p-0 overflow-x-auto overflow-y-hidden bg-muted/15"
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
                  className="h-[38px]! min-w-32 justify-start px-5 pe-10 text-xs ms-1 bg-transparent text-muted-foreground hover:bg-muted/40 rounded-none rounded-t-lg border border-transparent data-[state=active]:bg-background! data-[state=active]:text-foreground data-[state=active]:border-border data-[state=active]:border-b-background data-[state=active]:-mb-px data-[state=active]:shadow-none! transition-colors"
                >
                  <IconFileText data-icon="inline-start" className={cn("size-3.5", activeFile === path && "text-primary")} />
                  <span className="truncate">{file.title}</span>
                </TabsTrigger>
                <button
                  type="button"
                  aria-label={`Close ${file.title}`}
                  className={cn(
                    "absolute end-2 top-1/2 -translate-y-1/2 z-20 rounded-sm p-0.5 opacity-0 outline-none transition-[opacity,background-color] duration-150 hover:bg-muted-foreground/15 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5",
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
          <TabsContent key={path} value={path} className="min-h-0 flex-1 overflow-hidden border rounded-lg shadow-sm bg-background">
            <div className="h-[calc(100svh-7rem)]">
              <ScrollArea className="size-full shadcn-scroll-viewport">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={path}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    {file.path === "Search Editor" ? (
                      <SearchEditor />
                    ) : file.path === "Explore" ? (
                      <ExploreEditor />
                    ) : (
                      <>
                        <div className="px-5 py-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                            <IconBook size={14} />
                            {file.path}
                          </div>
                        </div>
                        <div className="px-2">
                          <BlockNoteEditor initialContent={file.content} />
                        </div>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </ScrollArea>
            </div>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
