import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { PencilIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { supabase } from '../utils/supabase';

export default function TestCard({ test, onSelect, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(test.title || `Test #${test.id}`);
    const [starredCount, setStarredCount] = useState(0);

    const formatDate = (dateString) => {
        try {
            return format(new Date(dateString), 'MMM d, yyyy h:mm a');
        } catch (error) {
            return 'Invalid date';
        }
    };

    const handleTitleChange = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newTitle = e.target.value.trim();
            if (newTitle && newTitle !== test.title) {
                try {
                    const { error } = await supabase
                        .from('tests')
                        .update({ title: newTitle })
                        .eq('id', test.id)
                        .select()
                        .single();

                    if (error) throw error;
                    
                    setTitle(newTitle);
                    test.title = newTitle;
                    if (onUpdate) onUpdate({ ...test, title: newTitle });
                } catch (error) {
                    console.error('Error updating test title:', error);
                    setTitle(test.title || `Test #${test.id}`);
                }
            }
            setIsEditing(false);
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setTitle(test.title || `Test #${test.id}`);
        }
    };

    useEffect(() => {
        setTitle(test.title || `Test #${test.id}`);
    }, [test.title, test.id]);

    useEffect(() => {
        fetchStarredCount();
    }, [test.id]);

    const fetchStarredCount = async () => {
        try {
            const { count, error } = await supabase
                .from('starred_questions')
                .select('*', { count: 'exact' })
                .eq('test_id', test.id);

            if (error) throw error;
            setStarredCount(count || 0);
        } catch (error) {
            console.error('Error fetching starred count:', error);
        }
    };

    return (
        <div 
            onClick={() => onSelect(test)}
            className="relative bg-[#240046] rounded-lg border border-[#3c096c] transition-all duration-300 transform hover:-translate-y-1"
        >
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        {isEditing ? (
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={handleTitleChange}
                                onBlur={() => setIsEditing(false)}
                                className="w-full px-3 py-2 border-2 border-[#3c096c] rounded-lg focus:outline-none focus:border-[#4361ee] focus:ring-2 focus:ring-[#4361ee]/20 transition-colors bg-[#240046] text-white"
                                autoFocus
                                onClick={e => e.stopPropagation()}
                            />
                        ) : (
                            <div className="group flex items-center">
                                <h3 className="text-xl font-semibold text-white">{title}</h3>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditing(true);
                                    }}
                                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <PencilIcon className="h-4 w-4 text-[#4cc9f0] hover:text-[#4361ee] transition-colors" />
                                </button>
                            </div>
                        )}
                        <p className="text-white/60 text-sm mt-1">Created {formatDate(test.created_at)}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#3c096c] rounded-lg p-3">
                        <p className="text-sm text-white/60">Best Score</p>
                        <p className="text-lg font-semibold text-white">
                            {test.best_score !== null ? `${Math.round(test.best_score)}%` : 'Not taken'}
                        </p>
                    </div>
                    <div className="bg-[#3c096c] rounded-lg p-3">
                        <p className="text-sm text-white/60">Last Score</p>
                        <p className="text-lg font-semibold text-white">
                            {test.last_score !== null ? `${Math.round(test.last_score)}%` : 'Not taken'}
                        </p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-[#3c096c] rounded-lg p-3">
                        <p className="text-sm text-white/60">Question Types</p>
                        <p className="text-[#4cc9f0] font-medium">
                            {test.config?.questionTypes?.join(', ') || 'Not specified'}
                        </p>
                    </div>
                    <div className="bg-[#3c096c] rounded-lg p-3">
                        <p className="text-sm text-white/60">Difficulty</p>
                        <p className="text-[#4cc9f0] font-medium capitalize">
                            {test.config?.difficulty || 'Not specified'}
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex items-center text-sm text-white/60">
                    <StarIcon className="h-4 w-4 text-[#4cc9f0] mr-1" />
                    <span>{starredCount} starred questions</span>
                    <span className="mx-2">•</span>
                    <span>{test.questions?.length || 0} questions</span>
                </div>
            </div>
        </div>
    );
}
