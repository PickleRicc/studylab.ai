import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import { useRouter } from 'next/router'

export default function Home() {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold text-gray-900">
          Welcome to StudyLab
        </h1>
        <p className="text-xl text-gray-600">
          Your intelligent study companion
        </p>
        <div className="space-x-4">
          {user ? (
            <>
              <p className="mb-4 text-gray-700">Welcome, {user.email}!</p>
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push('/login')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
