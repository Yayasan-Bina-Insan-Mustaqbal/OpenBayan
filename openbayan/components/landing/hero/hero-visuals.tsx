"use client"

import { motion } from "motion/react"
import {
  IconBook,
  IconBookmark,
  IconDatabaseSearch,
  IconFileText,
  IconGitBranch,
  IconSearch,
} from "@tabler/icons-react"
import { LogoIcon } from "@/components/landing/logo"

export function WorkspaceMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.12 }}
      className="relative mx-auto mt-14 max-w-7xl overflow-hidden rounded-lg border bg-card shadow-2xl shadow-muted"
    >
      <div className="flex items-center justify-between border-b bg-muted/35 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <LogoIcon className="size-4" />
            <span className="text-xs font-medium text-muted-foreground">OpenBayan Workspace</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-6 w-64 rounded-md border bg-background/50 px-2 flex items-center gap-2">
            <IconSearch className="size-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Search workspace...</span>
          </div>
        </div>
      </div>

      <div className="flex min-h-[620px]">
        {/* Mock Sidebar */}
        <aside className="hidden w-64 border-e bg-muted/10 p-4 lg:block">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Explorer</div>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {[
              { label: "sources", icon: IconDatabaseSearch },
              { label: "sahifah", icon: IconFileText },
              { label: "alamat", icon: IconBookmark },
              { label: "graph", icon: IconGitBranch },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.22 + index * 0.04 }}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <item.icon className="size-4" />
                <span className="capitalize">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          {/* Mock Dual Pane */}
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col border-e">
              <div className="flex h-10 items-end border-b bg-muted/20 px-2">
                <div className="flex h-9 items-center gap-2 rounded-t-md border border-b-0 bg-background px-3 text-xs">
                  <IconFileText className="size-3.5 text-primary" />
                  <span>qolb-research.sahifah</span>
                </div>
                <div className="flex h-9 items-center gap-2 px-3 text-xs text-muted-foreground">
                  <IconDatabaseSearch className="size-3.5" />
                  <span>Al-Baqarah 2:10</span>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24 }}
                  className="mx-auto max-w-2xl"
                >
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 mb-6">
                    <IconBook size={12} />
                    documents/qolb-research.sahifah
                  </div>
                  <div className="flex flex-col gap-4 font-mono text-sm leading-7 text-muted-foreground">
                    <p>{"# Understanding Heart (Qolb)"}</p>
                    <p>{"Qolb refers to the heart as an inner center of understanding, intention, turning, and faith."}</p>
                    <div className="rounded-md border bg-muted/30 p-4 font-sans text-foreground">
                      <p dir="rtl" className="text-right text-lg leading-loose">فِي قُلُوبِهِم مَّرَضٌ</p>
                      <p className="mt-2 text-xs text-muted-foreground">Al-Baqarah 2:10 - "In their hearts is a disease..."</p>
                    </div>
                    <p>{"The connection between qolb and reflection is central to Islamic epistemology."}</p>
                  </div>
                </motion.div>
              </div>
            </div>

            <aside className="hidden w-80 flex-col bg-muted/5 lg:flex">
              <div className="flex h-10 items-end border-b bg-muted/20 px-2">
                <div className="flex h-9 items-center gap-2 rounded-t-md border border-b-0 bg-background px-3 text-xs">
                  <IconGitBranch className="size-3.5 text-primary" />
                  <span>Connections</span>
                </div>
              </div>
              <div className="flex-1 p-4">
                <div className="grid gap-3">
                  {[
                    { label: "Semantic", value: "0.92 correlation" },
                    { label: "Entity", value: "Qolb (Heart)" },
                    { label: "Root", value: "q-l-b (ق ل ب)" },
                  ].map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.34 + index * 0.06 }}
                      className="rounded-md border bg-background p-3"
                    >
                      <div className="text-[10px] font-medium uppercase text-muted-foreground">{item.label}</div>
                      <div className="mt-1 text-xs font-semibold">{item.value}</div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="mt-6 rounded-lg border bg-background p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <IconBookmark className="size-3.5 text-primary" />
                    Saved Alamat
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded bg-muted px-2 py-1 text-[10px]">Al-Hajj 22:46</span>
                    <span className="rounded bg-muted px-2 py-1 text-[10px]">Qaf 50:37</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
