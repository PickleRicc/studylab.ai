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

  if (studyMode && selectedSet) {
    return (
      <FlashcardStudyView
        set={selectedSet}
        onClose={() => {
          setSelectedSet(null);
          setStudyMode(false);
        }}
      />
    );
  }

  if (reviewMode && selectedSet) {
    return (
      <FlashcardStudyReviewView
        setId={selectedSet}
        onClose={() => {
          setSelectedSet(null);
          setReviewMode(false);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div>
        <DashboardNav />
        <div className="min-h-screen bg-gradient-to-br from-[#1d2937] to-gray-900">
          <div className="container mx-auto px-6 py-12">
            <div className="flex justify-center items-center h-64">
              <div className="text-xl text-white/70">Loading flashcard sets...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DashboardNav />
      <div className="min-h-screen bg-gradient-to-br from-[#1d2937] to-gray-900">
        <div className="container mx-auto px-6 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">My Flashcard Sets</h1>
            <p className="text-white/70 text-lg">Create, study, and master your knowledge with flashcards.</p>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8">
              <p className="text-red-400">{error}</p>
            </div>
          )}
          
          {flashcardSets.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-12 text-center">
              <h3 className="text-2xl font-medium text-white mb-4">No Flashcard Sets Yet</h3>
              <p className="text-white/70 mb-8">Start by creating your first flashcard set to begin studying!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {flashcardSets.map(set => (
                <FlashcardSetCard
                  key={set.id}
                  set={set}
                  onUpdate={handleSetUpdate}
                  onDelete={handleSetDelete}
                  onStudy={() => handleStudyClick(set.id)}
                  onReview={() => handleReviewClick(set.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
