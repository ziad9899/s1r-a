"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LogRow = {
  id: string;
  title: string;
  body: string;
  mode: string;
  segment_key: string | null;
  recipients_count: number;
  sent_count: number;
  removed_invalid: number;
  created_at: string;
};

const AR_DATETIME = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  timeZone: "Asia/Riyadh",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const MODE_LABEL: Record<string, string> = {
  all: "الكل",
  selected: "محدّدون",
  segment: "فئة",
  scheduled: "مجدول",
  test: "تجريبي",
};

export async function NotificationHistory() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("notification_log")
    .select(
      "id,title,body,mode,segment_key,recipients_count,sent_count,removed_invalid,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = (data ?? []) as LogRow[];

  if (rows.length === 0) {
    return (
      <div className="rounded-md border bg-background py-12 text-center text-sm text-muted-foreground">
        لم تُرسل أي إشعارات بعد.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>التاريخ</TableHead>
            <TableHead>العنوان</TableHead>
            <TableHead>الفئة</TableHead>
            <TableHead>أُرسل / المستهدف</TableHead>
            <TableHead>رموز منظَّفة</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs whitespace-nowrap">
                {AR_DATETIME.format(new Date(r.created_at))}
              </TableCell>
              <TableCell>
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {r.body}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {MODE_LABEL[r.mode] ?? r.mode}
                  {r.segment_key && r.segment_key !== r.mode
                    ? ` · ${r.segment_key}`
                    : ""}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {r.sent_count} / {r.recipients_count}
              </TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">
                {r.removed_invalid || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
