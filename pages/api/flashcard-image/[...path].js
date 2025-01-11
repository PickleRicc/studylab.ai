import { flashcardStorage } from '@/utils/azureStorage';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the blob path from the URL
    const { path } = req.query;
    const blobPath = Array.isArray(path) ? path.join('/') : path;
    
    // Get the blob
    const downloadResponse = await flashcardStorage.getImage(blobPath);
    
    // Set headers
    res.setHeader('Content-Type', downloadResponse.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Stream the blob data
    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(404).json({ error: 'Image not found' });
  }
}
