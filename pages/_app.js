import '../styles/globals.css'
import { Inter } from 'next/font/google'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { useState } from 'react'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

function MyApp({ Component, pageProps }) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient())

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      <div className={inter.className}>
        <Component {...pageProps} />
      </div>
    </SessionContextProvider>
  )
}

export default MyApp
