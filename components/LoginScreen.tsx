import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Logo from './Logo';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim());
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-stone-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-red-50 p-6 rounded-full mb-4 shadow-inner">
             <Logo className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-stone-900 text-center">彩汉字</h1>
          <p className="text-stone-500 mt-2 text-center">Begin your journey to mastery</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-stone-700 mb-1">
              What should we call you?
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all bg-stone-50 text-stone-900 placeholder-stone-400"
              placeholder="Enter your name"
              autoFocus
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-stone-900 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200"
          >
            <span>Start Practicing</span>
            <ArrowRight size={18} />
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-stone-400">
          Your progress is stored locally on this device.
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;