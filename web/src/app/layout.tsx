import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeContext';

export const metadata: Metadata = {
  title: 'Bridge_COBOL | Core Banking Modernization Console',
  description: 'Zero-overhead binary bridge connecting GnuCOBOL VSAM KSDS indexed core to Solana Devnet settlement',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#E5E7EB] transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
