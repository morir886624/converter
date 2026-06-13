import { Link } from 'react-router-dom';
import { Head } from 'vite-react-ssg';

export function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page Not Found | File Converter</title>
      </Head>
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 py-16">
        <p className="text-6xl mb-4" aria-hidden>🔍</p>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Page Not Found</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          This page doesn't exist or the URL has changed.
        </p>
        <Link to="/" className="btn-primary text-sm px-5 py-2">
          ← Back to home
        </Link>
      </div>
    </>
  );
}
