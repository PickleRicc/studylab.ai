import { createServerClient } from '@supabase/ssr';
import { processFile } from '../../utils/fileProcessor';
import { AzureStorageService } from '../../utils/azureStorage';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get file ID from request body
        const { fileId } = req.body;
        if (!fileId) {
            return res.status(400).json({ error: 'File ID is required' });
        }

        // Get auth token from header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        // Create Supabase client
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    get: (name) => {
                        const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
                            const [key, value] = cookie.split('=').map(c => c.trim());
                            acc[key] = value;
                            return acc;
                        }, {});
                        return cookies?.[name];
                    },
                },
            }
        );

        // Verify user authentication
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error('Authentication error:', authError);
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Fetch file metadata from Supabase
        const { data: file, error: fileError } = await supabase
            .from('files')
            .select('*')
            .eq('id', fileId)
            .eq('user_id', user.id)
            .single();

        if (fileError || !file) {
            console.error('File fetch error:', fileError);
            return res.status(404).json({ error: 'File not found' });
        }

        // Initialize Azure Storage service
        const azureStorage = new AzureStorageService();
        
        try {
            // Download the blob directly using Azure SDK
            console.log('Downloading blob:', file.blob_name);
            const containerName = 'studylab-files';
            const buffer = await azureStorage.downloadBlob(containerName, file.blob_name);

            console.log('Successfully downloaded file, size:', buffer.length);

            // Process the file
            const processedContent = await processFile(buffer, file.file_name);

            // Return processed content
            return res.status(200).json({
                file: {
                    id: file.id,
                    name: file.file_name,
                    type: file.file_type,
                    size: file.file_size,
                    content: processedContent.text,
                    chunks: processedContent.chunks,
                    info: processedContent.info
                }
            });

        } catch (error) {
            console.error('Error processing file:', error);
            return res.status(500).json({ 
                error: 'Error processing file',
                message: error.message
            });
        }

    } catch (error) {
        console.error('Error in request handler:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message
        });
    }
}
