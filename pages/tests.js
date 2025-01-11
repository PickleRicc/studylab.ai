import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabase';
import TestCard from '../components/TestCard';
import InteractiveTest from '../components/InteractiveTest';
import DashboardNav from '../components/DashboardNav';

export default function Tests() {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [displayCount, setDisplayCount] = useState(6);

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    const { selected } = router.query;
    if (selected) {
      const test = tests.find(t => t.id === selected);
      if (test) {
        setSelectedTest(test);
      }
    }
  }, [router.query, tests]);

  const fetchTests = async () => {
    try {
      setLoading(true);

      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }
      if (!session) {
        console.log('No session found, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('Current user:', session.user.id);

      // Check if tests table exists
      const { data: tableInfo, error: tableError } = await supabase
        .from('tests')
        .select('*')
        .limit(1);

      if (tableError) {
        console.error('Table error:', tableError);
        throw tableError;
      }

      // Fetch tests for current user
      const { data: testsData, error } = await supabase
        .from('tests')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tests:', error);
        throw error;
      }

      console.log('Fetched tests:', testsData); // Debug log
      setTests(testsData || []);
    } catch (error) {
      console.error('Error in fetchTests:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSelect = (test) => {
    setSelectedTest(test);
    router.push(`/tests?selected=${test.id}`, undefined, { shallow: true });
  };

  const handleTestUpdate = async (updatedTest) => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .update(updatedTest)
        .eq('id', updatedTest.id)
        .single();

      if (error) throw error;

      setTests(tests.map(test => 
        test.id === updatedTest.id ? { ...test, ...updatedTest } : test
      ));
    } catch (error) {
      console.error('Error updating test:', error);
    }
  };

  const handleStarClick = async (e, test) => {
    e.stopPropagation();
    try {
      const updatedTest = { ...test, starred: !test.starred };
      const { error } = await supabase
        .from('tests')
        .update({ starred: updatedTest.starred })
        .eq('id', test.id);

      if (error) throw error;

      setTests(tests.map(t => 
        t.id === test.id ? { ...t, starred: updatedTest.starred } : t
      ));
    } catch (error) {
      console.error('Error updating test starred status:', error);
    }
  };

  const handleTestComplete = async (testId, score) => {
    // Update the tests state immediately with the new score
    setTests(prevTests => prevTests.map(test => {
      if (test.id === testId) {
        return {
          ...test,
          last_score: score,
          best_score: score > (test.best_score || 0) ? score : test.best_score
        };
      }
      return test;
    }));
  };

  const handleShowMore = () => {
    setDisplayCount(prev => prev + 6);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#10002b] to-[#240046]">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8">
        {error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : loading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-white">Test Sets</h1>
            </div>

            {tests.length === 0 ? (
              <div className="text-center text-white/60">
                No tests yet. Create one to get started!
              </div>
            ) : (
              <div className="grid gap-8">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-white/80">Recent Tests</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tests.slice(0, 2).map((test) => (
                      <TestCard
                        key={test.id}
                        test={test}
                        onSelect={() => handleTestSelect(test)}
                        onStarClick={(e) => handleStarClick(e, test)}
                      />
                    ))}
                  </div>
                </div>

                {tests.length > 2 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white/80">All Tests</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-90">
                      {tests.slice(2, displayCount + 2).map((test) => (
                        <TestCard
                          key={test.id}
                          test={test}
                          onSelect={() => handleTestSelect(test)}
                          onStarClick={(e) => handleStarClick(e, test)}
                        />
                      ))}
                    </div>
                    {tests.length > displayCount + 2 && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={handleShowMore}
                          className="px-6 py-3 bg-[#3c096c]/20 backdrop-blur-xl text-white rounded-xl hover:bg-[#3c096c]/40 transform hover:scale-[1.02] transition-all duration-200 font-medium"
                        >
                          Show More Tests
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      {selectedTest && (
        <InteractiveTest
          test={selectedTest}
          onClose={() => setSelectedTest(null)}
          onUpdate={handleTestUpdate}
          onTestComplete={handleTestComplete}
        />
      )}
    </div>
  );
}
