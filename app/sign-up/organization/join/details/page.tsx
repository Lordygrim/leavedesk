import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { completeJoin } from "@/lib/actions";
import { getPendingAccount } from "@/lib/signup";
import { btn, err, field, h1, lbl, muted, note } from "@/components/styles";
export default async function JoinDetails({ searchParams }: { searchParams: Promise<{ org?: string; error?: string }> }) {
  const acc = await getPendingAccount();
  if (!acc) redirect("/sign-up?error=expired");
  const sp = await searchParams;
  const org = sp.org ? await prisma.organization.findUnique({ where: { id: sp.org } }) : null;
  if (!org) redirect("/sign-up/organization/join?error=notfound");
  // Admin roles are not offered: nobody can join as an admin.
  const roles = await prisma.role.findMany({ where: { orgId: org.id, grantsAdmin: false }, orderBy: { name: "asc" } });
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4 pt-16">
      <b className="text-xl text-ac">LeaveDesk</b>
      <p className={muted}>Step 3 of 3: your details · <Link className="text-ac" href="/sign-up/organization/join">Change organization</Link></p>
      <h1 className={h1}>Join {org.name}</h1>
      {org.requireApproval && <div className={note}>An admin of {org.name} must approve your request before you can sign in. You will get an email when it is approved.</div>}
      {sp.error === "adminrole" && <div className={err}>That role gives admin access, so you cannot join with it. Type a different title: an admin can change it later.</div>}
      {sp.error && sp.error !== "adminrole" && <div className={err}>Fill in every field.</div>}
        <form action={completeJoin} className="flex flex-col gap-4">
          <input type="hidden" name="org" value={org.id} />
          <label className={lbl}>Full name<input className={field} name="name" defaultValue={acc.name ?? ""} required /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={lbl}>Your role (type it, or pick a suggestion)<input className={field} name="role" list="role-list" maxLength={60} required /><datalist id="role-list">{roles.map((r) => <option key={r.id} value={r.name} />)}</datalist></label>
            <label className={lbl}>Department<input className={field} name="department" maxLength={60} required /></label>
          </div>
          <button className={`${btn} self-start`}>{org.requireApproval ? "Send request to join" : `Join ${org.name}`}</button>
        </form>
    </div>
  );
}
