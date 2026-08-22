import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Blast Radius — Dependency Intelligence',
  description: 'See what breaks when anything fails.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <nav className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900">
              Blast Radius
            </Link>
            <div className="flex gap-5 ml-4">
              <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
                Search
              </Link>
              <Link href="/risks" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
                Risks
              </Link>
              <Link href="/plan" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
                Simulate
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
