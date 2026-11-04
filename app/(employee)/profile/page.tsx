import { requireUser } from "@/lib/dal";
import { changePassword, signOut } from "@/lib/actions";
import ThemeToggle from "@/components/ThemeToggle";
import PasswordInput from "@/components/PasswordInput";
import { btn, card, err, ghostSm, h1, h2, lbl, muted, note } from "@/components/styles";
const ERR: Record<string, string> = { wrong: "Your current password is wrong.", short: "The new password must be at least 8 characters.", mismatch: "The new passwords don't match." };
export default async function Profile({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const rows: [string, string][] = [["Name", u.name], ["Email", u.email], ["Role", u.role.name], ["Department", u.department], ["HR dashboard access", u.role.isAdmin ? "Yes" : "No"]];
  return (
    <>
      <h1 className={h1}>Profile</h1>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className={`${card} flex flex-col gap-3 p-6`}>
            {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0"><span className={muted}>{k}</span><span>{v}</span></div>)}
          </div>
          <div className={`${card} flex flex-col gap-4 p-6`}>
            <h2 className={h2}>Appearance and account</h2>
            <div className="flex items-center justify-between gap-4"><span className={muted}>Switch between light and dark mode</span><ThemeToggle /></div>
            <div className="flex items-center justify-between gap-4"><span className={muted}>Signed in as {u.email}</span><form action={signOut}><button className={ghostSm}>Sign out</button></form></div>
          </div>
        </div>
        <form action={changePassword} className={`${card} flex flex-col gap-4 p-6`}>
          <h2 className={h2}>Change password</h2>
          {sp.saved && <div className={note}>Password changed.</div>}
          {sp.error && <div className={err}>{ERR[sp.error]}</div>}
          <label className={lbl}>Current password<PasswordInput name="current" autoComplete="current-password" /></label>
          <label className={lbl}>New password (min 8 characters)<PasswordInput name="next" minLength={8} autoComplete="new-password" /></label>
          <label className={lbl}>Repeat new password<PasswordInput name="again" autoComplete="new-password" /></label>
          <button className={`${btn} self-start`}>Save password</button>
        </form>
      </div>
    </>
  );
}
