import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import TestCard from '../components/TestCard';
import InteractiveTest from '../components/InteractiveTest';
import DashboardNav from '../components/DashboardNav';

export default function Tests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [activeTab, setActiveTab] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const testsPerPage = 6;

  useEffect(() => {
    loadTests();
  }, []);

  const handleTestUpdate = async (updatedTest) => {
    setTests(prevTests => 
      prevTests.map(test => test.id === updatedTest.id ? updatedTest : test)
    );

    try {
      const { data, error } = await supabase
        .from('tests')
        .select('title')
        .eq('id', updatedTest.id)
        .single();

      if (error) throw error;
      if (data.title !== updatedTest.title) {
        await loadTests();
      }
    } catch (error) {
      console.error('Error verifying test update:', error);
      await loadTests();
    }
  };

  const handleTestComplete = (testId, score) => {
    setTests(prevTests =>
      prevTests.map(test =>
        test.id === testId
          ? { ...test, last_score: score }
          : test
      )
    );
  };

  const loadTests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const { data: tests, error } = await supabase
        .from('tests')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(tests || []);
    } catch (error) {
      console.error('Error loading tests:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterTests = () => {
    switch (activeTab) {
      case 'recent':
        return [...tests].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
      case 'highScores':
        return [...tests]
          .filter(test => test.last_score !== undefined)
          .sort((a, b) => (b.last_score || 0) - (a.last_score || 0));
      case 'needsPractice':
        return [...tests]
          .filter(test => test.last_score === undefined || test.last_score < 70)
          .sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          );
      default:
        return tests;
    }
  };

  const filteredTests = filterTests();
  const totalPages = Math.ceil(filteredTests.length / testsPerPage);
  const currentTests = filteredTests.slice(
    (currentPage - 1) * testsPerPage,
    currentPage * testsPerPage
  );

  const renderTabs = () => (
    <div className="flex space-x-2 mb-8">
      {[
        { id: 'recent', label: 'Recent Tests' },
        { id: 'highScores', label: 'High Scores' },
        { id: 'needsPractice', label: 'Needs Practice' }
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => {
            setActiveTab(tab.id);
            setCurrentPage(1);
          }}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
            activeTab === tab.id
              ? 'bg-white/20 backdrop-blur-xl text-white shadow-lg'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const renderPagination = () => (
    <div className="flex justify-center items-center mt-8 space-x-2">
      <button
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-all duration-200"
      >
        Previous
      </button>
      <span className="px-4 py-2 text-white/70">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-all duration-200"
      >
        Next
      </button>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-white/70">Loading tests...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8">
          <p className="text-red-400">{error}</p>
        </div>
      );
    }

    if (tests.length === 0) {
      return (
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-12 text-center">
          <h3 className="text-2xl font-medium text-white mb-4">No Tests Created Yet</h3>
          <p className="text-white/70 mb-8">Upload a file and select "Generate Test" to create your first test!</p>
        </div>
      );
    }

    return (
      <>
        {renderTabs()}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {currentTests.map(test => (
            <TestCard
              key={test.id}
              test={test}
              onSelect={setSelectedTest}
              onUpdate={handleTestUpdate}
            />
          ))}
        </div>
        {totalPages > 1 && renderPagination()}
      </>
    );
  };

  if (selectedTest) {
    return (
      <InteractiveTest
        test={selectedTest}
        onClose={() => setSelectedTest(null)}
        onComplete={handleTestComplete}
      />
    );
  }

  return (
    <div>
      <DashboardNav />
      <div className="min-h-screen bg-gradient-to-br from-[#1d2937] to-gray-900">
        <div className="container mx-auto px-6 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">My Tests</h1>
            <p className="text-white/70 text-lg">Generate and take tests to assess your knowledge.</p>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
