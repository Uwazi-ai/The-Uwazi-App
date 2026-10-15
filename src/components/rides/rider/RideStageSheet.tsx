import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
export function RideStageSheet({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode }) {
  return <Sheet open={open} onOpenChange={(value) => { if (!value) onClose(); }}><SheetContent side="bottom" overlayClassName="rider-sheet-overlay" closeClassName="flex h-11 w-11 items-center justify-center rounded-full" className="rider-experience rider-sheet"><SheetHeader className="text-left"><SheetTitle className="sr-only">{title}</SheetTitle><SheetDescription className="sr-only">{description ?? 'Your ride to the voting place.'}</SheetDescription></SheetHeader><div className="space-y-5" aria-live="polite">{children}</div></SheetContent></Sheet>;
}
