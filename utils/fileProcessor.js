import { extractTextFromPDF } from './pdfProcessor';
import { transcribeAudio } from './audioProcessor';

// Supported file types
const SUPPORTED_TYPES = {
  PDF: ['pdf'],
  AUDIO: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']
};

/**
 * Process uploaded file based on its type
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} fileName - Original file name
 * @returns {Promise<{text: string, metadata: Object}>}
 */
export async function processFile(fileBuffer, fileName) {
  try {
    const ext = fileName.split('.').pop().toLowerCase();

    // Determine file type and process accordingly
    if (SUPPORTED_TYPES.PDF.includes(ext)) {
      return await extractTextFromPDF(fileBuffer);
    } 
    else if (SUPPORTED_TYPES.AUDIO.includes(ext)) {
      return await transcribeAudio(fileBuffer, fileName);
    } 
    else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  } catch (error) {
    console.error('Error processing file:', error);
    throw new Error(`File processing failed: ${error.message}`);
  }
}

/**
 * Validate file before processing
 * @param {string} fileName - File name to validate
 * @param {number} fileSize - File size in bytes
 * @returns {boolean}
 */
export function validateFile(fileName, fileSize) {
  const ext = fileName.split('.').pop().toLowerCase();
  const isSupported = [...SUPPORTED_TYPES.PDF, ...SUPPORTED_TYPES.AUDIO].includes(ext);
  
  if (!isSupported) {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  // Check file size (25MB limit for audio, larger for PDFs)
  const maxSize = SUPPORTED_TYPES.AUDIO.includes(ext) ? 25 * 1024 * 1024 : 100 * 1024 * 1024;
  if (fileSize > maxSize) {
    throw new Error(`File size exceeds limit of ${maxSize / (1024 * 1024)}MB`);
  }

  return true;
}
