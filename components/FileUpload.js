'use client'

import { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { DocumentTextIcon, MusicalNoteIcon, FolderIcon } from '@heroicons/react/24/outline'
import { supabase } from '../utils/supabase'
import TestConfigModal from './TestConfigModal'
import FlashcardConfigModal from './FlashcardConfigModal'

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
    const [isTestConfigModalOpen, setIsTestConfigModalOpen] = useState(false)
    const [isFlashcardConfigModalOpen, setIsFlashcardConfigModalOpen] = useState(false)
    const [previousFiles, setPreviousFiles] = useState([])
    const [selectedFiles, setSelectedFiles] = useState([])
    const [showPreviousFiles, setShowPreviousFiles] = useState(false)
    const [loadingStoredFile, setLoadingStoredFile] = useState(false)
    const VERCEL_LIMIT = 4.5 * 1024 * 1024;

    useEffect(() => {
        loadPreviousFiles()
    }, [])

    const loadPreviousFiles = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const { data: files, error } = await supabase
                .from('files')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setPreviousFiles(files || [])
        } catch (error) {
            console.error('Error loading previous files:', error)
            setError('Failed to load previous files')
        }
    }

    const handleStoredFileSelect = async (file) => {
        // If already selected, deselect
        if (selectedFiles.includes(file.id)) {
            setSelectedFiles(prev => prev.filter(id => id !== file.id));
            setProcessedFiles(prev => prev.filter(f => f.id !== file.id));
            return;
        }

        // Immediately update UI for selection
        setSelectedFiles(prev => [...prev, file.id]);
        
        try {
            setLoadingStoredFile(true);
            setError(null);

            // Get the current session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Not authenticated');
            }

            const response = await fetch('/api/fetch-stored-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ fileId: file.id })
            });

            if (!response.ok) {
                const errorData = await response.json();
                // Remove selection if file content couldn't be fetched
                setSelectedFiles(prev => prev.filter(id => id !== file.id));
                throw new Error(errorData.error || 'Failed to fetch file content');
            }

            const data = await response.json();
            
            // Create a file-like object to match the upload pattern
            const fileObject = {
                name: data.file.name,
                type: data.file.type,
                size: data.file.size
            };
            
            // Process using the same pattern as new uploads
            const processResponse = await processFile(fileObject, data.file);
            
            // Add to processed files
            setProcessedFiles(prev => [...prev, {
                ...processResponse,
                isStored: true
            }]);

        } catch (error) {
            console.error('Error fetching stored file:', error);
            setError(error.message || 'Failed to load file content');
        } finally {
            setLoadingStoredFile(false);
        }
    };

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
                
                // Calculate overall progress
                const baseProgress = (i / totalFiles) * 100
                setUploadProgress(baseProgress)

                console.log(`Processing file ${i + 1} of ${totalFiles}: ${file.name}`)

                let response;
                if (file.size > 4.5 * 1024 * 1024) {
                    console.log('Handling large file upload:', file.name);
                    // For large files, get upload URL
                    response = await fetch('/api/upload', {
                        method: 'POST',
                        headers: {
                            'x-file-name': file.name,
                            'content-type': file.type,
                            'x-user-id': session.user.id,
                            'x-file-size': file.size.toString(),
                            'x-large-file': 'true'
                        }
                    });
                    
                    const data = await response.json();
                    console.log('Got upload URL:', data.uploadUrl);
                    
                    // Upload directly to Azure using the SAS URL
                    const azureResponse = await fetch(data.uploadUrl, {
                        method: 'PUT',
                        headers: {
                            'x-ms-blob-type': 'BlockBlob',
                            'Content-Type': file.type
                        },
                        body: file
                    });

                    if (!azureResponse.ok) {
                        const errorText = await azureResponse.text();
                        console.error('Azure upload failed:', {
                            status: azureResponse.status,
                            statusText: azureResponse.statusText,
                            error: errorText
                        });
                        throw new Error(`Failed to upload to Azure: ${azureResponse.status} ${azureResponse.statusText}`);
                    }

                    console.log('Azure upload successful');
                    // Wait a moment for Azure to process the upload
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    results.push(data.file);
                } else {
                    // Standard upload for small files
                    response = await fetch('/api/upload', {
                        method: 'POST',
                        headers: {
                            'x-file-name': file.name,
                            'content-type': file.type,
                            'x-user-id': session.user.id
                        },
                        body: file
                    });

                    const data = await response.json();
                    results.push(data.file);
                }

                // Process the file
                const processResponse = await processFile(file, results[i])

                // Add to processed files array
                processedContents.push({
                    ...processResponse,
                    fileName: file.name
                });

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

    const processFile = async (file, uploadResult) => {
        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    blobName: uploadResult.blob_name,
                    fileName: file.name
                })
            });

            if (!response.ok) {
                throw new Error('Processing failed');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Processing error:', error);
            throw error;
        }
    };

    const handleGenerateTest = async (config) => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            const response = await fetch('/api/generate-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    files: processedFiles,
                    config
                })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error)

            onSuccess(result)
            setIsTestConfigModalOpen(false)
            return result
        } catch (error) {
            console.error('Error generating test:', error)
            throw error
        }
    }

    const handleGenerateFlashcards = async (config) => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            const response = await fetch('/api/generate-flashcards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    files: processedFiles,
                    config
                })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error)

            onSuccess(result)
            setIsFlashcardConfigModalOpen(false)
            return result
        } catch (error) {
            console.error('Error generating flashcards:', error)
            throw error
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
        <div className="space-y-4">
            {error && (
                <div className="p-4 text-red-700 bg-red-100 rounded-md">
                    {error}
                </div>
            )}

            <div className="flex space-x-4 mb-4">
                <button
                    onClick={() => setShowPreviousFiles(false)}
                    className={`px-4 py-2 rounded-lg transition-all ${!showPreviousFiles 
                        ? 'bg-[#4361ee] text-white' 
                        : 'bg-[#240046] text-white hover:bg-[#3c096c]'}`}
                >
                    Upload New
                </button>
                <button
                    onClick={() => setShowPreviousFiles(true)}
                    className={`px-4 py-2 rounded-lg transition-all ${showPreviousFiles 
                        ? 'bg-[#4361ee] text-white' 
                        : 'bg-[#240046] text-white hover:bg-[#3c096c]'}`}
                >
                    Previous Files
                </button>
            </div>

            {showPreviousFiles ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {previousFiles.map((file) => (
                        <div
                            key={file.id}
                            className={`p-4 rounded-lg border transition-all ${
                                selectedFiles.includes(file.id)
                                    ? 'bg-[#3c096c] border-[#4cc9f0]'
                                    : 'bg-[#240046] border-[#3c096c] hover:border-[#4cc9f0]'
                            }`}
                            onClick={() => {
                                if (!loadingStoredFile) {
                                    handleStoredFileSelect(file);
                                }
                            }}
                        >
                            <div className="flex items-center space-x-3">
                                {file.file_type === 'pdf' ? (
                                    <DocumentTextIcon className="h-6 w-6 text-[#4cc9f0]" />
                                ) : (
                                    <MusicalNoteIcon className="h-6 w-6 text-[#4cc9f0]" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {file.file_name}
                                    </p>
                                    <p className="text-sm text-white/60">
                                        {(file.file_size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                {selectedFiles.includes(file.id) && (
                                    <div className="flex-shrink-0">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#4cc9f0] text-[#240046]">
                                            Selected
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex justify-center px-6 pt-5 pb-6">
                    <div
                        {...getRootProps()}
                        className={`p-8 rounded-lg text-center transition-all bg-[#240046] border-2 ${
                            isDragActive ? 'border-[#4cc9f0]' : 'border-[#3c096c]'
                        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <input {...getInputProps()} />
                        <div className="flex justify-center mb-4">
                            <DocumentTextIcon className="h-12 w-12 text-[#4cc9f0]" />
                            <MusicalNoteIcon className="h-12 w-12 text-[#4cc9f0] ml-2" />
                        </div>
                        {isDragActive ? (
                            <p className="text-[#4cc9f0] text-lg font-medium">Drop your files here...</p>
                        ) : (
                            <div>
                                <p className="text-white text-lg mb-2">
                                    Drag and drop your files here
                                </p>
                                <button
                                    type="button"
                                    onClick={open}
                                    disabled={uploading}
                                    className="px-6 py-2 bg-[#4361ee] text-white rounded-lg hover:bg-[#3a0ca3] transition-all"
                                >
                                    Select Files
                                </button>
                                <p className="text-sm text-white/60 mt-2">
                                    Supported formats: PDF, MP3, WAV, M4A
                                </p>
                            </div>
                        )}
                        {uploadProgress > 0 && (
                            <div className="mt-4">
                                <div className="w-full bg-[#3a0ca3] rounded-full h-2">
                                    <div
                                        className="bg-[#4cc9f0] h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm text-white mt-2">
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
                                <p className="text-[#4cc9f0]">
                                    {currentFile ? `Processing ${currentFile}...` : 'Processing files...'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {processedFiles.length > 0 && !uploading && (
                <div className="mt-4 space-y-2">
                    <button
                        onClick={() => setIsTestConfigModalOpen(true)}
                        className="w-full px-6 py-2 bg-[#4361ee] text-white rounded-lg hover:bg-[#3a0ca3] transition-all"
                    >
                        Generate Test
                    </button>
                    <button
                        onClick={() => setIsFlashcardConfigModalOpen(true)}
                        className="w-full px-6 py-2 bg-[#560bad] text-white rounded-lg hover:bg-[#3a0ca3] transition-all"
                    >
                        Generate Flashcards
                    </button>
                </div>
            )}

            <TestConfigModal
                isOpen={isTestConfigModalOpen}
                onClose={() => setIsTestConfigModalOpen(false)}
                onGenerate={handleGenerateTest}
                selectedFiles={processedFiles}
            />
            <FlashcardConfigModal
                isOpen={isFlashcardConfigModalOpen}
                onClose={() => setIsFlashcardConfigModalOpen(false)}
                onGenerate={handleGenerateFlashcards}
                selectedFiles={processedFiles}
            />
        </div>
    )
}
