import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions";
import { btn, field, h1, lbl, muted, note } from "@/components/styles";
export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 p-4 pt-20">
      <b className="text-xl text-ac">LeaveDesk</b>
      <h1 className={h1}>Forgot your password?</h1>
      <p className={muted}>Enter your email and we will send you a link to choose a new one.</p>
      {sp.sent && <div className={note}>If an account uses that email, a reset link is on its way. It works once and expires in one hour.</div>}
      <form action={requestPasswordReset} className="flex flex-col gap-4">
        <label className={lbl}>Email<input className={field} name="email" type="email" required /></label>
        <button className={btn}>Send reset link</button>
      </form>
      <p className={muted}><Link className="text-ac" href="/sign-in">Back to sign in</Link></p>
    </div>
  );
}
