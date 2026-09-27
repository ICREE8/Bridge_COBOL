import './globals.css';
import type { Metadata } from 'next';

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
    <html lang="en" className="dark">
      <body className="bg-[#0B0F17] text-[#E5E7EB] min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
