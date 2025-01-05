/**
 * Calculates the next review interval based on SuperMemo-2 algorithm
 * @param {Object} card - The flashcard object
 * @param {boolean} isCorrect - Whether the answer was correct
 * @returns {Object} Updated card parameters
 */
export function calculateNextReview(card, isCorrect) {
    const now = new Date('2025-01-05T08:40:12-05:00');

    // Initialize card properties if they don't exist
    const currentInterval = card.interval || 1; // in days
    const currentEaseFactor = card.ease_factor || 2.5;
    const reviewCount = (card.review_count || 0) + 1;

    let newInterval;
    let newEaseFactor = currentEaseFactor;

    if (isCorrect) {
        // If correct, increase interval
        if (reviewCount === 1) {
            newInterval = 1; // 1 day
        } else if (reviewCount === 2) {
            newInterval = 3; // 3 days
        } else {
            newInterval = Math.round(currentInterval * currentEaseFactor);
        }
        // Slightly increase ease factor for correct answers
        newEaseFactor = Math.min(currentEaseFactor + 0.1, 2.5);
    } else {
        // If incorrect, reset interval and decrease ease factor
        newInterval = 1;
        newEaseFactor = Math.max(1.3, currentEaseFactor - 0.2);
    }

    // Calculate next review date
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + newInterval);

    return {
        interval: newInterval,
        ease_factor: newEaseFactor,
        next_review: nextReview.toISOString(),
        review_count: reviewCount,
        last_review: now.toISOString()
    };
}

/**
 * Gets due cards from a set of flashcards
 * @param {Array} cards - Array of flashcard objects
 * @returns {Array} Array of due cards
 */
export function getDueCards(cards) {
    const now = new Date('2025-01-05T08:40:12-05:00');
    return cards.filter(card => new Date(card.next_review) <= now);
}

/**
 * Calculate review statistics for a flashcard set
 * @param {Array} cards - Array of flashcard objects
 * @returns {Object} Statistics object
 */
export function calculateStats(cards) {
    if (!cards.length) return null;

    const stats = {
        totalCards: cards.length,
        dueToday: 0,
        dueThisWeek: 0,
        averageEaseFactor: 0,
        totalReviews: 0
    };

    const now = new Date('2025-01-05T08:40:12-05:00');
    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    cards.forEach(card => {
        const nextReview = new Date(card.next_review);
        
        // Count due cards
        if (nextReview <= now) {
            stats.dueToday++;
        } else if (nextReview <= oneWeek) {
            stats.dueThisWeek++;
        }

        // Calculate averages
        stats.averageEaseFactor += card.ease_factor || 2.5;
        stats.totalReviews += card.review_count || 0;
    });

    stats.averageEaseFactor /= cards.length;

    return stats;
}
