import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
export function RideStageSheet({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode }) {
 return <Sheet open={open} onOpenChange={(value) => { if (!value) onClose(); }}><SheetContent side="bottom" overlayClassName="rider-sheet-overlay" closeClassName="flex h-12 w-12 items-center justify-center" className="rider-experience rider-sheet mx-auto max-h-[90dvh] max-w-[460px] overflow-y-auto rounded-t-lg px-6 pb-6 pt-16"><SheetHeader className="text-left"><SheetTitle className="font-heading text-3xl leading-tight">{title}</SheetTitle><SheetDescription>{description ?? 'Your ride to the voting place.'}</SheetDescription></SheetHeader><div className="mt-6 space-y-4">{children}</div></SheetContent></Sheet>;
}
