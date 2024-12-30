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
 * Generates test questions from text content
 * @param {string} content - The text content to generate questions from
 * @param {Object} config - Test configuration options
 * @returns {Promise<Array>} Array of generated questions
 */
export async function generateTest(content, config) {
    try {
        console.log('Generating test with content length:', content.length);
        console.log('Test configuration:', config);

        const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.2, // Lower temperature for more consistent output
        });

        const parser = new JsonOutputParser();

        // Create different prompts based on question type
        let promptContent = '';
        if (config.questionTypes.includes('multiple_choice')) {
            promptContent += `
            For multiple choice questions:
            - Create exactly 4 options (A, B, C, D)
            - Make sure one option is clearly correct
            - Make other options plausible but incorrect
            `;
        }
        if (config.questionTypes.includes('short_answer')) {
            promptContent += `
            For short answer questions:
            - Create questions that require brief, specific answers
            - Answers should be 1-2 sentences
            `;
        }

        const promptTemplate = ChatPromptTemplate.fromTemplate(`
            You are an expert test creator. Create a test with {numQuestions} questions based on the following content.
            The test should be at {difficulty} difficulty level.
            Only create questions of these types: {questionTypes}.
            
            ${promptContent}

            Format your response as a JSON array where each question object has:
            - question: the question text
            - type: either "multiple_choice" or "short_answer"
            - choices: array of 4 options (for multiple choice only)
            - answer: the correct answer
            
            Content to generate questions about:
            {content}
        `);

        const chain = promptTemplate.pipe(model).pipe(parser);

        const response = await chain.invoke({
            content: content,
            numQuestions: config.numQuestions,
            questionTypes: config.questionTypes.join(", "),
            difficulty: config.difficulty,
        });

        console.log('Generated questions:', response.length);
        return { questions: response };
    } catch (error) {
        console.error('Error generating test:', error);
        throw error;
    }
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
