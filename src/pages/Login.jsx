import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loginSchema } from '../utils/validation';

export default function Login({ supabaseError, onRetry }) {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data) {
    setError('');
    setSubmitting(true);
    try {
      await login(data.email, data.password);
    } catch (err) {
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Something went wrong.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    
      <div className="w-full h-screen flex flex-col md:flex-row bg-white shadow-2xl rounded-sm overflow-hidden border border-gray-100">
        
        {/* Left Side: Brand/Visual (Inspired by Slide 1) */}
        <div className="hidden md:flex md:w-5/12 bg-[#1a365d] relative p-12 flex-col justify-between text-white">
          <div className="z-10">
            <div className="flex items-center gap-2 mb-8">
              <div className="bg-white/20 p-2 rounded">
                <LogIn className="w-5 h-5 text-white" />
              </div>
              <span className="tracking-[0.2em] uppercase text-sm font-bold">Devotion Tracker</span>
            </div>
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight uppercase">
              Prayer <br /> Gathering
            </h1>
            <div className="w-20 h-1 bg-white mt-6 mb-6"></div>
            <p className="text-blue-100/80 leading-relaxed max-w-xs">
              Continue your journey of reflection and spiritual growth.
            </p>
          </div>
          
          {/* Decorative Chevrons from Slides */}
          <div className="absolute bottom-10 right-10 flex gap-1 opacity-40">
            <ChevronRight className="w-8 h-8" />
            <ChevronRight className="w-8 h-8 -ml-4" />
            <ChevronRight className="w-8 h-8 -ml-4" />
          </div>
          
          {/* Background Overlay Image (Simulated) */}
          <div className="absolute inset-0 opacity-20 grayscale bg-[url('https://images.unsplash.com/photo-1515023115689-589c39715ee1?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
        </div>

        {/* Right Side: Form (Inspired by Slide 2/Overview) */}
        <div className="w-full  md:w-1/2 p-8 md:p-16 flex flex-col justify-center mx-auto relative">
          <div className="mb-10 flex items-center flex-col">
            <h2 className="text-3xl font-bold text-slate-800 uppercase tracking-wide">Welcome Back</h2>
            <div className="flex items-center gap-2 mb-8 mt-8">
              <div className="bg-[#1a365d] p-2 rounded">
                <LogIn className="w-5 h-5 text-white" />
              </div>
              <span className="tracking-[0.2em] uppercase text-sm font-bold">Devotion Tracker</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 mt-2">
              <span className="text-xs uppercase tracking-widest font-semibold">Sign in to continue</span>
              <div className="flex-grow h-[1px] bg-gray-100"></div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="relative">
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-1">Email Address</label>
              <input
                {...register('email')}
                className={`w-full px-0 py-3 border-b-2 bg-transparent focus:outline-none transition-colors duration-300 ${
                  errors.email ? 'border-red-400' : 'border-slate-200 focus:border-[#1a365d]'
                }`}
                placeholder="you@domain.com"
              />
              {errors.email && <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.email.message}</p>}
            </div>

            <div className="relative">
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-1">Password</label>
              <input
                type="password"
                {...register('password')}
                className={`w-full px-0 py-3 border-b-2 bg-transparent focus:outline-none transition-colors duration-300 ${
                  errors.password ? 'border-red-400' : 'border-slate-200 focus:border-[#1a365d]'
                }`}
                placeholder="••••••••"
              />
              {errors.password && <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.password.message}</p>}
            </div>

            <button
              disabled={submitting}
              className="w-full mt-4 bg-[#1a365d] hover:bg-[#2a4a7d] text-white py-4 px-6 font-bold uppercase tracking-widest text-sm flex items-center justify-center transition-all group"
            >
              {submitting ? 'Authenticating...' : (
                <>
                  Sign In 
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-slate-400 uppercase tracking-widest">
            New here?{' '}
            <Link to="/signup" className="text-[#1a365d] font-bold hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    
  );
}