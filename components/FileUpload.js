'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { DocumentTextIcon, MusicalNoteIcon } from '@heroicons/react/24/outline'
import { supabase } from '../utils/supabase'
import TestConfigModal from './TestConfigModal'

/**
 * File upload component with drag and drop support
 * @param {Object} props
 * @param {Function} props.onSuccess - Callback when files are successfully uploaded
 */
export default function FileUpload({ onSuccess }) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [currentFile, setCurrentFile] = useState(null)
    const [processedFiles, setProcessedFiles] = useState([])
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)

    const uploadFiles = async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return

        setUploading(true)
        setError(null)
        setUploadProgress(0)
        setProcessedFiles([])

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            const results = []
            const totalFiles = acceptedFiles.length
            const processedContents = []

            for (let i = 0; i < acceptedFiles.length; i++) {
                const file = acceptedFiles[i]
                setCurrentFile(file.name)
                
                // Calculate overall progress considering both upload and processing for each file
                const baseProgress = (i / totalFiles) * 100
                setUploadProgress(baseProgress)

                console.log(`Processing file ${i + 1} of ${totalFiles}: ${file.name}`)

                // Upload file (first 50% of progress for current file)
                setUploadProgress(baseProgress + (50 / totalFiles))
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

                // Process the file
                setUploadProgress(baseProgress + (75 / totalFiles))
                const processResponse = await fetch('/api/process', {
                    method: 'POST',
                    headers: {
                        'x-file-name': file.name
                    },
                    body: file
                })

                if (!processResponse.ok) {
                    const error = await processResponse.json()
                    throw new Error(error.message)
                }

                const processedData = await processResponse.json()
                console.log(`File processed successfully: ${file.name}`, {
                    type: processedData.info.type,
                    size: file.size,
                    ...(processedData.numPages && { pages: processedData.numPages }),
                    ...(processedData.info.format && { format: processedData.info.format })
                })

                // Add to processed files array
                processedContents.push({
                    ...processedData,
                    fileName: file.name
                })

                // Update progress for completed file
                setUploadProgress(baseProgress + (100 / totalFiles))
            }

            // Store all processed files
            setProcessedFiles(processedContents)
            setUploadProgress(100)
            if (onSuccess) {
                onSuccess(results)
            }
        } catch (err) {
            console.error('Upload error:', err)
            setError(`Error processing ${currentFile}: ${err.message}`)
        } finally {
            setUploading(false)
            setCurrentFile(null)
        }
    }

    const handleGenerateTest = async (config) => {
        try {
            if (processedFiles.length === 0) {
                throw new Error('No content available to generate test');
            }

            // Get current session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Not authenticated');
            }

            const response = await fetch('/api/generate-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    files: processedFiles.map(file => ({
                        content: file.text,
                        chunks: file.chunks,
                        name: file.fileName
                    })),
                    config
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to generate test');
            }

            const result = await response.json();
            console.log('Test generated successfully:', result);
            setIsConfigModalOpen(false);
            return result;
        } catch (error) {
            console.error('Error generating test:', error);
            throw error;
        }
    }

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop: uploadFiles,
        accept: {
            'application/pdf': ['.pdf'],
            'audio/*': ['.mp3', '.wav', '.m4a']
        },
        multiple: true, // Allow multiple files
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
                            {currentFile ? (
                                `Processing: ${currentFile} (${Math.round(uploadProgress)}%)`
                            ) : (
                                `Overall Progress: ${Math.round(uploadProgress)}%`
                            )}
                        </p>
                    </div>
                )}
                {uploading && (
                    <div className="mt-4">
                        <p className="text-blue-500">
                            {currentFile ? `Processing ${currentFile}...` : 'Processing files...'}
                        </p>
                    </div>
                )}
                {error && (
                    <div className="mt-4 text-red-500 text-sm">
                        {error}
                    </div>
                )}
            </div>
            {processedFiles.length > 0 && !uploading && (
                <div className="mt-4">
                    <button
                        onClick={() => setIsConfigModalOpen(true)}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Generate Test
                    </button>
                </div>
            )}
            <TestConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                onGenerate={handleGenerateTest}
                defaultConfig={{
                    numQuestions: 5,
                    questionTypes: ['multiple_choice'],
                    difficulty: 'medium'
                }}
            />
        </div>
    )
}
