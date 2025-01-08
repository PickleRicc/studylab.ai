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
  const [selectedTest, setSelectedTest] = useState(null);
  const [activeTab, setActiveTab] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const testsPerPage = 6;

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
      setTests([]); // Set empty array on error
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      );
    }

    if (tests.length === 0) {
      return (
        <div className="bg-[#560bad]/30 backdrop-blur-xl rounded-lg p-8 text-center border border-white/20">
          <h3 className="text-lg font-medium text-white mb-2">No Tests Created</h3>
          <p className="text-white/80">Start by uploading study material to generate tests.</p>
        </div>
      );
    }

    const startIndex = (currentPage - 1) * testsPerPage;
    const endIndex = startIndex + testsPerPage;
    const currentTests = activeTab === 'starred'
      ? tests.filter(test => test.starred)
      : tests;
    const paginatedTests = currentTests.slice(startIndex, endIndex);

    return (
      <div>
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'recent'
                ? 'bg-[#4361ee] text-white'
                : 'text-white/80 hover:bg-[#4895ef]/20'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setActiveTab('starred')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'starred'
                ? 'bg-[#4361ee] text-white'
                : 'text-white/80 hover:bg-[#4895ef]/20'
            }`}
          >
            Starred
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedTests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onSelect={() => handleTestSelect(test)}
              onStarClick={(e) => handleStarClick(e, test)}
            />
          ))}
        </div>

        {currentTests.length > testsPerPage && (
          <div className="mt-6 flex justify-center space-x-2">
            {Array.from({ length: Math.ceil(currentTests.length / testsPerPage) }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  currentPage === index + 1
                    ? 'bg-[#4361ee] text-white'
                    : 'text-white/80 hover:bg-[#4895ef]/20'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#10002b] to-[#240046]">
      <DashboardNav />
      <div className="container mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">My Tests</h1>
          <p className="text-white/90 text-lg">Generate and take tests to assess your knowledge.</p>
        </div>
        {selectedTest && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <InteractiveTest
              test={selectedTest}
              onClose={() => {
                setSelectedTest(null);
                router.push('/tests', undefined, { shallow: true });
              }}
              onUpdate={handleTestUpdate}
              onTestComplete={handleTestComplete}
            />
          </div>
        )}
        {!selectedTest && renderContent()}
      </div>
    </div>
  );
}
