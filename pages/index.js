import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabase';
import DashboardNav from '../components/DashboardNav';
import FileUpload from '../components/FileUpload';
import TestCard from '../components/TestCard';
import InteractiveTest from '../components/InteractiveTest';
import { DocumentTextIcon, MusicalNoteIcon, AcademicCapIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentMaterials, setRecentMaterials] = useState({
    tests: [],
    flashcards: []
  });
  const [selectedTest, setSelectedTest] = useState(null);
  const [stats, setStats] = useState({
    tests: 0,
    flashcards: 0,
    files: 0
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        router.push('/login');
      } else {
        fetchRecentMaterials();
        fetchStats();
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get test count
      const { count: testCount } = await supabase
        .from('tests')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Get flashcard set count
      const { count: flashcardCount } = await supabase
        .from('flashcard_sets')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Get file count
      const { count: fileCount } = await supabase
        .from('files')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      setStats({
        tests: testCount || 0,
        flashcards: flashcardCount || 0,
        files: fileCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentMaterials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch recent tests
      const { data: tests } = await supabase
        .from('tests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent flashcard sets
      const { data: flashcards } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentMaterials({
        tests: tests || [],
        flashcards: flashcards || []
      });
    } catch (error) {
      console.error('Error fetching recent materials:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleFileUpload = async (result) => {
    await fetchRecentMaterials();
    await fetchStats();
    if (result.flashcardSet) {
      router.push('/flashcards');
    } else if (result.test) {
      router.push('/tests');
    }
  };

  const handleTestSelect = (test) => {
    setSelectedTest(test);
  };

  const handleTestComplete = async (testId, score) => {
    setSelectedTest(null);
    await fetchRecentMaterials(); // Refresh the list to show updated score
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardNav />
      {selectedTest ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <InteractiveTest
            test={selectedTest}
            onClose={() => setSelectedTest(null)}
            onTestComplete={handleTestComplete}
          />
        </div>
      ) : (
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Welcome Message */}
            <div className="mb-8 bg-blue-50 rounded-lg p-6">
              <h1 className="text-lg font-medium text-blue-700">
                Welcome to the Lab,
              </h1>
              <p className="text-2xl font-semibold text-blue-900 mt-1">
                {session?.user?.email?.split('@')[0] || 'User'}
              </p>
            </div>

            {/* Stats Section */}
            <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Tests</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.tests}</dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Flashcard Sets</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.flashcards}</dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Files Uploaded</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.files}</dd>
                </div>
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Files</h2>
                <FileUpload onSuccess={handleFileUpload} />
              </div>

              {/* Recent Study Materials Section */}
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Recent Study Materials</h2>
                
                {/* Recent Tests */}
                {recentMaterials.tests.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                      <AcademicCapIcon className="h-5 w-5 mr-2 text-blue-500" />
                      Recent Tests
                    </h3>
                    <ul className="divide-y divide-gray-200">
                      {recentMaterials.tests.map((test) => (
                        <li key={test.id} className="py-3">
                          <Link href={`/tests?selected=${test.id}`} passHref>
                            <div className="w-full text-left hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{test.title || 'Untitled Test'}</p>
                                  <p className="text-sm text-gray-500">Score: {test.score || 'Not taken'}</p>
                                </div>
                                <span className="text-sm text-gray-400">{formatDate(test.created_at)}</span>
                              </div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recent Flashcard Sets */}
                {recentMaterials.flashcards.length > 0 && (
                  <div>
                    <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                      <BookOpenIcon className="h-5 w-5 mr-2 text-green-500" />
                      Recent Flashcard Sets
                    </h3>
                    <ul className="divide-y divide-gray-200">
                      {recentMaterials.flashcards.map((set) => (
                        <li key={set.id} className="py-3">
                          <Link href={`/flashcards?selected=${set.id}`} passHref>
                            <div className="w-full text-left hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{set.title || 'Untitled Set'}</p>
                                  <p className="text-sm text-gray-500">{set.card_count || 0} cards</p>
                                </div>
                                <span className="text-sm text-gray-400">{formatDate(set.created_at)}</span>
                              </div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {recentMaterials.tests.length === 0 && recentMaterials.flashcards.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-gray-500">No study materials yet. Upload a file to get started!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
