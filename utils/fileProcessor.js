import { extractTextFromPDF } from './pdfProcessor';
import { transcribeAudio } from './audioProcessor';
import { splitTextIntoChunks } from './textChunker';

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
    console.log('\n=== Starting File Processing ===');
    console.log(`Processing file: ${fileName}`);
    console.log(`File size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);

    const ext = fileName.split('.').pop().toLowerCase();
    let result;

    // Determine file type and process accordingly
    if (SUPPORTED_TYPES.PDF.includes(ext)) {
      console.log('Processing PDF file...');
      result = await extractTextFromPDF(fileBuffer);
      console.log(`Extracted ${result.text.length} characters of text from PDF`);
    } 
    else if (SUPPORTED_TYPES.AUDIO.includes(ext)) {
      console.log('Processing Audio file...');
      result = await transcribeAudio(fileBuffer, fileName);
      console.log(`Transcribed ${result.text.length} characters of text from audio`);
    } 
    else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    console.log('\nInitiating text chunking...');
    // Split the processed text into chunks
    const chunks = await splitTextIntoChunks(result.text, {
      fileName,
      fileType: ext,
      ...result.info
    });

    const finalResult = {
      ...result,
      chunks,
      info: {
        ...result.info,
        numChunks: chunks.length
      }
    };

    console.log('\nProcessing Summary:');
    console.log(`- File type: ${ext.toUpperCase()}`);
    console.log(`- Original text length: ${result.text.length} characters`);
    console.log(`- Number of chunks: ${chunks.length}`);
    console.log(`- Additional info:`, finalResult.info);
    console.log('=== File Processing Complete ===\n');

    return finalResult;
  } catch (error) {
    console.error('\n=== Processing Error ===');
    console.error(`Error processing ${fileName}:`, error);
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
