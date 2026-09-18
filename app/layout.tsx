import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MediaTrack',
  description: 'Segue os teus filmes, séries, animes, mangas e livros num só lugar.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">{children}</body>
    </html>
  );
}
