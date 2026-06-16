import React, { useState } from 'react';
import { Mail, Lock, User, FileSignature, ArrowRight } from 'lucide-react';
import api from '../utils/api';

interface LoginProps {
  setCurrentPage: (page: string) => void;
}

const Login: React.FC<LoginProps> = ({ setCurrentPage }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? { email, password } : { name, email, password };

      const response = await api.post(endpoint, payload);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Redirect to dashboard
      setCurrentPage('dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[75vh] px-4">
      <div className="cyber-card w-full max-w-md rounded-xl p-8 flex flex-col border-2 border-[#1f1f2e] shadow-lg">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#f97316] p-3 rounded-lg text-black border border-[#ea580c] shadow-sm mb-3">
            <FileSignature size={28} />
          </div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white uppercase">
            {isLogin ? 'Access Portal' : 'Create Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider text-center">
            {isLogin ? 'Sign in to access your digital workspace' : 'Get started with digital document signatures'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs leading-relaxed font-bold tech-font">
            [ERROR] {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User size={14} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-3 cyber-input rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail size={14} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-3 cyber-input rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock size={14} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 cyber-input rounded-lg text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3.5 cyber-button-primary rounded-lg text-sm"
          >
            <span>{loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register'}</span>
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>

        {/* Footer switcher */}
        <div className="mt-8 pt-6 border-t border-[#1f1f2e] text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-xs uppercase font-bold tracking-wider text-slate-400 hover:text-[#f97316] cursor-pointer transition-all"
          >
            {isLogin ? "Need an account? Register here" : 'Have an account? Sign In'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;
