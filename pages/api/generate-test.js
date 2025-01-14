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

        const { title, numQuestions, questionTypes, difficulty, files } = req.body;
        
        if (!files || !files.length) {
            console.error('No files provided');
            return res.status(400).json({ error: 'No files provided' });
        }

        // Format content for test generation
        const formattedContent = files.map(file => ({
            content: file.chunks?.join('\n') || '',  // Use chunks if available
            source: file.name,
            chunks: file.chunks || [],
            isStored: true,
            fileId: file.id
        }));

        // Generate test questions
        const generatedTest = await generateTest(formattedContent, {
            userId: user.id,
            numQuestions: numQuestions || 20,
            questionTypes: questionTypes || ['multiple_choice'],
            difficulty: difficulty || 'medium'
        });

        // Store completed test in Supabase
        const { error: insertError } = await supabase
            .from('tests')
            .insert({
                user_id: user.id,
                title: title || 'Generated Test',
                content: JSON.stringify(formattedContent),
                questions: generatedTest.questions,
                created_at: new Date().toISOString(),
                status: 'completed',
                config: {
                    numQuestions,
                    questionTypes,
                    difficulty
                }
            });

        if (insertError) {
            console.error('Error storing test:', insertError);
            return res.status(500).json({ error: 'Failed to store test' });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error generating test:', error);
        return res.status(500).json({ 
            error: 'Error generating test', 
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
