import formidable from 'formidable';
import { flashcardStorage } from '@/utils/azureStorage';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const config = {
  api: {
    bodyParser: false,
  },
};

const parseForm = async (req) => {
  return new Promise((resolve, reject) => {
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(os.tmpdir(), 'studylab-uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        reject(err);
        return;
      }

      // Convert arrays to single values
      const parsedFields = Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [
          key,
          Array.isArray(value) ? value[0] : value,
        ])
      );

      // Handle file arrays
      const parsedFiles = Object.fromEntries(
        Object.entries(files).map(([key, value]) => [
          key,
          Array.isArray(value) ? value[0] : value,
        ])
      );

      console.log('Parsed form data:', {
        fields: parsedFields,
        fileInfo: parsedFiles.file ? {
          filepath: parsedFiles.file.filepath,
          originalFilename: parsedFiles.file.originalFilename,
          mimetype: parsedFiles.file.mimetype,
          size: parsedFiles.file.size
        } : null
      });

      resolve({ fields: parsedFields, files: parsedFiles });
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fields, files } = await parseForm(req);
    const file = files.file;
    const userId = fields.userId;
    const side = fields.side;

    if (!file || !userId || !side) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { 
          file: file ? {
            hasFilepath: !!file.filepath,
            originalFilename: file.originalFilename,
            mimetype: file.mimetype
          } : null,
          userId, 
          side 
        }
      });
    }

    // Upload the image and get the URL
    const url = await flashcardStorage.uploadImage(file, userId, side);
    console.log('Image uploaded successfully:', { url });

    // Clean up the temporary file
    try {
      await fs.promises.unlink(file.filepath);
    } catch (err) {
      console.error('Error deleting temp file:', err);
    }

    res.status(200).json({ url });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      error: 'Error uploading file',
      message: error.message,
      stack: error.stack
    });
  }
}
