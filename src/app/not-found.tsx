import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md space-y-4">
        <h2 className="text-3xl font-extrabold text-amber-400">404 - Page Not Found</h2>
        <p className="text-sm text-slate-300">
          The requested page could not be found in the AMU Dining Hall System.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow"
        >
          Return to Dining Portal
        </Link>
      </div>
    </div>
  );
}
