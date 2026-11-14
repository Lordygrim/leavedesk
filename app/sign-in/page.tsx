import Link from "next/link";
import { signIn } from "@/lib/actions";
import GoogleButton from "@/components/GoogleButton";
import PasswordInput from "@/components/PasswordInput";
import { btn, err, field, ghostSm, h1, lbl, muted, note } from "@/components/styles";
const ERR: Record<string, string> = {
  "1": "Email or password is wrong.", google: "Google sign-in did not work. Please try again.",
  googlesetup: "Google sign-in is not set up yet. The person running the app needs to add the Google keys to .env (see the README) and restart.",
  pending: "Your request to join is waiting for an admin to approve it. You will get an email when it is approved.",
  nogoogle: "No account uses that Google email. Ask your admin to add you, or create an organization.", exists: "That email already has an account. Sign in instead.",
};
export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string; why?: string; joined?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 p-4 pt-20">
      <b className="text-xl text-ac">LeaveDesk</b>
      <h1 className={h1}>Sign in</h1>
      {sp.joined && <div className={note}>Request sent. An admin must approve you before you can sign in. You will get an email when it is approved.</div>}
      {sp.reset && <div className={note}>Your password was updated. Sign in with the new one.</div>}
      {sp.error && <div className={err}>{ERR[sp.error] ?? ERR["1"]}</div>}
      {sp.why && process.env.NODE_ENV !== "production" && <p className={muted}>Details (development only): {sp.why}</p>}
      <form action={signIn} className="flex flex-col gap-4">
        <label className={lbl}>Email<input className={field} name="email" type="email" required /></label>
        <label className={lbl}>Password<PasswordInput name="password" autoComplete="current-password" /></label>
        <button className={btn}>Sign in</button>
        <Link className="text-sm text-ac" href="/forgot-password">Forgot your password?</Link>
      </form>
      <GoogleButton href="/api/auth/google?intent=signin" label="Continue with Google" />
      <p className={muted}>New here? <Link className="text-ac" href="/sign-up">Create an account</Link></p>
      <p className={muted}>Demo firm: h.gichuki@company.co.ke (owner, admin), loise.mwai@company.co.ke (admin) or grace.mincha@company.co.ke (employee). Password: <b>Password123!</b></p>
    </div>
  );
}
