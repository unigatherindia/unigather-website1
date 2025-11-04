'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { 
  Lock, LogIn, Eye, EyeOff, AlertCircle, 
  ArrowRight, Settings, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    adminId: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Admin credentials - in production, these should be in environment variables
  // For now, we'll store them in sessionStorage after first successful login
  // Default admin credentials (you should change these)
  const ADMIN_CREDENTIALS = {
    adminId: process.env.NEXT_PUBLIC_ADMIN_ID || 'admin',
    password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123',
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.adminId || !formData.password) {
      toast.error('Please fill in all fields');
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
      // Check admin credentials
      if (formData.adminId === ADMIN_CREDENTIALS.adminId && 
          formData.password === ADMIN_CREDENTIALS.password) {
        
        // Store admin session in sessionStorage
        const adminSession = {
          isAuthenticated: true,
          adminId: formData.adminId,
          loginTime: new Date().toISOString(),
        };
        sessionStorage.setItem('adminSession', JSON.stringify(adminSession));
        
        toast.success('Admin login successful!');
        
        // Redirect to admin dashboard
        router.push('/admin');
      } else {
        toast.error('Invalid admin credentials. Please try again.');
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast.error('Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <section className="min-h-screen bg-dark-900 flex items-center justify-center py-20 px-4">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-400/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto max-w-md relative z-10">
          {/* Back to Sign In */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>Back to Home</span>
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
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Admin <span className="gradient-text">Login</span>
            </h1>
            
            <p className="text-gray-300 text-lg">
              Enter your admin credentials to access the dashboard
            </p>
          </motion.div>

          {/* Login Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-dark-800 rounded-2xl border border-gray-700 p-8 shadow-2xl"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Admin ID Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Admin ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Settings className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.adminId}
                    onChange={(e) => handleInputChange('adminId', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    placeholder="Enter your admin ID"
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
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary-400 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-400 text-white py-3 rounded-lg font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Login</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-400">
                  <p className="font-semibold mb-1">Security Notice</p>
                  <p className="text-yellow-300/80">
                    This is a restricted area. Only authorized administrators should access this page.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}

