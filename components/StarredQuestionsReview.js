import { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';

export default function StarredQuestionsReview({ test, onClose }) {
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(null);

    if (!test || !test.questions || test.questions.length === 0) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-[#1d2937] to-gray-900 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-white/20">
                    <h3 className="text-2xl font-bold text-white mb-4">No Questions Available</h3>
                    <p className="text-gray-300 mb-6">There are no starred questions available for review.</p>
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-[#1d2937] text-white rounded-xl hover:bg-[#2d3947] transform hover:scale-[1.02] transition-all duration-200 font-medium"
                    >
                        Return to Tests
                    </button>
                </div>
            </div>
        );
    }

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
                if (answers[index]?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()) {
                    correct++;
                }
            }
        });
        return Math.round((correct / test.questions.length) * 100);
    };

    const handleSubmit = () => {
        const finalScore = calculateScore();
        setScore(finalScore);
        setSubmitted(true);
    };

    const handleReset = () => {
        setAnswers({});
        setSubmitted(false);
        setScore(null);
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-[#1d2937] to-gray-900 overflow-hidden">
            <div className="h-full w-full overflow-auto p-4">
                <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl w-full max-w-4xl mx-auto mb-8 overflow-hidden border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.3)]">
                    <div className="flex justify-between items-center p-6 border-b border-white/10 sticky top-0 bg-[#1d2937]/80 backdrop-blur-xl z-10">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center">
                                <StarIcon className="h-6 w-6 text-yellow-400 mr-2" />
                                {test.title || `Test #${test.id}`} - Starred Questions
                            </h2>
                            <p className="text-gray-300 mt-1">
                                {test.questions.length} questions
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {submitted ? (
                        <div className="p-8 text-center">
                            <div className="mb-8">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#1d2937]/20 backdrop-blur-xl mb-4">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2">Review Complete!</h2>
                                <p className="text-gray-300 text-lg">
                                    Your Score: {score}%
                                </p>
                            </div>
                            <div className="space-y-3">
                                <button
                                    onClick={handleReset}
                                    className="w-full px-6 py-3 bg-white/10 backdrop-blur-xl text-white border-2 border-white/30 rounded-xl hover:bg-white/20 transform hover:scale-[1.02] transition-all duration-200 font-medium"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full px-6 py-3 bg-[#1d2937] text-white rounded-xl hover:bg-[#2d3947] transform hover:scale-[1.02] transition-all duration-200 font-medium"
                                >
                                    Close Review
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 space-y-6">
                            {test.questions.map((question, index) => (
                                <div key={index} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                                    <p className="text-lg font-medium text-white mb-4 flex items-start">
                                        <span className="mr-3 text-gray-400">{index + 1}.</span>
                                        <span>{question.question}</span>
                                    </p>

                                    {question.type === 'multiple_choice' ? (
                                        <div className="space-y-3">
                                            {question.options?.map((choice, choiceIndex) => (
                                                <label
                                                    key={choiceIndex}
                                                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`question-${index}`}
                                                        value={choice}
                                                        checked={answers[index] === choice}
                                                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                                                        disabled={submitted}
                                                        className="form-radio text-blue-500 border-white/30 focus:ring-blue-500 focus:ring-offset-0 bg-transparent"
                                                    />
                                                    <span className="text-gray-200">
                                                        {String.fromCharCode(65 + choiceIndex)}. {choice}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={answers[index] || ''}
                                            onChange={(e) => handleAnswerChange(index, e.target.value)}
                                            placeholder="Type your answer..."
                                            disabled={submitted}
                                            className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    )}

                                    {submitted && (
                                        <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
                                            <p className={`text-base ${
                                                answers[index]?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
                                                    ? 'text-green-400'
                                                    : 'text-red-400'
                                            }`}>
                                                Correct Answer: {
                                                    question.type === 'multiple_choice' 
                                                        ? `${String.fromCharCode(65 + question.options.indexOf(question.correctAnswer))}. ${question.correctAnswer}`
                                                        : question.correctAnswer
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button
                                onClick={handleSubmit}
                                className="w-full mt-8 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-[1.02] transition-all duration-200 font-medium shadow-lg shadow-blue-500/25"
                            >
                                Check Answers
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
