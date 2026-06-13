import { Link } from 'react-router-dom';
import { Head } from 'vite-react-ssg';
import { ConverterTab } from '../components/ConverterTab';
import {
  DOMAIN,
  COMMON_FAQS,
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
          <Link to="/" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Accueil</Link>
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
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Questions fréquentes</h2>
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

        {/* Link back to full tool */}
        <div className="pb-8 text-center text-xs text-slate-400 dark:text-slate-500">
          Besoin de plus d'outils ?{' '}
          <Link to="/app" className="text-brand-500 hover:underline">
            Accédez au convertisseur complet →
          </Link>
        </div>
      </div>
    </>
  );
}
