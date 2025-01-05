import { generateFlashcards } from '../../utils/flashcardGenerator';
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
      console.log('Received flashcard generation request');
      
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

      const { files, config } = req.body;
      
      if (!files || !Array.isArray(files) || files.length === 0) {
        console.error('No files provided');
        return res.status(400).json({ error: 'No files provided' });
      }

      console.log('Processing files:', files.map(f => f.fileName || f.name));

      // Prepare content sources
      const contentSources = files.map(file => ({
        content: file.text || file.content,
        source: file.fileName || file.name,
        chunks: file.chunks
      }));

      console.log('Content sources prepared:', contentSources.length);

      // Generate flashcards
      const { flashcards, totalCards } = await generateFlashcards(contentSources, config);

      console.log('Flashcards generated:', totalCards);

      if (!flashcards || flashcards.length === 0) {
        throw new Error('No flashcards were generated');
      }

      // Create flashcard set in database
      const { data: flashcardSet, error: setError } = await supabase
        .from('flashcard_sets')
        .insert([{
          user_id: user.id,
          title: config.title || 'New Flashcard Set',
          description: config.description,
          source_file_id: files[0].id,
          card_count: totalCards
        }])
        .select()
        .single();

      if (setError) {
        console.error('Error creating flashcard set:', setError);
        throw setError;
      }

      console.log('Flashcard set created:', flashcardSet.id);

      // Insert flashcards
      const { error: cardsError } = await supabase
        .from('flashcards')
        .insert(flashcards.map(card => ({
          set_id: flashcardSet.id,
          front_content: card.front_content,
          back_content: card.back_content,
          position: card.position
        })));

      if (cardsError) {
        console.error('Error inserting flashcards:', cardsError);
        throw cardsError;
      }

      console.log('Flashcards inserted successfully');

      return {
        success: true,
        flashcardSet,
        totalCards
      };
    })();

    const result = await Promise.race([generationPromise, timeoutPromise]);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error generating flashcards:', error);
    // Send a proper JSON response even for errors
    return res.status(error.message === 'Operation timed out' ? 504 : 500)
      .json({ 
        error: 'Error generating flashcards', 
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
  }
}
