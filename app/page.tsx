import { redirect } from "next/navigation";
import { isAdminUser, requireUser } from "@/lib/dal";
export default async function Index() {
  const u = await requireUser();
  redirect(isAdminUser(u) ? "/admin" : "/home");
}
