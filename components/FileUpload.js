'use client'

import { useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { DocumentTextIcon, MusicalNoteIcon } from '@heroicons/react/24/outline'
import { supabase } from '../utils/supabase'

/**
 * A reusable file upload component that supports:
 * - Multiple file uploads
 * - Drag and drop functionality
 * - Progress tracking
 * - File type validation
 * - Error handling
 */
export default function FileUpload({ onSuccess }) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(null)
    const [uploadProgress, setUploadProgress] = useState(0)

    const uploadFiles = async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return

        setUploading(true)
        setError(null)
        setUploadProgress(0)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            const results = []
            const totalFiles = acceptedFiles.length

            for (let i = 0; i < acceptedFiles.length; i++) {
                const file = acceptedFiles[i]
                setUploadProgress(Math.round((i / totalFiles) * 100))

                // Upload file
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'x-file-name': file.name,
                        'content-type': file.type,
                        'x-user-id': session.user.id
                    },
                    body: file
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.message)
                }

                const data = await response.json()
                results.push(data.file)
            }

            setUploadProgress(100)
            if (onSuccess) {
                onSuccess(results)
            }
        } catch (err) {
            console.error('Upload error:', err)
            setError(err.message)
        } finally {
            setUploading(false)
        }
    }

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop: uploadFiles,
        accept: {
            'application/pdf': ['.pdf'],
            'audio/*': ['.mp3', '.wav', '.m4a']
        },
        multiple: true,
        noClick: true // Disable click handling on the root element
    })

    return (
        <div className="w-full max-w-xl mx-auto">
            <div
                {...getRootProps()}
                className={`p-8 border-2 border-dashed rounded-lg text-center transition-colors
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                    ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <input {...getInputProps()} />
                <div className="flex justify-center mb-4">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400" />
                    <MusicalNoteIcon className="h-12 w-12 text-gray-400 ml-2" />
                </div>
                {isDragActive ? (
                    <p className="text-blue-500">Drop your files here...</p>
                ) : (
                    <div>
                        <p className="text-gray-600 mb-2">
                            Drag and drop your files here
                        </p>
                        <button
                            type="button"
                            onClick={open}
                            disabled={uploading}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Select Files
                        </button>
                        <p className="text-sm text-gray-500 mt-2">
                            Supported formats: PDF, MP3, WAV, M4A
                        </p>
                    </div>
                )}
                {uploadProgress > 0 && (
                    <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                            {uploadProgress}% uploaded
                        </p>
                    </div>
                )}
                {uploading && (
                    <div className="mt-4">
                        <p className="text-blue-500">Uploading...</p>
                    </div>
                )}
                {error && (
                    <div className="mt-4 text-red-500 text-sm">
                        {error}
                    </div>
                )}
            </div>
        </div>
    )
}
