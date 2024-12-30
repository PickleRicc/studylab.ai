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

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Get only the current user's tests
      const { data: tests, error } = await supabase
        .from('tests')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTests(tests || []);
    } catch (error) {
      console.error('Error loading tests:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="animate-pulse">Loading tests...</div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          Error: {error}
        </div>
      );
    }

    return (
      <>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Tests</h1>
          <p className="text-gray-600">Click on a test to start or review it</p>
        </div>

        {tests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No tests found. Generate a test from your uploaded content!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                onSelect={setSelectedTest}
              />
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>

      {selectedTest && (
        <InteractiveTest
          test={selectedTest}
          onClose={() => setSelectedTest(null)}
        />
      )}
    </div>
  );
}
