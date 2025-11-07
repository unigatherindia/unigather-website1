'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Users, Calendar, Info, Mail, Settings, LogIn, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/auth/AuthModal';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigationItems = [
    { name: 'Home', href: '/', icon: Users },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'About Us', href: '/about', icon: Info },
    { name: 'Contact', href: '/contact', icon: Mail },
  ];

  const isAuthPage = pathname === '/admin' || pathname === '/admin-login';

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)}
        />
      )}

      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-dark-900/95 backdrop-blur-md shadow-lg' 
            : 'bg-transparent'
        }`}
      >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-2"
          >
            <Link href="/" className="flex items-center space-x-3 group">
              <div className={`rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                isAuthPage ? 'w-16 h-16 md:w-20 md:h-20' : 'w-10 h-10'
              }`}>
                <img 
                  src="/media/logo-new.png" 
                  alt="Unigather Logo" 
                  className={`object-contain rounded-lg ${
                    isAuthPage ? 'w-16 h-16 md:w-20 md:h-20' : 'w-10 h-10'
                  }`}
                />
              </div>
              <div>
                <h1 className={`font-bold gradient-text ${
                  isAuthPage ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-xl md:text-2xl'
                }`} style={{ fontFamily: 'Inter, Arial, sans-serif', letterSpacing: '0.01em' }}>
                  Unigather
                </h1>
                <p className={`text-gray-400 hidden md:block ${
                  isAuthPage ? 'text-sm' : 'text-xs'
                }`}>
                  Gathering Minds - Uniting Hearts
                </p>
              </div>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          {!isAuthPage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden md:flex space-x-8"
            >
              {navigationItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-300 group ${
                      isActive 
                        ? 'text-primary-400 bg-primary-500/10' 
                        : 'text-gray-300 hover:text-primary-400 hover:bg-primary-500/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.name}</span>
                    {isActive && (
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400 rounded-full"
                        layoutId="activeTab"
                      />
                    )}
                  </Link>
                );
              })}
            </motion.div>
          )}

          {/* CTA Buttons */}
          {!isAuthPage && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="hidden md:flex items-center space-x-3"
            >
              {user ? (
                <>
                  <div className="flex items-center space-x-2 px-3 py-2 text-gray-300">
                    <User className="w-4 h-4" />
                    <span className="font-medium text-sm">{user.displayName || user.email}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-primary-400 transition-colors duration-300"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-300"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="font-medium">Sign In</span>
                </button>
              )}
              <Link 
                href="/admin-login"
                className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-primary-400 transition-colors duration-300"
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium">Admin</span>
              </Link>
            </motion.div>
          )}

          {/* Mobile Menu Button */}
          {!isAuthPage && (
            <div className="md:hidden">
              <button
                onClick={toggleMenu}
                className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-300"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-dark-800/95 backdrop-blur-md border-t border-gray-700"
          >
            <div className="container mx-auto px-4 py-4">
              {navigationItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                        isActive 
                          ? 'text-primary-400 bg-primary-500/10' 
                          : 'text-gray-300 hover:text-primary-400 hover:bg-primary-500/5'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </motion.div>
                );
              })}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: navigationItems.length * 0.1 }}
                className="mt-4 pt-4 border-t border-gray-700 space-y-3"
              >
                {user ? (
                  <>
                    <div className="flex items-center justify-center space-x-2 px-4 py-3 text-gray-300">
                      <User className="w-5 h-5" />
                      <span className="font-medium">{user.displayName || user.email}</span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center justify-center space-x-3 px-4 py-3 w-full rounded-lg text-gray-300 hover:text-primary-400 hover:bg-primary-500/5 transition-all duration-300"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setShowAuthModal(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center justify-center space-x-3 px-4 py-3 w-full rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-all duration-300"
                  >
                    <LogIn className="w-5 h-5" />
                    <span className="font-medium">Sign In</span>
                  </button>
                )}
                <Link
                  href="/admin-login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center space-x-3 px-4 py-3 w-full rounded-lg text-gray-300 hover:text-primary-400 hover:bg-primary-500/5 transition-all duration-300"
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Admin</span>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
    </>
  );
};

export default Header;

