import Link from "next/link";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { resetPassword } from "@/lib/actions";
import PasswordInput from "@/components/PasswordInput";
import { btn, err, h1, lbl, muted } from "@/components/styles";
const ERR: Record<string, string> = { short: "The new password must be at least 8 characters.", mismatch: "The two passwords don't match." };
export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const sp = await searchParams;
  const row = sp.token ? await prisma.passwordReset.findUnique({ where: { tokenHash: createHash("sha256").update(sp.token).digest("hex") } }) : null;
  const valid = !!row && row.expiresAt > new Date();
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 p-4 pt-20">
      <b className="text-xl text-ac">LeaveDesk</b>
      <h1 className={h1}>Choose a new password</h1>
      {!valid ? (
        <>
          <div className={err}>This link is invalid or has expired.</div>
          <p className={muted}><Link className="text-ac" href="/forgot-password">Ask for a new link</Link></p>
        </>
      ) : (
        <form action={resetPassword} className="flex flex-col gap-4">
          {sp.error && <div className={err}>{ERR[sp.error]}</div>}
          <input type="hidden" name="token" value={sp.token} />
          <label className={lbl}>New password (min 8 characters)<PasswordInput name="next" minLength={8} autoComplete="new-password" /></label>
          <label className={lbl}>Repeat new password<PasswordInput name="again" autoComplete="new-password" /></label>
          <button className={btn}>Save new password</button>
        </form>
      )}
    </div>
  );
}
