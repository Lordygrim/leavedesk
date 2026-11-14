import Link from "next/link";
import { redirect } from "next/navigation";
import { findOrganization } from "@/lib/actions";
import { getPendingAccount } from "@/lib/signup";
import { btn, err, field, h1, lbl, muted } from "@/components/styles";
export default async function JoinOrganization({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await getPendingAccount())) redirect("/sign-up?error=expired");
  const sp = await searchParams;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 p-4 pt-16">
      <b className="text-xl text-ac">LeaveDesk</b>
      <p className={muted}>Step 2 of 3: join an organization · <Link className="text-ac" href="/sign-up/organization">Back</Link></p>
      <h1 className={h1}>Join an organization</h1>
      <p className={muted}>Type the name of the organization exactly as your admin gave it to you. Capital letters don&apos;t matter.</p>
      {sp.error && <div className={err}>We could not find an organization with that name. Check the spelling, or ask your admin for the exact name.</div>}
      <form action={findOrganization} className="flex flex-col gap-4">
        <label className={lbl}>Organization name<input className={field} name="org" required autoFocus /></label>
        <button className={btn}>Find organization</button>
      </form>
    </div>
  );
}
