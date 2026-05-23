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
    Table as TableIcon,
    ArrowUpRight,
    Cpu,
    Layers,
    Network
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

const PIPELINE_INFO: Record<string, any> = {
  "atomize_quran_v2.py": {
    description: "Linguistic Quranic Ayah segmentation and semantic sentence mapping.",
    speed: "~1,200 Ayahs/hr",
    prediction: "Quran Corpus",
    mermaid: `graph TD
    A[Quranic Ayahs] -->|Segment by Punctuation| B(Linguistic Segments)
    B -->|Strip Tashkeel| C(Clean Simple Text)
    C -->|Embed via Ollama| D[mxbai-embed-large]
    D -->|UPSERT| E[(sentence Table)]`
  },
  "atomize_hadith_v5.py": {
    description: "Hybrid narration analysis, isnad/matn split, and sentence atomization.",
    speed: "~800 Hadiths/hr",
    prediction: "Hadith Collections",
    mermaid: `graph TD
    A[Hadith Records] -->|Regex boundary anchors| B{Isnad/Matn Split}
    B -->|Extract Matn| C[Arabic Punctuation Chunker]
    C -->|If long paragraph| D[Sub-segment by Particles]
    D -->|Embed via Ollama| E[mxbai-embed-large]
    E -->|UPSERT| F[(sentence Table)]`
  },
  "atomize_tafsir.py": {
    description: "Verse commentary chunking and semantic HTML text extraction.",
    speed: "~1,500 Ayahs/hr",
    prediction: "Tafsir Commentaries",
    mermaid: `graph TD
    A[HTML Tafsir Content] -->|Strip HTML Tags| B(Clean Tafsir Text)
    B -->|Punctuation Splitter .?!| C{Length Guard}
    C -->|>500 chars fallback| D[80-Word Block Chunker]
    C -->|Standard Sentence| E[mxbai-embed-large]
    D --> E
    E -->|UPSERT| F[(sentence Table)]`
  },
  "atomize_kitab.py": {
    description: "Recursive book page passage chunking with 15% overlap context-retention.",
    speed: "~2,000 Pages/hr",
    prediction: "Classical Book Pages",
    mermaid: `graph TD
    A[Classical Book Pages] -->|Recursive Chunker| B(350-Word Passages)
    B -->|Apply 15% Overlap| C(Context-Preserved Chunks)
    C -->|Embed via Ollama| D[mxbai-embed-large]
    D -->|UPSERT| E[(sentence Table)]`
  },
  "populate_clean_sentences.py": {
    description: "High-concurrence Arabic diacritics (Harakat) stripping utility.",
    speed: "~15,000 Sentences/min",
    prediction: "Harakat Migration",
    mermaid: `graph LR
    A[Lacking simple_clean_text] -->|ThreadPoolExecutor 20| B[Batch fetch 200]
    B -->|strip_tashkeel| C[Update simple_clean_text]
    C -->|RocksDB Memory Safe| D[(Update DB Records)]`
  },
  "ingest_athar_final.py": {
    description: "Multi-stage Athar dataset ingestion using HTTP streaming.",
    speed: "Auto-detected",
    prediction: "Dynamic",
    mermaid: `graph TD
    HF[HuggingFace Hub] -->|Stream| S{Auth Client}
    S -->|HTTP POST| DB[(SurrealDB)]
    DB -->|UPSERT| SRC[Source Table]
    DB -->|UPSERT| PG[Book Page Table]`
  },
  "ingest_hf_enhanced_knowledge.py": {
    description: "650k Hadith Sanadset ingestion with normalized identifiers.",
    speed: "Fast",
    prediction: "Completed",
    mermaid: `graph LR
    HF[HF Sanadset] --> Map[ID Normalization]
    Map --> Hadith[(Hadith Table)]
    Hadith --> Relation[Graph Links]`
  },
  "enrich_dictionary_data.py": {
    description: "LLM-based morphological and entity enrichment for dictionary entries.",
    speed: "~120 entries/hr",
    prediction: "Ongoing",
    mermaid: `graph TD
    S(Sentence) -->|Batch 1k| LLM{LLM Extract}
    LLM --> Word[Word/Root]
    LLM --> Entity[Entity]`
  }
}

