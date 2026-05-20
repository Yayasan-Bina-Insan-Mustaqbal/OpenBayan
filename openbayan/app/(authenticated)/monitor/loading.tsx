import { Loader2, Server, Database, Activity } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8 space-y-8 flex flex-col justify-between">
      {/* Header Loading Skeleton */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            {/* Title shimmer */}
            <div className="h-10 w-64 bg-slate-900 rounded-lg animate-pulse border border-slate-800/30 flex items-center px-3 gap-2">
              <Activity className="h-5 w-5 text-emerald-500 animate-pulse" />
              <div className="h-5 w-32 bg-slate-800 rounded animate-pulse" />
            </div>
            {/* Subtitle shimmer */}
            <div className="h-4 w-80 bg-slate-900 rounded animate-pulse" />
          </div>
          {/* Action buttons shimmer */}
          <div className="flex gap-3">
            <div className="h-10 w-36 bg-slate-900 rounded-lg border border-slate-800/30 animate-pulse" />
            <div className="h-10 w-28 bg-slate-900 rounded-lg border border-slate-800/30 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Spinner & Premium Text in Center */}
      <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-6">
        <div className="relative">
          {/* Multi-layered premium spinner */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl animate-pulse" />
          <Loader2 className="h-16 w-16 text-emerald-400 animate-spin relative z-10" />
          <Server className="h-6 w-6 text-teal-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        
        <div className="space-y-2 text-center max-w-md">
          <p className="font-mono text-sm text-emerald-400 font-medium tracking-wider animate-pulse">
            BISMILLAHIR RAHMANIR RAHIM
          </p>
          <h3 className="text-lg font-semibold text-slate-200">
            Connecting to SurrealDB Node...
          </h3>
          <p className="text-xs text-slate-500 font-mono">
            Fetching corpus counts and live sentence telemetry
          </p>
        </div>
      </div>

      {/* Grid Skeletons mirroring the actual stats display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            className="p-6 bg-slate-900/20 border border-slate-900/60 rounded-2xl space-y-4 relative overflow-hidden"
          >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-800/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            <div className="flex justify-between items-start">
              <div className="h-4 w-24 bg-slate-900 rounded animate-pulse" />
              <div className="p-2 bg-slate-900/50 rounded-lg">
                <Database className="h-4 w-4 text-slate-700" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-8 w-32 bg-slate-900 rounded animate-pulse" />
              <div className="h-3 w-40 bg-slate-900/50 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
