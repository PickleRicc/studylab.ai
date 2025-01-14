import { processFile } from '../../utils/fileProcessor';
import { AzureStorageService } from '../../utils/azureStorage';

export const config = {
  api: {
    bodyParser: true,  // We can enable bodyParser since we're only receiving JSON now
    maxDurationInSeconds: 300,  // 5 minutes timeout
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== Starting File Processing ===');
    
    const { blobName, fileName } = req.body;
    if (!blobName || !fileName) {
      throw new Error('Blob name or filename not provided');
    }
    console.log('Processing file:', fileName);

    // Initialize Azure Storage and get the file
    const azureStorage = new AzureStorageService();
    const buffer = await azureStorage.downloadBlob(blobName);
    console.log('File size:', (buffer.length / 1024).toFixed(2), 'KB');

    // Process the file
    console.log('Starting file processing...');
    const result = await processFile(buffer, fileName);
    
    console.log('=== Processing Complete ===');
    console.log('File type:', result.info.type);
    if (result.numPages) {
      console.log('Number of pages:', result.numPages);
    }
    if (result.info.format) {
      console.log('Audio format:', result.info.format);
    }
    console.log('Processing successful for:', fileName);

    // Return the processed content
    res.status(200).json(result);
  } catch (error) {
    console.error('=== Processing Error ===');
    console.error('Error details:', error);
    res.status(500).json({ error: error.message });
  }
}
