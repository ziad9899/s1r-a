import { redirect } from "next/navigation";

// Middleware already gates / behind a signed-in admin. This page just
// forwards to the dashboard surface.
export default function RootPage() {
  redirect("/dashboard");
}
