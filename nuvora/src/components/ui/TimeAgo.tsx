"use client";

import { useEffect, useState } from "react";
import { formatRelative, formatDate } from "@/lib/dates";

/**
 * Renders "2 hours ago" on the client while the server renders a stable
 * absolute date, so freshness is obvious without hydration mismatches.
 */
export function TimeAgo({ iso, prefix = "" }: { iso: string; prefix?: string }) {
  const [label, setLabel] = useState<string>(formatDate(iso));
  useEffect(() => {
    const update = () => setLabel(formatRelative(iso));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [iso]);
  return (
    <time dateTime={iso} title={formatDate(iso)}>
      {prefix}
      {label}
    </time>
  );
}
