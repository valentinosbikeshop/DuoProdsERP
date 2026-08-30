'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(false);
        }
      };
      
      // Use capture = true so ESC is caught even when an input or textarea is focused
      window.addEventListener('keydown', handleKeyDown, true);
      
      return () => {
        document.body.style.overflow = originalStyle;
        window.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Backdrop with click-to-close */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(false);
        }} 
        aria-hidden="true"
      />
      {/* Dialog Modal Card */}
      <div 
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-50 flex w-full max-w-lg md:max-w-xl flex-col rounded-2xl border border-border/80 bg-background shadow-2xl shadow-black/20',
          'max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-hidden',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          className
        )}
      >
        {/* Close Button X */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(false);
          }}
          className="absolute right-4 top-4 z-30 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/80 transition-all hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 cursor-pointer"
          aria-label="Cerrar modal (Esc)"
          title="Cerrar (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn('flex flex-col space-y-1.5 px-6 pt-6 pb-4 border-b border-border/40 shrink-0 bg-muted/5 pr-12', className)} 
      {...props} 
    />
  );
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 
      className={cn('text-lg sm:text-xl font-semibold tracking-tight text-foreground flex items-center gap-2', className)} 
      {...props} 
    />
  );
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p 
      className={cn('text-sm text-muted-foreground leading-relaxed', className)} 
      {...props} 
    />
  );
}

function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn('flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar', className)} 
      {...props} 
    />
  );
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 gap-2 sm:gap-0 px-6 py-4 border-t border-border/40 bg-muted/20 shrink-0 mt-auto', className)} 
      {...props} 
    />
  );
}

export { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter };

