import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function FlashcardSetCard({ set, onUpdate, onDelete, onStudy, onReview }) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(set.title);
    const [cardStats, setCardStats] = useState({
        total: 0,
        needsReview: 0
    });

    useEffect(() => {
        const subscription = supabase
            .channel(`flashcard-changes-${set.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'flashcards',
                filter: `set_id=eq.${set.id}`
            }, () => {
                fetchCardStats();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [set.id]);

    useEffect(() => {
        fetchCardStats();
    }, [set.id]);

    const fetchCardStats = async () => {
        try {
            const { data: cards, error } = await supabase
                .from('flashcards')
                .select('*')
                .eq('set_id', set.id);

            if (error) throw error;

            setCardStats({
                total: cards.length,
                needsReview: cards.filter(card => card.needs_review).length
            });
        } catch (err) {
            console.error('Error fetching card stats:', err);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate({ ...set, title });
        setIsEditing(false);
    };

    return (
        <div className="relative bg-gradient-to-b from-white/80 to-white/60 backdrop-blur-xl rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.17)] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-white/30 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:to-transparent before:rounded-xl">
            <div className="relative">
                <div className="p-6 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        {isEditing ? (
                            <form onSubmit={handleSubmit} className="flex-1">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-white/50 rounded-lg focus:outline-none focus:border-[#1d2937] focus:ring-2 focus:ring-[#1d2937]/20 transition-colors bg-white/30 backdrop-blur-xl"
                                    autoFocus
                                />
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="submit"
                                        className="px-3 py-1 bg-[#1d2937] text-white rounded-lg hover:bg-[#2d3947] transition-colors shadow-[0_4px_12px_0_rgba(31,38,135,0.15)]"
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTitle(set.title);
                                            setIsEditing(false);
                                        }}
                                        className="px-3 py-1 bg-white/30 backdrop-blur-xl text-gray-700 rounded-lg hover:bg-white/40 transition-colors shadow-[0_4px_12px_0_rgba(31,38,135,0.15)]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-[#1d2937] mb-2">{set.title}</h3>
                                <p className="text-gray-500 text-sm">{set.description || 'No description'}</p>
                            </div>
                        )}
                        
                        <div className="flex gap-2 ml-4">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-gray-400 hover:text-[#1d2937] transition-colors"
                                title="Edit title"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onDelete(set.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete set"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/30 backdrop-blur-xl rounded-lg p-3 text-center border border-white/30 shadow-[0_4px_12px_0_rgba(31,38,135,0.15)]">
                            <div className="text-2xl font-bold text-[#1d2937]">{cardStats.total}</div>
                            <div className="text-sm text-gray-500">Total Cards</div>
                        </div>
                        <div className="bg-white/30 backdrop-blur-xl rounded-lg p-3 text-center border border-white/30 shadow-[0_4px_12px_0_rgba(31,38,135,0.15)]">
                            <div className={`text-2xl font-bold ${cardStats.needsReview > 0 ? 'text-[#1d2937]' : 'text-gray-400'}`}>
                                {cardStats.needsReview}
                            </div>
                            <div className="text-sm text-gray-500">To Review</div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => onStudy(set.id)}
                            className="w-full px-4 py-3 bg-[#1d2937] text-white rounded-lg hover:bg-[#2d3947] transform hover:scale-[1.02] transition-all duration-200 font-medium flex items-center justify-center shadow-[0_8px_32px_0_rgba(31,38,135,0.2)]"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            Study Set
                        </button>
                        <button
                            onClick={() => onReview(set.id)}
                            className="w-full px-4 py-3 bg-white/30 backdrop-blur-xl border-2 border-[#1d2937] text-[#1d2937] rounded-lg hover:bg-[#1d2937] hover:text-white transform hover:scale-[1.02] transition-all duration-200 font-medium flex items-center justify-center shadow-[0_8px_32px_0_rgba(31,38,135,0.2)]"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            Review Cards {cardStats.needsReview > 0 ? `(${cardStats.needsReview})` : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
