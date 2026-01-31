import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MicrophoneIcon, SendIcon, ShopIcon, SparklesIcon, UserIcon } from './icons/Icons';

interface WelcomePageProps {
  onSubmit: (productName: string) => void;
  onRegisterSeller: () => void;
  onLoginAsBuyer: () => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onSubmit, onRegisterSeller, onLoginAsBuyer }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef(false);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    const words = input.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  }, [input]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current && isRecognitionActiveRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition stop error (ignored):', e);
      }
    }
    isRecognitionActiveRef.current = false;
    setIsListening(false);
  }, []);

  const startRecognition = useCallback(() => {
    if (!recognitionRef.current || isRecognitionActiveRef.current) {
      return;
    }

    try {
      // Reset the final transcript when starting new recognition
      finalTranscriptRef.current = input;
      recognitionRef.current.start();
      isRecognitionActiveRef.current = true;
      setIsListening(true);
    } catch (e: any) {
      console.error('Recognition start error:', e);
      if (e.message?.includes('already started')) {
        // Recognition is already running, just update state
        isRecognitionActiveRef.current = true;
        setIsListening(true);
      } else {
        isRecognitionActiveRef.current = false;
        setIsListening(false);
      }
    }
  }, [input]);

  const handleVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser');
      return;
    }

    // If currently listening, stop
    if (isListening || isRecognitionActiveRef.current) {
      stopRecognition();
      return;
    }

    // Initialize recognition if not already done
    if (!recognitionRef.current) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        isRecognitionActiveRef.current = true;
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Only update with final results to prevent echo
        if (finalTranscript) {
          setInput(prev => {
            const baseText = finalTranscriptRef.current.trim();
            const newText = finalTranscript.trim();
            const combined = baseText ? `${baseText} ${newText}` : newText;
            // Limit to 100 words
            const words = combined.split(/\s+/).slice(0, 100);
            const result = words.join(' ');
            finalTranscriptRef.current = result;
            return result;
          });
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        isRecognitionActiveRef.current = false;
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access to use voice input.');
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
          // Don't show error for aborted or no-speech
          console.log('Speech recognition error:', event.error);
        }
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        isRecognitionActiveRef.current = false;
        setIsListening(false);
      };
    }

    // Start recognition
    startRecognition();
  }, [isListening, startRecognition, stopRecognition]);

  const handleSubmit = () => {
    if (input.trim()) {
      // Stop any ongoing recognition
      stopRecognition();
      onSubmit(input.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-4 md:p-6">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden bg-white">
            <img 
              src="https://d64gsuwffb70l.cloudfront.net/697830e2d2a66a605e53d724_1769759333132_e7d1e864.jpg" 
              alt="hoko logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-2xl font-bold text-white">hoko</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Login as Buyer button */}
          <button
            onClick={onLoginAsBuyer}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500/30 backdrop-blur-sm text-white rounded-full hover:bg-blue-500/50 transition-all border border-white/30"
          >
            <UserIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Login as Buyer</span>
            <span className="sm:hidden">Buyer</span>
          </button>
          {/* Register as Seller button */}
          <button
            onClick={onRegisterSeller}
            className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-all border border-white/30"
          >
            <ShopIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Register as Seller</span>
            <span className="sm:hidden">Seller</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 py-8 md:py-16 min-h-[calc(100vh-80px)]">
        <div className="max-w-2xl w-full text-center">
          {/* Welcome text */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Welcome to <span className="text-yellow-300">hoko</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80">
              Your marketplace for products & services
            </p>
          </div>

          {/* Illustration */}
          <div className="mb-8">
            <img 
              src="https://d64gsuwffb70l.cloudfront.net/697c363681ce6b41c031c291_1769748141877_51e21ca2.png" 
              alt="Marketplace illustration" 
              className="w-48 h-48 md:w-64 md:h-64 mx-auto object-contain drop-shadow-2xl"
            />
          </div>

          {/* Question card */}
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-6 md:p-8">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4">
              What kind of product or service offer you wish to have on hand?
            </h2>
            
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  const words = e.target.value.trim().split(/\s+/).filter(w => w.length > 0);
                  if (words.length <= 100 || e.target.value.length < input.length) {
                    setInput(e.target.value);
                    // Update the final transcript ref when user types
                    finalTranscriptRef.current = e.target.value;
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type your requirement here... (e.g., 'I need quality soap for my household')"
                className="w-full h-32 p-4 pr-24 border-2 border-gray-200 rounded-2xl resize-none focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-gray-700 placeholder-gray-400"
              />
              
              {/* Word count */}
              <div className="absolute bottom-3 left-4 text-sm text-gray-400">
                {wordCount}/100 words
              </div>

              {/* Action buttons */}
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={handleVoiceInput}
                  className={`p-3 rounded-xl transition-all ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  <MicrophoneIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Submit"
                >
                  <SendIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Press Enter to submit or use the microphone for voice input
            </p>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-white/80 text-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span>Post Requirements</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span>Get Best Offers</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span>Save Money</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-white/60 text-sm">
        <p>Connect buyers with sellers in your city</p>
      </footer>
    </div>
  );
};

export default WelcomePage;
