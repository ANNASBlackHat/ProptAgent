import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastContainer } from '@/components/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PropAgent — AI Tenant Screening & Property Management SaaS',
  description: 'AI-powered tenant screening conversational interviews, scoring, applications, lease tracking, and maintenance management.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-50 text-neutral-900 antialiased min-h-screen`}>
        <AuthProvider>
          <ErrorBoundary>
            {children}
            <ToastContainer />
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
