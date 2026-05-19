"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/shared/copy-button";

type ScriptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  script: string;
};

export function ScriptDialog({ open, onOpenChange, title, description, script }: ScriptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4">
          <textarea
            readOnly
            value={script}
            className="h-64 w-full resize-none rounded-lg border border-input bg-slate-950 p-4 font-mono text-sm text-emerald-400 focus:outline-none"
          />
          <div className="flex justify-end">
            <CopyButton value={script} label="Script MikroTik" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
