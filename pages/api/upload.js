import { createServerClient } from '@supabase/ssr'
import { AzureStorageService } from '../../utils/azureStorage'

export const config = {
  api: {
    bodyParser: false,
  },
}

const VERCEL_LIMIT = 4.5 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const fileName = req.headers['x-file-name']
    const fileType = req.headers['content-type']
    const userId = req.headers['x-user-id']
    const isLargeFile = req.headers['x-large-file'] === 'true'
    const fileSize = parseInt(req.headers['x-file-size'] || '0')

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (name) => {
            const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
              const [key, value] = cookie.split('=').map(c => c.trim())
              acc[key] = value
              return acc
            }, {})
            return cookies?.[name]
          },
          set: (name, value) => {
            res.setHeader('Set-Cookie', `${name}=${value}; Path=/`)
          },
          remove: (name) => {
            res.setHeader('Set-Cookie', `${name}=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`)
          },
          getAll: () => {
            return Object.fromEntries(
              (req.headers.cookie || '').split(';').map(cookie => {
                const [key, value] = cookie.split('=').map(c => c.trim())
                return [key, value]
              })
            )
          },
          setAll: (cookies) => {
            res.setHeader(
              'Set-Cookie',
              Object.entries(cookies).map(
                ([name, value]) => `${name}=${value}; Path=/`
              )
            )
          },
        },
      }
    )

    // Initialize Azure Storage service
    const azureStorage = new AzureStorageService()

    if (isLargeFile) {
      const blobName = `${userId}/${fileName}`
      
      // Generate URL for the blob
      const { sasUrl } = await azureStorage.generateUploadUrl(blobName, {
        contentType: fileType
      })

      // Store file metadata in Supabase first
      const { data, error } = await supabase
        .from('files')
        .insert({
          user_id: userId,
          file_name: fileName,
          file_type: fileType,
          file_size: fileSize,
          blob_name: blobName,
          blob_url: sasUrl
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Return the SAS URL for client-side upload
      return res.status(200).json({
        uploadUrl: sasUrl,
        file: data
      })
    }

    // Standard upload flow for smaller files
    const chunks = []
    req.on('data', (chunk) => {
      chunks.push(chunk)
    })

    await new Promise((resolve, reject) => {
      req.on('end', resolve)
      req.on('error', reject)
    })

    const buffer = Buffer.concat(chunks)

    // Upload file to Azure Blob Storage
    const { url, name, sasUrl } = await azureStorage.uploadFile(
      buffer,
      'studylab-files',
      `${userId}/${fileName}`,
      {
        userId,
        contentType: fileType,
        name: fileName
      }
    )

    // Store file metadata in Supabase
    const { data, error } = await supabase
      .from('files')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_type: fileType,
        file_size: buffer.length,
        blob_url: sasUrl,
        blob_name: name
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    res.status(200).json({
      message: 'File uploaded successfully',
      file: data
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ message: 'Error uploading file', error: error.message })
  }
}
