import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function FlashcardStudyView({ set, onClose }) {
    const [flashcards, setFlashcards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showAnswerButtons, setShowAnswerButtons] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [studyStats, setStudyStats] = useState({
        total: 0,
        needsReview: 0
    });
    const [answeredCards, setAnsweredCards] = useState(new Set());

    useEffect(() => {
        if (set) {
            loadFlashcards();
        }
    }, [set]);

    const loadFlashcards = async () => {
        try {
            const { data, error } = await supabase
                .from('flashcards')
                .select('*')
                .eq('set_id', set.id);

            if (error) throw error;

            // Shuffle the cards for variety
            const shuffledCards = [...data].sort(() => Math.random() - 0.5);
            setFlashcards(shuffledCards);
            setCurrentIndex(0);
            setIsFlipped(false);
            setShowAnswerButtons(false);
            setAnsweredCards(new Set());
            setStudyStats({ total: 0, needsReview: 0 });
            setIsComplete(false);
        } catch (err) {
            console.error('Error loading flashcards:', err);
        } finally {
            setLoading(false);
        }
    };

    const checkCompletion = () => {
        // Set is complete if we've answered all cards
        if (answeredCards.size === flashcards.length) {
            setIsComplete(true);
        }
    };

    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsFlipped(false);
            setShowAnswerButtons(false);
        }
        checkCompletion();
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsFlipped(false);
            setShowAnswerButtons(false);
        }
        checkCompletion();
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
            const { error } = await supabase
                .from('flashcards')
                .update({
                    needs_review: !isCorrect,
                    last_reviewed: new Date().toISOString()
                })
                .eq('id', currentCard.id);

            if (error) throw error;

            // Update local state to reflect the change
            const updatedFlashcards = [...flashcards];
            updatedFlashcards[currentIndex] = {
                ...currentCard,
                needs_review: !isCorrect,
                last_reviewed: new Date().toISOString()
            };
            setFlashcards(updatedFlashcards);

            // Mark card as answered
            setAnsweredCards(prev => new Set([...prev, currentCard.id]));

            // Update study stats
            setStudyStats(prev => ({
                total: prev.total + 1,
                needsReview: prev.needsReview + (!isCorrect ? 1 : 0)
            }));

            // Move to next card if available
            if (currentIndex < flashcards.length - 1) {
                handleNext();
            } else {
                checkCompletion();
            }
        } catch (err) {
            console.error('Error updating card:', err);
        }
    };

    if (loading) return <div className="text-center p-4">Loading flashcards...</div>;
    if (!flashcards.length) return <div className="text-center p-4">No flashcards in this set.</div>;

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-[#1d2937] to-gray-900 flex items-center justify-center p-4">
            <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl w-full max-w-4xl overflow-hidden border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.3)]">
                {isComplete ? (
                    <div className="p-8 text-center">
                        <div className="mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#1d2937]/20 backdrop-blur-xl mb-4">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Study Session Complete!</h2>
                            <p className="text-gray-300 text-lg">
                                You've studied {studyStats.total} cards
                                {studyStats.needsReview > 0 && ` and marked ${studyStats.needsReview} for review`}.
                            </p>
                        </div>
                        <div className="space-y-3">
                            {studyStats.needsReview > 0 && (
                                <button
                                    onClick={onClose}
                                    className="w-full px-6 py-3 bg-white/10 backdrop-blur-xl text-white border-2 border-white/30 rounded-xl hover:bg-white/20 transform hover:scale-[1.02] transition-all duration-200 font-medium flex items-center justify-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                    Review {studyStats.needsReview} Cards
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="w-full px-6 py-3 bg-[#1d2937] text-white rounded-xl hover:bg-[#2d3947] transform hover:scale-[1.02] transition-all duration-200 font-medium flex items-center justify-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Close Session
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center p-6 border-b border-white/10">
                            <div className="flex items-center space-x-4">
                                <div className="text-xl font-semibold text-white">
                                    {currentIndex + 1}/{flashcards.length}
                                </div>
                                <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#1d2937] to-blue-500 transition-all duration-300"
                                        style={{ width: `${(currentIndex + 1) / flashcards.length * 100}%` }}
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
                                                {flashcards[currentIndex]?.front_content}
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
                                                {flashcards[currentIndex]?.back_content}
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
                        </div>
                    </>
                )}
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