import { MarkdownDocsRenderer } from './markdown-renderer';

export default function MonitorClient({ pythonJobs, progressFiles, documentationDocs = [], initialMetrics }: { pythonJobs: any[], progressFiles: any[], documentationDocs?: any[], initialMetrics: any }) {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedInventoryTable, setSelectedInventoryTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [mermaidSvgs, setMermaidSvgs] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState<any>(initialMetrics);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(documentationDocs?.[0] || null);

  const fetchMetrics = async () => {
    setIsRefreshing(true);
    try {
        const res = await fetch("/api/monitor-stats");
        if (res.ok) {
            const data = await res.json();
            setMetrics(data);
        }
    } catch (e) {
        console.error("Failed to fetch metrics:", e);
    } finally {
        setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const renderAll = async () => {
      const svgs: Record<string, string> = {};
      for (const jobName of Object.keys(PIPELINE_INFO)) {
        try {
          const res = renderMermaid(PIPELINE_INFO[jobName].mermaid, { theme: 'dark' } as any);
          svgs[jobName] = res instanceof Promise ? await res : res;
        } catch (e) {
          console.error("Mermaid render failed for", jobName, e);
        }
      }
      setMermaidSvgs(svgs);
    };
    renderAll();
  }, []);

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

  const formatETA = (seconds: number | null) => {
      if (seconds === null || seconds < 0) return "--";
      if (seconds < 60) return `${Math.round(seconds)}s`;
      if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
      if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
      return `${(seconds / 86400).toFixed(1)}d`;
  };

  const renderJobsAccordion = (jobNames: string[]) => {
      const filteredJobs = pythonJobs.filter(j => jobNames.includes(j.name));
      if (filteredJobs.length === 0) {
          return (
              <div className="text-center py-8 text-slate-600 text-xs border border-slate-800/80 border-dashed rounded-xl bg-slate-900/10">
                  No active or registered flows in this category.
              </div>
          );
      }
      return (
          <Accordion type="single" collapsible className="w-full space-y-3">
              {filteredJobs.map((job, idx) => {
                  const info = PIPELINE_INFO[job.name] || {
                    description: "External processing flow.",
                    speed: "N/A",
                    prediction: "N/A",
                    mermaid: `graph LR\n  Start --> Process[Processing] --> End`
                  };
                  
                  const isNewJob = [
                      'atomize_quran_v2.py',
                      'atomize_hadith_v5.py',
                      'atomize_tafsir.py',
                      'atomize_kitab.py',
                      'populate_clean_sentences.py',
                      'enrich_dictionary_data.py',
                      'ingest_hf_enhanced_knowledge.py'
                  ].includes(job.name);

                  const jobStats = isNewJob 
                      ? metrics?.jobs?.[job.name] 
                      : (job.name === 'ingest_athar_final.py' ? metrics?.athar : null);

                  const isActive = jobStats?.active || (job.name === 'ingest_athar_final.py' && metrics?.athar?.speed > 0);
                  const speedText = jobStats?.speed ? `~${jobStats.speed.toFixed(1)}/m` : info.speed;
                  const etaText = (jobStats?.eta !== undefined && jobStats?.eta !== null) ? formatETA(jobStats.eta) : info.prediction;
                  
                  return (
                      <AccordionItem key={job.name} value={`item-${idx}`} className="border border-slate-800 rounded-xl px-4 bg-slate-900/30 hover:bg-slate-900/50 transition-colors overflow-hidden">
                          <AccordionTrigger className="hover:no-underline py-4">
                              <div className="flex items-center justify-between w-full pr-4 text-left">
                                  <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded ${isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                          {isActive ? <Zap className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />}
                                      </div>
                                      <div>
                                          <p className="font-mono text-sm text-slate-200">{job.name}</p>
                                          <p className="text-xs text-slate-500">{info.description}</p>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {isActive && (
                                        <div className="text-right hidden md:block">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">Live Speed</p>
                                            <p className="text-xs font-mono text-emerald-400">{speedText}</p>
                                        </div>
                                    )}
                                    {isActive ? (
                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3">ACTIVE</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-slate-600 border-slate-800">IDLE</Badge>
                                    )}
                                  </div>
                              </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-6 border-t border-slate-800/50">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 flex flex-col items-center min-h-[300px] justify-center relative">
                                      <div className="absolute top-2 left-2 flex items-center gap-2">
                                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Logic Visualization</span>
                                      </div>
                                      {mermaidSvgs[job.name] ? (
                                        <div 
                                            className="mermaid-svg opacity-80 hover:opacity-100 transition-opacity w-full overflow-x-auto text-center"
                                            dangerouslySetInnerHTML={{ __html: mermaidSvgs[job.name] }} 
                                        />
                                      ) : (
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            <span className="text-xs">Generating flow map...</span>
                                        </div>
                                      )}
                                  </div>
                                  <div className="space-y-6">
                                      <div className="grid grid-cols-2 gap-4">
                                          <div className="p-4 bg-slate-800/20 rounded-xl border border-slate-800/50">
                                              <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                  <Zap className="h-3 w-3" />
                                                  <span className="text-[10px] uppercase font-bold">Performance</span>
                                              </div>
                                              <p className="text-xl font-bold text-slate-200">
                                                  {speedText}
                                              </p>
                                          </div>
                                          <div className="p-4 bg-slate-800/20 rounded-xl border border-slate-800/50">
                                              <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                  <Clock className="h-3 w-3" />
                                                  <span className="text-[10px] uppercase font-bold">ETA</span>
                                              </div>
                                              <p className={`text-sm font-semibold ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                  {etaText}
                                              </p>
                                          </div>
                                      </div>
                                      <div className="p-5 bg-indigo-950/10 rounded-xl border border-indigo-500/10">
                                          <h4 className="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center gap-2">
                                              <FileText className="h-3 w-3" />
                                              Pipeline Context
                                          </h4>
                                          <p className="text-xs text-slate-400 leading-relaxed italic">
                                              "This process handles heavy transformation. It leverages reciprocal rank fusion for indexing and utilizes the mxbai-embed-large model for semantic mapping."
                                          </p>
                                      </div>
                                      <div className="flex gap-2">
                                          <Button size="sm" variant="outline" className="flex-1 border-slate-800 hover:bg-slate-800 text-[10px] h-9 uppercase font-bold">View Logs</Button>
                                          <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-[10px] h-9 uppercase font-bold">Debug Flow</Button>
                                      </div>
                                  </div>
                              </div>
                          </AccordionContent>
                      </AccordionItem>
                  )
              })}
          </Accordion>
      );
  };

  return (
    <div className="space-y-12">
      {/* SECTION 1: Immutable Source Texts */}
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-400" />
            <h2 className="text-2xl font-bold text-slate-200">Knowledge Graph Inventory</h2>
          </div>
          <Button 
              size="sm" 
              variant="ghost" 
              onClick={fetchMetrics} 
              className="text-slate-500 hover:text-emerald-400"
              disabled={isRefreshing}
          >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Updating...' : 'Refresh Stats'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <InventoryCard 
              title="Quranic Corpus"
              sourceLabel="quran api"
              targetLabel="ayah"
              stats={metrics?.quran}
              unit="Ayahs"
              color="emerald"
              onClick={() => browseTable("ayah", "SELECT uthmani_text, surah_number, ayah_number, created_at FROM ayah")}
          />
          <InventoryCard 
              title="Hadith Collections"
              sourceLabel="650k sanadset"
              targetLabel="hadith"
              stats={metrics?.hadith}
              unit="Records"
              color="amber"
              onClick={() => browseTable("hadith", "SELECT collection, hadith_number, matn_ar FROM hadith")}
          />
          <InventoryCard 
              title="Athar Passages"
              sourceLabel="Kandil7/Athar"
              targetLabel="book_page"
              stats={metrics?.athar}
              unit="Passages"
              color="blue"
              onClick={() => browseTable("book_page", "SELECT content, category, page_number FROM book_page WHERE id >= book_page:athar_")}
          />
          <InventoryCard 
              title="Classical Books"
              sourceLabel="Shamela Dataset"
              targetLabel="book"
              stats={metrics?.shamela}
              unit="Pages"
              color="teal"
              onClick={() => browseTable("book_page", "SELECT content, page_number FROM book_page WHERE id >= book_page:s")}
          />
        </div>
      </div>

      {/* SECTION 2: Sentence Processing & Knowledge Integration */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <FileText className="h-5 w-5 text-indigo-400" />
          <h2 className="text-2xl font-bold text-slate-200">Sentence Processing & Knowledge Integration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InventoryCard 
              title="Knowledge Atoms"
              targetLabel="sentence"
              stats={metrics?.sentences}
              unit="Sentences"
              color="purple"
              onClick={() => browseTable("sentence", "SELECT text, source FROM sentence")}
          />
          <InventoryCard 
              title="Named Entities"
              targetLabel="entity"
              stats={metrics?.entities}
              unit="Entities"
              color="rose"
              onClick={() => browseTable("entity", "SELECT label, type FROM entity")}
          />
          <InventoryCard 
              title="Graph Relations"
              sourceLabel="Knowledge links"
              targetLabel="relation"
              stats={metrics?.relations}
              unit="Edges"
              color="blue"
              onClick={() => browseTable("defines", "SELECT parent, target, type FROM defines LIMIT 50")}
          />
        </div>

        <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
            <CardHeader className="border-b border-slate-800/50 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-indigo-400" />
                      <CardTitle className="text-base text-slate-300 font-semibold">Chunking & Sentence Extraction Flows</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-indigo-500/5 text-indigo-400 border-indigo-500/20">Atomization</Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {renderJobsAccordion([
                    'atomize_quran_v2.py',
                    'atomize_hadith_v5.py',
                    'atomize_tafsir.py',
                    'atomize_kitab.py'
                ])}
            </CardContent>
        </Card>
      </div>

      {/* SECTION 3: Vectorization & Embedding */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Cpu className="h-5 w-5 text-sky-400" />
          <h2 className="text-2xl font-bold text-slate-200">Vectorization & Semantic Mapping</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-slate-900/40 border-slate-800/80 p-6 flex flex-col justify-between shadow-lg min-h-[220px]">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Embedding Node</span>
                        {metrics?.ollamaStatus === "online" ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-2.5 py-0.5 animate-pulse">ONLINE</Badge>
                        ) : (
                            <Badge variant="outline" className="text-rose-500 border-rose-500/20 bg-rose-500/5 px-2.5 py-0.5">OFFLINE</Badge>
                        )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-200 mb-1">Ollama Server</h3>
                    <p className="font-mono text-xs text-slate-500">100.121.116.17:11434</p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Active Model:</span>
                    <span className="font-mono text-emerald-400 font-bold">mxbai-embed-large</span>
                </div>
            </Card>
            <div className="lg:col-span-2">
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl h-full">
                    <CardHeader className="border-b border-slate-800/50 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                              <Terminal className="h-4 w-4 text-sky-400" />
                              <CardTitle className="text-base text-slate-300 font-semibold">Pre-Embedding Diacritic Cleaners</CardTitle>
                          </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {renderJobsAccordion(['populate_clean_sentences.py'])}
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>

      {/* SECTION 4: AI Knowledge Enrichment */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Network className="h-5 w-5 text-amber-400" />
          <h2 className="text-2xl font-bold text-slate-200">AI Knowledge Enrichment</h2>
        </div>

        <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
            <CardHeader className="border-b border-slate-800/50 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-amber-400" />
                      <CardTitle className="text-base text-slate-300 font-semibold">Knowledge Enrichment Pipelines</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/5 text-amber-400 border-amber-500/20">Enrichment</Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {renderJobsAccordion([
                    'enrich_dictionary_data.py',
                    'ingest_hf_enhanced_knowledge.py',
                    'ingest_athar_final.py'
                ])}
            </CardContent>
        </Card>
      </div>

      {/* Documentation Hub Section */}
      {documentationDocs && documentationDocs.length > 0 && (
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
              <CardHeader className="border-b border-slate-800/50 flex flex-row items-center justify-between py-4">
                  <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-indigo-400" />
                      <CardTitle className="text-xl text-slate-300">Architecture & Ingestion Documentation</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-indigo-500/5 text-indigo-400 border-indigo-500/20 uppercase text-[9px] tracking-widest font-black">Knowledge Base</Badge>
              </CardHeader>
              <CardContent className="pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                      {/* Doc Sidebar Navigation */}
                      <div className="space-y-1.5">
                          {documentationDocs.map((doc: any) => {
                              const category = doc.name.split('/')[0];
                              const isActive = activeDoc?.name === doc.name;
                              return (
                                  <button
                                      key={doc.name}
                                      onClick={() => setActiveDoc(doc)}
                                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                                          isActive 
                                              ? 'bg-slate-800/80 border-indigo-500/50 text-slate-100 shadow-md shadow-indigo-500/5' 
                                              : 'bg-slate-900/20 border-slate-800/50 hover:bg-slate-800/30 text-slate-400 hover:text-slate-200'
                                      }`}
                                  >
                                      <div>
                                          <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider block mb-0.5">{category}</span>
                                          <span className="font-semibold text-xs leading-tight line-clamp-1">{doc.title}</span>
                                      </div>
                                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isActive ? 'rotate-90 text-indigo-400' : 'text-slate-600'}`} />
                                  </button>
                              )
                          })}
                      </div>
                      {/* Active Doc Viewer */}
                      <div className="lg:col-span-3 bg-slate-950/30 border border-slate-800/80 rounded-2xl p-8 max-h-[600px] overflow-y-auto shadow-inner">
                          {activeDoc ? (
                              <MarkdownDocsRenderer content={activeDoc.content} />
                          ) : (
                              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-500 gap-2">
                                  <FileText className="h-8 w-8 text-slate-700 animate-bounce" />
                                  <p className="text-xs font-semibold">Select a documentation page from the sidebar to view details</p>
                              </div>
                          )}
                      </div>
                  </div>
              </CardContent>
          </Card>
      )}

      {/* Progress Reports Section */}
      <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
          <CardHeader className="border-b border-slate-800/50">
              <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-sky-400" />
                  <CardTitle className="text-xl text-slate-300">System Logs</CardTitle>
              </div>
          </CardHeader>
          <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {progressFiles.map(file => (
                      <div 
                        key={file.name} 
                        onClick={() => setSelectedReport(file)}
                        className="group flex flex-col p-4 rounded-xl bg-slate-800/20 border border-slate-800/50 hover:bg-slate-800/40 hover:border-sky-500/30 transition-all cursor-pointer relative overflow-hidden"
                      >
                          <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ArrowUpRight className="h-4 w-4 text-sky-400" />
                          </div>
                          <span className="font-semibold text-xs text-slate-400 uppercase tracking-tighter mb-1">{file.name}</span>
                          <span className="font-bold text-sm text-slate-200 group-hover:text-sky-400 transition-colors line-clamp-2 leading-tight">{file.title}</span>
                          <div className="mt-auto pt-4 flex items-center justify-between">
                              <Badge variant="outline" className="text-[9px] uppercase border-slate-700 text-slate-500">Log Entry</Badge>
                              <span className="text-[10px] text-slate-600 font-mono italic">Click to expand</span>
                          </div>
                      </div>
                  ))}
              </div>
          </CardContent>
      </Card>

      {/* Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl scale-in-center">
            <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
              <div>
                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-[0.2em] mb-1">System Log</p>
                <h3 className="text-xl font-bold text-slate-200">{selectedReport.title}</h3>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-950/30">
              <pre className="whitespace-pre-wrap text-xs text-slate-400 font-mono leading-relaxed p-4 bg-black/20 rounded-lg border border-slate-800/50">
                {selectedReport.content}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Data Browser Modal */}
      {selectedInventoryTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl scale-in-center">
            <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <TableIcon className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-200 uppercase tracking-tight">{selectedInventoryTable} Node Browser</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Direct SurrealDB Query Interface</p>
                </div>
              </div>
              <button onClick={() => setSelectedInventoryTable(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-950/20">
              {isLoadingTable ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-600 py-32">
                    <RefreshCw className="h-10 w-10 animate-spin text-emerald-500/20" />
                    <p className="text-sm font-medium animate-pulse">Scanning graph shards...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-slate-800 shadow-sm">
                        <tr>
                            {tableData.length > 0 ? Object.keys(tableData[0]).map(key => (
                                <th key={key} className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 border-r border-slate-800/30 last:border-0">{key}</th>
                            )) : <th className="p-20 text-center text-slate-700 italic font-mono">End of dataset or empty table.</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                        {tableData.map((row, i) => (
                            <tr key={i} className="hover:bg-indigo-500/5 transition-colors group">
                                {Object.values(row).map((val: any, j) => (
                                    <td key={j} className="px-6 py-4 text-xs text-slate-400 font-mono border-r border-slate-800/20 last:border-0 group-hover:text-slate-200">
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
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Query complete</p>
                    <div className="h-4 w-px bg-slate-800" />
                    <p className="text-xs text-slate-400 font-mono">{tableData.length} records in view</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] border-slate-800 bg-transparent text-slate-500 hover:text-slate-200 uppercase font-black tracking-widest">JSON</Button>
                    <Button size="sm" className="h-8 text-[10px] bg-slate-800 hover:bg-slate-700 uppercase font-black tracking-widest px-6">Fetch Next 50</Button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InventoryCard({ title, sourceLabel, targetLabel, stats, unit, color, onClick }: any) {
    const colorClasses: any = {
        emerald: "text-emerald-400 bg-emerald-500/5 border-emerald-500/10 group-hover:border-emerald-500/30",
        amber: "text-amber-400 bg-amber-500/5 border-amber-500/10 group-hover:border-amber-500/30",
        blue: "text-blue-400 bg-blue-500/5 border-blue-500/10 group-hover:border-blue-500/30",
        teal: "text-teal-400 bg-teal-500/5 border-teal-500/10 group-hover:border-teal-500/30",
        purple: "text-purple-400 bg-purple-500/5 border-purple-500/10 group-hover:border-purple-500/30",
        rose: "text-rose-400 bg-rose-500/5 border-rose-500/10 group-hover:border-rose-500/30"
    }

    const count = stats?.count || 0
    const total = stats?.total
    const progress = stats?.progress
    const speed = stats?.speed
    const eta = stats?.eta

    const currentColor = colorClasses[color] || colorClasses.emerald

    const formatETA = (seconds: number | null) => {
        if (seconds === null || seconds < 0) return "--";
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
        return `${(seconds / 86400).toFixed(1)}d`;
    };

    return (
        <Card onClick={onClick} className="bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70 transition-all cursor-pointer group shadow-lg">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-slate-400 transition-colors">{title}</CardTitle>
                </div>
                <div className={`p-1.5 rounded-md opacity-50 group-hover:opacity-100 transition-all ${currentColor.split(' ')[0]}`}>
                    <Search className="h-3.5 w-3.5" />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-1.5">
                    {sourceLabel && (
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-600 uppercase w-8">From</span>
                            <Badge variant="outline" className="text-[9px] py-0 border-slate-800 text-slate-500">{sourceLabel}</Badge>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-600 uppercase w-8">To</span>
                        <Badge variant="outline" className="text-[9px] py-0 border-indigo-500/20 text-indigo-400/70 bg-indigo-500/5">{targetLabel}</Badge>
                    </div>
                </div>

                <div className={"py-5 rounded-xl border transition-all " + currentColor + " flex flex-col items-center justify-center"}>
                    <p className="text-3xl font-black tracking-tighter">{(count || 0).toLocaleString()}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60 mt-1">{unit}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/20 rounded-lg p-2 border border-slate-800/50">
                        <p className="text-[8px] font-black text-slate-600 uppercase mb-0.5">Speed</p>
                        <p className="text-xs font-mono font-bold text-slate-300">
                            {speed > 0 ? `~${speed.toFixed(0)}/m` : 'IDLE'}
                        </p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2 border border-slate-800/50">
                        <p className="text-[8px] font-black text-slate-600 uppercase mb-0.5">ETA</p>
                        <p className="text-xs font-mono font-bold text-emerald-500/80">
                            {speed > 0 ? formatETA(eta) : '--'}
                        </p>
                    </div>
                </div>

                {total && (
                    <div className="space-y-2 pt-1">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                            <span className="text-slate-400">{progress?.toFixed(1)}% complete</span>
                            <span className="text-slate-600">{total.toLocaleString()} target</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden border border-slate-800">
                            <div 
                                className={`h-full transition-all duration-1000 ease-out rounded-full ${color === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: Math.max(Math.min(progress || 0, 100), 1) + "%" }}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
