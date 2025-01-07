import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export default function InteractiveTest({ test, onClose, onTestComplete, starredOnly = false }) {
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(null);
    const [bestScore, setBestScore] = useState(null);
    const [attemptHistory, setAttemptHistory] = useState([]);
    const [starredQuestions, setStarredQuestions] = useState({});
    const [displayQuestions, setDisplayQuestions] = useState([]);

    useEffect(() => {
        fetchTestHistory();
        fetchStarredQuestions();
    }, [test.id]);

    useEffect(() => {
        if (test?.questions) {
            if (starredOnly) {
                // Filter questions to only show starred ones
                const filteredQuestions = test.questions.filter((_, index) => starredQuestions[index]);
                setDisplayQuestions(filteredQuestions);
            } else {
                setDisplayQuestions(test.questions);
            }
        }
    }, [test.questions, starredQuestions, starredOnly]);

    const fetchTestHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('test_attempts')
                .select('score')
                .eq('test_id', test.id)
                .order('score', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                setBestScore(data[0].score);
                setAttemptHistory(data);
            }
        } catch (error) {
            console.error('Error fetching test history:', error);
        }
    };

    const fetchStarredQuestions = async () => {
        try {
            const { data, error } = await supabase
                .from('starred_questions')
                .select('*')
                .eq('test_id', test.id);

            if (error) throw error;

            const starredMap = {};
            data.forEach(item => {
                starredMap[item.question_index] = true;
            });
            setStarredQuestions(starredMap);
        } catch (error) {
            console.error('Error fetching starred questions:', error);
        }
    };

    const handleStarQuestion = async (questionIndex) => {
        const question = test.questions[questionIndex];
        const isCurrentlyStarred = starredQuestions[questionIndex];

        try {
            if (isCurrentlyStarred) {
                // Remove star
                const { error } = await supabase
                    .from('starred_questions')
                    .delete()
                    .eq('test_id', test.id)
                    .eq('question_index', questionIndex);

                if (error) throw error;

                setStarredQuestions(prev => {
                    const updated = { ...prev };
                    delete updated[questionIndex];
                    return updated;
                });
            } else {
                // Add star
                const { error } = await supabase
                    .from('starred_questions')
                    .insert({
                        test_id: test.id,
                        question_index: questionIndex,
                        question_text: question.question,
                        correct_answer: question.correctAnswer,
                        question_type: question.type,
                        options: question.options
                    });

                if (error) throw error;

                setStarredQuestions(prev => ({
                    ...prev,
                    [questionIndex]: true
                }));
            }
        } catch (error) {
            console.error('Error updating starred question:', error);
        }
    };

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
            // Save the attempt in test_attempts table
            const { error: attemptError } = await supabase
                .from('test_attempts')
                .insert({
                    test_id: test.id,
                    score: finalScore,
                    answers: answers,
                    attempted_at: new Date().toISOString()
                });

            if (attemptError) throw attemptError;

            // Update the test's last score and best score
            const { error: updateError } = await supabase
                .from('tests')
                .update({ 
                    last_score: finalScore,
                    best_score: bestScore === null ? finalScore : Math.max(finalScore, bestScore)
                })
                .eq('id', test.id);

            if (updateError) throw updateError;

            // Refresh test history
            await fetchTestHistory();

            // Notify parent component of test completion without closing
            if (onTestComplete) {
                onTestComplete(test.id, finalScore, false); // Added false parameter to prevent auto-closing
            }
        } catch (error) {
            console.error('Error saving test score:', error);
        }
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
                                {test.title || `Test #${test.id}`}
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
                                <h2 className="text-3xl font-bold text-white mb-2">Test Complete!</h2>
                                <p className="text-gray-300 text-lg">
                                    Your Score: {score}%
                                </p>
                            </div>
                            <div className="space-y-3">
                                <button
                                    onClick={onClose}
                                    className="w-full px-6 py-3 bg-[#1d2937] text-white rounded-xl hover:bg-[#2d3947] transform hover:scale-[1.02] transition-all duration-200 font-medium"
                                >
                                    Close Test
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 space-y-6">
                            {test.questions.map((question, index) => (
                                <div key={index} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="text-lg font-medium text-white flex items-start flex-1">
                                            <span className="mr-3 text-gray-400">{index + 1}.</span>
                                            <span>{question.question}</span>
                                        </p>
                                        <button
                                            onClick={() => handleStarQuestion(index)}
                                            className="ml-4 text-gray-300 hover:text-yellow-400 transition-colors"
                                        >
                                            {starredQuestions[index] ? (
                                                <StarIconSolid className="h-5 w-5 text-yellow-400" />
                                            ) : (
                                                <StarIcon className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>

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
                                            placeholder="Type your answer..."
                                            onChange={(e) => handleAnswerChange(index, e.target.value)}
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
                                Submit Test
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
