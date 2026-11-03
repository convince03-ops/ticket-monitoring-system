export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-24 text-center">
      <div className="max-w-xl rounded-[28px] border border-slate-200 bg-white p-14 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">404</p>
        <h1 className="mt-6 text-4xl font-semibold text-slate-950">Page not found</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">The requested page does not exist or has moved. Return to the dashboard to continue.</p>
      </div>
    </div>
  );
}
