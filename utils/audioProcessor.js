import OpenAI from 'openai';

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SUPPORTED_FORMATS = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * Transcribe audio using OpenAI's Whisper API
 * @param {Buffer} fileBuffer - The audio file buffer
 * @param {string} fileName - Original file name
 * @returns {Promise<{text: string, info: Object}>}
 */
export async function transcribeAudio(fileBuffer, fileName) {
  try {
    // Get file extension and validate format
    const ext = fileName.split('.').pop().toLowerCase();
    
    if (!SUPPORTED_FORMATS.includes(ext)) {
      throw new Error(`Unsupported audio format: ${ext}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
    }

    // Check file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error('Audio file size exceeds 25MB limit');
    }

    // Create a Blob from the buffer
    const blob = new Blob([fileBuffer], { type: `audio/${ext}` });
    const file = new File([blob], fileName, { type: `audio/${ext}` });

    // Send to OpenAI for transcription
    const response = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      response_format: "text",
      language: "en"
    });

    return {
      text: response,
      info: {
        model: "whisper-1",
        type: "audio_transcription",
        format: ext
      }
    };

  } catch (error) {
    console.error('Error transcribing audio:', error);
    
    if (error.error?.message) {
      throw new Error(`Transcription failed: ${error.error.message}`);
    } else if (error.message) {
      throw new Error(error.message);
    }
    
    throw new Error('Failed to transcribe audio file');
  }
}
