"use client";

import { useRef, useState } from "react";
import {
  ArrowLeftIcon,
  Building2Icon,
  FilesIcon,
  HardDriveIcon,
  Loader2Icon,
  PackageIcon,
  PencilIcon,
  PieChartIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UsersRoundIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowActions } from "@/components/row-actions";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useDeleteStoredBlob,
  useStorageOverview,
  useStoredBlobs,
  useUpdateStorageMember,
  type BlobFilter,
} from "@/hooks/use-storage-admin";
import { Link } from "@/i18n/navigation";
import { useI18n, useT } from "@/i18n/provider";
import { getErrorMessage } from "@/lib/api";
import { KIND_META, displayName, formatBytes, initials } from "@/lib/library";
import type { StorageMember, StorageOverview, StoredBlobRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState, FilterChip } from "./file-views";
import { ConfirmDialog } from "./library-dialogs";
import { PlansDialog } from "./plans-dialog";

const MB = 1024 * 1024;
const mbText = (mb: number) => formatBytes(mb * MB);
/** Bars turn red from 90% full. */
const isNearlyFull = (used: number, quota: number) => quota <= 0 || used / quota >= 0.9;
const percent = (used: number, quota: number) => (quota > 0 ? Math.min(100, (used / quota) * 100) : 100);

type FilesFilter = { kind: "all" } | { kind: "shared" } | { kind: "member"; userId: string };

