"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
    Accordion, 
    AccordionContent, 
    AccordionItem, 
    AccordionTrigger 
} from "@/components/ui/accordion"
import { 
    Terminal, 
    FileText, 
    ChevronRight, 
    Clock, 
    Zap, 
    Play,
    Maximize2,
    X
} from "lucide-react"
import { renderMermaid } from 'beautiful-mermaid'

function Badge({ children, variant = "default", className = "" }: any) {
    const variants: any = {
        default: "bg-slate-800 text-slate-200 border-slate-700",
        outline: "border-slate-800 text-slate-400 bg-transparent",
    }
    const variantClass = variants[variant] || variants.default
    return (
        <span className={"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors " + variantClass + " " + className}>
            {children}
        </span>
    )
}


// Pipeline Metadata & Diagrams
const PIPELINE_INFO: Record<string, any> = {
  "enrich_dictionary_data.py": {
    description: "LLM-based morphological and entity enrichment for dictionary entries.",
    speed: "~120 entries/hr",
    prediction: "Completion expected mid-June 2026",
    mermaid: `graph TD
    A[Murad Dataset] -->|Ingest| B(Sentence Table)
    B -->|Batch 1k| C{LLM Processing}
    C -->|Extract| D[Word/Root]
    C -->|NER| E[Entity]
    E -->|Wiki API| F[Knowledge Mapping]
    D --> G((Knowledge Graph))
    F --> G`
  },
  "ingest_murad.py": {
    description: "Initial data ingestion from raw source to sentence table.",
    speed: "~50k records/hr",
    prediction: "Completed",
    mermaid: `graph LR
    Source[(SQLite/CSV)] --> Clean[Text Cleaning]
    Clean --> Chunk[Sentence Chunking]
    Chunk --> Store[(SurrealDB Sentence)]`
  },
  "shamela_hf_ingestion.py": {
    description: "Ingesting Shamela HF datasets into the Library plane.",
    speed: "~20 books/hr",
    prediction: "On-demand",
    mermaid: `graph TD
    HF[HuggingFace Dataset] --> Filter[Arabic Filtering]
    Filter --> Book[Book Table]
    Book --> Section[Book Section]
    Section --> Sentence[Sentence Atom]`
  },
  "quran_ingestion": {
    description: "Canonical Quranic verse ingestion via API.",
    speed: "Fast",
    prediction: "Completed",
    mermaid: `graph LR
    API[Quran API] --> Ayah[Ayah Table]
    Ayah --> Sentence[Sentence Map]
    Sentence --> Taxonomy[Topic/Tagging]`
  }
}

export default function MonitorClient({ pythonJobs, progressFiles }: { pythonJobs: any[], progressFiles: any[] }) {
  const [selectedReport, setSelectedReport] = useState<any>(null);

  return (
    <div className="space-y-8">
      {/* Interactive Pipeline Section */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-indigo-400" />
                    <CardTitle className="text-xl text-slate-300">Active & Historical Pipelines</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full space-y-2">
                    {/* Map known and detected jobs */}
                    {[...pythonJobs, { name: "quran_ingestion" }].map((job, idx) => {
                        const info = PIPELINE_INFO[job.name] || {
                          description: "Custom pipeline flow.",
                          speed: "Unknown",
                          prediction: "N/A",
                          mermaid: `graph LR\n  Start --> Process[Processing] --> End`
                        };
                        
                        return (
                            <AccordionItem key={job.name} value={`item-${idx}`} className="border border-slate-800 rounded-lg px-4 bg-slate-900/30 overflow-hidden">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center justify-between w-full pr-4 text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-800 rounded text-indigo-400">
                                                <Play className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-mono text-sm text-slate-200">{job.name}</p>
                                                <p className="text-xs text-slate-500">{info.description}</p>
                                            </div>
                                        </div>
                                        {job.name.includes('enrich_dictionary') ? (
                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Running</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-500 border-slate-700">Idle</Badge>
                                        )}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-6 border-t border-slate-800/50">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                                        {/* Mermaid Diagram */}
                                        <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 flex flex-col items-center">
                                            <div className="w-full flex justify-between items-center mb-4">
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Process Flow</span>
                                                <Zap className="h-3 w-3 text-yellow-400" />
                                            </div>
                                            <div 
                                                className="mermaid-svg opacity-90 hover:opacity-100 transition-opacity"
                                                dangerouslySetInnerHTML={{ __html: renderMermaid(info.mermaid, { theme: 'dark' }) }}
                                            />
                                        </div>

                                        {/* Metrics & Predictions */}
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-slate-800/20 rounded-lg border border-slate-800/50">
                                                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                        <Zap className="h-3 w-3" />
                                                        <span className="text-[10px] uppercase font-bold">Speed</span>
                                                    </div>
                                                    <p className="text-xl font-bold text-slate-200">{info.speed}</p>
                                                </div>
                                                <div className="p-4 bg-slate-800/20 rounded-lg border border-slate-800/50">
                                                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                        <Clock className="h-3 w-3" />
                                                        <span className="text-[10px] uppercase font-bold">Prediction</span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-emerald-400">{info.prediction}</p>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-indigo-950/10 rounded-lg border border-indigo-500/10">
                                                <h4 className="text-xs font-bold text-indigo-400 uppercase mb-2">Technical Note</h4>
                                                <p className="text-xs text-slate-400 leading-relaxed">
                                                    This pipeline utilizes asynchronous worker pools to maximize throughput. 
                                                    Backpressure is managed via SurrealDB transaction locks.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            </CardContent>
        </Card>
      </div>

      {/* Progress Reports Section */}
      <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
              <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-sky-400" />
                  <CardTitle className="text-xl text-slate-300">Progress Reports</CardTitle>
              </div>
          </CardHeader>
          <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {progressFiles.map(file => (
                      <div 
                        key={file.name} 
                        onClick={() => setSelectedReport(file)}
                        className="group flex flex-col p-4 rounded-xl bg-slate-800/20 border border-slate-800/50 hover:bg-slate-800/40 hover:border-sky-500/30 transition-all cursor-pointer relative overflow-hidden"
                      >
                          <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Maximize2 className="h-3 w-3 text-sky-400" />
                          </div>
                          <span className="font-semibold text-sm text-slate-200 group-hover:text-sky-400 transition-colors line-clamp-1">{file.title}</span>
                          <span className="font-mono text-[10px] text-slate-500 mt-1">{file.name}</span>
                          <div className="mt-3 flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] uppercase border-slate-700 text-slate-500">Log</Badge>
                              <span className="text-[10px] text-slate-600">Click to view content</span>
                          </div>
                      </div>
                  ))}
              </div>
          </CardContent>
      </Card>

      {/* Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl scale-in-center">
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-200">{selectedReport.title}</h3>
                <p className="text-xs font-mono text-slate-500 mt-1">{selectedReport.name}</p>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 prose prose-invert prose-emerald max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">
                {selectedReport.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
