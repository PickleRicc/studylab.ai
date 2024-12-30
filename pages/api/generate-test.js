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

    console.log('Received test generation request');
    const { content, config } = req.body;
    
    if (!content) {
      console.error('No content provided');
      return res.status(400).json({ error: 'No content provided' });
    }

    // Get the current user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.authorization?.split(' ')[1]
    );

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('Generating test with config:', config);
    console.log('Content length:', content.length);
    
    // Generate test questions
    const test = await generateTest(content, {
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
        content: content,
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
    res.status(200).json(savedTest);
  } catch (error) {
    console.error('Error in test generation:', error);
    res.status(500).json({ error: error.message });
  }
}
