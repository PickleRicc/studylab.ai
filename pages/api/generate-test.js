import { generateTest } from '../../utils/testGenerator';
import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure OPENAI_API_KEY is set
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    // Add timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), 50000)
    );

    const generationPromise = (async () => {
      console.log('Received test generation request');
      
      // Get auth token from header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization header' });
      }

      // Get the current user's session
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.split(' ')[1]
      );

      if (authError || !user) {
        console.error('Authentication error:', authError);
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { content, files, config } = req.body;
      
      if (!content && !files) {
        console.error('No content provided');
        return res.status(400).json({ error: 'No content provided' });
      }

      console.log('Raw request body:', {
        hasContent: !!content,
        hasFiles: !!files,
        filesLength: files?.length,
        config
      });

      if (files) {
        console.log('Files array details:');
        files.forEach((file, idx) => {
          console.log(`File ${idx + 1}:`, {
            name: file.name,
            hasContent: !!file.content,
            hasChunks: !!file.chunks,
            numChunks: file.chunks?.length
          });
        });
      }

      console.log('Generating test with config:', config);
      console.log('User:', user.email);
      
      // Format content for test generation
      let formattedContent;
      if (files && Array.isArray(files)) {
        // If we have multiple files
        formattedContent = files.map((file, index) => ({
          content: file.content,
          chunks: file.chunks || [],  // Include chunks if available
          source: file.isStored ? file.name : `File ${index + 1}: ${file.name}`,
          isStored: !!file.isStored,
          fileId: file.id
        }));
        console.log(`Processing ${formattedContent.length} files`);
      } else if (content) {
        // For single content, create chunks if not provided
        const chunks = content.chunks || [];
        formattedContent = [{
          content: content.text || content,
          chunks: chunks,
          source: content.name || 'File 1',
          isStored: !!content.isStored,
          fileId: content.id
        }];
        console.log('Processing single content source');
      } else {
        console.error('Invalid content format');
        return res.status(400).json({ error: 'Invalid content format' });
      }

      // Log content sources for debugging
      formattedContent.forEach((source, index) => {
        console.log(`Source ${index + 1}: ${source.source}`);
        console.log(`Content length: ${source.content?.length} characters`);
        console.log(`Number of chunks: ${source.chunks?.length || 0}`);
        if (source.isStored) {
          console.log(`Using stored file with ID: ${source.fileId}`);
        }
      });
      
      // Generate test questions
      const test = await generateTest(formattedContent, {
        userId: user.id,
        numQuestions: config.numQuestions || 5,
        questionTypes: config.questionTypes || ['multiple_choice'],
        difficulty: config.difficulty || 'medium'
      });

      console.log('Test generated successfully');

      // Store test in database with user_id
      const { data: savedTest, error: saveError } = await supabase
        .from('tests')
        .insert([{
          user_id: user.id,
          title: config.title || `Test #${new Date().toISOString()}`,
          content: JSON.stringify(formattedContent),
          questions: test.questions,
          config: config,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (saveError) {
        console.error('Error saving test:', saveError);
        throw saveError;
      }

      console.log('Test saved successfully');
      return savedTest;
    })();

    const result = await Promise.race([generationPromise, timeoutPromise]);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error generating test:', error);
    // Send a proper JSON response even for errors
    return res.status(error.message === 'Operation timed out' ? 504 : 500)
      .json({ 
        error: 'Error generating test', 
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
  }
}
