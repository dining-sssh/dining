import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AMU Dining Hall System | Provost, Munshi & Student Portal',
  description: 'Comprehensive Dining Management System for AMU Sir Syed Hall with Supabase, Two-Level Admin (Provost, Munshi), CSV Student Import, and Day-Wise Dining Register.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-amber-400 selection:text-emerald-950">
        {children}
      </body>
    </html>
  );
}
