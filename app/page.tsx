import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
export default async function Index() {
  const u = await requireUser();
  redirect(u.role.isAdmin ? "/admin" : "/home");
}
