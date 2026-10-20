import type { Metadata } from 'next';
import { Disclaimer } from '@/components/Disclaimer';
import './globals.css';

export const metadata: Metadata = {
  title: 'PapLens — Cytology Evidence Workspace',
  description:
    'Research workspace for interpretable cervical cytology classification using attention-based multiple instance learning.',
  keywords: ['cytology', 'cervical cancer research', 'Pap smear', 'attention MIL', 'microscopy'],
  openGraph: {
    title: 'PapLens — Cytology Evidence Workspace',
    description: 'Inspect slide-level classifications alongside the image regions that informed them.',
    type: 'website',
    siteName: 'PapLens',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <a href="#main-content" className="skip-link">Skip to workspace</a>
        <div className="flex-1 flex flex-col">{children}</div>
        <Disclaimer />
      </body>
    </html>
  );
}
