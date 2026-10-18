import type { Metadata } from 'next';
import { Disclaimer } from '@/components/Disclaimer';
import './globals.css';

export const metadata: Metadata = {
  title: 'PapLens - Interpretable Cervical Cytology Classification',
  description: 'Interpretable cervical cytology classification. Demo of a model from the PapSmear-BD study.',
  keywords: ['cytology', 'cervical cancer', 'Pap smear', 'Attention MIL', 'ResNet-50', 'microscopy', 'deep learning'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#090d16] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
        <main className="flex-1 flex flex-col">{children}</main>
        <Disclaimer />
      </body>
    </html>
  );
}
