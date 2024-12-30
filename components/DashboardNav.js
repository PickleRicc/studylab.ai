'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../utils/supabase'
import { 
  HomeIcon, 
  DocumentIcon, 
  BookOpenIcon,
  AcademicCapIcon,
  UserCircleIcon 
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Files', href: '/files', icon: DocumentIcon },
  { name: 'Flashcards', href: '/flashcards', icon: BookOpenIcon },
  { name: 'Tests', href: '/tests', icon: AcademicCapIcon },
  { name: 'Profile', href: '/profile', icon: UserCircleIcon },
]

export default function DashboardNav() {
  const router = useRouter()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    getUserName()
  }, [])

  const getUserName = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      // Get user profile from database
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()

      setUserName(profile?.full_name || session.user.email)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <nav className="space-y-1">
      {/* Welcome Message */}
      <div className="px-3 py-4 bg-blue-50 rounded-lg mb-4">
        <p className="text-sm font-medium text-blue-700">
          Welcome to the Lab,
        </p>
        <p className="text-lg font-semibold text-blue-900">
          {userName || 'Loading...'}
        </p>
      </div>

      {/* Navigation Links */}
      {navigation.map((item) => {
        const isActive = router.pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              isActive 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <item.icon
              className={`flex-shrink-0 w-6 h-6 mr-3 text-gray-400`}
            />
            <span className="truncate">{item.name}</span>
          </Link>
        )
      })}

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full mt-4 group flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50"
      >
        <svg className="flex-shrink-0 w-6 h-6 mr-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Logout
      </button>
    </nav>
  )
}
