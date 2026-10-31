"use client";

import { useState } from "react";
import { Loader2Icon, MegaphoneIcon, SendIcon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { SettingsSection } from "@/components/settings-section";
import { useAnnouncements, useSendAnnouncement } from "@/hooks/use-notifications";
import type { AnnouncementAudience } from "@/lib/types";
import { isolate } from "./notification-text";

const AUDIENCES: AnnouncementAudience[] = ["EVERYONE", "TEACHERS", "STUDENTS", "ADMINS"];
const TITLE = { min: 3, max: 120 };
const BODY_MAX = 2000;

/** Write to the center's members (or, from the platform console, to every center), and see what was sent. */
export function Announcements({ platform }: { platform: boolean }) {
  const { t, format } = useI18n();
  const history = useAnnouncements();
  const send = useSendAnnouncement();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("EVERYONE");
  const valid = title.trim().length >= TITLE.min && body.trim().length > 0;
  const audiences = platform ? "platformAudiences" : "audiences";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    send.mutate(
      { title: title.trim(), body: body.trim(), audience },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
        },
      },
    );
  };

  return (
    <div className="space-y-8">
      <SettingsSection title={t("notifications.announce.title")} description={t("notifications.announce.description")}>
        <Card>
          <form onSubmit={submit}>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="ann-audience">{t("notifications.announce.audience")}</FieldLabel>
                  <Select value={audience} onValueChange={(v) => setAudience(v as AnnouncementAudience)}>
                    <SelectTrigger id="ann-audience" className="w-full sm:w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map((a) => (
                        <SelectItem key={a} value={a}>
                          {t(`notifications.announce.${audiences}.${a}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="ann-title">{t("notifications.announce.fieldTitle")}</FieldLabel>
                  <Input id="ann-title" value={title} maxLength={TITLE.max} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ann-body">{t("notifications.announce.fieldBody")}</FieldLabel>
                  <Textarea id="ann-body" rows={5} value={body} maxLength={BODY_MAX} onChange={(e) => setBody(e.target.value)} />
                  <FieldDescription className="text-end tabular-nums">
                    {format.number(body.length)} / {format.number(BODY_MAX)}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-end border-t">
              <Button type="submit" disabled={!valid || send.isPending}>
                {send.isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon className="rtl:-scale-x-100" />}
                {t("notifications.announce.send")}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </SettingsSection>

      <SettingsSection title={t("notifications.announce.history")}>
        <Card>
          <CardContent className="divide-y p-0">
            {history.isLoading ? (
              <Skeleton className="m-4 h-16" />
            ) : !history.data?.length ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("notifications.announce.historyEmpty")}</p>
            ) : (
              history.data.map((a) => (
                <article key={a.id} className="flex gap-3 px-5 py-4">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                    <MegaphoneIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">
                        <bdi>{a.title}</bdi>
                      </h3>
                      <Badge variant="secondary">{t(`notifications.announce.${audiences}.${a.audience}`)}</Badge>
                    </div>
                    <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                      <bdi>{a.body}</bdi>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format.longDateTime(a.createdAt)} · {t("notifications.announce.recipients", { count: a.recipients })}
                      {a.author && <> · {t("notifications.announce.by", { name: isolate(a.author.fullName) })}</>}
                    </p>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </SettingsSection>
    </div>
  );
}
