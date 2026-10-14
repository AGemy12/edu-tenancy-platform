"use client";

import { Link } from "@/i18n/navigation";
import { useT } from "@/i18n/provider";
import { EllipsisVerticalIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RowAction = {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  /** Internal or external link; external links open in a new tab. */
  href?: string;
  external?: boolean;
  variant?: "default" | "destructive";
  disabled?: boolean;
  /** Visually separate this action from the one above it. */
  separatorBefore?: boolean;
};

const itemClass = "gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer";

type Props = {
  actions: RowAction[];
  /** Optional heading at the top of the menu (e.g. the row's name). */
  label?: string;
  ariaLabel?: string;
};

/**
 * Elegant "⋮" button that opens a menu of row actions.
 * Used by every table so actions look and behave the same everywhere.
 */
export function RowActions({ actions, label, ariaLabel }: Props) {
  const t = useT();
  const visible = actions.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={ariaLabel ?? t("common.labels.actions")}
          className="text-muted-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
        >
          <EllipsisVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {label && (
          <>
            <DropdownMenuLabel className="truncate">{label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          {visible.map((a, i) => {
            const content = (
              <>
                {a.icon && <a.icon />}
                {a.label}
              </>
            );
            return (
              <div key={`${a.label}-${i}`}>
                {a.separatorBefore && i > 0 && <DropdownMenuSeparator />}
                {a.href ? (
                  <DropdownMenuItem asChild variant={a.variant} disabled={a.disabled} className={itemClass}>
                    {a.external ? (
                      <a href={a.href} target="_blank" rel="noreferrer">
                        {content}
                      </a>
                    ) : (
                      <Link href={a.href}>{content}</Link>
                    )}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem variant={a.variant} disabled={a.disabled} onClick={a.onClick} className={itemClass}>
                    {content}
                  </DropdownMenuItem>
                )}
              </div>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
