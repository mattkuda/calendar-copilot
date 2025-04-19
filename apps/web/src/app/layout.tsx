import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { ClerkProvider } from '@clerk/nextjs'
import { ToastProvider } from '@/components/ui/toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Calendar Copilot',
    description: 'AI-powered calendar assistant using Claude for Desktop and MCP',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ClerkProvider
            appearance={{
                layout: {
                    socialButtonsVariant: "iconButton"
                },
                elements: {
                    formButtonPrimary:
                        "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md",
                    card: "bg-card shadow-sm border rounded-lg",
                    socialButtonsIconButton: "border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md"
                }
            }}
        >
            <html lang="en" suppressHydrationWarning>
                <body className={inter.className}>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        <ToastProvider>
                            {children}
                        </ToastProvider>
                    </ThemeProvider>
                </body>
            </html>
        </ClerkProvider>
    )
} 