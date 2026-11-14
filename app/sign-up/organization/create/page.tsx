import Link from "next/link";
import { redirect } from "next/navigation";
import { completeSignUp } from "@/lib/actions";
import { getPendingAccount } from "@/lib/signup";
import AllowanceFields from "@/components/AllowanceFields";
import { btn, err, field, h1, h2, lbl, muted, note } from "@/components/styles";
const ERR: Record<string, string> = { invalid: "Fill in every field.", days: "Leave days must be whole numbers from 0 to 260.", nametaken: "An organization with that name already exists. If it is yours, go back and join it instead." };
export default async function CreateOrganization({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const acc = await getPendingAccount();
  if (!acc) redirect("/sign-up?error=expired");
  const sp = await searchParams;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4 pt-16">
      <b className="text-xl text-ac">LeaveDesk</b>
      <p className={muted}>Step 2 of 2: create your organization · <Link className="text-ac" href="/sign-up/organization">Back</Link></p>
      <h1 className={h1}>Create your organization</h1>
      <div className={note}>Your account ({acc.email}) is confirmed. You become the owner of the organization, with full admin access.</div>
      {sp.error && <div className={err}>{ERR[sp.error]}</div>}
      <form action={completeSignUp} className="flex flex-col gap-4">
        <label className={lbl}>Organization name<input className={field} name="org" required /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={lbl}>Full name<input className={field} name="name" defaultValue={acc.name ?? ""} required /></label>
          <label className={lbl}>Job title (e.g. Managing Partner)<input className={field} name="title" required /></label>
        </div>
        <h2 className={`${h2} mt-2`}>Annual leave allowance</h2>
        <p className={muted}>Choose how your organization gives annual leave: one fixed allowance a year, or days each half-year, quarter or month. You can change all of this later under Policies, where you can also add mandatory leave periods and public holidays.</p>
        <AllowanceFields initial={{ period: "YEARLY", rule: "WINDOW", days: [21] }} />
        <button className={`${btn} self-start`}>Save and go to my dashboard</button>
      </form>
    </div>
  );
}
