import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import ThemeProvider from '@/components/layout/ThemeProvider'
import './globals.css'

const geist = localFont({
  src: [
    { path: './fonts/GeistVF.woff', weight: '100 900', style: 'normal' },
  ],
  variable: '--font-geist',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Cocoon Ops',
  description: 'Sistema de Registo de Horas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang='pt' suppressHydrationWarning>
        <body className={geist.variable}>
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}