import pdf from 'pdf-parse';

/**
 * Extract text from a PDF file
 * @param {Buffer} fileBuffer - The PDF file buffer
 * @returns {Promise<{text: string, numPages: number, info: Object}>}
 */
export async function extractTextFromPDF(fileBuffer) {
  try {
    const data = await pdf(fileBuffer);
    
    return {
      text: data.text,
      numPages: data.numpages,
      info: {
        ...data.info,
        type: 'pdf_extraction',
        processor: 'pdf-parse'
      }
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Validate PDF file before processing
 * @param {Buffer} buffer - The file buffer to validate
 * @returns {Promise<boolean>}
 */
export async function validatePDF(buffer) {
  try {
    // Check file signature (PDF magic number)
    const signature = buffer.toString('ascii', 0, 5);
    if (signature !== '%PDF-') {
      throw new Error('Invalid PDF file signature');
    }

    // Try to parse the PDF to verify it's not corrupted
    await pdf(buffer);
    return true;
  } catch (error) {
    throw new Error(`Invalid PDF file: ${error.message}`);
  }
}
