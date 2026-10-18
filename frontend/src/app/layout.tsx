import type { Metadata } from 'next';
import { Disclaimer } from '@/components/Disclaimer';
import './globals.css';

export const metadata: Metadata = {
  title: 'PapLens - Interpretable Cervical Cytology Classification',
  description:
    'Interpretable cervical cytology classification with attention-based multiple instance learning. Research demo.',
  keywords: [
    'cytology',
    'cervical cancer',
    'Pap smear',
    'Attention MIL',
    'ResNet-50',
    'microscopy',
    'deep learning',
    'interpretability',
  ],
  openGraph: {
    title: 'PapLens - Interpretable Cervical Cytology Classification',
    description:
      'Interpretable cervical cytology classification with attention-based multiple instance learning. Research demo.',
    type: 'website',
    siteName: 'PapLens',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PapLens - Interpretable Cervical Cytology Classification',
    description:
      'Interpretable cervical cytology classification with attention-based multiple instance learning. Research demo.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col transition-colors selection:bg-indigo-500/30 selection:text-indigo-600 dark:selection:text-indigo-200">
        <main className="flex-1 flex flex-col">{children}</main>
        <Disclaimer />
      </body>
    </html>
  );
}
