'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  Mail, 
  MapPin, 
  Instagram, 
  Facebook, 
  Twitter, 
  Linkedin,
  Heart,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { name: 'Instagram', icon: Instagram, href: 'https://instagram.com/unigather_india', color: 'hover:text-pink-400' },
  ];

  const quickLinks = [
    { name: 'Home', href: '/' },
    { name: 'Events', href: '/events' },
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  const policyLinks = [
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms & Conditions', href: '/terms' },
    { name: 'Refund Policy', href: '/refund' },
  ];

  return (
    <footer className="bg-dark-800 border-t border-gray-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <img 
                  src="/media/logo-new.png" 
                  alt="Unigather Logo" 
                  className="w-10 h-10 object-contain rounded-lg"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold gradient-text">Unigather</h3>
                <p className="text-sm text-gray-400">Gathering Minds - Uniting Hearts</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6 max-w-md">
              We believe that the best friendships start with strangers. Join our events and 
              discover amazing people who share your interests and passion for life. Every 
              gathering is a new beginning, every stranger a potential lifelong friend.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`p-2 bg-dark-700 rounded-lg text-gray-400 transition-all duration-300 ${social.color} hover:scale-110`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="w-5 h-5" />
                  </motion.a>
                );
              })}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link, index) => (
                <motion.li 
                  key={link.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Link 
                    href={link.href}
                    className="text-gray-400 hover:text-primary-400 transition-colors duration-300 text-sm"
                  >
                    {link.name}
                  </Link>
                </motion.li>
              ))}
            </ul>

            {/* Policy Links */}
            <h4 className="text-lg font-semibold text-white mb-4 mt-6">Legal</h4>
            <ul className="space-y-2">
              {policyLinks.map((link, index) => (
                <motion.li 
                  key={link.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 + 0.4 }}
                >
                  <Link 
                    href={link.href}
                    className="text-gray-400 hover:text-primary-400 transition-colors duration-300 text-sm"
                  >
                    {link.name}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Contact Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h4 className="text-lg font-semibold text-white mb-4">Get in Touch</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-gray-400">
                <Mail className="w-4 h-4 text-primary-400" />
                <a href="mailto:unigatherindia@gmail.com" className="text-sm hover:text-primary-300 transition-colors">unigatherindia@gmail.com</a>
              </div>
              <div className="flex items-start space-x-3 text-gray-400">
                <MapPin className="w-4 h-4 text-primary-400 mt-0.5" />
                <span className="text-sm">
                  Ludhiana, PB, India
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="border-t border-gray-700 mt-8 pt-8"
        >
          {/* Policy Links Row */}
          <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-4">
            <Link href="/privacy-policy" className="text-gray-400 hover:text-orange-400 transition-colors text-xs">
              Privacy Policy
            </Link>
            <span className="text-gray-600">•</span>
            <Link href="/terms" className="text-gray-400 hover:text-orange-400 transition-colors text-xs">
              Terms & Conditions
            </Link>
            <span className="text-gray-600">•</span>
            <Link href="/refund" className="text-gray-400 hover:text-orange-400 transition-colors text-xs">
              Refund Policy
            </Link>
            <span className="text-gray-600">•</span>
            <Link href="/admin-login" className="text-gray-400 hover:text-orange-400 transition-colors text-xs flex items-center space-x-1">
              <Settings className="w-3 h-3" />
              <span>Admin Login</span>
            </Link>
          </div>
          
          {/* Copyright Row */}
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © {currentYear} Unigather. All rights reserved.
            </p>
            <div className="flex items-center space-x-1 text-sm text-gray-400">
              <span>Made with</span>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Heart className="w-4 h-4 text-red-500 fill-current" />
              </motion.div>
              <span>for bringing people together</span>
            </div>
          </div>
          
          {/* Powered By */}
          <div className="text-center mt-4">
            <p className="text-gray-500 text-xs">
              Powered By -{' '}
              <a 
                href="https://akshbahl.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 transition-colors duration-300"
              >
                Aksh Bahl
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
