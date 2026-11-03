interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
