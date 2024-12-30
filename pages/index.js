'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import FileUpload from '../components/FileUpload'
import DashboardNav from '../components/DashboardNav'
import { DocumentTextIcon, MusicalNoteIcon } from '@heroicons/react/24/outline'

export default function Dashboard() {
    const [recentFiles, setRecentFiles] = useState([])
    const [showAllFiles, setShowAllFiles] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchRecentFiles()
    }, [])

    const fetchRecentFiles = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const { data: files, error } = await supabase
                .from('files')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })

            if (error) throw error

            setRecentFiles(files || [])
            setLoading(false)
        } catch (error) {
            console.error('Error fetching files:', error)
            setLoading(false)
        }
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const getFileIcon = (fileType) => {
        if (!fileType) return <DocumentTextIcon className="h-6 w-6 text-gray-500" />
        
        const type = fileType.toLowerCase()
        if (type.includes('pdf')) {
            return <DocumentTextIcon className="h-6 w-6 text-red-500" />
        } else if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) {
            return <MusicalNoteIcon className="h-6 w-6 text-blue-500" />
        }
        return <DocumentTextIcon className="h-6 w-6 text-gray-500" />
    }

    const displayedFiles = showAllFiles ? recentFiles : recentFiles.slice(0, 5)

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:grid lg:grid-cols-12 lg:gap-8">
                        {/* Sidebar */}
                        <div className="lg:col-span-3">
                            <DashboardNav />
                        </div>

                        {/* Main content */}
                        <main className="lg:col-span-9">
                            <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
                                {/* Upload Section */}
                                <div className="p-6">
                                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                                        Upload Files
                                    </h2>
                                    <FileUpload onSuccess={fetchRecentFiles} />
                                </div>

                                {/* Recent Files Section */}
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-medium text-gray-900">
                                            Recent Files
                                        </h2>
                                        {recentFiles.length > 5 && (
                                            <button
                                                onClick={() => setShowAllFiles(!showAllFiles)}
                                                className="text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                {showAllFiles ? 'Show Less' : 'Show All'}
                                            </button>
                                        )}
                                    </div>

                                    {loading ? (
                                        <p className="text-gray-500">Loading files...</p>
                                    ) : displayedFiles.length > 0 ? (
                                        <ul className="divide-y divide-gray-200">
                                            {displayedFiles.map((file) => (
                                                <li key={file.id} className="py-4">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="flex-shrink-0">
                                                            {getFileIcon(file.file_type || file.type)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                {file.file_name || file.name}
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                Uploaded on {formatDate(file.created_at)}
                                                            </p>
                                                        </div>
                                                        <div className="flex-shrink-0 text-sm text-gray-500">
                                                            {((file.file_size || file.size) / 1024 / 1024).toFixed(2)} MB
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-500">No files uploaded yet.</p>
                                    )}
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    )
}
