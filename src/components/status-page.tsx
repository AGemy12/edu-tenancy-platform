import type { LucideIcon } from "lucide-react";

/** Full-page message for 404s and unexpected errors. */
export default function StatusPage({
  icon: Icon,
  code,
  title,
  text,
  children,
}: {
  icon: LucideIcon;
  code?: string;
  title: string;
  text: string;
  /** Buttons under the text. */
  children?: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-soft">
          <Icon className="size-9" aria-hidden="true" />
        </span>
        {code && <p className="text-5xl font-bold tracking-tight text-primary tabular-nums">{code}</p>}
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{text}</p>
        {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
      </div>
    </main>
  );
}
