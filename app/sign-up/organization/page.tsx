import { redirect } from "next/navigation";
import { completeSignUp } from "@/lib/actions";
import { getPendingAccount } from "@/lib/signup";
import { btn, err, field, h1, h2, lbl, muted, note } from "@/components/styles";
const ERR: Record<string, string> = { invalid: "Fill in every field.", days: "Leave days per quarter must be whole numbers from 0 to 260." };
export default async function CreateOrganization({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const acc = await getPendingAccount();
  if (!acc) redirect("/sign-up?error=expired");
  const sp = await searchParams;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4 pt-16">
      <b className="text-xl text-ac">LeaveDesk</b>
      <p className={muted}>Step 2 of 2: create your organization</p>
      <h1 className={h1}>Create your organization</h1>
      <div className={note}>Your account ({acc.email}) is confirmed. You become the owner of the organization, with full admin access.</div>
      {sp.error && <div className={err}>{ERR[sp.error]}</div>}
      <form action={completeSignUp} className="flex flex-col gap-4">
        <label className={lbl}>Organization name<input className={field} name="org" required /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={lbl}>Your full name<input className={field} name="name" defaultValue={acc.name ?? ""} required /></label>
          <label className={lbl}>Your job title (for example Managing Partner)<input className={field} name="title" required /></label>
        </div>
        <h2 className={`${h2} mt-2`}>Annual leave days people may take in each quarter</h2>
        <p className={muted}>Use 0 for a quarter with no leave days. For example, a firm that closes over the festive season might use 0, 5, 5, 0. You can change this later under Policies, where you can also add mandatory leave periods and public holidays.</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {["Q1 (Jan to Mar)", "Q2 (Apr to Jun)", "Q3 (Jul to Sep)", "Q4 (Oct to Dec)"].map((l, i) => (
            <label key={l} className={lbl}>{l}<input className={field} type="number" min={0} max={260} name={`q${i + 1}`} defaultValue={[6, 5, 5, 5][i]} required /></label>
          ))}
        </div>
        <button className={`${btn} self-start`}>Save and go to my dashboard</button>
      </form>
    </div>
  );
}
