"use client"

import * as React from "react"
import { motion } from "motion/react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { IconFile, IconLayoutSidebarRight, IconSearch, IconTrendingUp } from "@tabler/icons-react"

import { sidebarData } from "./sidebar-data"
import { Tree, listVariants, rowVariants } from "./sidebar-tree"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  activeFile?: string
  onOpenFile?: (file: string) => void
  onOpenRightFile?: (file: string) => void
}

export function AppSidebar({
  activeFile,
  onOpenFile,
  onOpenRightFile,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <div className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Explorer</div>
          <SidebarGroupLabel>Changes</SidebarGroupLabel>
          <SidebarGroupContent>
            <motion.div variants={listVariants} initial="hidden" animate="show">
              <SidebarMenu>
              {sidebarData.changes.map((item, index) => (
                <SidebarMenuItem key={index}>
                  <motion.div variants={rowVariants}>
                    <div
                      className="group flex items-center relative w-full"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", item.file)
                      }}
                    >
                      <SidebarMenuButton
                        isActive={activeFile === item.file}
                        className="transition-[background-color,transform] duration-150 ease-out hover:translate-x-0.5 active:scale-[0.99] pr-8"
                        onClick={() => onOpenFile?.(item.file)}
                      >
                        <IconFile />
                        {item.file}
                      </SidebarMenuButton>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onOpenRightFile?.(item.file) }}
                        className="absolute right-8 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground p-1 rounded-sm transition-opacity z-10"
                        title="Open to the Side"
                      >
                        <IconLayoutSidebarRight size={14} />
                      </button>
                      <SidebarMenuBadge>{item.state}</SidebarMenuBadge>
                    </div>
                  </motion.div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            </motion.div>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <motion.div variants={listVariants} initial="hidden" animate="show">
              <SidebarMenu>
              {sidebarData.tree.map((item, index) => (
                <Tree
                  key={index}
                  item={item}
                  activeFile={activeFile}
                  onOpenFile={onOpenFile}
                  onOpenRightFile={onOpenRightFile}
                />
              ))}
            </SidebarMenu>
            </motion.div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="px-2 py-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Explore</div>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeFile === "Search Editor"} 
                  onClick={() => onOpenFile?.("Search Editor")}
                >
                  <IconSearch /> Search Workspace
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <div
                  className="group flex items-center relative w-full"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", "Explore")
                  }}
                >
                  <SidebarMenuButton 
                    isActive={activeFile === "Explore"} 
                    onClick={() => onOpenFile?.("Explore")}
                    className="pr-8"
                  >
                    <IconTrendingUp /> Explore Workspace
                  </SidebarMenuButton>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenRightFile?.("Explore") }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground p-1 rounded-sm transition-opacity z-10"
                    title="Open to the Side"
                  >
                    <IconLayoutSidebarRight size={14} />
                  </button>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
