import Link from "next/link";
import { SargassumAdminForm } from "@/components/admin/SargassumAdminForm";
import { requireAdminSession } from "@/lib/admin-session";
import { fetchSargassumByCoast } from "@/lib/sargassum";

export default async function AdminSargassumPage({
  searchParams
}: {
  searchParams: { saved?: string };
}) {
  await requireAdminSession();
  const initialByCoast = await fetchSargassumByCoast();

  const sp = searchParams;

  return (
    <>
      {sp?.saved === "1" && (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900">
          Saved. Public site updated.
        </div>
      )}
      <SargassumAdminForm initialByCoast={initialByCoast} />
      <p className="pb-10 text-center text-sm text-slate-500">
        <Link href="/" className="text-ocean-700 hover:text-ocean-600">
          ← Back to site
        </Link>
      </p>
    </>
  );
}
