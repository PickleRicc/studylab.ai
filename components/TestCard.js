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
            className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
            onClick={(e) => {
                // Prevent triggering onSelect when clicking the title input
                if (e.target.tagName !== 'INPUT') {
                    onSelect(test);
                }
            }}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex-grow">
                    {isEditing ? (
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={handleTitleChange}
                            onBlur={() => setIsEditing(false)}
                            className="w-full px-2 py-1 text-lg font-semibold border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div className="flex items-center">
                            <h3 className="text-lg font-semibold text-gray-900 mr-2">
                                {title}
                            </h3>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                            >
                                <PencilIcon className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                    <p className="text-sm text-gray-500">
                        {formatDate(test.created_at)}
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        {test.questions?.length || 0} questions
                    </div>
                    {test.last_score !== undefined && (
                        <div className={`mt-1 px-2 py-1 text-xs font-medium rounded ${
                            test.last_score >= 70 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            Last Score: {test.last_score}%
                        </div>
                    )}
                </div>
            </div>
            <div className="text-sm text-gray-600">
                <p>Question Types: {test.config?.questionTypes?.join(', ')}</p>
                <p>Difficulty: {test.config?.difficulty}</p>
            </div>
        </div>
    );
}
