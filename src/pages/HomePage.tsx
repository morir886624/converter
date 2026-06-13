import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Head } from 'vite-react-ssg';
import {
  conversions,
  CATEGORY_LABEL,
  CATEGORY_ICON_SEO,
  DOMAIN,
  type ConversionCategory,
} from '../conversions.config';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABEL) as ConversionCategory[];

export function HomePage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversions;
    return conversions.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.from.toLowerCase().includes(q) ||
        c.to.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<ConversionCategory, typeof conversions>();
    for (const cat of ALL_CATEGORIES) map.set(cat, []);
    for (const c of filtered) {
      map.get(c.category)?.push(c);
    }
    return map;
  }, [filtered]);

  const totalResults = filtered.length;

  return (
    <>
      <Head>
        <title>File Converter — Free Online File Converter</title>
        <meta
          name="description"
          content="Convert your files for free directly in your browser. Images, PDF, audio, video, data — 100% local, no files ever sent to any server."
        />
        <link rel="canonical" href={DOMAIN + '/'} />
        <meta property="og:title" content="File Converter — Free file conversion tool" />
        <meta
          property="og:description"
          content="30+ conversions available: images, PDF, audio, video and data. Everything runs in your browser — no data collected, no uploads."
        />
        <meta property="og:url" content={DOMAIN + '/'} />
        <meta property="og:type" content="website" />
        <meta name="google-site-verification" content="BVNEd-3B73VwzBLjp_kJgeOXXwEzifAgvu7eZ7rVv8I" />
      </Head>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-10 pb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-4">
          Convert your files <span className="text-brand-600 dark:text-brand-400">for free</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-6">
          30+ conversions available — images, PDF, audio, video and data.
          Everything runs in your browser.{' '}
          <strong className="text-slate-800 dark:text-slate-200">No files ever leave your device.</strong>
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/app"
            className="btn-primary px-6 py-2.5 text-sm font-semibold"
          >
            ⚡ Open the full converter
          </Link>
          <span className="text-xs text-slate-400 dark:text-slate-500">or choose a conversion below</span>
        </div>
      </section>

      {/* Search */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden>🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a conversion… e.g. jpg, mp3, pdf"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500 transition-shadow"
          />
        </div>
        {query && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {totalResults === 0 ? 'No results.' : `${totalResults} conversion${totalResults > 1 ? 's' : ''} found`}
          </p>
        )}
      </div>

      {/* Conversion grid by category */}
      <div className="max-w-4xl mx-auto px-4 pb-12 space-y-8">
        {ALL_CATEGORIES.map((cat) => {
          const items = grouped.get(cat) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                <span aria-hidden>{CATEGORY_ICON_SEO[cat]}</span>
                {CATEGORY_LABEL[cat]}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {items.map((conv) => (
                  <Link
                    key={conv.slug}
                    to={`/${conv.slug}`}
                    className="group flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-sm transition-all"
                  >
                    <span className="shrink-0 text-lg" aria-hidden>{CATEGORY_ICON_SEO[conv.category]}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                        {conv.from.toUpperCase()} → {conv.to.toUpperCase()}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate leading-snug mt-0.5">
                        {conv.title
                          .replace(/^Convertir\s+/i, '')
                          .replace(/\s+gratuitement$/i, '')
                          .replace(/^Extraire le texte d'un\s+/i, '')}
                      </p>
                    </div>
                    <span className="ml-auto shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-brand-400 transition-colors text-sm" aria-hidden>›</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Trust section */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30">
        <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: '🔒', title: '100% local', desc: 'No files are sent to any server. Everything stays on your device.' },
            { icon: '🆓', title: 'Free, no account', desc: 'No sign-up, no usage limit, no watermark.' },
            { icon: '📶', title: 'Works offline', desc: 'Once the page is loaded, you can cut internet and keep converting.' },
          ].map(({ icon, title, desc }) => (
            <div key={title}>
              <div className="text-3xl mb-2" aria-hidden>{icon}</div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
