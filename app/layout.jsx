import './globals.css';

export const metadata = {
  title: 'Mekong Remittance Corridors',
  description: "Millions of workers from Myanmar, Cambodia, Laos and Viet Nam send money home from Thailand. This page follows that money using the Bank of Thailand's quarterly record of money sent abroad by individuals, the Thai labour ministry's monthly work-permit counts by province, and World Bank indicators — marking every number as measured or estimated, with its source and date.",
  openGraph: {
    type: 'website',
    title: 'Mekong Remittance Corridors',
    description: 'How much money leaves Thailand for Myanmar, Cambodia, Laos and Viet Nam, when in the year it leaves, and which provinces it leaves from -- with every number marked measured or estimated.',
    locale: 'en_US',
  },
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
        <link rel="stylesheet" href='https://fonts.googleapis.com/css2?family=Architects+Daughter&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@500;600;700&family=Geist+Mono:wght@400;500;600&display=swap' />
        {/* baht sign only: it is not in the Latin Plex cuts */}
        <link rel="stylesheet" href='https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600&text=%E0%B8%BF&display=swap' />
      </head>
      <body>{children}</body>
    </html>
  );
}
