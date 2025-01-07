import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabase';
import DashboardNav from '../../components/DashboardNav';

export default function FlashcardSetDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [flashcardSet, setFlashcardSet] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchFlashcardSet();
    }
  }, [id]);

  const fetchFlashcardSet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: set, error } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!set) throw new Error('Flashcard set not found');

      setFlashcardSet(set);
    } catch (error) {
      console.error('Error fetching flashcard set:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const nextCard = () => {
    if (currentCardIndex < flashcardSet.cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    }
  };

  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setShowAnswer(false);
    }
  };

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <DashboardNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-red-500">Error: {error}</p>
            <button
              onClick={() => router.push('/flashcards')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Back to Flashcards
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!flashcardSet) {
    return (
      <div className="min-h-screen bg-gray-100">
        <DashboardNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-500">Flashcard set not found</p>
            <button
              onClick={() => router.push('/flashcards')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Back to Flashcards
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = flashcardSet.cards[currentCardIndex];

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {flashcardSet.title || 'Untitled Set'}
            </h1>
            <p className="text-gray-500 mt-2">
              Created on {new Date(flashcardSet.created_at).toLocaleDateString()}
            </p>
          </div>

          {flashcardSet.cards && flashcardSet.cards.length > 0 ? (
            <div>
              <div className="text-center mb-4">
                <p className="text-gray-500">
                  Card {currentCardIndex + 1} of {flashcardSet.cards.length}
                </p>
              </div>

              <div className="border rounded-lg p-8 mb-6 min-h-[200px] flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xl font-medium text-gray-900">
                    {showAnswer ? currentCard.answer : currentCard.question}
                  </p>
                </div>
              </div>

              <div className="flex justify-center space-x-4 mb-6">
                <button
                  onClick={previousCard}
                  disabled={currentCardIndex === 0}
                  className={`px-4 py-2 rounded-md ${
                    currentCardIndex === 0
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={toggleAnswer}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  {showAnswer ? 'Show Question' : 'Show Answer'}
                </button>
                <button
                  onClick={nextCard}
                  disabled={currentCardIndex === flashcardSet.cards.length - 1}
                  className={`px-4 py-2 rounded-md ${
                    currentCardIndex === flashcardSet.cards.length - 1
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No flashcards available</p>
          )}

          <div className="mt-6">
            <button
              onClick={() => router.push('/flashcards')}
              className="text-blue-600 hover:text-blue-800"
            >
              Back to Flashcards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
