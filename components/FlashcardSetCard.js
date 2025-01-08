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
        <div className="relative bg-[#240046] rounded-lg border border-[#3c096c] transition-all duration-300 transform hover:-translate-y-1">
            <div className="relative">
                <div className="p-6 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        {isEditing ? (
                            <form onSubmit={handleSubmit} className="flex-1">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-[#3c096c] rounded-lg focus:outline-none focus:border-[#4361ee] focus:ring-2 focus:ring-[#4361ee]/20 transition-colors bg-[#3c096c]/50"
                                    autoFocus
                                />
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="submit"
                                        className="px-3 py-1 bg-[#4361ee] text-white rounded-lg hover:bg-[#4cc9f0] transition-colors"
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTitle(set.title);
                                            setIsEditing(false);
                                        }}
                                        className="px-3 py-1 bg-[#3c096c] text-white rounded-lg hover:bg-[#4361ee] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-white mb-2">{set.title}</h3>
                                <p className="text-white/60 text-sm">{set.description || 'No description'}</p>
                            </div>
                        )}
                        
                        <div className="flex gap-2 ml-4">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-[#4cc9f0] hover:text-[#4361ee] transition-colors"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => onDelete(set.id)}
                                className="text-[#4cc9f0] hover:text-[#4361ee] transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-[#3c096c] rounded-lg p-3">
                            <p className="text-sm text-white/60">Total Cards</p>
                            <p className="text-lg font-semibold text-white">{cardStats.total}</p>
                        </div>
                        <div className="bg-[#3c096c] rounded-lg p-3">
                            <p className="text-sm text-white/60">Needs Review</p>
                            <p className="text-lg font-semibold text-white">{cardStats.needsReview}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => onStudy(set.id)}
                            className="flex-1 px-4 py-2 bg-[#4361ee] text-white rounded-lg hover:bg-[#4cc9f0] transition-colors"
                        >
                            Study
                        </button>
                        <button
                            onClick={() => onReview(set.id)}
                            className="flex-1 px-4 py-2 bg-[#3c096c] text-white rounded-lg hover:bg-[#4361ee] transition-colors"
                        >
                            Review
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
