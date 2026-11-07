"use client";

import { useEffect, useState } from "react";

/** The current time, re-read every `everyMs` (a minute by default) so "today", countdowns and now lines stay current. */
export function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
