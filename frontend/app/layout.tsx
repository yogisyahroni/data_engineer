import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { UserProvider } from '@/contexts/user-context'
import { DatabaseProvider } from '@/contexts/database-context'
import { StoryProvider } from '@/contexts/story-context'
import { SidebarProvider } from '@/contexts/sidebar-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'InsightEngine AI - Business Intelligence Platform',
  description: 'Hybrid Business Intelligence platform combining SQL precision with AI intuition for data analysis',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

import { ThemeProvider } from "@/components/theme-provider"

import { MainBreadcrumbs } from "@/components/main-breadcrumbs"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased bg-background text-foreground transition-colors duration-300`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoryProvider>
            <DatabaseProvider>
              <UserProvider>
                <WorkspaceProvider>
                  <SidebarProvider>
                    <MainBreadcrumbs />
                    {children}
                  </SidebarProvider>
                </WorkspaceProvider>
              </UserProvider>
            </DatabaseProvider>
          </StoryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
