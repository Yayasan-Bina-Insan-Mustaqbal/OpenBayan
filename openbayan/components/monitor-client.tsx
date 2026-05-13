"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
    X,
    Search,
    RefreshCw,
    Table as TableIcon
} from "lucide-react"

import { renderMermaid } from 'beautiful-mermaid'
import { querySurreal } from "@/lib/surreal-query"

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

export default function MonitorClient({ pythonJobs, progressFiles, inventoryData }: { pythonJobs: any[], progressFiles: any[], inventoryData: any }) {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedInventoryTable, setSelectedInventoryTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [mermaidSvgs, setMermaidSvgs] = useState<Record<string, string>>({});

  // Handle Mermaid rendering (it might be async)
  useEffect(() => {
    const renderAll = async () => {
      const svgs: Record<string, string> = {};
      for (const jobName of Object.keys(PIPELINE_INFO)) {
        try {
          const res = renderMermaid(PIPELINE_INFO[jobName].mermaid, { theme: 'dark' });
          svgs[jobName] = res instanceof Promise ? await res : res;
        } catch (e) {
          console.error("Mermaid render failed for", jobName, e);
        }
      }
      setMermaidSvgs(svgs);
    };
    renderAll();
  }, []);

  // Handle Inventory Table Click
  const browseTable = async (table: string, query: string) => {
    setSelectedInventoryTable(table);
    setIsLoadingTable(true);
    setTableData([]);
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: query + " LIMIT 50" })
      });
      
      if (!response.ok) throw new Error("API request failed");
      
      const res = await response.json();
      const results = res[res.length - 1].result;
      setTableData(Array.isArray(results) ? results : []);
    } catch (e) {
      console.error("Failed to fetch table data:", e);
    } finally {
      setIsLoadingTable(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Knowledge Graph Inventory Section */}
      <h2 className="text-2xl font-semibold text-slate-200 mt-8 mb-4 border-b border-slate-800 pb-2">Knowledge Graph Inventory</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <InventoryCard 
            title="Quranic Corpus"
            sourceLabel="quran api -> ayah"
            targetLabel="ayah -> sentence, entities"
            count={inventoryData.ayahs}
            unit="Ayahs"
            color="emerald"
            onClick={() => browseTable("ayah", "SELECT uthmani_text, surah_number, ayah_number, created_at FROM ayah")}
        />
        <InventoryCard 
            title="Hadith Collections"
            sourceLabel="hadith dataset -> hadith"
            targetLabel="hadith -> sentence, rijal"
            count={inventoryData.hadiths}
            unit="Hadiths"
            color="amber"
            onClick={() => browseTable("hadith", "SELECT main_full, hadith_number, collection, grade FROM hadith")}
        />
        <InventoryCard 
            title="Classical Books"
            sourceLabel="book dataset -> book"
            targetLabel="book -> book_section -> sentence"
            count={inventoryData.books}
            unit="Books"
            color="blue"
            onClick={() => browseTable("book", "SELECT title, author, category FROM book")}
        />
        <InventoryCard 
            title="Murad Dictionary"
            sourceLabel="murad dataset -> sentence"
            targetLabel="sentence -> word -> entity"
            count={inventoryData.murad_done}
            unit="Enriched Sentences"
            total={96243}
            color="teal"
            isProgress
            onClick={() => browseTable("sentence", "SELECT text, simple_clean_text, source FROM sentence WHERE source = source:murad_dataset_2026")}
        />
        <InventoryCard 
            title="Taxonomy & Linguistic"
            sourceLabel="sentence -> word"
            targetLabel="word -> root"
            count={inventoryData.words}
            unit="Unique Words"
            color="purple"
            onClick={() => browseTable("word", "SELECT text, root, created_at FROM word")}
        />
        <InventoryCard 
            title="Named Entities"
            sourceLabel="ilm rijal / extraction"
            targetLabel="entity"
            count={inventoryData.entities}
            unit="Entities"
            color="rose"
            onClick={() => browseTable("entity", "SELECT label, type, created_at FROM entity")}
        />
      </div>

      {/* Interactive Pipeline Section */}
      <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
              <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-indigo-400" />
                  <CardTitle className="text-xl text-slate-300">Active & Historical Pipelines</CardTitle>
              </div>
          </CardHeader>
          <CardContent>
              <Accordion type="single" collapsible className="w-full space-y-2">
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
                                      <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 flex flex-col items-center min-h-[300px] justify-center">
                                          <div className="w-full flex justify-between items-center mb-4">
                                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Process Flow</span>
                                              <Zap className="h-3 w-3 text-yellow-400" />
                                          </div>
                                          {mermaidSvgs[job.name] ? (
                                            <div 
                                                className="mermaid-svg opacity-90 hover:opacity-100 transition-opacity w-full overflow-x-auto text-center"
                                                dangerouslySetInnerHTML={{ __html: mermaidSvgs[job.name] }} 
                                            />
                                          ) : (
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                <span className="text-xs">Rendering diagram...</span>
                                            </div>
                                          )}
                                      </div>
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
              <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">
                {selectedReport.content}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Data Browser Modal */}
      {selectedInventoryTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl scale-in-center">
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg">
                    <TableIcon className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-200 uppercase tracking-tight">{selectedInventoryTable} Browser</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Showing latest 50 records from Knowledge Graph</p>
                </div>
              </div>
              <button onClick={() => setSelectedInventoryTable(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-0">
              {isLoadingTable ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500 py-20">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                    <p className="text-sm font-medium">Fetching Knowledge Graph nodes...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-slate-800">
                        <tr>
                            {tableData.length > 0 ? Object.keys(tableData[0]).map(key => (
                                <th key={key} className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 border-r border-slate-800/50 last:border-0">{key}</th>
                            )) : <th className="p-10 text-center text-slate-600">No data found in this table.</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {tableData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                                {Object.values(row).map((val: any, j) => (
                                    <td key={j} className="px-6 py-4 text-sm text-slate-300 font-mono border-r border-slate-800/30 last:border-0">
                                        <div className="max-w-[400px] truncate" title={String(val)}>
                                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
              )}
            </div>
            <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center">
                <p className="text-xs text-slate-500 font-mono">Found {inventoryData[selectedInventoryTable + 's'] || inventoryData[selectedInventoryTable] || 'N/A'} total records</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] border-slate-800">Export CSV</Button>
                    <Button size="sm" className="h-8 text-[10px] bg-slate-800 hover:bg-slate-700">Load More</Button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InventoryCard({ title, sourceLabel, targetLabel, count, unit, color, total, isProgress, onClick }: any) {
    const colorClasses: any = {
        emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/40",
        amber: "text-amber-400 bg-amber-500/10 border-amber-500/20 group-hover:border-amber-500/40",
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20 group-hover:border-blue-500/40",
        teal: "text-teal-400 bg-teal-500/10 border-teal-500/20 group-hover:border-teal-500/40",
        purple: "text-purple-400 bg-purple-500/10 border-purple-500/20 group-hover:border-purple-500/40",
        rose: "text-rose-400 bg-rose-500/10 border-rose-500/20 group-hover:border-rose-500/40"
    }

    const progress = total ? (count / total) * 100 : 0
    const currentColor = colorClasses[color] || colorClasses.emerald

    return (
        <Card onClick={onClick} className="bg-slate-900/50 border-slate-800 hover:bg-slate-900/80 transition-all cursor-pointer group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-slate-300 group-hover:text-slate-100 transition-colors">{title}</CardTitle>
                <Search className="h-3 w-3 text-slate-600 group-hover:text-slate-400" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">FROM</span>
                        <Badge variant="outline" className="text-[10px] py-0">{sourceLabel}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">TO</span>
                        <Badge variant="outline" className="text-[10px] py-0 border-slate-600 text-slate-300">{targetLabel}</Badge>
                    </div>
                </div>

                <div className={"p-4 rounded-lg border transition-all " + currentColor + " flex flex-col items-center justify-center"}>
                    <p className="text-3xl font-bold tracking-tight">{(count || 0).toLocaleString()}</p>
                    <p className="text-xs uppercase tracking-wider font-semibold opacity-80 mt-1">{unit}</p>
                </div>

                {isProgress && total && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{progress.toFixed(2)}%</span>
                            <span>{total.toLocaleString()} total</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-teal-500 rounded-full"
                                style={{ width: Math.max(progress, 1) + "%" }}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
