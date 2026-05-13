import { querySurreal } from "@/lib/surreal-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, CheckCircle, Clock, Database, RefreshCw, Terminal, FileText, Zap } from "lucide-react"
import Link from "next/link"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

function Badge({ children, variant = "default", className = "" }: any) {
    const variants: any = {
        default: "bg-slate-800 text-slate-200 border-slate-700",
        outline: "border-slate-800 text-slate-400 bg-transparent",
    }
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`}>
            {children}
        </span>
    )
}

function getProgressFiles() {
  const possiblePaths = [
    path.join(process.cwd(), 'backend_progress'),
    path.join(process.cwd(), '../OpenBayanBackend/progress')
  ]
  
  let progressPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      progressPath = p;
      break;
    }
  }

  if (!progressPath) return [];

  const files = fs.readdirSync(progressPath)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort().reverse();
  
  return files.map(f => {
    const content = fs.readFileSync(path.join(progressPath, f), 'utf-8');
    const title = content.split('\n')[0].replace(/^#+\s*/, '') || f;
    return { name: f, title };
  });
}

function getPythonJobs() {
  const possiblePaths = [
    path.join(process.cwd(), 'backend_flows'),
    path.join(process.cwd(), '../OpenBayanBackend/notebooks/flows')
  ]
  
  let flowsPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      flowsPath = p;
      break;
    }
  }

  if (!flowsPath) return [];

  const files = fs.readdirSync(flowsPath)
    .filter(f => f.endsWith('.py'));
  
  return files.map(f => {
    return { name: f };
  });
}

export default async function MonitorPage() {
  const statsQuery = `
    let $ayahs = (SELECT count() FROM ayah GROUP ALL)[0].count OR 0;
    let $hadiths = (SELECT count() FROM hadith GROUP ALL)[0].count OR 0;
    let $books = (SELECT count() FROM book GROUP ALL)[0].count OR 0;
    let $words = (SELECT count() FROM word GROUP ALL)[0].count OR 0;
    let $entities = (SELECT count() FROM entity GROUP ALL)[0].count OR 0;
    let $sentences = (SELECT count() FROM sentence GROUP ALL)[0].count OR 0;
    
    let $murad_done = (SELECT count() FROM sentence WHERE source = source:murad_dataset_2026 AND simple_clean_text != NONE GROUP ALL)[0].count OR 0;

    SELECT 
        $ayahs as ayahs,
        $hadiths as hadiths,
        $books as books,
        $words as words,
        $entities as entities,
        $sentences as sentences,
        $murad_done as murad_done;
  `
  
  let data: any = { ayahs: 0, hadiths: 0, books: 0, words: 0, entities: 0, sentences: 0, murad_done: 0 }
  try {
    const res = await querySurreal(statsQuery)
    data = res[res.length - 1].result[0]
  } catch (e) {
    console.error("Monitor Data Fetch Failed:", e)
  }

  const progressFiles = getProgressFiles();
  const pythonJobs = getPythonJobs();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            System Monitor
          </h1>
          <p className="text-slate-400 mt-2">OpenBayan Knowledge Graph Inventory & Jobs</p>
        </div>
        <div className="flex gap-3">
            <Link href="/workspace">
                <Button variant="outline" className="border-slate-800 hover:bg-slate-900">
                    Back to Workspace
                </Button>
            </Link>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
        </div>
      </div>

      {/* Global Knowledge Graph Inventory */}
      <h2 className="text-2xl font-semibold text-slate-200 mt-8 mb-4 border-b border-slate-800 pb-2">Knowledge Graph Inventory</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <InventoryCard 
            title="Quranic Corpus"
            sourceLabel="quran api -> ayah"
            targetLabel="ayah -> sentence, entities"
            count={data.ayahs}
            unit="Ayahs"
            color="emerald"
        />
        
        <InventoryCard 
            title="Hadith Collections"
            sourceLabel="hadith dataset -> hadith"
            targetLabel="hadith -> sentence, rijal"
            count={data.hadiths}
            unit="Hadiths"
            color="amber"
        />

        <InventoryCard 
            title="Classical Books"
            sourceLabel="book dataset -> book"
            targetLabel="book -> book_section -> sentence"
            count={data.books}
            unit="Books"
            color="blue"
        />

        <InventoryCard 
            title="Murad Dictionary"
            sourceLabel="murad dataset -> sentence"
            targetLabel="sentence -> word -> entity"
            count={data.murad_done}
            unit="Enriched Sentences"
            total={96243}
            color="teal"
            isProgress
        />

        <InventoryCard 
            title="Taxonomy & Linguistic"
            sourceLabel="sentence -> word"
            targetLabel="word -> root"
            count={data.words}
            unit="Unique Words"
            color="purple"
        />

        <InventoryCard 
            title="Named Entities (Rijal/Concepts)"
            sourceLabel="ilm rijal / extraction"
            targetLabel="entity"
            count={data.entities}
            unit="Entities"
            color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8">
        {/* Python Jobs Section */}
        <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-indigo-400" />
                    <CardTitle className="text-xl text-slate-300">Active Python Pipelines</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {pythonJobs.length > 0 ? pythonJobs.map(job => (
                        <div key={job.name} className="flex justify-between items-center p-3 rounded-lg bg-slate-800/30 border border-slate-800/50">
                            <span className="font-mono text-sm text-slate-300">{job.name}</span>
                            {job.name.includes('enrich_dictionary') ? (
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Running</Badge>
                            ) : (
                                <Badge variant="outline" className="border-slate-600 text-slate-400">Idle</Badge>
                            )}
                        </div>
                    )) : (
                        <p className="text-slate-500 text-sm">No python flows detected in directory.</p>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* Progress Logs Section */}
        <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-sky-400" />
                    <CardTitle className="text-xl text-slate-300">Progress Reports</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {progressFiles.length > 0 ? progressFiles.map(file => (
                        <div key={file.name} className="flex flex-col p-3 rounded-lg bg-slate-800/30 border border-slate-800/50 gap-1">
                            <span className="font-semibold text-sm text-slate-200">{file.title}</span>
                            <span className="font-mono text-xs text-slate-500">{file.name}</span>
                        </div>
                    )) : (
                        <p className="text-slate-500 text-sm">No progress logs detected.</p>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InventoryCard({ title, sourceLabel, targetLabel, count, unit, color, total, isProgress }: any) {
    const colorClasses: any = {
        emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        teal: "text-teal-400 bg-teal-500/10 border-teal-500/20",
        purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        rose: "text-rose-400 bg-rose-500/10 border-rose-500/20"
    }

    const progress = total ? (count / total) * 100 : 0

    return (
        <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg text-slate-300">{title}</CardTitle>
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

                <div className={`p-4 rounded-lg border ${colorClasses[color]} flex flex-col items-center justify-center`}>
                    <p className="text-3xl font-bold tracking-tight">{count?.toLocaleString() || 0}</p>
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
                                style={{ width: \`\${Math.max(progress, 1)}%\` }}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
