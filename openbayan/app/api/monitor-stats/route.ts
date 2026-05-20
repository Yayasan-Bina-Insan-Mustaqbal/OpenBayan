import { querySurreal } from "@/lib/surreal-query"
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    // 1. Get counts from SurrealDB via system_counters in sub-milliseconds
    const countsQuery = `SELECT count, id FROM system_counters;`;
    const dbRes = await querySurreal(countsQuery);
    const results = dbRes[0]?.result || [];
    
    const counts = {
      hadith: results.find((r: any) => r.id === "system_counters:hadith")?.count || 0,
      athar: results.find((r: any) => r.id === "system_counters:athar")?.count || 0,
      shamela: results.find((r: any) => r.id === "system_counters:shamela")?.count || 0,
      quran: results.find((r: any) => r.id === "system_counters:quran")?.count || 0,
      sentences: results.find((r: any) => r.id === "system_counters:sentences")?.count || 0,
      entities: results.find((r: any) => r.id === "system_counters:entities")?.count || 0
    };

    // 2. Load ingestion state for speed/ETA (Shared with Python script, now in accessible location inside container)
    let prevState: any = {};
    const flowsStatePath = path.join(process.cwd(), 'backend_flows', 'ingestion_state.json');
    const progressStatePath = path.join(process.cwd(), 'backend_progress', 'ingestion_state.json');
    const localStatePath = path.join(process.cwd(), 'ingestion_state.json');
    
    if (fs.existsSync(flowsStatePath)) {
        try {
            prevState = JSON.parse(fs.readFileSync(flowsStatePath, 'utf-8'));
        } catch (e) {
            console.error("Failed to parse flows state:", e);
        }
    } else if (fs.existsSync(progressStatePath)) {
        try {
            prevState = JSON.parse(fs.readFileSync(progressStatePath, 'utf-8'));
        } catch (e) {
            console.error("Failed to parse progress state:", e);
        }
    } else if (fs.existsSync(localStatePath)) {
        try {
            prevState = JSON.parse(fs.readFileSync(localStatePath, 'utf-8'));
        } catch (e) {
            console.error("Failed to parse local state:", e);
        }
    }

    // 3. Define totals
    const totals: any = {
      hadith: 650000,
      athar: 10000000, // Updated estimate based on scale
      shamela: 83915,
      quran: 6236
    };

    // 4. Calculate metrics
    const now = Date.now() / 1000;
    const metrics: any = { jobs: {} };

    for (const key of Object.keys(counts)) {
        const count = (counts as any)[key];
        const total = totals[key];
        const prev = prevState[key];
        
        let speed = 0;
        let eta = null;
        let progress = total ? (count / total) * 100 : null;

        if (prev && prev.count < count) {
            const timeDiff = now - prev.time;
            if (timeDiff > 0) {
                speed = (count - prev.count) / timeDiff; // per sec
                if (total && speed > 0) {
                    const remaining = total - count;
                    eta = remaining / speed;
                }
            }
        }

        metrics[key] = {
            count,
            total,
            progress,
            speed: speed * 60, // per min
            eta
        };
    }

    // 5. Calculate live metrics for specific python flows if present in shared state
    const jobKeys = [
        "atomize_quran_v2.py",
        "atomize_hadith_v5.py",
        "atomize_tafsir.py",
        "atomize_kitab.py",
        "populate_clean_sentences.py"
    ];

    for (const jobName of jobKeys) {
        const jobState = prevState[jobName];
        if (jobState) {
            const count = jobState.count || 0;
            const total = jobState.total || 0;
            const time = jobState.time || now;
            const lastUpdated = jobState.time || 0;
            
            // A job is active if it was updated in the last 2 minutes
            const isActive = (now - lastUpdated) < 120;
            let speed = jobState.speed || 0; // per min or per sec
            let eta = jobState.eta || null;
            let progress = total > 0 ? (count / total) * 100 : 0;

            metrics.jobs[jobName] = {
                count,
                total,
                progress,
                speed,
                eta,
                active: isActive
            };
        } else {
            metrics.jobs[jobName] = {
                count: 0,
                total: 0,
                progress: 0,
                speed: 0,
                eta: null,
                active: false
            };
        }
    }

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error("API Monitor Stats Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
