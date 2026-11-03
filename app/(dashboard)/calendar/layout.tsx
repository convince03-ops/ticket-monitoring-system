import { ReactNode } from "react";

export default function CalendarLayout({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}
