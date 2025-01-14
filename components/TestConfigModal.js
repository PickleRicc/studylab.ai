'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { useSession } from '@supabase/auth-helpers-react'

export default function TestConfigModal({ isOpen, onClose, selectedFiles }) {
  const [testName, setTestName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const session = useSession();
  const maxLength = 50;

  const validateTestName = (name) => {
    if (name.length === 0) {
      setNameError('Test name is required');
      return false;
    }
    if (name.length > maxLength) {
      setNameError(`Test name must be ${maxLength} characters or less`);
      return false;
    }
    setNameError('');
    return true;
  };

  const handleTestNameChange = (e) => {
    const name = e.target.value;
    setTestName(name);
    validateTestName(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('title').trim();
    
    if (!validateTestName(name)) {
      return;
    }

    if (!session?.access_token) {
      setNameError('You must be logged in to generate tests');
      return;
    }
    
    const config = {
      title: name,
      numQuestions: parseInt(formData.get('numQuestions')),
      questionTypes: Array.from(formData.getAll('questionTypes')),
      difficulty: formData.get('difficulty'),
      files: selectedFiles
    };

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to generate test');
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsGenerating(false);
        onClose();
        router.push('/tests');
      }, 1500);
    } catch (error) {
      console.error('Error generating test:', error);
      setIsGenerating(false);
      setNameError('Failed to generate test. Please try again.');
    }
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
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-[#240046] border border-[#4cc9f0] px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-[#240046] text-[#4cc9f0] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#4cc9f0] focus:ring-offset-2 transition-colors"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-white">
                      Configure Test
                    </Dialog.Title>
                    <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                      {/* Test Name */}
                      <div className="space-y-1">
                        <label htmlFor="title" className="block text-sm font-medium text-white">
                          Test Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="title"
                            id="title"
                            value={testName}
                            onChange={handleTestNameChange}
                            placeholder="Enter a descriptive name for your test"
                            className="mt-1 block w-full rounded-md shadow-sm text-base py-2.5 px-4 bg-[#3c096c] text-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                          {nameError && (
                            <div className="absolute -bottom-5 text-red-500">{nameError}</div>
                          )}
                        </div>
                      </div>
                      {/* Number of Questions */}
                      <div>
                        <label htmlFor="numQuestions" className="block text-sm font-medium text-white">
                          Number of Questions
                        </label>
                        <select
                          id="numQuestions"
                          name="numQuestions"
                          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm bg-[#3c096c] text-white"
                        >
                          {[5, 10, 15, 20, 50, 70].map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      </div>

                      {/* Question Types */}
                      <div>
                        <label className="block text-sm font-medium text-white">
                          Question Types
                        </label>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center">
                            <input
                              id="multiple_choice"
                              name="questionTypes"
                              type="checkbox"
                              value="multiple_choice"
                              className="h-4 w-4 rounded border-[#4cc9f0] text-[#4361ee] focus:ring-[#4cc9f0] bg-[#3c096c]"
                            />
                            <label htmlFor="multiple_choice" className="ml-2 text-sm text-white">
                              Multiple Choice
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              id="short_answer"
                              name="questionTypes"
                              type="checkbox"
                              value="short_answer"
                              className="h-4 w-4 rounded border-[#4cc9f0] text-[#4361ee] focus:ring-[#4cc9f0] bg-[#3c096c]"
                            />
                            <label htmlFor="short_answer" className="ml-2 text-sm text-white">
                              Short Answer
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Difficulty */}
                      <div>
                        <label htmlFor="difficulty" className="block text-sm font-medium text-white">
                          Difficulty
                        </label>
                        <select
                          id="difficulty"
                          name="difficulty"
                          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm bg-[#3c096c] text-white"
                        >
                          {['easy', 'medium', 'hard'].map(level => (
                            <option key={level} value={level}>
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {isGenerating && (
                        <div className="mt-4 text-center">
                          <div className="animate-pulse text-blue-600">
                            Generating test...
                          </div>
                        </div>
                      )}
                      {isSuccess && (
                        <div className="mt-4 text-green-600 text-center">
                          <CheckCircleIcon className="h-6 w-6 inline-block" />
                          Test generated successfully!
                        </div>
                      )}
                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          disabled={isGenerating}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          disabled={isGenerating}
                        >
                          {isGenerating ? 'Generating...' : 'Generate Test'}
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
  )
}
