import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import DashboardNav from '../components/DashboardNav'
import FileUpload from '../components/FileUpload'
import { DocumentIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function Dashboard() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFiles(data || [])
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadSuccess = (uploadedFiles) => {
    setFiles(prevFiles => [...uploadedFiles, ...prevFiles])
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <DashboardNav />
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Files</h2>
              <FileUpload onSuccess={handleUploadSuccess} />
            </div>

            {/* Recent Files */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Files</h2>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-gray-500 text-center py-4">Loading...</p>
                ) : files.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No files uploaded yet. Start by uploading a PDF or audio file.
                  </p>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <DocumentIcon className="h-6 w-6 text-gray-400 mr-4" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.file_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {file.file_type} • {formatFileSize(file.file_size)}
                        </p>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {formatDate(file.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Progress Tracker */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Your Progress</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Files Uploaded</p>
                  <p className="text-2xl font-bold text-blue-700">{files.length}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Flashcards Created</p>
                  <p className="text-2xl font-bold text-green-700">0</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Tests Taken</p>
                  <p className="text-2xl font-bold text-purple-700">0</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
