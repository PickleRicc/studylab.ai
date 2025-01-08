import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import DashboardNav from '../components/DashboardNav';
import FlashcardSetCard from '../components/FlashcardSetCard';
import FlashcardStudyView from '../components/FlashcardStudyView';
import FlashcardStudyReviewView from '../components/FlashcardStudyReviewView';
import { useRouter } from 'next/router';

export default function Flashcards() {
  const router = useRouter();
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);
  const [studyMode, setStudyMode] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSetTitle, setNewSetTitle] = useState('');

  useEffect(() => {
    loadFlashcardSets();
  }, []);

  useEffect(() => {
    const { selected } = router.query;
    if (selected && flashcardSets.length > 0) {
      const set = flashcardSets.find(s => s.id === selected);
      if (set) {
        setSelectedSet(set);
        setStudyMode(true);
      }
    }
  }, [router.query, flashcardSets]);

  const loadFlashcardSets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to view your flashcard sets');
        setLoading(false);
        return;
      }

      const { data: sets, error: setsError } = await supabase
        .from('flashcard_sets')
        .select('*, flashcards(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (setsError) throw setsError;

      setFlashcardSets(sets || []);
    } catch (err) {
      console.error('Error loading flashcard sets:', err);
      setError('Failed to load flashcard sets');
    } finally {
      setLoading(false);
    }
  };

  const handleSetUpdate = async (updatedSet) => {
    setFlashcardSets(prevSets => 
      prevSets.map(set => set.id === updatedSet.id ? updatedSet : set)
    );
  };

  const handleSetDelete = async (setId) => {
    try {
      const { error } = await supabase
        .from('flashcard_sets')
        .delete()
        .eq('id', setId);

      if (error) throw error;

      setFlashcardSets(prevSets => prevSets.filter(set => set.id !== setId));
    } catch (err) {
      console.error('Error deleting flashcard set:', err);
    }
  };

  const handleStudyClick = (setId) => {
    setSelectedSet(setId);
    setStudyMode(true);
    setReviewMode(false);
  };

  const handleReviewClick = (setId) => {
    setSelectedSet(setId);
    setReviewMode(true);
    setStudyMode(false);
  };

  const handleSetSelect = (set) => {
    setSelectedSet(set);
    setStudyMode(true);
    setReviewMode(false);
  };

  const handleEditSet = (set) => {
    // implement edit set functionality
  };

  const handleDeleteSet = (setId) => {
    handleSetDelete(setId);
  };

  const handleCreateSet = async () => {
    try {
      const { data, error } = await supabase
        .from('flashcard_sets')
        .insert([{ title: newSetTitle, user_id: supabase.auth.user().id }]);

      if (error) throw error;

      setFlashcardSets(prevSets => [...prevSets, data[0]]);
      setShowCreateModal(false);
      setNewSetTitle('');
    } catch (err) {
      console.error('Error creating flashcard set:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#10002b] to-[#240046]">
      <DashboardNav />
      
      <main className="container mx-auto px-4 py-8">
        {error ? (
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 text-red-400 border border-red-500/20">
            {error}
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (
          <>
            {!studyMode && !reviewMode && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-bold text-white">Flashcard Sets</h1>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-[1.02] transition-all duration-200 font-medium shadow-lg shadow-blue-500/25"
                  >
                    Create New Set
                  </button>
                </div>

                {flashcardSets.length === 0 ? (
                  <div className="bg-white/10 backdrop-blur-xl rounded-xl p-8 text-center border border-white/20">
                    <h3 className="text-xl font-semibold text-white mb-4">No Flashcard Sets Yet</h3>
                    <p className="text-gray-300 mb-6">Create your first set to start studying!</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-[1.02] transition-all duration-200 font-medium shadow-lg shadow-blue-500/25"
                    >
                      Create New Set
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {flashcardSets.map((set) => (
                      <FlashcardSetCard
                        key={set.id}
                        set={set}
                        onStudy={() => handleSetSelect(set)}
                        onEdit={() => handleEditSet(set)}
                        onDelete={() => handleDeleteSet(set.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {studyMode && selectedSet && (
              <FlashcardStudyView
                set={selectedSet}
                onClose={() => {
                  setSelectedSet(null);
                  setStudyMode(false);
                  router.push('/flashcards', undefined, { shallow: true });
                }}
              />
            )}

            {reviewMode && selectedSet && (
              <FlashcardStudyReviewView
                set={selectedSet}
                onClose={() => {
                  setSelectedSet(null);
                  setReviewMode(false);
                }}
              />
            )}

            {showCreateModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full border border-white/20">
                  <h3 className="text-xl font-semibold text-white mb-4">Create New Flashcard Set</h3>
                  <input
                    type="text"
                    placeholder="Set Title"
                    value={newSetTitle}
                    onChange={(e) => setNewSetTitle(e.target.value)}
                    className="w-full p-3 mb-4 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-gray-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateSet}
                      disabled={!newSetTitle.trim()}
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-[1.02] transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
