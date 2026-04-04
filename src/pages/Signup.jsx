import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getGroups } from '../services/auth.service';
import { signupSchema } from '../utils/validation';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [groups, setGroups] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '',
      password: '', confirmPassword: '', role: 'member',
    },
  });

  useEffect(() => {
    async function loadGroups() {
      const data = await getGroups();
      setGroups(data);
    }
    loadGroups();
  }, []);

  async function onSubmit(data) {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await signup({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        groupId: data.groupId || undefined,
      });
      setSuccess('Account created! Please check your email to verify.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    
      <div className="h-full w-full flex flex-col md:flex-row bg-white shadow-2xl rounded-sm overflow-hidden border border-gray-100">
        
        {/* Left Side: Liturgical Branding */}
        <div className="hidden md:flex md:w-2/5 bg-[#1a365d] relative p-12 flex-col justify-between text-white">
          <div className="z-10">
            <div className="flex items-center gap-2 mb-12">
              <UserPlus className="w-5 h-5 text-blue-300" />
              <span className="tracking-[0.3em] uppercase text-[10px] font-bold">Fellowship</span>
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tighter uppercase">
              Begin Your <br /> Journey
            </h1>
            <div className="w-16 h-1 bg-white/30 mt-6"></div>
          </div>
          
          <div className="z-10 italic text-blue-100/60 text-sm leading-relaxed">
            "For where two or three gather in my name, there am I with them."
          </div>

          {/* Decorative Elements from Slides */}
          <div className="absolute top-0 right-0 p-8 opacity-10">
            {[...Array(3)].map((_, i) => (
              <ChevronRight key={i} className="w-12 h-12 -mt-6" style={{ transform: 'rotate(90deg)' }} />
            ))}
          </div>

          <div className="absolute inset-0 opacity-15 grayscale bg-[url('https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
        </div>

        {/* Right Side: Signup Form */}
        <div className="w-full md:w-3/5 p-8 md:p-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-widest">Create Account</h2>
            <p className="text-xs text-slate-400 mt-2 uppercase tracking-tight">Join the Devotion Tracker community</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-3 bg-green-50 border-l-4 border-green-500 flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle className="w-4 h-4" /> {success}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">First Name</label>
                <input {...register('firstName')} className={`w-full border-b-2 py-2 focus:outline-none transition-colors ${errors.firstName ? 'border-red-300' : 'border-slate-100 focus:border-[#1a365d]'}`} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Last Name</label>
                <input {...register('lastName')} className={`w-full border-b-2 py-2 focus:outline-none transition-colors ${errors.lastName ? 'border-red-300' : 'border-slate-100 focus:border-[#1a365d]'}`} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Email Address</label>
              <input type="email" {...register('email')} className={`w-full border-b-2 py-2 focus:outline-none transition-colors ${errors.email ? 'border-red-300' : 'border-slate-100 focus:border-[#1a365d]'}`} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Password</label>
                <input type="password" {...register('password')} className={`w-full border-b-2 py-2 focus:outline-none transition-colors ${errors.password ? 'border-red-300' : 'border-slate-100 focus:border-[#1a365d]'}`} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Confirm</label>
                <input type="password" {...register('confirmPassword')} className={`w-full border-b-2 py-2 focus:outline-none transition-colors ${errors.confirmPassword ? 'border-red-300' : 'border-slate-100 focus:border-[#1a365d]'}`} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">I am joining as a</label>
              <select {...register('role')} className="w-full border-b-2 py-2 bg-transparent focus:outline-none focus:border-[#1a365d] text-slate-600">
                <option value="member">Member</option>
                <option value="leader">Leader</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#1a365d] hover:bg-[#2a4a7d] text-white py-4 mt-4 font-bold uppercase tracking-[0.2em] text-xs transition-all shadow-lg active:scale-[0.98]"
            >
              {submitting ? 'Registering...' : 'Complete Registration'}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] text-slate-400 uppercase tracking-widest">
            Already have an account?{' '}
            <Link to="/login" className="text-[#1a365d] font-bold hover:underline ml-1">Sign In</Link>
          </p>
        </div>
      </div>
    
  );
}