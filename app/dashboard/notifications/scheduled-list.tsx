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

import { CancelScheduledButton } from "./cancel-scheduled-button";

type Row = {
  id: string;
  title: string;
  body: string;
  send_at: string;
  status: string;
  user_ids: string[];
  target_route: string | null;
  sent_count: number | null;
  processed_at: string | null;
};

const AR_DATETIME = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  timeZone: "Asia/Riyadh",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار الإرسال",
  sent: "أُرسل",
  failed: "فشل",
  cancelled: "أُلغي",
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-sky-100 text-sky-900 border-sky-300",
  sent: "bg-emerald-100 text-emerald-900 border-emerald-300",
  failed: "bg-rose-100 text-rose-900 border-rose-300",
  cancelled: "bg-zinc-100 text-zinc-700 border-zinc-300",
};

export async function ScheduledList() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("scheduled_notifications")
    .select(
      "id,title,body,send_at,status,user_ids,target_route,sent_count,processed_at",
    )
    .order("send_at", { ascending: true })
    .limit(20);
  const rows = (data ?? []) as Row[];

  if (rows.length === 0) {
    return (
      <div className="rounded-md border bg-background py-12 text-center text-sm text-muted-foreground">
        لا توجد إشعارات مجدولة.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>وقت الإرسال</TableHead>
            <TableHead>العنوان</TableHead>
            <TableHead>المستلمون</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs whitespace-nowrap">
                {AR_DATETIME.format(new Date(r.send_at))}
              </TableCell>
              <TableCell>
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {r.body}
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {r.user_ids.length}
              </TableCell>
              <TableCell>
                <Badge className={STATUS_TONE[r.status] ?? ""}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </Badge>
              </TableCell>
              <TableCell>
                {r.status === "pending" && (
                  <CancelScheduledButton id={r.id} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
