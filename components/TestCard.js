import { useState } from 'react';
import { format } from 'date-fns';

export default function TestCard({ test, onSelect }) {
    const formatDate = (dateString) => {
        try {
            return format(new Date(dateString), 'MMM d, yyyy h:mm a');
        } catch (error) {
            return 'Invalid date';
        }
    };

    return (
        <div 
            onClick={() => onSelect(test)}
            className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        Test #{test.id}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {formatDate(test.created_at)}
                    </p>
                </div>
                <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {test.questions?.length || 0} questions
                </div>
            </div>
            <div className="text-sm text-gray-600">
                <p>Question Types: {test.config?.questionTypes?.join(', ')}</p>
                <p>Difficulty: {test.config?.difficulty}</p>
            </div>
        </div>
    );
}
