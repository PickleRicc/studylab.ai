import formidable from 'formidable';
import { flashcardStorage } from '@/utils/azureStorage';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      multiples: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          reject(err);
          return;
        }
        resolve([fields, files]);
      });
    });

    // Log the received data for debugging
    console.log('Received fields:', fields);
    console.log('Received files:', files);

    // Get the first file if it's an array
    const fileObj = Array.isArray(files.file) ? files.file[0] : files.file;
    const userId = fields.userId;
    const side = fields.side;

    if (!fileObj || !userId || !side) {
      const missing = { 
        file: !fileObj, 
        userId: !userId, 
        side: !side 
      };
      console.error('Missing required fields:', missing);
      return res.status(400).json({ 
        error: 'Missing required fields',
        missing 
      });
    }

    // Upload to Azure and get the blob path
    const blobPath = await flashcardStorage.uploadImage(fileObj, userId, side);

    // Clean up temp file
    await fs.promises.unlink(fileObj.filepath);

    // Return the path that can be used with our proxy API
    const imageUrl = `/api/flashcard-image/${blobPath}`;
    return res.status(200).json({ url: imageUrl });
  } catch (error) {
    console.error('General error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
