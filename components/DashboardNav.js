import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import Link from 'next/link'

export default function DashboardNav() {
    const [userName, setUserName] = useState('')

    useEffect(() => {
        getUserName()
    }, [])

    async function getUserName() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No user')

            let { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profileError || !profile) {
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert([{ id: user.id, email: user.email }])
                    .select()
                    .single()

                if (createError) throw createError
                profile = newProfile
            }

            setUserName(profile.email)
        } catch (error) {
            console.error('Error getting user name:', error)
        }
    }

    return (
        <nav className="bg-gray-800">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center">
                            <span className="text-white text-xl font-bold">StudyLab</span>
                        </Link>
                        <div className="hidden md:block ml-10">
                            <div className="flex items-baseline space-x-4">
                                <Link
                                    href="/dashboard"
                                    className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="/tests"
                                    className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Tests
                                </Link>
                                <Link
                                    href="/files"
                                    className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Files
                                </Link>
                                <Link
                                    href="/flashcards"
                                    className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Flashcards
                                </Link>
                                <Link
                                    href="/profile"
                                    className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Profile
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-gray-300 text-sm">{userName}</span>
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
            {/* Mobile menu */}
            <div className="md:hidden border-t border-gray-700">
                <div className="px-2 py-3 space-y-1">
                    <Link
                        href="/dashboard"
                        className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/tests"
                        className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    >
                        Tests
                    </Link>
                    <Link
                        href="/files"
                        className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    >
                        Files
                    </Link>
                    <Link
                        href="/flashcards"
                        className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    >
                        Flashcards
                    </Link>
                    <Link
                        href="/profile"
                        className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                    >
                        Profile
                    </Link>
                </div>
            </div>
        </nav>
    )
}
