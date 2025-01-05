import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { PencilIcon } from '@heroicons/react/24/outline';
import { supabase } from '../utils/supabase';

export default function TestCard({ test, onSelect, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(test.title || `Test #${test.id}`);

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
                    
                    // Update local state and parent component
                    setTitle(newTitle);
                    test.title = newTitle; // Update the test object
                    if (onUpdate) onUpdate({ ...test, title: newTitle });
                } catch (error) {
                    console.error('Error updating test title:', error);
                    // Revert to original title on error
                    setTitle(test.title || `Test #${test.id}`);
                }
            }
            setIsEditing(false);
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            // Revert to original title on cancel
            setTitle(test.title || `Test #${test.id}`);
        }
    };

    useEffect(() => {
        setTitle(test.title || `Test #${test.id}`);
    }, [test.title, test.id]);

    return (
        <div 
            className="relative bg-gradient-to-b from-white/80 to-white/60 backdrop-blur-xl rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.17)] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-white/30 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:to-transparent before:rounded-xl"
            onClick={(e) => {
                if (e.target.tagName !== 'INPUT') {
                    onSelect(test);
                }
            }}
        >
            <div className="relative">
                <div className="p-6 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-grow">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onKeyDown={handleTitleChange}
                                    onBlur={() => setIsEditing(false)}
                                    className="w-full px-3 py-2 border-2 border-white/50 rounded-lg focus:outline-none focus:border-[#1d2937] focus:ring-2 focus:ring-[#1d2937]/20 transition-colors bg-white/30 backdrop-blur-xl"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <div className="flex items-center">
                                    <h3 className="text-xl font-semibold text-[#1d2937] mr-2">
                                        {title}
                                    </h3>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsEditing(true);
                                        }}
                                        className="p-1 text-gray-400 hover:text-[#1d2937] transition-colors"
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                                {formatDate(test.created_at)}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="px-4 py-2 bg-[#1d2937]/10 backdrop-blur-xl text-[#1d2937] text-sm font-medium rounded-lg">
                                {test.questions?.length || 0} questions
                            </div>
                            {test.last_score !== undefined && (
                                <div className={`px-4 py-2 backdrop-blur-xl text-sm font-medium rounded-lg ${
                                    test.last_score >= 70 
                                        ? 'bg-green-500/10 text-green-700' 
                                        : 'bg-yellow-500/10 text-yellow-700'
                                }`}>
                                    Last Score: {test.last_score}%
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg">
                            <p className="text-sm text-[#1d2937]">
                                <span className="font-medium">Types:</span>{' '}
                                {test.config?.questionTypes?.join(', ') || 'Not specified'}
                            </p>
                        </div>
                        <div className="px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg">
                            <p className="text-sm text-[#1d2937]">
                                <span className="font-medium">Difficulty:</span>{' '}
                                {test.config?.difficulty || 'Not specified'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
