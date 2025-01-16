import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { supabase } from './supabase';

// Define the test question structure
export const testQuestionSchema = {
    type: "object",
    properties: {
        questions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    type: { type: "string", enum: ["multiple_choice", "short_answer"] },
                    question: { type: "string" },
                    options: { 
                        type: "array",
                        items: { type: "string" },
                        optional: true 
                    },
                    correctAnswer: { type: "string" },
                    explanation: { type: "string" }
                },
                required: ["id", "type", "question", "correctAnswer", "explanation"]
            }
        }
    }
};

/**
 * Generates test questions from multiple content sources with progress tracking
 * @param {Array} contentSources - Array of content objects with text and metadata
 * @param {Object} config - Test configuration options
 * @returns {Promise<Object>} Object containing generated questions
 */
export async function generateTest(contentSources, config) {
    try {
        console.log('Generating test with config:', config);
        console.log('Number of content sources:', contentSources.length);
        console.log('Content sources details:');
        contentSources.forEach((source, idx) => {
            console.log(`Source ${idx + 1}:`, {
                source: source.source,
                hasContent: !!source.content,
                contentLength: source.content?.length,
                hasChunks: !!source.chunks,
                numChunks: source.chunks?.length
            });
        });

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

        const parser = new JsonOutputParser();
        let allQuestions = [];
        let totalQuestionsGenerated = 0;

        // Calculate questions per type
        const questionsPerType = {};
        config.questionTypes.forEach(type => {
            questionsPerType[type] = Math.floor(config.numQuestions / config.questionTypes.length);
        });

        // Distribute remaining questions
        let remaining = config.numQuestions - (questionsPerType[config.questionTypes[0]] * config.questionTypes.length);
        let typeIndex = 0;
        while (remaining > 0) {
            questionsPerType[config.questionTypes[typeIndex]]++;
            typeIndex = (typeIndex + 1) % config.questionTypes.length;
            remaining--;
        }

        console.log('Questions per type:', questionsPerType);

        // Prepare content chunks
        let allChunks = [];
        contentSources.forEach(source => {
            const chunks = source.chunks || (source.content ? [{ pageContent: source.content, metadata: { chunkIndex: 0 } }] : []);
            allChunks = allChunks.concat(chunks.map(chunk => ({
                ...chunk,
                source: source.source || 'Unknown'
            })));
        });

        // Select distributed chunks
        const QUESTIONS_PER_BATCH = 5;
        const MAX_RETRIES = 3;
        const selectedChunks = selectDistributedChunks(allChunks, Math.ceil(config.numQuestions / QUESTIONS_PER_BATCH));
        console.log(`Selected ${selectedChunks.length} chunks for processing`);

        // Process chunks sequentially with retries
        for (const [chunkIndex, chunk] of selectedChunks.entries()) {
            if (totalQuestionsGenerated >= config.numQuestions) break;

            const remainingNeeded = config.numQuestions - totalQuestionsGenerated;
            const questionsForChunk = Math.min(QUESTIONS_PER_BATCH, remainingNeeded);
            
            console.log(`Generating ${questionsForChunk} questions from chunk ${chunkIndex + 1}/${selectedChunks.length}`);

            let retryCount = 0;
            let chunkQuestions = [];

            while (chunkQuestions.length < questionsForChunk && retryCount < MAX_RETRIES) {
                try {
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
                        
                        Content from {source}:
                        {content}`
                    );

                    const chain = prompt.pipe(model).pipe(parser);

                    for (const [type, count] of Object.entries(questionsPerType)) {
                        if (count <= 0) continue;

                        const response = await chain.invoke({
                            content: chunk.pageContent,
                            source: chunk.source,
                            numQuestions: Math.min(count, questionsForChunk - chunkQuestions.length),
                            questionType: type,
                            difficulty: config.difficulty,
                            format_instructions: formatInstructions
                        });

                        const newQuestions = response?.questions?.map((q, idx) => ({
                            ...q,
                            id: `q${totalQuestionsGenerated + idx + 1}`,
                            source: chunk.source,
                            chunkIndex: chunk.metadata?.chunkIndex
                        })) || [];

                        chunkQuestions.push(...newQuestions);
                        questionsPerType[type] -= newQuestions.length;
                    }

                    // Update progress
                    if (config.testId) {
                        const progress = Math.round((totalQuestionsGenerated + chunkQuestions.length) / config.numQuestions * 100);
                        try {
                            await supabase
                                .from('test_generation_progress')
                                .upsert({
                                    test_id: config.testId,
                                    progress,
                                    questions: allQuestions.concat(chunkQuestions)
                                });
                            console.log(`Updated progress to ${progress}%`);
                        } catch (error) {
                            console.error('Error updating progress:', error);
                        }
                    }

                } catch (error) {
                    console.error(`Error generating questions (attempt ${retryCount + 1}):`, error);
                    retryCount++;
                }
            }

            if (chunkQuestions.length > 0) {
                allQuestions.push(...chunkQuestions);
                totalQuestionsGenerated += chunkQuestions.length;
                console.log(`Added ${chunkQuestions.length} questions. Total: ${totalQuestionsGenerated}/${config.numQuestions}`);
            }
        }

        // Final validation
        if (totalQuestionsGenerated < config.numQuestions) {
            throw new Error(`Failed to generate enough questions. Got ${totalQuestionsGenerated}/${config.numQuestions}`);
        }

        console.log(`Successfully generated ${totalQuestionsGenerated} questions`);
        return { questions: allQuestions };

    } catch (error) {
        console.error('Error in test generation:', error);
        if (config.testId) {
            await supabase
                .from('tests')
                .update({
                    status: 'error',
                    error_message: error.message,
                    completed_at: new Date().toISOString()
                })
                .eq('id', config.testId);
        }
        throw error;
    }
}

/**
 * Select chunks distributed evenly throughout the document
 * @param {Array} chunks - Array of all chunks
 * @param {number} numChunks - Number of chunks to select
 * @returns {Array} Selected chunks
 */
function selectDistributedChunks(chunks, numChunks) {
    if (numChunks >= chunks.length) return chunks;
    
    const step = chunks.length / numChunks;
    const selectedChunks = [];
    
    for (let i = 0; i < numChunks; i++) {
        const index = Math.floor(i * step);
        selectedChunks.push(chunks[index]);
    }
    
    return selectedChunks;
}

/**
 * Validates and scores a completed test
 * @param {Array} questions - The test questions
 * @param {Object} answers - User's answers
 * @returns {Object} Test results with score and feedback
 */
export function scoreTest(questions, answers) {
    const results = {
        totalQuestions: questions.length,
        correctAnswers: 0,
        wrongAnswers: 0,
        score: 0,
        feedback: []
    };

    questions.forEach((question) => {
        const userAnswer = answers[question.id];
        const isCorrect = userAnswer?.toLowerCase() === question.correctAnswer.toLowerCase();

        results.feedback.push({
            questionId: question.id,
            correct: isCorrect,
            userAnswer: userAnswer,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation
        });

        if (isCorrect) {
            results.correctAnswers++;
        } else {
            results.wrongAnswers++;
        }
    });

    results.score = (results.correctAnswers / results.totalQuestions) * 100;
    return results;
}

/**
 * Validate test configuration
 * @param {Object} config - Test configuration to validate
 * @returns {boolean} True if valid, throws error if invalid
 */
export function validateTestConfig(config) {
    const {
        numQuestions,
        questionTypes,
        difficulty,
        title
    } = config;

    if (!numQuestions || numQuestions < 1) {
        throw new Error('Number of questions must be at least 1');
    }

    if (!questionTypes || questionTypes.length === 0) {
        throw new Error('At least one question type must be specified');
    }

    const validTypes = ['multiple_choice', 'short_answer'];
    for (const type of questionTypes) {
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid question type: ${type}`);
        }
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
        throw new Error(`Invalid difficulty: ${difficulty}`);
    }

    if (!title || title.trim().length === 0) {
        throw new Error('Test title is required');
    }

    return true;
}
