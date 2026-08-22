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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-900 antialiased">

        {/* Top nav */}
        <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
          <nav className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3">
            <Link href="/" className="mr-4 flex items-center gap-2 font-bold text-zinc-900 text-sm tracking-tight">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-400 text-xs font-black text-white">B</span>
              Blast Radius
            </Link>
            <Link href="/" className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
              Search
            </Link>
            <Link href="/risks" className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
              Risks
            </Link>
            <Link href="/plan" className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
              Simulate
            </Link>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}
