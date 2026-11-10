import Link from "next/link";
import { signUp, signUpWithGoogle } from "@/lib/actions";
import { getPendingGoogle, googleConfigured } from "@/lib/google";
import PasswordInput from "@/components/PasswordInput";
import { btn, err, field, ghostSm, h1, h2, lbl, muted, note } from "@/components/styles";
const ERR: Record<string, string> = {
  invalid: "Fill in every field with valid values.", short: "The password must be at least 8 characters.", days: "Leave days per quarter must be whole numbers from 0 to 260.",
  exists: "Someone with that email already has an account.", expired: "Your Google sign-up expired. Please start again.",
};
function Quarters() {
  return (
    <>
      <h2 className={`${h2} mt-2`}>Annual leave days people may take in each quarter</h2>
      <p className={muted}>Use 0 for a quarter with no leave days. For example, a firm that closes over the festive season might use 0, 5, 5, 0. You can change this later under Policies.</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {["Q1 (Jan to Mar)", "Q2 (Apr to Jun)", "Q3 (Jul to Sep)", "Q4 (Oct to Dec)"].map((l, i) => (
          <label key={l} className={lbl}>{l}<input className={field} type="number" min={0} max={260} name={`q${i + 1}`} defaultValue={[6, 5, 5, 5][i]} required /></label>
        ))}
      </div>
    </>
  );
}
export default async function SignUp({ searchParams }: { searchParams: Promise<{ error?: string; google?: string }> }) {
  const sp = await searchParams;
  const g = sp.google ? await getPendingGoogle() : null;
  const bad = sp.error ? ERR[sp.error] : sp.google && !g ? ERR.expired : "";
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4 pt-16">
      <b className="text-xl text-ac">LeaveDesk</b>
      <h1 className={h1}>{g ? "Finish creating your organization" : "Create your organization"}</h1>
      <p className={muted}>You become the owner, with full admin access. You can add people, give admin access to others and change everything below later.</p>
      {bad && <div className={err}>{bad}</div>}
      {g ? (
        <form action={signUpWithGoogle} className="flex flex-col gap-4">
          <div className={note}>Signed in with Google as {g.email}. You can sign in with Google next time.</div>
          <label className={lbl}>Organization name<input className={field} name="org" required /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={lbl}>Your full name<input className={field} name="name" defaultValue={g.name} required /></label>
            <label className={lbl}>Your job title (for example Managing Partner)<input className={field} name="title" required /></label>
          </div>
          <Quarters />
          <button className={`${btn} self-start`}>Create organization</button>
        </form>
      ) : (
        <>
          {googleConfigured() && <a className={`${ghostSm} h-12 text-base`} href="/api/auth/google?intent=signup">Sign up with Google</a>}
          <form action={signUp} className="flex flex-col gap-4">
            <label className={lbl}>Organization name<input className={field} name="org" required /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={lbl}>Your full name<input className={field} name="name" required /></label>
              <label className={lbl}>Your job title (for example Managing Partner)<input className={field} name="title" required /></label>
            </div>
            <label className={lbl}>Work email<input className={field} name="email" type="email" required /></label>
            <label className={lbl}>Password (min 8 characters)<PasswordInput name="password" minLength={8} autoComplete="new-password" /></label>
            <Quarters />
            <button className={`${btn} self-start`}>Create organization</button>
          </form>
        </>
      )}
      <p className={muted}>Already have an account? <Link className="text-ac" href="/sign-in">Sign in</Link></p>
    </div>
  );
}
