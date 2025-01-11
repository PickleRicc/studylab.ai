import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { calculateNextReview } from '../utils/spacedRepetition';

export default function FlashcardStudyReviewView({ setId, onClose }) {
    const [flashcards, setFlashcards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showAnswerButtons, setShowAnswerButtons] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [knownCards, setKnownCards] = useState(0);
    const [learningCards, setLearningCards] = useState(0);

    useEffect(() => {
        if (setId) {
            loadReviewCards();
        }
    }, [setId]);

    const loadReviewCards = async () => {
        try {
            const { data, error } = await supabase
                .from('flashcards')
                .select('*')
                .eq('set_id', setId)
                .eq('needs_review', true)
                .order('last_reviewed');

            if (error) throw error;

            if (!data || data.length === 0) {
                setFlashcards([]);
                setLoading(false);
                setIsComplete(true);
                return;
            }

            // Shuffle the cards for variety
            const shuffledCards = [...data].sort(() => Math.random() - 0.5);
            setFlashcards(shuffledCards);
            setCurrentIndex(0);
            setIsFlipped(false);
            setShowAnswerButtons(false);
            setIsComplete(false);
        } catch (err) {
            console.error('Error loading review cards:', err);
            setFlashcards([]);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsFlipped(false);
            setShowAnswerButtons(false);
        } else {
            setIsComplete(true);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsFlipped(false);
            setShowAnswerButtons(false);
        }
    };

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
        if (!isFlipped) {
            setShowAnswerButtons(true);
        }
    };

    const handleAnswer = async (isCorrect) => {
        const currentCard = flashcards[currentIndex];
        if (!currentCard) return;

        try {
            await supabase
                .from('flashcards')
                .update({
                    needs_review: !isCorrect,
                    last_reviewed: new Date().toISOString()
                })
                .eq('id', currentCard.id);

            if (isCorrect) {
                setKnownCards(prev => prev + 1);
            } else {
                setLearningCards(prev => prev + 1);
            }

            // If correct, remove from current review session
            if (isCorrect) {
                const updatedCards = flashcards.filter((_, index) => index !== currentIndex);
                setFlashcards(updatedCards);
                if (updatedCards.length === 0) {
                    setIsComplete(true);
                } else if (currentIndex >= updatedCards.length) {
                    setCurrentIndex(Math.max(0, updatedCards.length - 1));
                }
                setIsFlipped(false);
                setShowAnswerButtons(false);
            } else {
                handleNext();
            }
        } catch (err) {
            console.error('Error updating card:', err);
        }
    };

    if (loading) return (
        <div className="fixed inset-0 bg-gradient-to-br from-[#10002b] to-[#240046] flex items-center justify-center">
            <div className="text-white text-lg">Loading review cards...</div>
        </div>
    );

    if (isComplete || !flashcards.length) return (
        <div className="fixed inset-0 bg-gradient-to-br from-[#10002b] to-[#240046] flex items-center justify-center p-4">
            <div className="bg-[#240046]/80 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-[#3c096c] text-center">
                <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#3c096c]/20 backdrop-blur-xl mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">All Caught Up!</h2>
                    <p className="text-white/60">
                        No cards need review at the moment. Keep up the good work!
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="w-full px-6 py-3 bg-[#4361ee] text-white rounded-xl hover:bg-[#4cc9f0] transform hover:scale-[1.02] transition-all duration-200 font-medium"
                >
                    Return to Sets
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-[#10002b] to-[#240046] flex items-center justify-center p-4">
            <div className="relative bg-[#240046]/80 backdrop-blur-xl rounded-2xl w-full max-w-4xl overflow-hidden border border-[#3c096c] shadow-[0_8px_32px_0_rgba(31,38,135,0.3)]">
                <div className="flex justify-between items-center p-6 border-b border-[#3c096c]">
                    <div className="flex items-center space-x-4">
                        <div className="text-xl font-semibold text-white">
                            {currentIndex + 1}/{flashcards.length}
                        </div>
                        <div className="w-48 h-2 bg-[#3c096c]/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#4361ee] to-[#4cc9f0] transition-all duration-300"
                                style={{ width: `${(currentIndex + 1) / flashcards.length * 100}%` }}
                            ></div>
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                            <div className="flex items-center text-[#4cc9f0]">
                                <span className="mr-1">✓</span>
                                <span>{knownCards}</span>
                            </div>
                            <div className="flex items-center text-[#ff758f]">
                                <span className="mr-1">✕</span>
                                <span>{learningCards}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-[#4cc9f0] transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <div
                        onClick={handleFlip}
                        className="relative min-h-[400px] w-full cursor-pointer perspective-1000"
                    >
                        <div
                            className={`absolute inset-0 p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.2)] transition-all duration-500 transform preserve-3d ${
                                isFlipped ? 'rotate-y-180' : ''
                            }`}
                        >
                            {/* Front of card */}
                            <div className="absolute inset-0 backface-hidden">
                                <div className="h-full bg-[#3c096c]/20 backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center justify-center border border-[#3c096c]">
                                    <div className="text-sm text-white/60 mb-4">Question</div>
                                    <div className="text-2xl text-white text-center font-medium">
                                        {flashcards[currentIndex]?.front_content}
                                    </div>
                                    <div className="absolute bottom-4 text-white/60">
                                        Click to flip
                                    </div>
                                </div>
                            </div>
                            {/* Back of card */}
                            <div className="absolute inset-0 backface-hidden rotate-y-180">
                                <div className="h-full bg-[#3c096c]/20 backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center justify-center border border-[#3c096c]">
                                    <div className="text-sm text-white/60 mb-4">Answer</div>
                                    <div className="text-2xl text-white text-center font-medium">
                                        {flashcards[currentIndex]?.back_content}
                                    </div>
                                    {!showAnswerButtons && (
                                        <div className="absolute bottom-4 text-white/60">
                                            Click to flip back
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {showAnswerButtons && isFlipped && (
                        <div className="flex justify-center gap-4 mt-8">
                            <button
                                onClick={() => handleAnswer(false)}
                                className="px-8 py-3 bg-[#3c096c]/20 backdrop-blur-xl text-white rounded-xl hover:bg-[#3c096c]/40 transform hover:scale-[1.02] transition-all duration-200 font-medium flex items-center"
                            >
                                <span className="text-xl mr-2">✕</span> Still Learning
                            </button>
                            <button
                                onClick={() => handleAnswer(true)}
                                className="px-8 py-3 bg-[#4361ee] text-white rounded-xl hover:bg-[#4cc9f0] transform hover:scale-[1.02] transition-all duration-200 font-medium flex items-center"
                            >
                                <span className="text-xl mr-2">✓</span> Got It
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <style jsx global>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .preserve-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
            `}</style>
        </div>
    );
}
