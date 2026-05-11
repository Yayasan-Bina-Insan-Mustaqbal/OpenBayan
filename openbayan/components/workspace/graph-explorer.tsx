"use client"

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { IconChevronRight, IconDatabase, IconBinaryTree, IconLanguage } from "@tabler/icons-react"
import { queryGraph } from "@/lib/graph-client"

type ExplorerNode = {
  id: string
  type: 'word' | 'root' | 'entity' | 'sentence'
  data: any
}

export function GraphExplorer({ targetId }: { targetId: string }) {
  const [nodes, setNodes] = React.useState<ExplorerNode[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (targetId) {
      loadInitialNode(targetId)
    }
  }, [targetId])

  const loadInitialNode = async (id: string) => {
    setLoading(true)
    try {
      // Determine what type of node it is based on ID prefix
      let query = ""
      if (id.startsWith("sentence:")) {
         query = `RETURN fn::get_sentence_context("${id.replace('sentence:', '')}");`
      } else if (id.startsWith("word:")) {
         query = `RETURN fn::get_word_info("${id.replace('word:', '')}");`
      }
      
      const res = await queryGraph(query)
      if (res && res.length > 0) {
        setNodes([{ id, type: id.split(":")[0] as any, data: res[0] }])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-background border-l">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Graph Explorer</h3>
      </div>
      
      <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-start p-4 gap-4">
        {nodes.map((node, idx) => (
          <motion.div 
            key={node.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-80 h-full shrink-0 border rounded-xl bg-card p-4 shadow-sm"
          >
            {/* Render Node Data based on type */}
            <div className="font-arabic text-xl mb-4 text-right">
              {node.data.text || node.data.name}
            </div>
            
            {node.type === 'sentence' && (
              <div className="space-y-4 text-sm">
                <div className="text-muted-foreground">{node.data.text}</div>
                {node.data.defined_words && (
                  <div className="border-t pt-4">
                    <p className="font-bold mb-2 text-xs uppercase">Defined Words</p>
                    {node.data.defined_words.map((w: any) => (
                      <div key={w.id} className="cursor-pointer hover:text-primary py-1" onClick={() => console.log(w.id)}>
                        {w.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
        {loading && <div className="p-4 animate-pulse">Loading context...</div>}
      </div>
    </div>
  )
}
