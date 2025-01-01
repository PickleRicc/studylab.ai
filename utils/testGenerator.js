import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

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
 * Generates test questions from multiple content sources
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
            modelName: "gpt-4o",
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
        },
        {
            "question": "The actual question text",
            "type": "short_answer",
            "correctAnswer": "The brief answer",
            "explanation": "Explanation of why this is correct"
        }
    ]
}

Generate an equal mix of the following question types: ${config.questionTypes.join(', ')}.
DO NOT include any other text, markdown formatting, or code blocks. Return ONLY the JSON object.`;

        const parser = new JsonOutputParser();
        let allQuestions = [];

        // Calculate questions per type
        const questionsPerType = Math.floor(config.numQuestions / config.questionTypes.length);
        const remainingQuestions = config.numQuestions % config.questionTypes.length;
        
        // Create a map of how many questions we need for each type
        const questionTypeCount = config.questionTypes.reduce((acc, type, index) => {
            acc[type] = questionsPerType + (index < remainingQuestions ? 1 : 0);
            return acc;
        }, {});

        console.log('Questions per type:', questionTypeCount);

        // Optimize chunks needed based on total questions
        const questionsPerChunk = 3;
        const chunksNeeded = Math.ceil(config.numQuestions / questionsPerChunk);
        const chunksPerSource = Math.ceil(chunksNeeded / contentSources.length);

        // Process sources in parallel
        const processedSources = await Promise.all(contentSources.map(async (source) => {
            if (allQuestions.length >= config.numQuestions) return [];

            // If no chunks available, create a single chunk from content
            let chunks = source.chunks || [];
            if (chunks.length === 0 && source.content) {
                chunks = [{
                    pageContent: source.content,
                    metadata: { chunkIndex: 0 }
                }];
            }

            if (chunks.length === 0) {
                console.log(`No content or chunks found for source: ${source.source || 'Unknown'}`);
                return [];
            }

            // Calculate remaining questions needed
            const remainingTotal = config.numQuestions - allQuestions.length;
            if (remainingTotal <= 0) return [];

            // Calculate optimal number of chunks and questions per chunk
            const optimalQuestionsPerChunk = Math.ceil(remainingTotal / Math.min(remainingTotal, 4)); // Max 4 chunks
            const chunksNeeded = Math.ceil(remainingTotal / optimalQuestionsPerChunk);
            
            console.log(`Remaining questions: ${remainingTotal}, Questions per chunk: ${optimalQuestionsPerChunk}`);
            
            // Select chunks evenly distributed
            const selectedChunks = selectDistributedChunks(chunks, chunksNeeded);
            console.log(`Selected ${selectedChunks.length} chunks from ${source.source || 'Unknown'}`);

            // Process chunks sequentially to maintain better control
            const chunkQuestions = [];
            for (const [chunkIndex, chunk] of selectedChunks.entries()) {
                const currentTotal = allQuestions.length + chunkQuestions.flat().length;
                if (currentTotal >= config.numQuestions) break;

                // Calculate questions for this chunk
                const remainingNeeded = config.numQuestions - currentTotal;
                const isLastChunk = chunkIndex === selectedChunks.length - 1;
                const questionsForChunk = isLastChunk 
                    ? remainingNeeded 
                    : Math.min(optimalQuestionsPerChunk, remainingNeeded);

                if (questionsForChunk <= 0) break;

                try {
                    console.log(`Generating ${questionsForChunk} questions from chunk ${chunk.metadata?.chunkIndex}`);
                    
                    const prompt = ChatPromptTemplate.fromTemplate(
                        `You are an expert test creator. Generate {numQuestions} questions based on the provided content.
                        The test should be at {difficulty} difficulty level.
                        
                        Requirements:
                        - Create exactly {numQuestions} questions from this content
                        - Make questions challenging but clear
                        - Ensure answers are unambiguous
                        - Questions must be based on the provided content only
                        - For multiple choice questions, include exactly 4 options
                        
                        {format_instructions}
                        
                        Content from {source}:
                        {content}`
                    );

                    const partialedPrompt = await prompt.partial({
                        format_instructions: formatInstructions,
                    });

                    const chain = partialedPrompt.pipe(model).pipe(parser);

                    const response = await chain.invoke({
                        content: chunk.pageContent,
                        source: source.source || 'Unknown',
                        numQuestions: questionsForChunk,
                        difficulty: config.difficulty,
                        questionTypes: config.questionTypes,
                        questionTypeCount: JSON.stringify(questionTypeCount)
                    });

                    // Extract questions and add metadata
                    const questions = (response?.questions || []).slice(0, questionsForChunk);
                    
                    // Update question type counts and validate total
                    const validQuestions = questions.map((q, idx) => {
                        if (questionTypeCount[q.type] > 0) {
                            questionTypeCount[q.type]--;
                            return {
                                ...q,
                                id: `q${currentTotal + idx + 1}`,
                                source: source.source || 'Unknown',
                                chunkIndex: chunk.metadata?.chunkIndex
                            };
                        }
                        return null;
                    }).filter(Boolean);

                    chunkQuestions.push(validQuestions);

                } catch (error) {
                    console.error(`Error generating questions from chunk:`, error);
                }
            }

            return chunkQuestions.flat();
        }));

        // Combine all questions and ensure we don't exceed the requested number
        allQuestions = processedSources.flat().slice(0, config.numQuestions);
        console.log('Total questions generated:', allQuestions.length);
        return {
            id: Date.now().toString(),
            title: config.title,
            config: {
                difficulty: config.difficulty,
                numQuestions: config.numQuestions
            },
            questions: allQuestions
        };
    } catch (error) {
        console.error('Error in test generation:', error);
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
