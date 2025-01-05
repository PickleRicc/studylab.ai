import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputParser } from "@langchain/core/output_parsers";

/**
 * Generates flashcards from multiple content sources
 * @param {Array} contentSources - Array of content objects with text and metadata
 * @param {Object} config - Flashcard configuration options
 * @returns {Promise<Object>} Object containing generated flashcards
 */
export async function generateFlashcards(contentSources, config) {
    try {
        console.log('Generating flashcards with config:', config);
        console.log('Number of content sources:', contentSources.length);

        // Validate configuration
        validateFlashcardConfig(config);

        // Initialize OpenAI chat model
        const model = new ChatOpenAI({
            modelName: "gpt-4-1106-preview",
            temperature: 0.7,
        });

        // Create output parser
        const parser = new JsonOutputParser();

        // Process each content source
        const allFlashcards = [];
        let position = 1;

        for (const source of contentSources) {
            console.log('Processing source:', source.source);
            const content = source.content || (source.chunks || []).join(' ');
            if (!content) {
                console.log('No content found for source:', source.source);
                continue;
            }

            const systemPrompt = `You are a skilled educator tasked with creating high-quality flashcards. Create exactly ${config.cardsPerSource} flashcards from the provided content, focusing on ${config.focus || 'key concepts and definitions'}.

You must respond with a JSON object in this exact format:
{
    "flashcards": [
        {
            "id": "card_1",
            "front_content": "Clear, concise question or concept",
            "back_content": "Comprehensive but concise explanation",
            "position": 1
        }
    ]
}

Rules:
1. front_content should be a clear question or key concept
2. back_content should be a comprehensive but concise explanation
3. Each card must have all fields
4. Position should start at 1 and increment

DO NOT include any other text or formatting. Return ONLY the JSON object.`;

            try {
                const response = await model.invoke(systemPrompt + "\\n\\nContent: " + content);
                const parsedResponse = await parser.invoke(response.content);

                console.log('Generated flashcards for source:', source.source, parsedResponse);

                if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
                    console.error('Invalid response format:', parsedResponse);
                    continue;
                }

                // Add source metadata and adjust positions
                const flashcardsWithMetadata = parsedResponse.flashcards.map(card => ({
                    ...card,
                    id: `card_${position}`,
                    position: position++,
                    source: source.source
                }));

                allFlashcards.push(...flashcardsWithMetadata);
            } catch (error) {
                console.error('Error generating flashcards for source:', source.source, error);
                continue;
            }
        }

        console.log('Total flashcards generated:', allFlashcards.length);

        return {
            flashcards: allFlashcards,
            totalCards: allFlashcards.length
        };

    } catch (error) {
        console.error('Error generating flashcards:', error);
        throw error;
    }
}

/**
 * Validate flashcard configuration
 * @param {Object} config - Flashcard configuration to validate
 * @returns {boolean} True if valid, throws error if invalid
 */
export function validateFlashcardConfig(config) {
    if (!config) {
        throw new Error('Configuration is required');
    }

    const requiredFields = ['cardsPerSource'];
    const missingFields = requiredFields.filter(field => !config[field]);

    if (missingFields.length > 0) {
        throw new Error(`Missing required configuration fields: ${missingFields.join(', ')}`);
    }

    if (config.cardsPerSource < 1 || config.cardsPerSource > 20) {
        throw new Error('Cards per source must be between 1 and 20');
    }

    return true;
}
