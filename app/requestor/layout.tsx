import type { ReactNode } from 'react';
import { RequestorShell } from '@/components/layout/RequestorShell';

export default function RequestorLayout({ children }: { children: ReactNode }) {
  return <RequestorShell>{children}</RequestorShell>;
}
