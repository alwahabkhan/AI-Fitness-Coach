// components/ui/accordion.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';



type AccordionType = 'single' | 'multiple';

type Ctx = {
  type: AccordionType;
  isOpen: (v: string) => boolean;
  toggle: (v: string) => void;
};

const AccordionCtx = React.createContext<Ctx | null>(null);
const ItemValueCtx = React.createContext<string | null>(null);

type AccordionProps = {
  type?: AccordionType;
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
};

export function Accordion({ type = 'single', defaultValue, className, children }: AccordionProps) {
  const initial = React.useMemo<string[]>(
    () =>
      Array.isArray(defaultValue)
        ? defaultValue
        : typeof defaultValue === 'string'
        ? [defaultValue]
        : [],
    [defaultValue]
  );

  const [open, setOpen] = React.useState<string[]>(initial);

  const toggle = (v: string) =>
    setOpen((prev) => {
      const on = prev.includes(v);
      if (type === 'single') return on ? [] : [v];
      return on ? prev.filter((x) => x !== v) : [...prev, v];
    });

  const isOpen = (v: string) => open.includes(v);

  return (
    <AccordionCtx.Provider value={{ type, isOpen, toggle }}>
      <div className={cn('w-full space-y-4', className)}>{children}</div>
    </AccordionCtx.Provider>
  );
}

type ItemProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
};

export function AccordionItem({ value, className, children }: ItemProps) {
  return (
    <ItemValueCtx.Provider value={value}>
      <div
        className={cn(
          // prettier, card-like container
          'group rounded-xl border border-slate-200/80 bg-white/80 shadow-sm transition-shadow',
          'hover:shadow-md',
          className
        )}
      >
        {children}
      </div>
    </ItemValueCtx.Provider>
  );
}

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
  children: React.ReactNode;
};

export function AccordionTrigger({ className, children, ...rest }: TriggerProps) {
  const ctx = React.useContext(AccordionCtx);
  const value = React.useContext(ItemValueCtx);
  if (!ctx || !value) throw new Error('AccordionTrigger must be inside AccordionItem');

  const open = ctx.isOpen(value);

  return (
    <button
      type="button"
      onClick={() => ctx.toggle(value)}
      data-state={open ? 'open' : 'closed'}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left font-medium',
        'transition-colors',
        // hover & open states
        'hover:bg-slate-50 data-[state=open]:bg-slate-50',
        className
      )}
      {...rest}
    >
      {children}
      {/* inline chevron */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={cn(
          'h-4 w-4 shrink-0 text-slate-600 transition-transform duration-200',
          open && 'rotate-180'
        )}
      >
        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </button>
  );
}

type ContentProps = {
  className?: string;
  children: React.ReactNode;
};

export function AccordionContent({ className, children }: ContentProps) {
  const ctx = React.useContext(AccordionCtx);
  const value = React.useContext(ItemValueCtx);
  if (!ctx || !value) throw new Error('AccordionContent must be inside AccordionItem');

  const open = ctx.isOpen(value);
  const ref = React.useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = React.useState<number>(0);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setMaxH(open ? el.scrollHeight : 0);
  }, [open, children]);

  return (
    <div
      className={cn(
        'overflow-hidden transition-[max-height] duration-200 ease-out',
        className
      )}
      style={{ maxHeight: `${maxH}px` }}
    >
      <div ref={ref} className="px-4 pb-4 pt-0">
        {children}
      </div>
    </div>
  );
}
