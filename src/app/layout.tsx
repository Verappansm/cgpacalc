import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VIT GPA — Grade & GPA Calculator',
  description: 'Instant GPA, CGPA, and grade prediction for VIT Chennai students. Built on VIT\'s 10-point grading scale and relative grading formula.',
  keywords: ['VIT Chennai', 'GPA calculator', 'CGPA calculator', 'grade predictor', 'relative grading'],
}

// Runs before React hydrates — reads localStorage and sets the correct class to avoid flash.
const themeScript = `
try {
  var t = localStorage.getItem('vitgpa-theme');
  var prefer = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', (t || prefer) === 'dark');
} catch(e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
