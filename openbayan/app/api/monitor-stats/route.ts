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
    const statePath = path.join(process.cwd(), 'ingestion_state.json');
    if (fs.existsSync(statePath)) {
        prevState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
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
    const metrics: any = {};

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

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error("API Monitor Stats Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
