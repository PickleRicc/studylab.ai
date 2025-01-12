import { Dialog, Transition } from '@headlessui/react';
import { useState, useEffect } from 'react';
import { Fragment } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabase';

export default function CreateFlashcardModal({ isOpen, onClose, session }) {
  const router = useRouter();
  const [setTitle, setSetTitle] = useState('');
  const [setDescription, setSetDescription] = useState('');
  const [cards, setCards] = useState([{
    front: '',
    back: '',
    frontImageUrl: null,
    backImageUrl: null,
    frontImagePreview: null,
    backImagePreview: null,
  }]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && !session?.user?.id) {
      alert('Please sign in to create flashcards');
      onClose();
    }
  }, [isOpen, session, onClose]);

  const handleImageChange = async (index, side, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!session?.user?.id) {
      alert('Please sign in to upload images');
      return;
    }

    try {
      console.log('Selected file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', session.user.id);
      formData.append('side', side);

      console.log('Uploading file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        userId: session.user.id,
        side: side
      });

      const response = await fetch('/api/upload-flashcard-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error response:', errorText);
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      console.log('Upload successful:', data);

      setCards(prevCards => {
        const newCards = [...prevCards];
        if (side === 'front') {
          newCards[index] = {
            ...newCards[index],
            frontImageUrl: data.url,
            frontImagePreview: URL.createObjectURL(file)
          };
        } else {
          newCards[index] = {
            ...newCards[index],
            backImageUrl: data.url,
            backImagePreview: URL.createObjectURL(file)
          };
        }
        return newCards;
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Failed to upload image. Please try again.');
    }
  };

  const handleCardChange = (index, field, value) => {
    const newCards = [...cards];
    newCards[index] = { ...newCards[index], [field]: value };
    setCards(newCards);
  };

  const handleAddCard = () => {
    setCards([...cards, {
      front: '',
      back: '',
      frontImageUrl: null,
      backImageUrl: null,
      frontImagePreview: null,
      backImagePreview: null,
    }]);
  };

  const handleRemoveCard = (index) => {
    setCards(prevCards => prevCards.filter((_, i) => i !== index));
  };

  const handleRemoveImage = (index, side) => {
    const newCards = [...cards];
    if (side === 'front') {
      newCards[index] = {
        ...newCards[index],
        frontImageUrl: null,
        frontImagePreview: null
      };
    } else {
      newCards[index] = {
        ...newCards[index],
        backImageUrl: null,
        backImagePreview: null
      };
    }
    setCards(newCards);
  };

  const handleSave = async () => {
    if (!setTitle.trim()) {
      alert('Please enter a title for your flashcard set');
      return;
    }

    if (cards.some(card => !card.front.trim() && !card.frontImageUrl)) {
      alert('Please fill in the front of all cards or remove empty ones');
      return;
    }

    if (cards.some(card => !card.back.trim() && !card.backImageUrl)) {
      alert('Please fill in the back of all cards or remove empty ones');
      return;
    }

    try {
      setIsSaving(true);
      
      // Create the flashcard set first
      const { data: setData, error: setError } = await supabase
        .from('flashcard_sets')
        .insert([
          {
            title: setTitle.trim(),
            description: setDescription.trim() || null,
            user_id: session.user.id,
            card_count: cards.length,
            type: 'manual'
          }
        ])
        .select()
        .single();

      if (setError) {
        console.error('Error creating flashcard set:', setError);
        throw setError;
      }

      console.log('Created flashcard set:', setData);

      // Then create all the flashcards
      const flashcardsToInsert = cards
        .filter(card => (card.front.trim() || card.frontImageUrl) && (card.back.trim() || card.backImageUrl))
        .map((card, index) => {
          // Log the card data for debugging
          console.log('Creating flashcard:', {
            front_content: card.front.trim(),
            back_content: card.back.trim(),
            front_type: card.frontImageUrl ? 'image' : 'text',
            back_type: card.backImageUrl ? 'image' : 'text',
            front_image_url: card.frontImageUrl,
            back_image_url: card.backImageUrl,
          });

          return {
            set_id: setData.id,
            front_content: card.front.trim(),
            back_content: card.back.trim(),
            front_type: card.frontImageUrl ? 'image' : 'text',
            back_type: card.backImageUrl ? 'image' : 'text',
            front_image_url: card.frontImageUrl,
            back_image_url: card.backImageUrl,
            position: index,
            needs_review: true,
            confidence_level: 0,
            review_count: 0,
            interval: 0,
            ease_factor: 2.5,
            next_review: new Date().toISOString()
          };
        });

      const { error: cardsError } = await supabase
        .from('flashcards')
        .insert(flashcardsToInsert);

      if (cardsError) {
        console.error('Error creating flashcards:', cardsError);
        throw cardsError;
      }

      console.log('Successfully created flashcard set with', flashcardsToInsert.length, 'cards');
      onClose();
      router.push('/flashcards');
    } catch (error) {
      console.error('Error saving flashcard set:', error);
      alert('Failed to save flashcard set. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-4"
                >
                  Create New Flashcard Set
                </Dialog.Title>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                  {/* Set Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flashcard Set Title
                    </label>
                    <input
                      type="text"
                      value={setTitle}
                      onChange={(e) => setSetTitle(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      placeholder="Enter a title for your flashcard set"
                      required
                    />
                  </div>

                  {/* Set Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flashcard Set Description
                    </label>
                    <textarea
                      value={setDescription}
                      onChange={(e) => setSetDescription(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      rows="3"
                    />
                  </div>

                  {/* Cards */}
                  {cards.map((card, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Card {index + 1}</h3>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCard(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Front of card */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Front
                        </label>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={card.front}
                            onChange={(e) => handleCardChange(index, 'front', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="Front of card"
                          />
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(index, 'front', e)}
                              className="hidden"
                              id={`front-image-${index}`}
                            />
                            <label
                              htmlFor={`front-image-${index}`}
                              className="inline-block px-4 py-2 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200"
                            >
                              Add Image
                            </label>
                            {card.frontImagePreview && (
                              <div className="mt-2 relative">
                                <img
                                  src={card.frontImagePreview}
                                  alt="Front preview"
                                  className="max-h-40 rounded-md"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(index, 'front')}
                                  className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Back of card */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Back
                        </label>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={card.back}
                            onChange={(e) => handleCardChange(index, 'back', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="Back of card"
                          />
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(index, 'back', e)}
                              className="hidden"
                              id={`back-image-${index}`}
                            />
                            <label
                              htmlFor={`back-image-${index}`}
                              className="inline-block px-4 py-2 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200"
                            >
                              Add Image
                            </label>
                            {card.backImagePreview && (
                              <div className="mt-2 relative">
                                <img
                                  src={card.backImagePreview}
                                  alt="Back preview"
                                  className="max-h-40 rounded-md"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(index, 'back')}
                                  className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Card Button */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleAddCard}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add Another Card
                    </button>
                  </div>

                  <div className="mt-6 flex justify-end space-x-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={onClose}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </>
                      ) : (
                        'Create Set'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
