import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { X } from "lucide-react";
export function Dialog({
    open,
    onOpenChange,
    title,
    description,
    children,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="dialog-overlay" />
                <DialogPrimitive.Content className="dialog-content">
                    <DialogPrimitive.Title className="dialog-title">
                        {title}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="muted">
                        {description}
                    </DialogPrimitive.Description>
                    {children}
                    <DialogPrimitive.Close
                        className="dialog-close"
                        aria-label="Tutup dialog"
                    >
                        <X size={20} />
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
