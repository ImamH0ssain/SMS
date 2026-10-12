export default function StudentLoading() {
  return <div className="space-y-6" aria-label="Loading student workspace" aria-busy="true"><div className="h-8 w-56 animate-pulse rounded bg-slate-200" /><div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" /><div className="grid gap-4 sm:grid-cols-2">{[1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div><div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" /></div>;
}
