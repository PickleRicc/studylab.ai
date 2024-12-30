import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export default function TestConfigModal({ isOpen, onClose, onGenerate, defaultConfig = {} }) {
  const {
    numQuestions = 5,
    questionTypes = ['multiple_choice'],
    difficulty = 'medium'
  } = defaultConfig;

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const config = {
      numQuestions: parseInt(formData.get('numQuestions')),
      questionTypes: Array.from(formData.getAll('questionTypes')),
      difficulty: formData.get('difficulty')
    };

    onGenerate(config);
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Configure Test
                    </Dialog.Title>
                    <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                      {/* Number of Questions */}
                      <div>
                        <label htmlFor="numQuestions" className="block text-sm font-medium text-gray-700">
                          Number of Questions
                        </label>
                        <select
                          id="numQuestions"
                          name="numQuestions"
                          defaultValue={numQuestions}
                          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        >
                          {[5, 10, 15, 20].map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      </div>

                      {/* Question Types */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Question Types
                        </label>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center">
                            <input
                              id="multiple_choice"
                              name="questionTypes"
                              type="checkbox"
                              defaultChecked={questionTypes.includes('multiple_choice')}
                              value="multiple_choice"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="multiple_choice" className="ml-2 text-sm text-gray-700">
                              Multiple Choice
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              id="short_answer"
                              name="questionTypes"
                              type="checkbox"
                              defaultChecked={questionTypes.includes('short_answer')}
                              value="short_answer"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="short_answer" className="ml-2 text-sm text-gray-700">
                              Short Answer
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Difficulty */}
                      <div>
                        <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
                          Difficulty
                        </label>
                        <select
                          id="difficulty"
                          name="difficulty"
                          defaultValue={difficulty}
                          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        >
                          {['easy', 'medium', 'hard'].map(level => (
                            <option key={level} value={level}>
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
                        >
                          Generate Test
                        </button>
                        <button
                          type="button"
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                          onClick={onClose}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
