import { useState } from 'react';
import { supabase } from '../utils/supabase';

export default function InteractiveTest({ test, onClose, onTestComplete }) {
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(null);

    const handleAnswerChange = (questionIndex, answer) => {
        setAnswers(prev => ({
            ...prev,
            [questionIndex]: answer
        }));
    };

    const calculateScore = () => {
        let correct = 0;
        test.questions.forEach((question, index) => {
            if (question.type === 'multiple_choice') {
                if (answers[index] === question.correctAnswer) {
                    correct++;
                }
            } else if (question.type === 'short_answer') {
                // For short answers, we'll do a simple case-insensitive comparison
                // You might want to implement more sophisticated answer checking
                if (answers[index]?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()) {
                    correct++;
                }
            }
        });
        return Math.round((correct / test.questions.length) * 100);
    };

    const handleSubmit = async () => {
        const finalScore = calculateScore();
        setScore(finalScore);
        setSubmitted(true);

        try {
            // Update the test's last score
            const { error } = await supabase
                .from('tests')
                .update({ last_score: finalScore })
                .eq('id', test.id);

            if (error) throw error;

            // Notify parent component of test completion
            if (onTestComplete) {
                onTestComplete(test.id, finalScore);
            }
        } catch (error) {
            console.error('Error saving test score:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-5 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {test.title || `Test #${test.id}`}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {test.questions?.length} questions • {test.config?.difficulty} difficulty
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>

                {submitted && (
                    <div className={`mb-4 p-4 rounded ${
                        score >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                        Your Score: {score}%
                    </div>
                )}

                <div className="space-y-6">
                    {test?.questions?.map((question, index) => (
                        <div key={index} className="p-4 border rounded">
                            <p className="font-medium mb-3">
                                {index + 1}. {question.question}
                            </p>

                            {question.type === 'multiple_choice' ? (
                                <div className="space-y-2">
                                    {question.options?.map((choice, choiceIndex) => (
                                        <label
                                            key={choiceIndex}
                                            className="flex items-center space-x-2 cursor-pointer"
                                        >
                                            <input
                                                type="radio"
                                                name={`question-${index}`}
                                                value={choice}
                                                onChange={(e) => handleAnswerChange(index, e.target.value)}
                                                disabled={submitted}
                                                className="form-radio"
                                            />
                                            <span>{choice}</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Type your answer..."
                                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                                    disabled={submitted}
                                    className="w-full p-2 border rounded"
                                />
                            )}

                            {submitted && (
                                <div className="mt-3">
                                    <p className={`text-sm ${
                                        answers[index]?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
                                            ? 'text-green-600'
                                            : 'text-red-600'
                                    }`}>
                                        Correct Answer: {question.correctAnswer}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {!submitted && (
                    <div className="mt-6">
                        <button
                            onClick={handleSubmit}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                        >
                            Submit Test
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
