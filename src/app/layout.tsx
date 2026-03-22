import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import { Inter, Poppins, Fira_Code } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const poppins = Poppins({ 
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-display'
});
const firaCode = Fira_Code({ 
  subsets: ['latin'],
  variable: '--font-code'
});

export const metadata: Metadata = {
  title: 'Nexpo Public Event Site',
  description: 'Nexpo Event Platform',
  icons: {
    icon: '/nexpo-symbol.png',
    apple: '/nexpo-symbol.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className={`${inter.variable} ${poppins.variable} ${firaCode.variable}`}>
        {children}
      </body>
    </html>
  );
} 