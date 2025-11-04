'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { 
  Mail, Lock, LogIn, Eye, EyeOff, AlertCircle, 
  ArrowRight, Users, Sparkles, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { signIn, signInWithGoogle, getFirebaseErrorMessage } from '@/lib/auth';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Prefill from localStorage if user opted to be remembered
  useEffect(() => {
    try {
      const remembered = localStorage.getItem('unigather_remember_me');
      const savedEmail = localStorage.getItem('unigather_remember_email') || '';
      const savedPassword = localStorage.getItem('unigather_remember_password') || '';
      if (remembered === 'true') {
        setRememberMe(true);
        setFormData(prev => ({ ...prev, email: savedEmail, password: savedPassword }));
      }
    } catch {}
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Set persistence based on Remember Me
      if (auth) {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      }
      await signIn(formData.email, formData.password);
      toast.success('Signed in successfully!');
      // Save or clear remembered email
      try {
        if (rememberMe) {
          localStorage.setItem('unigather_remember_me', 'true');
          localStorage.setItem('unigather_remember_email', formData.email);
          localStorage.setItem('unigather_remember_password', formData.password);
        } else {
          localStorage.removeItem('unigather_remember_me');
          localStorage.removeItem('unigather_remember_email');
          localStorage.removeItem('unigather_remember_password');
        }
      } catch {}
      const redirectTo = searchParams?.get('redirect') || '/';
      router.push(redirectTo);
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        toast.error('No account found. Redirecting to Sign Up...');
        setTimeout(() => {
          router.push(`/sign-up?email=${encodeURIComponent(formData.email)}`);
        }, 800);
      } else {
        const errorMessage = getFirebaseErrorMessage(error.code);
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      if (auth) {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      }
      await signInWithGoogle();
      toast.success('Signed in with Google!');
      const redirectTo = searchParams?.get('redirect') || '/';
      router.push(redirectTo);
    } catch (error: any) {
      const message = error?.code ? getFirebaseErrorMessage(error.code) : 'Google sign-in failed. Please try again.';
      toast.error(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Suspense fallback={null}>
    <Layout>
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 overflow-hidden pt-20">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-400/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary-500/5 to-transparent rounded-full"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="max-w-md mx-auto">
            {/* Admin Button */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6 flex justify-end"
            >
              <Link
                href="/admin-login"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg text-gray-300 hover:text-primary-400 hover:border-primary-500/50 transition-all duration-300"
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium">Admin</span>
              </Link>
            </motion.div>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-8"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Users className="w-8 h-8 text-white" />
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Welcome <span className="gradient-text">Back</span>
              </h1>
              
              <p className="text-gray-300 text-lg">
                Sign in to continue your journey of making new friends
              </p>
            </motion.div>

            {/* Sign In Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-dark-800 rounded-3xl border border-gray-700/50 p-8 shadow-xl"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-dark-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full pl-11 pr-11 py-3 bg-dark-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRememberMe(checked);
                        try {
                          if (checked) {
                            localStorage.setItem('unigather_remember_me', 'true');
                            if (formData.email) {
                              localStorage.setItem('unigather_remember_email', formData.email);
                            }
                            if (formData.password) {
                              localStorage.setItem('unigather_remember_password', formData.password);
                            }
                          } else {
                            localStorage.removeItem('unigather_remember_me');
                            localStorage.removeItem('unigather_remember_email');
                            localStorage.removeItem('unigather_remember_password');
                          }
                        } catch {}
                      }}
                      className="w-4 h-4 text-primary-500 bg-dark-700 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-300">Remember me</span>
                  </label>
                  <Link 
                    href="/forgot-password"
                    className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary-500 to-primary-400 text-white py-4 rounded-xl font-semibold text-lg hover:from-primary-600 hover:to-primary-500 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed glow-effect"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Sign In</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full mt-3 bg-white text-gray-900 py-3 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300"
                >
                  {isGoogleLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3" className="w-5 h-5"><path fill="#4285F4" d="M533.5 278.4c0-18.5-1.7-36.3-4.9-53.6H272v101.5h147c-6.3 34.1-25.3 63.1-54 82.5v68h87.2c51 47 80.3 116.2 80.3 195.7 0 11.2-.9 22.2-2.6 33h-0.1C503.2 497 533.5 394.1 533.5 278.4z"/><path fill="#34A853" d="M272 544.3c73.5 0 135.3-24.3 180.4-66.1l-87.2-68c-24.2 16.3-55.2 26-93.2 26-71.8 0-132.6-48.5-154.3-113.7H28.7v70.9C73.6 499.3 167.6 544.3 272 544.3z"/><path fill="#FBBC05" d="M117.7 322.5c-5.6-16.3-8.8-33.7-8.8-51.5s3.2-35.2 8.8-51.5v-70.9H28.7C10.7 184.3 0 230.2 0 278.4s10.7 94.1 28.7 130.7l89-70.9z"/><path fill="#EA4335" d="M272 107.7c39.9 0 75.8 13.7 104 40.5l78-78C407.4 24.8 344.6 0 272 0 167.6 0 73.6 44.9 28.7 114.1l89 70.9C139.4 156.2 200.2 107.7 272 107.7z"/></svg>
                      <span>Sign in with Google</span>
                    </>
                  )}
                </button>
              </form>

              {/* Sign Up Link */}
              <div className="mt-8 text-center">
                <p className="text-gray-400">
                  Don't have an account?{' '}
                  <Link 
                    href="/sign-up"
                    className="text-primary-400 hover:text-primary-300 font-medium transition-colors inline-flex items-center space-x-1"
                  >
                    <span>Sign Up</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </p>
              </div>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-8 text-center"
            >
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-primary-400" />
                  <span>Secure Login</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-primary-400" />
                  <span>10,000+ Members</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
    </Suspense>
  );
}

