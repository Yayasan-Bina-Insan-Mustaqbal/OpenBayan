import * as React from "react"
import { IconHistory, IconNews, IconTrendingUp } from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "motion/react"

const trendingSahifah = [
  { id: 1, title: "Linguistic Roots of Rahmah", author: "Dr. Al-Farsi", views: "1.2k", category: "Linguistics" },
  { id: 2, title: "Tafsir Collection: Al-Baqarah", author: "Usama H.", views: "850", category: "Tafsir" },
  { id: 3, title: "Hadith Authentication Methods", author: "Research Team", views: "640", category: "Hadith" },
]

const recentFiles = [
  { id: 1, title: "My Notes on Fasting", lastEdited: "2 hours ago", type: "Document" },
  { id: 2, title: "Prophetic Biography Timeline", lastEdited: "Yesterday", type: "Collection" },
]

const updatesNews = [
  { id: 1, title: "OpenBayan v0.9 Released", date: "April 28", summary: "New IDE-style workspace layout and improved search." },
  { id: 2, title: "SurrealDB Migration Complete", date: "April 25", summary: "Graph relationships are now live for all root words." },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
}

export function ExploreEditor() {
  return (
    <div className="p-6 md:p-10 space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Explore</h1>
        <p className="text-muted-foreground">Discover trending research, pick up where you left off, and see what's new.</p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-2">
            <IconTrendingUp className="text-primary size-5" />
            <h2 className="text-xl font-semibold">Trending Sahifah</h2>
          </div>
          <div className="grid gap-3">
            {trendingSahifah.map((item) => (
              <Card key={item.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription className="mt-1">By {item.author}</CardDescription>
                    </div>
                    <span className="text-xs font-medium bg-muted px-2 py-1 rounded-md">{item.category}</span>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-2">
            <IconHistory className="text-primary size-5" />
            <h2 className="text-xl font-semibold">Recent Files</h2>
          </div>
          <div className="grid gap-3">
            {recentFiles.map((item) => (
              <Card key={item.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader className="p-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <span className="text-xs font-medium bg-muted px-2 py-1 rounded-md">{item.type}</span>
                  </div>
                  <CardDescription>Edited {item.lastEdited}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <IconNews className="text-primary size-5" />
            <h2 className="text-xl font-semibold">Updates & News</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {updatesNews.map((item) => (
              <Card key={item.id}>
                <CardHeader className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                  </div>
                  <CardDescription>{item.summary}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
