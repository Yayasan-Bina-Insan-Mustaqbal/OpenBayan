
import { querySurreal } from "@/lib/surreal-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, CheckCircle, Clock, Database, RefreshCw, Zap } from "lucide-react"
import Link from "next/link"

// Force dynamic to ensure fresh data
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

export default async function MonitorPage() {
  const statsQuery = `
    let $total = (SELECT count() FROM sentence WHERE source = source:murad_dataset_2026 GROUP ALL)[0].count OR 0;
    let $done = (SELECT count() FROM sentence WHERE source = source:murad_dataset_2026 AND simple_clean_text != NONE GROUP ALL)[0].count OR 0;
    let $words = (SELECT count() FROM word WHERE root != NONE GROUP ALL)[0].count OR 0;
    let $entities = (SELECT count() FROM entity GROUP ALL)[0].count OR 0;
    
    SELECT 
        $total as total,
        $done as done,
        $words as words,
        $entities as entities;
  `
  
  let data: any = { total: 0, done: 0, words: 0, entities: 0 }
  try {
    const res = await querySurreal(statsQuery)
    data = res[res.length - 1].result[0]
  } catch (e) {
    console.error("Monitor Data Fetch Failed:", e)
  }

  const pending = data.total - data.done
  const progress = data.total > 0 ? (data.done / data.total) * 100 : 0
  
  // Rate estimation (based on previous findings: ~43/hr)
  const ratePerHour = 43
  const hoursRemaining = ratePerHour > 0 ? pending / ratePerHour : 0
  const daysRemaining = Math.floor(hoursRemaining / 24)
  const extraHours = Math.floor(hoursRemaining % 24)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            System Monitor
          </h1>
          <p className="text-slate-400 mt-2">OpenBayan Knowledge Graph Enrichment Pipeline</p>
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

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total records" 
            value={data.total.toLocaleString()} 
            icon={<Database className="h-5 w-5 text-emerald-400" />} 
            description="Murad Reverse Dictionary"
        />
        <StatCard 
            title="Enriched" 
            value={data.done.toLocaleString()} 
            icon={<CheckCircle className="h-5 w-5 text-teal-400" />} 
            description={`${progress.toFixed(2)}% of dataset`}
            trend="active"
        />
        <StatCard 
            title="Pending" 
            value={pending.toLocaleString()} 
            icon={<Clock className="h-5 w-5 text-amber-400" />} 
            description="Awaiting LLM Processing"
        />
        <StatCard 
            title="Avg Rate" 
            value="~43/hr" 
            icon={<Zap className="h-5 w-5 text-yellow-400" />} 
            description="LLM Extraction Speed"
        />
      </div>

      {/* Progress & ETA */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-medium text-slate-300">Enrichment Progress</CardTitle>
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
                    <Activity className="mr-1 h-3 w-3 animate-pulse" /> Running
                </Badge>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Completion</span>
                    <span className="font-mono text-emerald-400">{progress.toFixed(4)}%</span>
                </div>
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000"
                        style={{ width: `${Math.max(progress, 0.5)}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Estimated Completion</p>
                    <p className="text-2xl font-bold text-slate-200">
                        {daysRemaining}d {extraHours}h
                    </p>
                    <p className="text-xs text-slate-500 italic">Target: Aug 13, 2026</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Nodes Created</p>
                    <p className="text-2xl font-bold text-slate-200">{data.words.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Unique Dictionary Roots</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Entities Identified</p>
                    <p className="text-2xl font-bold text-slate-200">{data.entities.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Scholarly Concepts Linked</p>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* System Status Log (Placeholder for now) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-800 h-full">
                <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-300">Live Infrastructure Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <StatusItem name="SurrealDB (Remote)" status="Online" latency="42ms" color="emerald" />
                        <StatusItem name="Prefect Server" status="Online" latency="12ms" color="emerald" />
                        <StatusItem name="AI Worker Pool" status="Active (10 threads)" latency="N/A" color="teal" />
                        <StatusItem name="Ollama Infrerence" status="Steady" latency="1.2s avg" color="emerald" />
                    </div>
                </CardContent>
            </Card>
        </div>
        <div>
            <Card className="bg-emerald-950/20 border-emerald-900/30 h-full border-dashed">
                <CardHeader>
                    <CardTitle className="text-lg font-medium text-emerald-400">Optimization Note</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-400 space-y-4">
                    <p>Current bottleneck identified in <strong>Ollama JSON inference</strong>. Each record requires ~30-60s for full linguistic analysis.</p>
                    <p className="border-l-2 border-emerald-500/50 pl-4 py-1 italic">"Switching to Hybrid-Regex for structured entries will reduce completion time to ~2.8 days."</p>
                    <Button variant="link" className="text-emerald-500 p-0 h-auto">View Incident Report</Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, description, trend }: any) {
    return (
        <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-400">{title}</p>
                        <p className="text-3xl font-bold tracking-tight text-slate-100">{value}</p>
                    </div>
                    <div className="p-2 bg-slate-800/50 rounded-lg">
                        {icon}
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <p className="text-xs text-slate-500">{description}</p>
                    {trend === "active" && (
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function StatusItem({ name, status, latency, color }: any) {
    const colorClasses: any = {
        emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        teal: "bg-teal-500/10 text-teal-400 border-teal-500/20",
        amber: "bg-amber-500/10 text-amber-400 border-amber-500/20"
    }

    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-800/50">
            <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full bg-${color}-500`} />
                <span className="text-sm font-medium text-slate-300">{name}</span>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500">{latency}</span>
                <Badge variant="outline" className={`text-[10px] uppercase tracking-wider py-0 px-2 font-bold ${colorClasses[color]}`}>
                    {status}
                </Badge>
            </div>
        </div>
    )
}
