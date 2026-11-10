import Link from "next/link";
import { startSignUp } from "@/lib/actions";
import GoogleButton from "@/components/GoogleButton";
import PasswordInput from "@/components/PasswordInput";
import { btn, err, field, ghostSm, h1, lbl, muted, note } from "@/components/styles";
const ERR: Record<string, string> = {
  invalid: "Enter a valid email address.", short: "The password must be at least 8 characters.", mismatch: "The two passwords don't match.",
  exists: "An account already uses that email. Sign in instead.", expired: "Your sign-up session expired. Please start again.",
  googlesetup: "Google sign-up is not set up yet. The person running the app needs to add the Google keys to .env (see the README) and restart.",
  google: "Google sign-up did not work. Please try again.",
  badlink: "That confirmation link is invalid or has expired. Please sign up again.",
};
export default async function SignUp({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string; devlink?: string; why?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 p-4 pt-16">
      <b className="text-xl text-ac">LeaveDesk</b>
      <p className={muted}>Step 1 of 2: create your account</p>
      <h1 className={h1}>Sign up</h1>
      {sp.error && <div className={err}>{ERR[sp.error] ?? "Something went wrong."}</div>}
      {sp.why && process.env.NODE_ENV !== "production" && <p className={muted}>Details (development only): {sp.why}</p>}
      {sp.sent ? (
        <div className="flex flex-col gap-3">
          <div className={note}>Almost there. We sent a confirmation link to your email. Open it to continue and create your organization. It works for 24 hours.</div>
          {sp.devlink && !process.env.RESEND_API_KEY && (
            <p className={muted}>Development only: no email service is set up, so here is your link: <a className="break-all text-ac underline" href={sp.devlink}>confirm my email</a></p>
          )}
          <Link className={`${ghostSm} self-start`} href="/sign-up">Use a different email</Link>
        </div>
      ) : (
        <>
          <GoogleButton href="/api/auth/google?intent=signup" label="Sign up with Google" />
          <p className={`${muted} text-center`}>or sign up with your email</p>
          <form action={startSignUp} className="flex flex-col gap-4">
            <label className={lbl}>Email<input className={field} name="email" type="email" required /></label>
            <label className={lbl}>Password (min 8 characters)<PasswordInput name="password" minLength={8} autoComplete="new-password" /></label>
            <label className={lbl}>Repeat password<PasswordInput name="again" autoComplete="new-password" /></label>
            <button className={btn}>Create account</button>
          </form>
        </>
      )}
      <p className={muted}>Already have an account? <Link className="text-ac" href="/sign-in">Sign in</Link></p>
    </div>
  );
}
