import { signIn } from "@/lib/actions";
import PasswordInput from "@/components/PasswordInput";
export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-[720px] p-4" style={{ maxWidth: 400, paddingTop: 80 }}>
      <form action={signIn} className="flex flex-col gap-4">
        <b style={{ fontSize: 20, color: "var(--ac)" }}>LeaveDesk</b>
        <h1 className="text-3xl font-medium">Sign in</h1>
        {sp.error && <div className="rounded-xl bg-rjb px-4 py-3 text-rjt">Email or password is wrong.</div>}
        <label className="flex flex-col gap-1.5 text-sm text-mut">Work email<input className="rounded-xl border border-fld bg-card text-ink h-12 w-full px-3.5 text-base" name="email" type="email" defaultValue="michaelmuoki@company.co.ke" required /></label>
        <label className="flex flex-col gap-1.5 text-sm text-mut">Password<PasswordInput name="password" autoComplete="current-password" /></label>
        <button className="inline-flex items-center justify-center rounded-xl font-medium no-underline cursor-pointer h-12 px-5 text-base bg-ac text-act">Sign in</button>
        <p className="text-sm text-mut">Demo accounts use the password <b>Password123!</b>. Admins: michaelsila@company.co.ke (Managing Partner) and susan.wambui@company.co.ke (HR Manager).</p>
      </form>
    </div>
  );
}
