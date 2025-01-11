import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import Image from 'next/image';

export default function CreateFlashcardModal({ isOpen, onClose, onSave, isUploading }) {
  const [title, setTitle] = useState('');
  const [cards, setCards] = useState([{
    front: '',
    back: '',
    frontImageFile: null,
    backImageFile: null,
    frontImagePreview: null,
    backImagePreview: null,
  }]);

  const handleImageChange = (index, side, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCards(prevCards => {
          const newCards = [...prevCards];
          if (side === 'front') {
            newCards[index] = {
              ...newCards[index],
              frontImageFile: file,
              frontImagePreview: reader.result
            };
          } else {
            newCards[index] = {
              ...newCards[index],
              backImageFile: file,
              backImagePreview: reader.result
            };
          }
          return newCards;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCardChange = (index, field, value) => {
    setCards(prevCards => {
      const newCards = [...prevCards];
      newCards[index] = {
        ...newCards[index],
        [field]: value
      };
      return newCards;
    });
  };

  const addCard = () => {
    setCards(prevCards => [...prevCards, {
      front: '',
      back: '',
      frontImageFile: null,
      backImageFile: null,
      frontImagePreview: null,
      backImagePreview: null,
    }]);
  };

  const removeCard = (index) => {
    setCards(prevCards => prevCards.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSave({ 
      title,
      cards: cards.map(card => ({
        front: card.front,
        back: card.back,
        frontImageFile: card.frontImageFile,
        backImageFile: card.backImageFile
      }))
    });
    setTitle('');
    setCards([{
      front: '',
      back: '',
      frontImageFile: null,
      backImageFile: null,
      frontImagePreview: null,
      backImagePreview: null,
    }]);
    onClose();
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
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Set Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flashcard Set Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      placeholder="Enter a title for your flashcard set"
                      required
                    />
                  </div>

                  {/* Cards */}
                  {cards.map((card, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-md font-medium text-gray-700">Card {index + 1}</h4>
                        {cards.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCard(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove Card
                          </button>
                        )}
                      </div>

                      {/* Front of Card */}
                      <div className="border-b pb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Front of Card</h5>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Text
                            </label>
                            <textarea
                              value={card.front}
                              onChange={(e) => handleCardChange(index, 'front', e.target.value)}
                              className="w-full p-2 border rounded-md"
                              rows="3"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Image (Optional)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(index, 'front', e)}
                              className="w-full"
                            />
                            {card.frontImagePreview && (
                              <div className="mt-2 relative h-40 w-full">
                                <Image
                                  src={card.frontImagePreview}
                                  alt="Front Preview"
                                  fill
                                  className="object-contain rounded-md"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Back of Card */}
                      <div className="pt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Back of Card</h5>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Text
                            </label>
                            <textarea
                              value={card.back}
                              onChange={(e) => handleCardChange(index, 'back', e.target.value)}
                              className="w-full p-2 border rounded-md"
                              rows="3"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Image (Optional)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(index, 'back', e)}
                              className="w-full"
                            />
                            {card.backImagePreview && (
                              <div className="mt-2 relative h-40 w-full">
                                <Image
                                  src={card.backImagePreview}
                                  alt="Back Preview"
                                  fill
                                  className="object-contain rounded-md"
                                />
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
                      onClick={addCard}
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
                      disabled={isUploading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isUploading}
                    >
                      {isUploading ? (
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
