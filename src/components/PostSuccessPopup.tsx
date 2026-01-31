import React from 'react';
import { CheckIcon } from './icons/Icons';

interface PostSuccessPopupProps {
  cityName: string;
  onClose: () => void;
}

const PostSuccessPopup: React.FC<PostSuccessPopupProps> = ({ cityName, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center animate-scale-in">
        {/* Success icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckIcon className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Post Published Successfully!
        </h2>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          Your requirement has been posted on the <span className="font-semibold text-blue-600">{cityName}</span> dashboard. 
          Sellers in your city can now view and submit offers.
        </p>

        {/* Info box */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-sm text-blue-700 text-left">
              You'll receive notifications when sellers submit their offers. Check your notifications regularly!
            </p>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={onClose}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
        >
          View Dashboard
        </button>
      </div>
    </div>
  );
};

export default PostSuccessPopup;