/** Admin page: package, totals, per-member quotas and the largest stored files. */
export function StorageMonitor() {
  const t = useT();
  const { user, isLoading } = useCurrentUser();
  const isAdmin = user?.role === "TENANT_ADMIN";
  const overview = useStorageOverview(isAdmin);
  const [plansOpen, setPlansOpen] = useState(false);
  const [editing, setEditing] = useState<StorageMember | null>(null);
  const [filter, setFilter] = useState<FilesFilter>({ kind: "all" });
  const filesRef = useRef<HTMLElement>(null);

  if (isLoading || (isAdmin && overview.isPending)) return <MonitorSkeleton />;

  if (!isAdmin) {
    return (
      <EmptyState icon={ShieldCheckIcon} title={t("library.storage.adminOnly")} text={t("library.storage.adminOnlyHint")}>
        <BackButton />
      </EmptyState>
    );
  }

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t("library.storage.title")}</h1>
        <p className="text-muted-foreground">{t("library.storage.subtitle")}</p>
      </div>
      <div className="flex gap-2">
        <BackButton />
        <Button onClick={() => setPlansOpen(true)}>
          <PackageIcon /> {t("library.storage.cards.viewPlans")}
        </Button>
      </div>
    </div>
  );

  if (overview.isError) {
    return (
      <div className="space-y-6">
        {header}
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            {getErrorMessage(overview.error, t("library.storage.loadFailed"))}
            <Button size="sm" variant="outline" onClick={() => overview.refetch()}>
              <RotateCcwIcon /> {t("common.actions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
        <PlansDialog open={plansOpen} onOpenChange={setPlansOpen} />
      </div>
    );
  }

  const data = overview.data!;
  const showMemberFiles = (m: StorageMember) => {
    setFilter({ kind: "member", userId: m.userId });
    filesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-8">
      {header}
      <SummaryCards data={data} onPlans={() => setPlansOpen(true)} />
      <MembersSection data={data} onEdit={setEditing} onShowFiles={showMemberFiles} />
      <section ref={filesRef} className="scroll-mt-24">
        <LargestFiles members={data.members} filter={filter} onFilter={setFilter} />
      </section>

      <PlansDialog open={plansOpen} onOpenChange={setPlansOpen} />
      {editing && (
        <QuotaDialog
          key={editing.userId}
          member={editing}
          overview={data}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}

function BackButton() {
  const t = useT();
  return (
    <Button asChild variant="outline">
      <Link href="/dashboard/library">
        <ArrowLeftIcon className="rtl:rotate-180" /> {t("library.storage.back")}
      </Link>
    </Button>
  );
}

/* ───────── summary cards ───────── */

function SummaryCards({ data, onPlans }: { data: StorageOverview; onPlans: () => void }) {
  const { t, rich } = useI18n();
  const freePool = Math.max(0, data.pool.totalMb - data.pool.allocatedMb);
  const sharedWarn = isNearlyFull(data.shared.usedBytes, data.shared.quotaBytes);
  const poolWarn = data.pool.totalMb > 0 && data.pool.allocatedMb >= data.pool.totalMb;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={PackageIcon} tone="bg-secondary text-secondary-foreground" label={t("library.storage.cards.plan")}>
        <p className="text-2xl font-bold">
          <bdi>{data.plan.name}</bdi>
        </p>
        <dl className="space-y-1 text-xs">
          <Fact label={t("library.storage.cards.perTeacher")} value={mbText(data.plan.storagePerTeacherMb)} />
          <Fact label={t("library.storage.cards.sharedSpace")} value={mbText(data.plan.sharedStorageMb)} />
          <Fact label={t("library.storage.cards.maxFile")} value={mbText(data.plan.maxFileMb)} />
        </dl>
        <Button size="sm" variant="outline" className="mt-auto self-start" onClick={onPlans}>
          {t("library.storage.cards.viewPlans")}
        </Button>
      </StatCard>

      <StatCard icon={HardDriveIcon} tone="bg-info/15 text-info" label={t("library.storage.cards.totalUsed")}>
        <p className="text-2xl font-bold">
          <span dir="ltr">{formatBytes(data.totals.usedBytes)}</span>
        </p>
        <p className="text-xs text-muted-foreground">{t("library.count.files", { count: data.totals.files })}</p>
      </StatCard>

      <StatCard icon={PieChartIcon} tone="bg-accent text-accent-foreground" label={t("library.storage.cards.pool")}>
        <p className="text-2xl font-bold">
          <span dir="ltr">{mbText(data.pool.allocatedMb)}</span>{" "}
          <span className="text-sm font-medium text-muted-foreground">
            {rich("library.storage.cards.poolOf", { total: <span dir="ltr">{mbText(data.pool.totalMb)}</span> })}
          </span>
        </p>
        <Progress value={percent(data.pool.allocatedMb, data.pool.totalMb)} className={cn("h-2", poolWarn && "*:bg-warning")} />
        <p className="text-xs text-muted-foreground">
          {rich("library.storage.cards.poolFree", { free: <span dir="ltr">{mbText(freePool)}</span> })}
        </p>
      </StatCard>

      <StatCard icon={Building2Icon} tone="bg-success/15 text-success" label={t("library.storage.cards.shared")}>
        <p className="text-2xl font-bold">
          <span dir="ltr">{formatBytes(data.shared.usedBytes)}</span>{" "}
          <span className="text-sm font-medium text-muted-foreground">
            {rich("library.storage.cards.poolOf", { total: <span dir="ltr">{formatBytes(data.shared.quotaBytes)}</span> })}
          </span>
        </p>
        <Progress value={percent(data.shared.usedBytes, data.shared.quotaBytes)} className={cn("h-2", sharedWarn && "*:bg-destructive")} />
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {t("library.count.files", { count: data.shared.files })}
          {data.shared.addOnMb > 0 && (
            <Badge variant="success">{rich("library.storage.cards.addOn", { size: <span dir="ltr">{mbText(data.shared.addOnMb)}</span> })}</Badge>
          )}
        </div>
      </StatCard>
    </div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  children,
}: {
  icon: typeof PackageIcon;
  tone: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone)}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold" dir="ltr">
        {value}
      </dd>
    </div>
  );
}

/* ───────── members ───────── */

function MembersSection({
  data,
  onEdit,
  onShowFiles,
}: {
  data: StorageOverview;
  onEdit: (m: StorageMember) => void;
  onShowFiles: (m: StorageMember) => void;
}) {
  const { t, rich, format } = useI18n();
  const update = useUpdateStorageMember();
  const pendingId = update.isPending ? update.variables?.userId : undefined;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">{t("library.storage.members.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("library.storage.members.subtitle")}</p>
      </div>
      {data.members.length === 0 ? (
        <EmptyState icon={UsersRoundIcon} title={t("library.storage.members.empty")} text={t("library.storage.members.emptyHint")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-56">{t("library.storage.members.member")}</TableHead>
                <TableHead>{t("library.storage.members.role")}</TableHead>
                <TableHead className="min-w-60">{t("library.storage.members.usage")}</TableHead>
                <TableHead>{t("library.storage.members.files")}</TableHead>
                <TableHead>{t("library.storage.members.lastUpload")}</TableHead>
                <TableHead>{t("library.storage.members.canManage")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("common.labels.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.map((m) => {
                const admin = m.role === "TENANT_ADMIN";
                const warn = isNearlyFull(m.usedBytes, m.quotaBytes);
                return (
                  <TableRow key={m.userId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">{initials(m.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className={cn("truncate font-semibold", m.status !== "ACTIVE" && "text-muted-foreground")}>
                            <bdi>{m.fullName}</bdi>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            <span dir="ltr">{m.email}</span>
                          </p>
                        </div>
                        {m.status !== "ACTIVE" && <Badge variant="outline">{t(`common.account.status.${m.status}`)}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin ? "info" : "secondary"}>{t(`common.roles.${m.role}`)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <Progress value={percent(m.usedBytes, m.quotaBytes)} className={cn("h-2", warn && "*:bg-destructive")} />
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className={cn(warn ? "font-semibold text-destructive" : "text-muted-foreground")}>
                            {rich("library.storage.members.usageOf", {
                              used: <span dir="ltr">{formatBytes(m.usedBytes)}</span>,
                              total: <span dir="ltr">{formatBytes(m.quotaBytes)}</span>,
                            })}
                          </span>
                          {m.customQuota && <Badge variant="outline">{t("library.storage.members.custom")}</Badge>}
                          {m.addOnMb > 0 && (
                            <Badge variant="success">
                              {rich("library.storage.members.addOn", { size: <span dir="ltr">{mbText(m.addOnMb)}</span> })}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{format.number(m.files)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {m.lastUploadAt ? format.date(m.lastUploadAt) : t("library.storage.members.never")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={admin || m.canManageShared}
                          disabled={admin || pendingId === m.userId}
                          title={admin ? t("library.storage.members.adminAlways") : undefined}
                          aria-label={admin ? t("library.storage.members.adminAlways") : t("library.storage.members.canManageFor", { name: m.fullName })}
                          onCheckedChange={(on) => update.mutate({ userId: m.userId, canManageShared: on })}
                        />
                        {pendingId === m.userId && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <RowActions
                        label={m.fullName}
                        actions={[
                          { label: t("library.storage.members.editQuota"), icon: PencilIcon, onClick: () => onEdit(m) },
                          { label: t("library.storage.members.showFiles"), icon: FilesIcon, onClick: () => onShowFiles(m) },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

/* ───────── quota dialog ───────── */

function QuotaDialog({
  member,
  overview,
  onOpenChange,
}: {
  member: StorageMember;
  overview: StorageOverview;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, rich } = useI18n();
  const update = useUpdateStorageMember();
  const [value, setValue] = useState(() => String(Math.round((member.baseQuotaMb / 1024) * 100) / 100));

  // What this member could get: the unallocated pool plus what they already hold.
  const availableMb = Math.max(0, overview.pool.totalMb - overview.pool.allocatedMb + member.baseQuotaMb);
  const gb = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(gb) && gb > 0;
  const nextMb = valid ? Math.round(gb * 1024) : 0;
  const overPool = valid && nextMb > availableMb;
  const belowUsage = valid && (nextMb + member.addOnMb) * MB < member.usedBytes;
  const saving = update.isPending && update.variables?.storageQuotaMb !== null;
  const resetting = update.isPending && update.variables?.storageQuotaMb === null;
  const close = { onSuccess: () => onOpenChange(false) };
  const size = (mb: number) => <span dir="ltr">{mbText(mb)}</span>;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !overPool) update.mutate({ userId: member.userId, storageQuotaMb: nextMb }, close);
          }}
        >
          <DialogHeader>
            <DialogTitle>{rich("library.storage.quota.title", { name: <bdi>{member.fullName}</bdi> })}</DialogTitle>
            <DialogDescription>{t("library.storage.quota.description")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="quota-gb">{t("library.storage.quota.label")}</Label>
            <Input
              id="quota-gb"
              type="number"
              inputMode="decimal"
              min={0.5}
              step={0.5}
              dir="ltr"
              autoFocus
              value={value}
              aria-invalid={!valid || overPool}
              onChange={(e) => setValue(e.target.value)}
            />
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{rich("library.storage.quota.packageDefault", { size: size(overview.plan.storagePerTeacherMb) })}</p>
              <p>{rich("library.storage.quota.available", { size: size(availableMb) })}</p>
              {member.addOnMb > 0 && <p>{rich("library.storage.quota.addOn", { size: size(member.addOnMb) })}</p>}
              <p>{rich("library.storage.quota.currentUsage", { size: <span dir="ltr">{formatBytes(member.usedBytes)}</span> })}</p>
            </div>
            {!valid && <p className="text-xs text-destructive">{t("library.storage.quota.invalid")}</p>}
            {overPool && <p className="text-xs text-destructive">{rich("library.storage.quota.overPool", { size: size(availableMb) })}</p>}
            {belowUsage && !overPool && (
              <Alert className="border-warning/40 bg-warning/10">
                <AlertDescription className="text-foreground">
                  {rich("library.storage.quota.belowUsage", { used: <span dir="ltr">{formatBytes(member.usedBytes)}</span> })}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={!member.customQuota || update.isPending}
              onClick={() => update.mutate({ userId: member.userId, storageQuotaMb: null }, close)}
            >
              {resetting ? <Loader2Icon className="animate-spin" /> : <RotateCcwIcon />}
              {t("library.storage.quota.reset")}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" disabled={!valid || overPool || update.isPending}>
                {saving && <Loader2Icon className="animate-spin" />}
                {t("common.actions.save")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── largest files ───────── */

function LargestFiles({
  members,
  filter,
  onFilter,
}: {
  members: StorageMember[];
  filter: FilesFilter;
  onFilter: (f: FilesFilter) => void;
}) {
  const { t, rich, format } = useI18n();
  const query: BlobFilter = filter.kind === "shared" ? { shared: true } : filter.kind === "member" ? { userId: filter.userId } : {};
  const blobs = useStoredBlobs(query);
  const remove = useDeleteStoredBlob();
  const [confirm, setConfirm] = useState<StoredBlobRow | null>(null);
  const rows = blobs.data?.pages.flatMap((p) => p.data) ?? [];
  const total = blobs.data?.pages[0]?.total;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            {t("library.storage.files.title")} {total !== undefined && <span className="text-sm font-normal text-muted-foreground">({format.number(total)})</span>}
          </h2>
          <p className="text-sm text-muted-foreground">{t("library.storage.files.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("library.storage.files.filter")}>
          <FilterChip active={filter.kind === "all"} onClick={() => onFilter({ kind: "all" })}>
            {t("library.storage.files.all")}
          </FilterChip>
          <FilterChip active={filter.kind === "shared"} onClick={() => onFilter({ kind: "shared" })}>
            <Building2Icon className="size-3.5" aria-hidden="true" />
            {t("library.storage.files.shared")}
          </FilterChip>
          <Select value={filter.kind === "member" ? filter.userId : ""} onValueChange={(userId) => onFilter({ kind: "member", userId })}>
            <SelectTrigger
              size="sm"
              className={cn("w-auto min-w-36 rounded-full", filter.kind === "member" && "border-primary bg-primary text-primary-foreground *:data-[slot=select-value]:text-primary-foreground")}
              aria-label={t("library.storage.files.pickMember")}
            >
              <UsersRoundIcon className="size-3.5" />
              <SelectValue placeholder={t("library.storage.files.pickMember")} />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  <bdi>{m.fullName}</bdi>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheckIcon className="size-3.5 shrink-0" aria-hidden="true" />
        {t("library.storage.files.privacy")}
      </p>

      {blobs.isError && (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(blobs.error, t("library.storage.loadFailed"))}</AlertDescription>
        </Alert>
      )}

      {blobs.isPending ? (
        <div className="space-y-2 rounded-2xl border bg-card p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : !rows.length ? (
        !blobs.isError && <EmptyState icon={HardDriveIcon} title={t("library.storage.files.empty")} text={t("library.storage.files.emptyHint")} />
      ) : (
        <div className={cn("overflow-hidden rounded-2xl border bg-card transition-opacity", blobs.isPlaceholderData && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-64">{t("library.storage.files.name")}</TableHead>
                <TableHead>{t("library.storage.files.size")}</TableHead>
                <TableHead>{t("library.storage.files.chargedTo")}</TableHead>
                <TableHead>{t("library.storage.files.copies")}</TableHead>
                <TableHead>{t("library.storage.files.date")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("common.labels.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const meta = KIND_META[row.kind] ?? KIND_META.OTHER;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", meta.tint)}>
                          <meta.icon className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-80 truncate font-semibold" title={row.name}>
                            <bdi>{displayName(row)}</bdi>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t(`library.kinds.${row.kind}.label`)} ·{" "}
                            <span className="uppercase" dir="ltr">
                              {row.extension}
                            </span>
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold" dir="ltr">
                      <span className="block text-end">{formatBytes(row.size)}</span>
                    </TableCell>
                    <TableCell>
                      {row.chargedTo ? (
                        <span className="block max-w-48 truncate">
                          <bdi>{row.chargedTo.fullName}</bdi>
                        </span>
                      ) : (
                        <Badge variant="secondary">
                          <Building2Icon /> {t("library.storage.files.shared")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p>{t("library.storage.files.copiesCount", { count: row.references })}</p>
                      {row.studentCopies > 0 && (
                        <p className="text-xs text-muted-foreground">{t("library.storage.files.studentCopies", { count: row.studentCopies })}</p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{format.date(row.createdAt)}</TableCell>
                    <TableCell>
                      <RowActions
                        label={displayName(row)}
                        actions={[{ label: t("common.actions.delete"), icon: Trash2Icon, variant: "destructive", onClick: () => setConfirm(row) }]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {blobs.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={blobs.isFetchingNextPage} onClick={() => blobs.fetchNextPage()}>
            {blobs.isFetchingNextPage && <Loader2Icon className="animate-spin" />}
            {t("library.storage.files.loadMore")}
          </Button>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={t("library.storage.files.deleteTitle")}
          description={
            <>
              {rich("library.storage.files.deleteText", { name: <bdi>{displayName(confirm)}</bdi> })}{" "}
              <span className="font-semibold text-foreground">
                {t("library.storage.files.copiesCount", { count: confirm.references })}
                {confirm.studentCopies > 0 && <> · {t("library.storage.files.studentCopies", { count: confirm.studentCopies })}</>}
              </span>
            </>
          }
          confirmLabel={t("library.storage.files.deleteConfirm")}
          pending={remove.isPending}
          onConfirm={() => remove.mutate(confirm.id, { onSuccess: () => setConfirm(null) })}
        />
      )}
    </div>
  );
}

/* ───────── loading ───────── */

function MonitorSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
