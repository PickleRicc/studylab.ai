import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabase';
import DashboardNav from '../components/DashboardNav';
import FileUpload from '../components/FileUpload';
import { DocumentTextIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentFiles, setRecentFiles] = useState([]);
  const [showAllFiles, setShowAllFiles] = useState(false);
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
        fetchRecentFiles();
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

      // Get flashcard count
      const { count: flashcardCount } = await supabase
        .from('flashcards')
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

  const fetchRecentFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: files, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecentFiles(files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return <DocumentTextIcon className="h-6 w-6 text-gray-500" />;
    
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) {
      return <DocumentTextIcon className="h-6 w-6 text-red-500" />;
    } else if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) {
      return <MusicalNoteIcon className="h-6 w-6 text-blue-500" />;
    }
    return <DocumentTextIcon className="h-6 w-6 text-gray-500" />;
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

  const displayedFiles = showAllFiles ? recentFiles : recentFiles.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardNav />
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
                <dt className="text-sm font-medium text-gray-500 truncate">Total Flashcards</dt>
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

          {/* Upload and Recent Files Section */}
          <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Files</h2>
              <FileUpload onSuccess={fetchRecentFiles} />
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Recent Files</h2>
                {recentFiles.length > 5 && (
                  <button
                    onClick={() => setShowAllFiles(!showAllFiles)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showAllFiles ? 'Show Less' : 'Show All'}
                  </button>
                )}
              </div>

              {displayedFiles.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {displayedFiles.map((file) => (
                    <li key={file.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getFileIcon(file.file_type || file.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.file_name || file.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Uploaded on {formatDate(file.created_at)}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-sm text-gray-500">
                          {((file.file_size || file.size) / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No files uploaded yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
