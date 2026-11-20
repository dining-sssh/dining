import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AMU Dining Hall System | Provost, Munshi & Student Portal',
  description: 'Dining management for Sir Shah Sulaiman Hall, AMU: separate Provost, Munshi and Student panels, CSV student import and a day-wise dining register.',
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
