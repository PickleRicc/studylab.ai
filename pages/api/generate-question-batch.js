import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { supabase } from '../../utils/supabase';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { content, testId, batchIndex, batchSize, questionType, difficulty } = req.body;

        const model = new ChatOpenAI({
            modelName: "gpt-4",
            temperature: 0.2,
        });

        const formatInstructions = `
You must respond with a JSON object in this exact format, following these rules:
1. For multiple_choice questions:
   - Include an "options" array with exactly 4 options
   - The "correctAnswer" must match one of the options exactly
2. For short_answer questions:
   - Do not include an "options" array
   - The "correctAnswer" should be a brief, clear answer

Example format:
{
    "questions": [
        {
            "question": "The actual question text",
            "type": "multiple_choice",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "Option A",
            "explanation": "Explanation of why this is correct"
        }
    ]
}`;

        const prompt = ChatPromptTemplate.fromTemplate(
            `You are an expert test creator. Generate {numQuestions} {questionType} questions based on the provided content.
            The test should be at {difficulty} difficulty level.
            
            Requirements:
            - Create exactly {numQuestions} questions
            - Make questions challenging but clear
            - Ensure answers are unambiguous
            - Questions must be based ONLY on the provided content
            - For multiple choice, include exactly 4 plausible options
            
            {format_instructions}
            
            Content:
            {content}`
        );

        const chain = prompt.pipe(model).pipe(new JsonOutputParser());
        
        const response = await chain.invoke({
            content: content,
            numQuestions: batchSize,
            questionType: questionType,
            difficulty: difficulty,
            format_instructions: formatInstructions
        });

        const questions = response?.questions?.map((q, idx) => ({
            ...q,
            id: `q${batchIndex * batchSize + idx + 1}`,
        })) || [];

        // Update progress in Supabase
        const { data: currentProgress } = await supabase
            .from('test_generation_progress')
            .select('questions')
            .eq('test_id', testId)
            .single();

        const updatedQuestions = [...(currentProgress?.questions || []), ...questions];
        
        await supabase
            .from('test_generation_progress')
            .upsert({
                test_id: testId,
                progress: Math.round((updatedQuestions.length / (batchSize * 4)) * 100),
                questions: updatedQuestions
            });

        return res.status(200).json({ questions });

    } catch (error) {
        console.error('Error generating question batch:', error);
        return res.status(500).json({ error: 'Failed to generate questions' });
    }
}
