import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function FlashcardConfigModal({ isOpen, onClose, onGenerate, selectedFiles }) {
  const [config, setConfig] = useState({
    title: '',
    description: '',
    cardsPerSource: 5,
    focus: 'key concepts and definitions'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate(config);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Configure Flashcard Set</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter flashcard set title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <textarea
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter description"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Cards per Source
              </label>
              <input
                type="number"
                value={config.cardsPerSource}
                onChange={(e) => setConfig({ ...config, cardsPerSource: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                min="1"
                max="20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Focus Area
              </label>
              <select
                value={config.focus}
                onChange={(e) => setConfig({ ...config, focus: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="key concepts and definitions">Key Concepts & Definitions</option>
                <option value="important facts">Important Facts</option>
                <option value="vocabulary">Vocabulary</option>
                <option value="examples and applications">Examples & Applications</option>
              </select>
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">
                Selected Files: {selectedFiles.length}
              </p>
              <ul className="text-sm text-gray-600">
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
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Generate Flashcards
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
