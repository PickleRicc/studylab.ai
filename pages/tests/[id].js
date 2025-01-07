import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabase';
import DashboardNav from '../../components/DashboardNav';

export default function TestDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchTest();
    }
  }, [id]);

  const fetchTest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: test, error } = await supabase
        .from('tests')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!test) throw new Error('Test not found');

      setTest(test);
    } catch (error) {
      console.error('Error fetching test:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <DashboardNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-red-500">Error: {error}</p>
            <button
              onClick={() => router.push('/tests')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Back to Tests
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gray-100">
        <DashboardNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-500">Test not found</p>
            <button
              onClick={() => router.push('/tests')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Back to Tests
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{test.title || 'Untitled Test'}</h1>
            <p className="text-gray-500 mt-2">Created on {new Date(test.created_at).toLocaleDateString()}</p>
          </div>

          {test.questions && test.questions.length > 0 ? (
            <div className="space-y-6">
              {test.questions.map((question, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-3">
                    {index + 1}. {question.question}
                  </p>
                  <ul className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <li
                        key={optIndex}
                        className={`p-2 rounded ${
                          test.answers && test.answers[index] === optIndex
                            ? option === question.correct_answer
                              ? 'bg-green-100'
                              : 'bg-red-100'
                            : 'bg-gray-50'
                        }`}
                      >
                        {option}
                        {test.answers && test.answers[index] === optIndex && (
                          <span className="ml-2">
                            {option === question.correct_answer ? '✓' : '✗'}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {test.answers && test.answers[index] !== null && (
                    <p className="mt-2 text-sm text-gray-600">
                      Explanation: {question.explanation || 'No explanation provided'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No questions available</p>
          )}

          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={() => router.push('/tests')}
              className="text-blue-600 hover:text-blue-800"
            >
              Back to Tests
            </button>
            {!test.completed && (
              <button
                onClick={() => router.push(`/tests/${id}/take`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Take Test
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
