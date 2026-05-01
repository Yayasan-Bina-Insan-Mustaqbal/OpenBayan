"use client"

import * as React from "react"
import { AnimatePresence, motion, type Variants } from "motion/react"
import { IconFile, IconChevronRight, IconFolder, IconLayoutSidebarRight } from "@tabler/icons-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
} from "@/components/ui/sidebar"
import { type TreeItem } from "./sidebar-data"

export const listVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
    },
  },
}

export const rowVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.18, ease: "easeOut" },
  },
}

export function Tree({
  item,
  activeFile,
  onOpenFile,
  onOpenRightFile,
  parentPath = "",
}: {
  item: TreeItem
  activeFile?: string
  onOpenFile?: (file: string) => void
  onOpenRightFile?: (file: string) => void
  parentPath?: string
}) {
  const [name, ...items] = Array.isArray(item) ? item : [item]
  const [isOpen, setIsOpen] = React.useState(name === "components" || name === "ui")
  const path = parentPath ? `${parentPath}/${name}` : name

  if (!items.length) {
    return (
      <SidebarMenuItem>
        <motion.div variants={rowVariants}>
          <div
            className="group flex items-center relative w-full"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", path)
            }}
          >
            <SidebarMenuButton
              isActive={activeFile === path}
              className="transition-[background-color,transform] duration-150 ease-out hover:translate-x-0.5 active:scale-[0.99] data-[active=true]:bg-transparent pr-8"
              onClick={() => onOpenFile?.(path)}
            >
              <IconFile />
              {name}
            </SidebarMenuButton>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenRightFile?.(path) }}
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground p-1 rounded-sm transition-opacity z-10"
              title="Open to the Side"
            >
              <IconLayoutSidebarRight size={14} />
            </button>
          </div>
        </motion.div>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <motion.div variants={rowVariants}>
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="group/collapsible"
        >
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="transition-[background-color,transform] duration-150 ease-out hover:translate-x-0.5 active:scale-[0.99]">
              <motion.span
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex"
              >
                <IconChevronRight />
              </motion.span>
              <IconFolder />
              {name}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <AnimatePresence initial={false}>
            {isOpen ? (
              <CollapsibleContent forceMount asChild>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <SidebarMenuSub>
                    {items.map((subItem, index) => (
                      <Tree
                        key={index}
                        item={subItem}
                        activeFile={activeFile}
                        onOpenFile={onOpenFile}
                        onOpenRightFile={onOpenRightFile}
                        parentPath={path}
                      />
                    ))}
                  </SidebarMenuSub>
                </motion.div>
              </CollapsibleContent>
            ) : null}
          </AnimatePresence>
        </Collapsible>
      </motion.div>
    </SidebarMenuItem>
  )
}
