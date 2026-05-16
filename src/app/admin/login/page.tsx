import Link from "next/link";
import { LoginForm } from "@/app/admin/login/LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold text-slate-800">Admin login</h1>
      <p className="mt-2 text-sm text-slate-600">
        Sargassum coast updates and beach photo overrides — password required.
      </p>
      <LoginForm />
      <p className="mt-8 text-center text-sm">
        <Link href="/" className="text-ocean-700 hover:text-ocean-600">
          ← Back to site
        </Link>
      </p>
    </main>
  );
}
