import Link from "next/link";
import { redirect } from "next/navigation";
import { getPendingAccount } from "@/lib/signup";
import { btn, card, h1, h2, muted, note } from "@/components/styles";
export default async function ChooseOrganization() {
  const acc = await getPendingAccount();
  if (!acc) redirect("/sign-up?error=expired");
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pt-16">
      <b className="text-xl text-ac">LeaveDesk</b>
      <p className={muted}>Step 2 of 2: your organization</p>
      <h1 className={h1}>Create or join an organization</h1>
      <div className={note}>Your account ({acc.email}) is confirmed.</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className={`${card} flex flex-col gap-3 p-6`}>
          <h2 className={h2}>Create an organization</h2>
          <p className={muted}>Set up your firm, school or company. You become its owner and an admin, and you choose how annual leave works.</p>
          <Link className={`${btn} mt-auto`} href="/sign-up/organization/create">Create an organization</Link>
        </section>
        <section className={`${card} flex flex-col gap-3 p-6`}>
          <h2 className={h2}>Join an organization</h2>
          <p className={muted}>Your organization already uses LeaveDesk? Type its name, then add your name, role and department.</p>
          <Link className={`${btn} mt-auto`} href="/sign-up/organization/join">Join an organization</Link>
        </section>
      </div>
    </div>
  );
}
