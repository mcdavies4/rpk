import './globals.css'
import { SessionProvider } from './SessionProvider'

export const metadata = { title: 'RightPDFKit — Analytics Dashboard' }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
