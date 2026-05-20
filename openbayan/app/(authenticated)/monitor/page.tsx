import { querySurreal } from "@/lib/surreal-query"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import Link from "next/link"
import fs from "fs"
import path from "path"
import MonitorClient from "@/components/monitor-client"

export const dynamic = "force-dynamic"

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

  try {
    const files = fs.readdirSync(progressPath)
      .filter(f => f.endsWith('.md') && f !== 'README.md')
      .sort().reverse();
    
    return files.map(f => {
      const content = fs.readFileSync(path.join(progressPath, f), 'utf-8');
      const title = content.split('\n')[0].replace(/^#+\s*/, '') || f;
      return { name: f, title, content };
    });
  } catch (e) {
    console.error("Failed to read progress files:", e);
    return [];
  }
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

  try {
    const jobs: any[] = [];
    const rootFiles = fs.readdirSync(flowsPath);
    for (const f of rootFiles) {
      const fullPath = path.join(flowsPath, f);
      const stat = fs.statSync(fullPath);
      if (stat.isFile() && f.endsWith('.py')) {
        jobs.push({ name: f });
      } else if (stat.isDirectory() && f !== '.ipynb_checkpoints') {
        const subFiles = fs.readdirSync(fullPath);
        for (const sf of subFiles) {
          const sFullPath = path.join(fullPath, sf);
          if (fs.statSync(sFullPath).isFile() && sf.endsWith('.py')) {
            jobs.push({ name: sf });
          }
        }
      }
    }
    return jobs;
  } catch (e) {
    console.error("Failed to read python flows:", e);
    return [];
  }
}

export default async function MonitorPage() {
  // 1. Fetch counts from system_counters in sub-milliseconds
  let counts = {
    hadith: 0,
    athar: 0,
    shamela: 0,
    quran: 0,
    sentences: 0,
    entities: 0,
    relations: 0
  };

  try {
    const dbRes = await querySurreal("SELECT count, id FROM system_counters;");
    const results = dbRes[0]?.result || [];
    
    let relationsCount = 0;
    try {
        const relRes = await querySurreal("SELECT count() FROM defines GROUP ALL; SELECT count() FROM mentions GROUP ALL;");
        relationsCount = (relRes[0]?.result?.[0]?.count || 0) + (relRes[1]?.result?.[0]?.count || 0);
    } catch (e) {
        console.error("Failed to query relations count:", e);
    }

    counts = {
      hadith: results.find((r: any) => r.id === "system_counters:hadith")?.count || 0,
      athar: results.find((r: any) => r.id === "system_counters:athar")?.count || 0,
      shamela: results.find((r: any) => r.id === "system_counters:shamela")?.count || 0,
      quran: results.find((r: any) => r.id === "system_counters:quran")?.count || 0,
      sentences: results.find((r: any) => r.id === "system_counters:sentences")?.count || 0,
      entities: results.find((r: any) => r.id === "system_counters:entities")?.count || 0,
      relations: relationsCount
    };
  } catch (e) {
    console.error("Failed to query system_counters:", e);
  }

  // 2. Build initial metrics to avoid client-side mount populating lag
  const totals: any = {
    hadith: 650000,
    athar: 10000000,
    shamela: 83915,
    quran: 6236
  };

  const initialMetrics: any = { jobs: {} };
  for (const key of Object.keys(counts)) {
    const count = (counts as any)[key];
    const total = totals[key];
    initialMetrics[key] = {
      count,
      total,
      progress: total ? (count / total) * 100 : null,
      speed: 0,
      eta: null
    };
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
            <Link href="/monitor">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </Link>
        </div>
      </div>

      <MonitorClient 
        pythonJobs={pythonJobs} 
        progressFiles={progressFiles} 
        initialMetrics={initialMetrics} 
      />
    </div>
  )
}
