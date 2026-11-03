import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-8 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">{title}</p>
          {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
        </div>
        <div>{actions}</div>
      </div>
    </div>
  );
}
