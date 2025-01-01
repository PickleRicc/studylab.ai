import OpenAI from 'openai';

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

// Cache for storing processed audio results
const audioCache = new Map();

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
    // Check cache first
    const cacheKey = Buffer.from(fileBuffer).toString('base64');
    if (audioCache.has(cacheKey)) {
      console.log('Using cached transcription for:', fileName);
      return audioCache.get(cacheKey);
    }

    console.log('Starting audio transcription for:', fileName);

    // Get file extension and validate format
    const ext = fileName.split('.').pop().toLowerCase();

    if (!SUPPORTED_FORMATS.includes(ext)) {
      throw new Error(`Unsupported audio format: ${ext}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
    }

    // Check file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error('Audio file size exceeds 25MB limit');
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create a Blob from the buffer
    const blob = new Blob([fileBuffer], { type: `audio/${ext}` });
    const file = new File([blob], fileName, { type: `audio/${ext}` });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "json",
      temperature: 0.2,
      prompt: "This is an academic or scientific text. Please transcribe accurately."
    });

    const result = {
      text: transcription.text,
      info: {
        type: 'audio_transcription',
        format: ext,
        processor: 'whisper-api'
      }
    };

    // Cache the result
    audioCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Error in audio transcription:', error);

    if (error.error?.message) {
      throw new Error(`Transcription failed: ${error.error.message}`);
    } else if (error.message) {
      throw new Error(error.message);
    }

    throw new Error('Failed to transcribe audio file');
  }
}
