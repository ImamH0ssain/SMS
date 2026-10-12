export default function StaffLoading() {
  return <div className="space-y-6" aria-label="Loading staff workspace" aria-busy="true"><div className="h-8 w-64 animate-pulse rounded bg-slate-200" /><div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" /><div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div><div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" /></div>;
}
