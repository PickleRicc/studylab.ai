import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabase';
import DashboardNav from '../components/DashboardNav';
import FileUpload from '../components/FileUpload';
import TestCard from '../components/TestCard';
import InteractiveTest from '../components/InteractiveTest';
import FlashcardSetCard from '../components/FlashcardSetCard';
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
        .select('*, last_score, best_score')
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

  const handleUploadComplete = async () => {
    await fetchRecentMaterials();
    await fetchStats();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#10002b] to-[#240046]">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#10002b] to-[#240046]">
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
            <div className="mb-8 bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
              <h1 className="text-lg font-medium text-blue-400">
                Welcome to the Lab,
              </h1>
              <p className="text-2xl font-semibold text-white mt-1">
                {session?.user?.email?.split('@')[0] || 'User'}
              </p>
            </div>

            {/* Stats Section */}
            <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                <dt className="text-sm font-medium text-gray-300 truncate flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-400" />
                  Total Tests
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-white">{stats.tests}</dd>
              </div>
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                <dt className="text-sm font-medium text-gray-300 truncate flex items-center">
                  <BookOpenIcon className="h-5 w-5 mr-2 text-green-400" />
                  Total Flashcard Sets
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-white">{stats.flashcards}</dd>
              </div>
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                <dt className="text-sm font-medium text-gray-300 truncate flex items-center">
                  <AcademicCapIcon className="h-5 w-5 mr-2 text-purple-400" />
                  Files Uploaded
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-white">{stats.files}</dd>
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl divide-y divide-white/10 border border-white/20">
              <div className="p-6">
                <h2 className="text-lg font-medium text-white mb-4">Upload Files</h2>
                <FileUpload onSuccess={handleFileUpload} />
              </div>

              {/* Recent Study Materials Section */}
              <div className="p-6">
                <h2 className="text-lg font-medium text-white mb-6">Recent Study Materials</h2>
                
                {/* Recent Tests */}
                {recentMaterials.tests.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-md font-medium text-gray-300 mb-4 flex items-center">
                      <AcademicCapIcon className="h-5 w-5 mr-2 text-blue-400" />
                      Recent Tests
                    </h3>
                    <ul className="divide-y divide-white/10">
                      {recentMaterials.tests.map((test) => (
                        <li key={test.id} className="py-3">
                          <Link href={`/tests?selected=${test.id}`} passHref>
                            <div className="w-full text-left hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-medium text-white">{test.title || 'Untitled Test'}</p>
                                  <div className="text-sm text-gray-300">
                                    {test.last_score ? (
                                      <div>
                                        <span>Last Score: {test.last_score}%</span>
                                        {test.best_score && test.best_score !== test.last_score && (
                                          <span className="ml-2 text-blue-400">Best: {test.best_score}%</span>
                                        )}
                                      </div>
                                    ) : (
                                      'Not taken'
                                    )}
                                  </div>
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
                    <h3 className="text-md font-medium text-gray-300 mb-4 flex items-center">
                      <BookOpenIcon className="h-5 w-5 mr-2 text-green-400" />
                      Recent Flashcard Sets
                    </h3>
                    <ul className="divide-y divide-white/10">
                      {recentMaterials.flashcards.map((set) => (
                        <li key={set.id} className="py-3">
                          <Link href={`/flashcards?selected=${set.id}`} passHref>
                            <div className="w-full text-left hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-medium text-white">{set.title || 'Untitled Set'}</p>
                                  <p className="text-sm text-gray-300">{set.card_count || 0} cards</p>
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
                    <p className="text-gray-300">No study materials yet. Upload a file to get started!</p>
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
