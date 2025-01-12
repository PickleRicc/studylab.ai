import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/router';
import DashboardNav from '../components/DashboardNav';
import FlashcardSetCard from '../components/FlashcardSetCard';
import FlashcardStudyView from '../components/FlashcardStudyView';
import FlashcardStudyReviewView from '../components/FlashcardStudyReviewView';
import CreateFlashcardModal from '../components/CreateFlashcardModal';

export default function Flashcards() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ));
  
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);
  const [studyMode, setStudyMode] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [showCustomFlashcardModal, setShowCustomFlashcardModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [displayCount, setDisplayCount] = useState(6);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        setSession(currentSession);
        
        if (!currentSession) {
          router.push('/auth/signin');
          return;
        }
        
        fetchFlashcardSets(currentSession);
      } catch (error) {
        console.error('Error getting session:', error);
        setError(error.message);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        router.push('/auth/signin');
      }
    });

    return () => subscription?.unsubscribe();
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

  const fetchFlashcardSets = async (session) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlashcardSets(data || []);
    } catch (error) {
      console.error('Error fetching flashcard sets:', error);
      setError(error.message);
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

  const handleStudyClick = (set) => {
    setSelectedSet(set);
    setStudyMode(true);
    setReviewMode(false);
  };

  const handleReviewClick = (set) => {
    setSelectedSet(set);
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
        .insert([{ 
          title: newSetTitle, 
          user_id: supabase.auth.user().id,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      setFlashcardSets(prevSets => [data[0], ...prevSets]);
      setShowCreateModal(false);
      setNewSetTitle('');
    } catch (err) {
      console.error('Error creating flashcard set:', err);
    }
  };

  const handleImageUpload = async (file, side) => {
    const formData = new FormData();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    formData.append('file', file);
    formData.append('userId', user.id);
    formData.append('side', side);
    
    try {
      const response = await fetch('/api/upload-flashcard-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }
      
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleCustomFlashcardSave = async (cardData) => {
    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create new flashcard set
      const { data: newSet, error: setError } = await supabase
        .from('flashcard_sets')
        .insert([{
          title: cardData.title,
          user_id: user.id,
          type: 'custom',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (setError) throw setError;

      // Process each card
      const processedCards = await Promise.all(cardData.cards.map(async (card, index) => {
        let frontImageUrl = null;
        let backImageUrl = null;

        if (card.frontImageFile) {
          frontImageUrl = await handleImageUpload(card.frontImageFile, 'front');
        }
        if (card.backImageFile) {
          backImageUrl = await handleImageUpload(card.backImageFile, 'back');
        }

        return {
          set_id: newSet.id,
          front_content: card.front,
          back_content: card.back,
          front_type: card.frontImageFile ? 'image' : 'text',
          back_type: card.backImageFile ? 'image' : 'text',
          front_image_url: frontImageUrl,
          back_image_url: backImageUrl,
          position: index,
          created_at: new Date().toISOString()
        };
      }));

      // Insert all cards
      const { error: cardError } = await supabase
        .from('flashcards')
        .insert(processedCards);

      if (cardError) throw cardError;

      // Add the new set to the state at the beginning
      const newSetWithCards = {
        ...newSet,
        flashcards: processedCards
      };
      
      setFlashcardSets(prevSets => [newSetWithCards, ...prevSets]);
      setShowCustomFlashcardModal(false);
    } catch (error) {
      console.error('Error creating custom flashcard:', error);
    } finally {
      setIsUploading(false);
    }
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
          <>
            {studyMode && selectedSet ? (
              <FlashcardStudyView
                set={selectedSet}
                onClose={() => {
                  setSelectedSet(null);
                  setStudyMode(false);
                }}
              />
            ) : reviewMode && selectedSet ? (
              <FlashcardStudyReviewView
                setId={selectedSet.id}
                onClose={() => {
                  setSelectedSet(null);
                  setReviewMode(false);
                }}
              />
            ) : (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-bold text-white">Flashcard Sets</h1>
                  <button
                    onClick={() => setShowCustomFlashcardModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-[#4361ee] to-[#4cc9f0] text-white rounded-xl hover:from-[#4cc9f0] hover:to-[#4361ee] transform hover:scale-[1.02] transition-all duration-200 font-medium shadow-lg shadow-blue-500/25"
                  >
                    Create Custom Set
                  </button>
                </div>

                {flashcardSets.length === 0 ? (
                  <div className="text-center text-white/60">
                    No flashcard sets yet. Create one to get started!
                  </div>
                ) : (
                  <div className="grid gap-8">
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold text-white/80">Recent Sets</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {flashcardSets.slice(0, 2).map((set) => (
                          <FlashcardSetCard
                            key={set.id}
                            set={set}
                            onUpdate={handleSetUpdate}
                            onDelete={handleDeleteSet}
                            onStudy={() => handleStudyClick(set)}
                            onReview={() => handleReviewClick(set)}
                          />
                        ))}
                      </div>
                    </div>

                    {flashcardSets.length > 2 && (
                      <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-white/80">All Sets</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-90">
                          {flashcardSets.slice(2, displayCount + 2).map((set) => (
                            <FlashcardSetCard
                              key={set.id}
                              set={set}
                              onUpdate={handleSetUpdate}
                              onDelete={handleDeleteSet}
                              onStudy={() => handleStudyClick(set)}
                              onReview={() => handleReviewClick(set)}
                            />
                          ))}
                        </div>
                        {flashcardSets.length > displayCount + 2 && (
                          <div className="flex justify-center mt-6">
                            <button
                              onClick={handleShowMore}
                              className="px-6 py-3 bg-[#3c096c]/20 backdrop-blur-xl text-white rounded-xl hover:bg-[#3c096c]/40 transform hover:scale-[1.02] transition-all duration-200 font-medium"
                            >
                              Show More Sets
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <CreateFlashcardModal
        isOpen={showCustomFlashcardModal}
        onClose={() => setShowCustomFlashcardModal(false)}
        onSave={handleCustomFlashcardSave}
        isUploading={isUploading}
        session={session}
      />
    </div>
  );
}
