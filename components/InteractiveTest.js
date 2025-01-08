import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export default function InteractiveTest({ test, onClose, onTestComplete, starredOnly = false }) {
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(null);
    const [bestScore, setBestScore] = useState(null);
    const [isNewHighScore, setIsNewHighScore] = useState(false);
    const [attemptHistory, setAttemptHistory] = useState([]);
    const [starredQuestions, setStarredQuestions] = useState({});
    const [displayQuestions, setDisplayQuestions] = useState([]);
    const [mode, setMode] = useState('all');
    const scoreRef = useRef(null);

    useEffect(() => {
        fetchTestHistory();
        fetchStarredQuestions();
    }, [test.id]);

    useEffect(() => {
        if (test?.questions) {
            if (mode === 'starred') {
                const filteredQuestions = test.questions.filter((_, index) => starredQuestions[index]);
                setDisplayQuestions(filteredQuestions);
            } else {
                setDisplayQuestions(test.questions);
            }
        }
    }, [test.questions, starredQuestions, mode]);

    useEffect(() => {
        if (submitted && scoreRef.current) {
            scoreRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [submitted]);

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
        const isNewBest = finalScore > (bestScore || 0);
        setScore(finalScore);
        setSubmitted(true);
        setIsNewHighScore(isNewBest);

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
                    best_score: isNewBest ? finalScore : bestScore
                })
                .eq('id', test.id);

            if (updateError) throw updateError;

            // Refresh test history
            await fetchTestHistory();

            // Notify parent component of test completion without closing
            if (onTestComplete) {
                onTestComplete(test.id, finalScore, false);
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

    const handleModeChange = (newMode) => {
        if (!submitted) {
            setMode(newMode);
            setAnswers({});
        }
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-[#10002b] to-[#240046] overflow-hidden">
            <div className="h-full w-full overflow-auto p-4">
                <div className="relative bg-[#240046]/80 backdrop-blur-xl rounded-2xl w-full max-w-4xl mx-auto mb-8 overflow-hidden border border-[#3c096c] shadow-[0_8px_32px_0_rgba(31,38,135,0.3)]">
                    <div className="flex justify-between items-center p-6 border-b border-[#3c096c] sticky top-0 bg-[#240046]/80 backdrop-blur-xl z-10">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center">
                                {test.title || `Test #${test.id}`}
                            </h2>
                            <p className="text-white/80 mt-1">
                                {mode === 'starred' ? `${displayQuestions.length} starred questions` : `${test.questions.length} questions`}
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            {!submitted && (
                                <div className="flex rounded-lg overflow-hidden border border-[#3c096c]">
                                    <button
                                        onClick={() => handleModeChange('all')}
                                        className={`px-4 py-2 text-sm transition-all ${
                                            mode === 'all'
                                                ? 'bg-[#4361ee] text-white'
                                                : 'text-white/80 hover:bg-[#3c096c]'
                                        }`}
                                    >
                                        All Questions
                                    </button>
                                    <button
                                        onClick={() => handleModeChange('starred')}
                                        className={`px-4 py-2 text-sm transition-all ${
                                            mode === 'starred'
                                                ? 'bg-[#4361ee] text-white'
                                                : 'text-white/80 hover:bg-[#3c096c]'
                                        }`}
                                    >
                                        Starred Only
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={onClose}
                                className="text-white/80 hover:text-[#4cc9f0] p-2 rounded-lg hover:bg-[#3c096c] transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {submitted ? (
                        <div className="p-6 space-y-6">
                            {/* Score Summary Section */}
                            <div ref={scoreRef} className="bg-[#3c096c]/20 backdrop-blur-xl rounded-xl p-6 border border-[#3c096c]">
                                <div className="text-center mb-6">
                                    {isNewHighScore && (
                                        <div className="animate-bounce mb-4">
                                            <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#4cc9f0]/20 text-[#4cc9f0] text-sm font-medium">
                                                🏆 New High Score!
                                            </div>
                                        </div>
                                    )}
                                    <h2 className="text-3xl font-bold text-white mb-2">Test Complete!</h2>
                                    <p className="text-lg text-white/80 mb-2">
                                        Your Score: {score}%
                                        {mode === 'starred' && <span className="text-sm ml-2">(Starred Questions Only)</span>}
                                    </p>
                                    <p className="text-sm text-white/60">
                                        {isNewHighScore ? (
                                            <span className="text-[#4cc9f0]">Previous Best: {bestScore || 0}%</span>
                                        ) : (
                                            bestScore && `Personal Best: ${bestScore}%`
                                        )}
                                    </p>
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={handleReset}
                                        className="flex-1 px-6 py-3 bg-[#4361ee] text-white rounded-xl hover:bg-[#4cc9f0] transform hover:scale-[1.02] transition-all duration-200 font-medium"
                                    >
                                        Retake Test
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-6 py-3 bg-[#3c096c] text-white rounded-xl hover:bg-[#4361ee] transform hover:scale-[1.02] transition-all duration-200 font-medium"
                                    >
                                        Close Test
                                    </button>
                                </div>
                            </div>

                            {/* Questions Review Section */}
                            <div className="space-y-6">
                                {displayQuestions.map((question, index) => {
                                    const originalIndex = test.questions.findIndex(q => q.question === question.question);
                                    return (
                                    <div key={originalIndex} className="bg-[#3c096c]/20 backdrop-blur-xl rounded-xl p-6 border border-[#3c096c]">
                                        <div className="flex justify-between items-start mb-4">
                                            <p className="text-lg font-medium text-white flex items-start flex-1">
                                                <span className="mr-3 text-white/60">{index + 1}.</span>
                                                <span>{question.question}</span>
                                            </p>
                                            <button
                                                onClick={() => handleStarQuestion(originalIndex)}
                                                className="ml-4 text-white/80 hover:text-[#4cc9f0] transition-colors"
                                            >
                                                {starredQuestions[originalIndex] ? (
                                                    <StarIconSolid className="h-5 w-5 text-[#4cc9f0]" />
                                                ) : (
                                                    <StarIcon className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>

                                        <div className={`p-4 rounded-lg ${
                                            answers[originalIndex]?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
                                                ? 'bg-green-500/10 border border-green-500/20'
                                                : 'bg-red-500/10 border border-red-500/20'
                                        }`}>
                                            <div className="flex items-center mb-2">
                                                <span className={`text-sm font-medium ${
                                                    answers[originalIndex]?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
                                                        ? 'text-green-400'
                                                        : 'text-red-400'
                                                }`}>
                                                    {answers[originalIndex]?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
                                                        ? '✓ Correct'
                                                        : '✗ Incorrect'}
                                                </span>
                                            </div>
                                            <p className="text-base text-white/60">
                                                <span className="text-white/60">Your answer: </span>
                                                {answers[originalIndex] ? (
                                                    question.type === 'multiple_choice'
                                                        ? `${String.fromCharCode(65 + question.options.indexOf(answers[originalIndex]))}. ${answers[originalIndex]}`
                                                        : answers[originalIndex]
                                                ) : 'Not answered'}
                                            </p>
                                            <p className="text-base text-white/60 mt-1">
                                                <span className="text-white/60">Correct answer: </span>
                                                {question.type === 'multiple_choice'
                                                    ? `${String.fromCharCode(65 + question.options.indexOf(question.correctAnswer))}. ${question.correctAnswer}`
                                                    : question.correctAnswer}
                                            </p>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 space-y-6">
                            {displayQuestions.map((question, index) => {
                                const originalIndex = test.questions.findIndex(q => q.question === question.question);
                                return (
                                <div key={originalIndex} className="bg-[#3c096c]/20 backdrop-blur-xl rounded-xl p-6 border border-[#3c096c]">
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="text-lg font-medium text-white flex items-start flex-1">
                                            <span className="mr-3 text-white/60">{index + 1}.</span>
                                            <span>{question.question}</span>
                                        </p>
                                        <button
                                            onClick={() => handleStarQuestion(originalIndex)}
                                            className="ml-4 text-white/80 hover:text-[#4cc9f0] transition-colors"
                                        >
                                            {starredQuestions[originalIndex] ? (
                                                <StarIconSolid className="h-5 w-5 text-[#4cc9f0]" />
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
                                                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-[#3c096c]/40 cursor-pointer transition-all"
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`question-${originalIndex}`}
                                                        value={choice}
                                                        onChange={(e) => handleAnswerChange(originalIndex, e.target.value)}
                                                        disabled={submitted}
                                                        className="form-radio text-[#4361ee] border-white/30 focus:ring-[#4361ee] focus:ring-offset-0 bg-transparent"
                                                    />
                                                    <span className="text-white/80">
                                                        {String.fromCharCode(65 + choiceIndex)}. {choice}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder="Type your answer..."
                                            onChange={(e) => handleAnswerChange(originalIndex, e.target.value)}
                                            disabled={submitted}
                                            className="w-full p-3 bg-[#3c096c]/20 border border-[#3c096c] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#4361ee] focus:border-transparent"
                                        />
                                    )}

                                    {submitted && (
                                        <div className="mt-4 space-y-3">
                                            <div className={`p-4 rounded-lg ${
                                                answers[originalIndex]?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
                                                    ? 'bg-green-500/10 border border-green-500/20'
                                                    : 'bg-red-500/10 border border-red-500/20'
                                            }`}>
                                                <div className="flex items-center mb-2">
                                                    <span className={`text-sm font-medium ${
                                                        answers[originalIndex]?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                    }`}>
                                                        {answers[originalIndex]?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
                                                            ? '✓ Correct'
                                                            : '✗ Incorrect'}
                                                    </span>
                                                </div>
                                                <p className="text-base text-white/60">
                                                    <span className="text-white/60">Your answer: </span>
                                                    {answers[originalIndex] ? (
                                                        question.type === 'multiple_choice'
                                                            ? `${String.fromCharCode(65 + question.options.indexOf(answers[originalIndex]))}. ${answers[originalIndex]}`
                                                            : answers[originalIndex]
                                                    ) : 'Not answered'}
                                                </p>
                                                <p className="text-base text-white/60 mt-1">
                                                    <span className="text-white/60">Correct answer: </span>
                                                    {question.type === 'multiple_choice'
                                                        ? `${String.fromCharCode(65 + question.options.indexOf(question.correctAnswer))}. ${question.correctAnswer}`
                                                        : question.correctAnswer}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )})}

                            <button
                                onClick={handleSubmit}
                                className="w-full mt-8 px-6 py-3 bg-[#4361ee] text-white rounded-xl hover:bg-[#4cc9f0] transform hover:scale-[1.02] transition-all duration-200 font-medium shadow-lg shadow-[#4361ee]/25"
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
