import { generateTest, validateTestConfig } from '../../utils/testGenerator';
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
        
        if (!files || files.length === 0) {
            console.error('No files provided');
            return res.status(400).json({ error: 'No files provided' });
        }

        // Validate test configuration
        try {
            validateTestConfig({ title, numQuestions, questionTypes, difficulty });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }

        // Format content for test generation
        const formattedContent = files.map(file => ({
            content: file.chunks?.join('\n') || '',  // Use chunks if available
            source: file.name,
            type: file.type,
            chunks: file.chunks || [],
            isStored: true,
            fileId: file.id
        }));

        // Create initial test record
        const { data: testRecord, error: insertError } = await supabase
            .from('tests')
            .insert({
                user_id: user.id,
                title,
                status: 'processing',
                created_at: new Date().toISOString(),
                config: {
                    numQuestions,
                    questionTypes,
                    difficulty
                }
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating test record:', insertError);
            return res.status(500).json({ error: 'Failed to create test' });
        }

        // Initialize progress tracking
        await supabase
            .from('test_generation_progress')
            .upsert({
                test_id: testRecord.id,
                progress: 0,
                questions: []
            });

        // Start test generation in the background
        generateTest(formattedContent, {
            userId: user.id,
            testId: testRecord.id,
            numQuestions,
            questionTypes,
            difficulty,
            title
        }).then(async (generatedTest) => {
            // Update test record with completed status and questions
            await supabase
                .from('tests')
                .update({
                    questions: generatedTest.questions,
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', testRecord.id);
        }).catch(async (error) => {
            console.error('Error in test generation:', error);
            // Update test record with error status
            await supabase
                .from('tests')
                .update({
                    status: 'error',
                    error_message: error.message || 'An unknown error occurred',
                    completed_at: new Date().toISOString()
                })
                .eq('id', testRecord.id);
        });

        // Return immediately with the test ID and processing status
        return res.status(202).json({
            testId: testRecord.id,
            status: 'processing',
            message: 'Test generation started'
        });

    } catch (error) {
        console.error('Error in request:', error);
        
        // If we have a test record, update its status
        if (typeof testRecord !== 'undefined' && testRecord?.id) {
            await supabase
                .from('tests')
                .update({
                    status: 'error',
                    error_message: error.message || 'An unknown error occurred',
                    completed_at: new Date().toISOString()
                })
                .eq('id', testRecord.id);
        }
        
        return res.status(500).json({ error: 'Internal server error' });
    }
}
