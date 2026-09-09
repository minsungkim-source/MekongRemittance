import './globals.css';

/* The canonical home. Open Graph and Twitter both require absolute URLs, and
   the export is served under a basePath, so the origin is written out once
   here rather than derived -- a relative og:image unfurls as nothing. */
const SITE = 'https://minsungkim-source.github.io/MekongRemittance/';
const TITLE = 'Mekong Remittance Corridors';
const CARD = "How much money leaves Thailand for Myanmar, Cambodia, Laos and Viet Nam, when in the year it leaves, and which provinces it leaves from \u2014 with every number marked measured or estimated.";

export const metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: "Millions of workers from Myanmar, Cambodia, Laos and Viet Nam send money home from Thailand. This page follows that money using the Bank of Thailand's quarterly record of money sent abroad by individuals, the Thai labour ministry's monthly work-permit counts by province, and World Bank indicators \u2014 marking every number as measured or estimated, with its source and date.",
  alternates: { canonical: SITE },
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: TITLE,
    title: TITLE,
    description: CARD,
    locale: 'en_US',
    images: [{ url: SITE + 'og-image.png', width: 1200, height: 630,
      alt: "Mekong Remittance Corridors: modelled flow by corridor over the last four measured quarters \u2014 Myanmar 85.2, Cambodia 33.9, Laos 22.5 and Viet Nam 0.7 billion baht." }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: CARD,
    images: [SITE + 'og-image.png'] },
  icons: { icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="%23f8f9f8"/><rect x="5" y="6" width="22" height="4" fill="%23f5e3ce"/><rect x="5" y="11" width="22" height="4" fill="%23d9945c"/><rect x="5" y="16" width="22" height="4" fill="%23bd6b30"/><rect x="5" y="21" width="22" height="4" fill="%2394420f"/><rect x="1.6" y="1.6" width="28.8" height="28.8" fill="none" stroke="%232c4d61" stroke-width="3.2"/></svg>' },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e7dfcc' },
    { media: '(prefers-color-scheme: dark)', color: '#14171a' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Inter carries the whole page now -- text, display and the numbers in
            the colophon. Geist Mono stays for figures and labels. The drafting
            hand and both Plex cuts are gone with the drafting language. */}
        <link rel="stylesheet" href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap' />
        {/* baht sign only: it is not in the Latin Plex cuts */}
        <link rel="stylesheet" href='https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600&text=%E0%B8%BF&display=swap' />
      </head>
      <body>{children}</body>
    </html>
  );
}
