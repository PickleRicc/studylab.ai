import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { calculateNextReview } from '../utils/spacedRepetition';

export default function FlashcardStudyReviewView({ setId, onClose }) {
    const [flashcards, setFlashcards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showAnswerButtons, setShowAnswerButtons] = useState(false);

    useEffect(() => {
        loadReviewCards();
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
                return;
            }

            // Shuffle the cards for variety
            const shuffledCards = [...data].sort(() => Math.random() - 0.5);
            setFlashcards(shuffledCards);
            setCurrentIndex(0);
            setIsFlipped(false);
            setShowAnswerButtons(false);
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

            // If correct, remove from current review session
            if (isCorrect) {
                const updatedCards = flashcards.filter((_, index) => index !== currentIndex);
                setFlashcards(updatedCards);
                if (currentIndex >= updatedCards.length) {
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

    if (loading) return <div className="text-center p-4">Loading review cards...</div>;
    if (!flashcards.length) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
                    <h2 className="text-xl font-semibold mb-4">Nothing to Review</h2>
                    <p className="text-gray-600 mb-6">
                        Study the original set first and mark cards you need to review.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const currentCard = flashcards[currentIndex];
    const progress = ((currentIndex + 1) / flashcards.length) * 100;

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-[#1d2937] to-gray-900 flex items-center justify-center p-4">
            <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl w-full max-w-4xl overflow-hidden border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.3)]">
                <div className="flex justify-between items-center p-6 border-b border-white/10">
                    <div className="flex items-center space-x-4">
                        <div className="text-xl font-semibold text-white">
                            {currentIndex + 1}/{flashcards.length}
                        </div>
                        <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#1d2937] to-blue-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
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
                                <div className="h-full bg-white/20 backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center justify-center border border-white/30">
                                    <div className="text-sm text-gray-300 mb-4">Question</div>
                                    <div className="text-2xl text-white text-center font-medium">
                                        {currentCard?.front_content}
                                    </div>
                                    <div className="absolute bottom-4 text-gray-400">
                                        Click to flip
                                    </div>
                                </div>
                            </div>
                            {/* Back of card */}
                            <div className="absolute inset-0 backface-hidden rotate-y-180">
                                <div className="h-full bg-white/20 backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center justify-center border border-white/30">
                                    <div className="text-sm text-gray-300 mb-4">Answer</div>
                                    <div className="text-2xl text-white text-center font-medium">
                                        {currentCard?.back_content}
                                    </div>
                                    {!showAnswerButtons && (
                                        <div className="absolute bottom-4 text-gray-400">
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
                                className="px-8 py-3 bg-white/10 backdrop-blur-xl text-white rounded-xl hover:bg-white/20 transform hover:scale-[1.02] transition-all duration-200 font-medium flex items-center"
                            >
                                <span className="text-xl mr-2">✕</span> Still Learning
                            </button>
                            <button
                                onClick={() => handleAnswer(true)}
                                className="px-8 py-3 bg-[#1d2937] text-white rounded-xl hover:bg-[#2d3947] transform hover:scale-[1.02] transition-all duration-200 font-medium flex items-center"
                            >
                                <span className="text-xl mr-2">✓</span> Got It
                            </button>
                        </div>
                    )}

                    <div className="flex justify-between mt-6">
                        <button
                            onClick={handlePrevious}
                            disabled={currentIndex === 0}
                            className="px-6 py-2 bg-white/10 backdrop-blur-xl text-white rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            Previous
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={currentIndex === flashcards.length - 1}
                            className="px-6 py-2 bg-white/10 backdrop-blur-xl text-white rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                        >
                            Next
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
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
