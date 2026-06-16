import { Link } from 'react-router-dom';
import { Head } from 'vite-react-ssg';
import { ConverterTab } from '../components/ConverterTab';
import {
  DOMAIN,
  COMMON_FAQS,
  CATEGORY_ICON_SEO,
  conversions,
  type ConversionDef,
} from '../conversions.config';

interface Props {
  config: ConversionDef;
}

export function ConversionPage({ config }: Props) {
  const pageTitle = `${config.title} | File Converter`;
  const canonical = `${DOMAIN}/${config.slug}`;

  const faqs = config.specificFaq
    ? [...COMMON_FAQS, config.specificFaq]
    : COMMON_FAQS;

  const related = conversions
    .filter((c) => c.slug !== config.slug && (c.from === config.from || c.to === config.to || c.category === config.category))
    .slice(0, 6);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={config.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={config.title} />
        <meta property="og:description" content={config.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${DOMAIN}/apple-touch-icon.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={config.title} />
        <meta name="twitter:description" content={config.description} />
        <meta name="twitter:image" content={`${DOMAIN}/apple-touch-icon.png`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: `How to convert ${config.from.toUpperCase()} to ${config.to.toUpperCase()}`,
          description: config.description,
          totalTime: 'PT1M',
          tool: { '@type': 'HowToTool', name: 'File Converter', url: DOMAIN },
          step: [
            { '@type': 'HowToStep', position: 1, name: 'Upload your file', text: `Drop your ${config.from.toUpperCase()} file into the converter or click to browse your files.` },
            { '@type': 'HowToStep', position: 2, name: 'Select the output format', text: `Choose ${config.to.toUpperCase()} as the output format from the dropdown. Adjust quality or other options if needed.` },
            { '@type': 'HowToStep', position: 3, name: 'Convert', text: 'Click Convert. The conversion runs entirely in your browser — nothing is sent to any server.' },
            { '@type': 'HowToStep', position: 4, name: 'Download', text: `Click Download to save your converted ${config.to.toUpperCase()} file to your device.` },
          ],
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: DOMAIN + '/' },
            { '@type': 'ListItem', position: 2, name: `${config.from.toUpperCase()} → ${config.to.toUpperCase()}`, item: canonical },
          ],
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        })}</script>
      </Head>

      <div className="max-w-4xl mx-auto px-3 sm:px-4">

        {/* Breadcrumb */}
        <nav className="pt-4 pb-2 text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <Link to="/" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Home</Link>
          <span aria-hidden>›</span>
          <span className="text-slate-600 dark:text-slate-300">{config.from.toUpperCase()} → {config.to.toUpperCase()}</span>
        </nav>

        {/* SEO content */}
        <section className="pt-2 pb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-3">
            {config.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
            {config.description}
          </p>
        </section>

        {/* Converter tool */}
        <section>
          <ConverterTab preferredFormat={config.to} />
        </section>

        {/* FAQ */}
        <section className="mt-10 pb-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Frequently asked questions</h2>
          <dl className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
              >
                <dt className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                  {faq.question}
                </dt>
                <dd className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Related conversions */}
        {related.length > 0 && (
          <section className="mt-2 pb-8">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Related conversions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {related.map((conv) => (
                <Link
                  key={conv.slug}
                  to={`/${conv.slug}`}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-sm transition-all"
                >
                  <span className="shrink-0 text-base" aria-hidden>{CATEGORY_ICON_SEO[conv.category]}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                    {conv.from.toUpperCase()} → {conv.to.toUpperCase()}
                  </span>
                  <span className="ml-auto shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-brand-400 text-sm" aria-hidden>›</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Link back to full tool */}
        <div className="pb-8 text-center text-xs text-slate-400 dark:text-slate-500">
          Need more tools?{' '}
          <Link to={`/app?to=${config.to}`} className="text-brand-500 hover:underline">
            Open the full converter →
          </Link>
        </div>
      </div>
    </>
  );
}
