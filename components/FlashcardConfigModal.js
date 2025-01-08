import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';

export default function FlashcardConfigModal({ isOpen, onClose, onGenerate, selectedFiles }) {
  const [config, setConfig] = useState({
    title: '',
    description: '',
    cardsPerSource: 5,
    focus: 'key concepts and definitions'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await onGenerate(config);
      setIsSuccess(true);
      // Wait 1.5 seconds to show success message before closing
      setTimeout(() => {
        setIsSuccess(false);
        setIsGenerating(false);
        onClose();
        router.push('/flashcards');
      }, 1500);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto border w-full max-w-lg shadow-lg rounded-md bg-[#240046] border-[#4cc9f0] px-4 pb-4 pt-5 sm:my-8 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">Configure Flashcard Set</h3>
          <button
            onClick={onClose}
            className="text-[#4cc9f0] hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white">
                Title
              </label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                className="mt-1 block w-full rounded-md bg-[#3c096c] border-[#4cc9f0] text-white placeholder-gray-400 shadow-sm focus:border-[#4cc9f0] focus:ring-[#4cc9f0] px-4 py-2.5 text-base"
                placeholder="Enter flashcard set title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white">
                Description (optional)
              </label>
              <textarea
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                className="mt-1 block w-full rounded-md bg-[#3c096c] border-[#4cc9f0] text-white placeholder-gray-400 shadow-sm focus:border-[#4cc9f0] focus:ring-[#4cc9f0] px-4 py-2.5 text-base"
                placeholder="Enter description"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white">
                Cards per Source
              </label>
              <input
                type="number"
                value={config.cardsPerSource}
                onChange={(e) => setConfig({ ...config, cardsPerSource: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md bg-[#3c096c] border-[#4cc9f0] text-white placeholder-gray-400 shadow-sm focus:border-[#4cc9f0] focus:ring-[#4cc9f0] px-4 py-2.5 text-base"
                min="1"
                max="20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white">
                Focus Area
              </label>
              <select
                value={config.focus}
                onChange={(e) => setConfig({ ...config, focus: e.target.value })}
                className="mt-1 block w-full rounded-md bg-[#3c096c] border-[#4cc9f0] text-white shadow-sm focus:border-[#4cc9f0] focus:ring-[#4cc9f0] px-4 py-2.5 text-base"
              >
                <option value="key concepts and definitions">Key Concepts & Definitions</option>
                <option value="important facts">Important Facts</option>
                <option value="vocabulary">Vocabulary</option>
                <option value="examples and applications">Examples & Applications</option>
              </select>
            </div>

            <div className="mt-4">
              <p className="text-sm text-[#4cc9f0] mb-2">
                Selected Files: {selectedFiles.length}
              </p>
              <ul className="text-sm text-white/80">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="truncate">
                    • {file.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#4361ee] text-base font-medium text-white hover:bg-[#3a0ca3] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4cc9f0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : isSuccess ? (
                "Success!"
              ) : (
                "Generate Flashcards"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
