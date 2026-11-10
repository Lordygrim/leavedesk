import { isAdminUser, requireUser } from "@/lib/dal";
import { changeEmail, changePassword, signOut } from "@/lib/actions";
import { googleConfigured } from "@/lib/google";
import PasswordInput from "@/components/PasswordInput";
import ThemeToggle from "@/components/ThemeToggle";
import { btn, card, err, field, ghostSm, h1, h2, lbl, muted, note } from "@/components/styles";
const ERR: Record<string, string> = {
  wrong: "Your current password is wrong.", short: "The new password must be at least 8 characters.", mismatch: "The new passwords don't match.",
  email: "Enter a valid email address.", wrongemailpw: "Your password is wrong, so the email was not changed.", emailtaken: "Another person already uses that email.",
  googletaken: "That Google account is already connected to someone else.",
};
export default async function Profile({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; emailsaved?: string; linked?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const rows: [string, string][] = [["Name", u.name], ["Email", u.email], ["Organization", u.org.name], ["Role", u.role.name], ["Department", u.department], ["Your leave is approved by", u.manager ? `${u.manager.name} or an admin` : "An admin"],
    ["HR dashboard access", u.isOwner ? "Yes (organization owner)" : isAdminUser(u) ? "Yes" : "No"]];
  const passwordErrors = ["wrong", "short", "mismatch"];
  return (
    <>
      <h1 className={h1}>Profile</h1>
      {sp.emailsaved && <div className={note}>Your email was updated. Use it the next time you sign in.</div>}
      {sp.linked && <div className={note}>Your Google account is connected. You can now sign in with Google.</div>}
      {sp.error && !passwordErrors.includes(sp.error) && <div className={err}>{ERR[sp.error]}</div>}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className={`${card} flex flex-col gap-3 p-6`}>
            {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0"><span className={muted}>{k}</span><span>{v}</span></div>)}
          </div>
          <form action={changeEmail} className={`${card} flex flex-col gap-4 p-6`}>
            <h2 className={h2}>Change your work email</h2>
            <p className={muted}>Use your official work address. You will sign in with it from now on. Double-check it, because it is not verified.</p>
            <label className={lbl}>New email<input className={field} type="email" name="email" defaultValue={u.email} required /></label>
            {u.hasPassword && <label className={lbl}>Your password, to confirm<PasswordInput name="password" autoComplete="current-password" /></label>}
            <button className={`${btn} self-start`}>Save email</button>
          </form>
          {googleConfigured() && (
            <div className={`${card} flex flex-col gap-3 p-6`}>
              <h2 className={h2}>Google sign-in</h2>
              {u.googleId ? <p className={muted}>A Google account is connected. You can sign in with the Continue with Google button.</p> : (
                <>
                  <p className={muted}>Connect a Google account so you can sign in with it, even if its email differs from your work email.</p>
                  <a className={`${ghostSm} self-start`} href="/api/auth/google?intent=link">Connect Google account</a>
                </>
              )}
            </div>
          )}
          <div className={`${card} flex flex-col gap-4 p-6`}>
            <h2 className={h2}>Appearance and account</h2>
            <div className="flex items-center justify-between gap-4"><span className={muted}>Switch between light and dark mode</span><ThemeToggle /></div>
            <div className="flex items-center justify-between gap-4"><span className={muted}>Signed in as {u.email}</span><form action={signOut}><button className={ghostSm}>Sign out</button></form></div>
          </div>
        </div>
        <form action={changePassword} className={`${card} flex flex-col gap-4 p-6`}>
          <h2 className={h2}>{u.hasPassword ? "Change password" : "Set a password"}</h2>
          {!u.hasPassword && <p className={muted}>You signed up with Google. Setting a password is optional, and lets you also sign in with your email and password.</p>}
          {sp.saved && <div className={note}>Password saved.</div>}
          {sp.error && passwordErrors.includes(sp.error) && <div className={err}>{ERR[sp.error]}</div>}
          {u.hasPassword && <label className={lbl}>Current password<PasswordInput name="current" autoComplete="current-password" /></label>}
          <label className={lbl}>New password (min 8 characters)<PasswordInput name="next" minLength={8} autoComplete="new-password" /></label>
          <label className={lbl}>Repeat new password<PasswordInput name="again" autoComplete="new-password" /></label>
          <button className={`${btn} self-start`}>Save password</button>
        </form>
      </div>
    </>
  );
}
