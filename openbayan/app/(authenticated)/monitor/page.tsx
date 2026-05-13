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
    const files = fs.readdirSync(flowsPath)
      .filter(f => f.endsWith('.py'));
    
    return files.map(f => {
      return { name: f };
    });
  } catch (e) {
    console.error("Failed to read python flows:", e);
    return [];
  }
}

async function getCount(table: string, whereClause: string = "") {
    try {
        const query = whereClause 
            ? `SELECT count() FROM ${table} WHERE ${whereClause}`
            : `SELECT count() FROM ${table}`;
        const res = await querySurreal(query);
        const result = res[res.length - 1]?.result?.[0]?.count;
        return typeof result === 'number' ? result : 0;
    } catch (e) {
        console.error(`Count failed for ${table}:`, e);
        return 0;
    }
}

export default async function MonitorPage() {
  // Fetch counts individually for better reliability
  const [ayahs, hadiths, books, words, entities, sentences, murad_done] = await Promise.all([
    getCount("ayah"),
    getCount("hadith"),
    getCount("book"),
    getCount("word"),
    getCount("entity"),
    getCount("sentence"),
    getCount("sentence", "source = source:murad_dataset_2026 AND simple_clean_text != NONE")
  ]);

  const inventoryData = { ayahs, hadiths, books, words, entities, sentences, murad_done };
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

      <MonitorClient 
        pythonJobs={pythonJobs} 
        progressFiles={progressFiles} 
        inventoryData={inventoryData} 
      />
    </div>
  )
}
