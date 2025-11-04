'use client';

import React from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Cookie, Database, UserCheck, Mail, Clock } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const sectionClasses = "p-4 sm:p-6 bg-dark-800 rounded-2xl border border-gray-700/50";

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-400/5 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <span className="inline-flex items-center px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-400 text-sm font-medium mb-6">
              <Shield className="w-4 h-4 mr-2" />
              Privacy Policy
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              Your Privacy Matters to Us
            </h1>
            <p className="text-gray-300 text-base sm:text-lg">
              This Privacy Policy explains how Unigather collects, uses, and protects your information.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16 bg-dark-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className={sectionClasses}
            >
              <div className="flex items-center mb-3 text-gray-300 text-sm">
                <Clock className="w-4 h-4 mr-2 text-primary-400" />
                <span>Last updated: November 2025</span>
              </div>
              <p className="text-gray-300">
                Unigather ("we", "us", "our") is committed to protecting your privacy. By using our
                website and services, you agree to the collection and use of information in accordance with this policy.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className={sectionClasses}
            >
              <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
                <Database className="w-5 h-5 text-primary-400 mr-2" />
                Information We Collect
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Personal details like name, email, phone number, and city.</li>
                <li>Account and booking information related to events you view or join.</li>
                <li>Usage data including device, browser, IP, and interaction logs.</li>
                <li>Content you share with us (messages, feedback, forms).</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={sectionClasses}
            >
              <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
                <UserCheck className="w-5 h-5 text-primary-400 mr-2" />
                How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Provide and improve our services and events.</li>
                <li>Process bookings, payments, confirmations, and notifications.</li>
                <li>Personalize content and recommendations.</li>
                <li>Communicate updates, support responses, and marketing (you can opt out).</li>
                <li>Detect, prevent, and address technical or security issues.</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className={sectionClasses}
            >
              <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
                <Cookie className="w-5 h-5 text-primary-400 mr-2" />
                Cookies & Tracking
              </h2>
              <p className="text-gray-300 mb-3">
                We use cookies and similar technologies to improve your experience, analyze usage, and
                deliver relevant content. You can control cookies through your browser settings.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Essential cookies: required for core functionality.</li>
                <li>Analytics: to understand usage and performance.</li>
                <li>Preferences: to remember your settings and selections.</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={sectionClasses}
            >
              <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
                <Lock className="w-5 h-5 text-primary-400 mr-2" />
                Data Sharing & Security
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>We do not sell your personal information.</li>
                <li>We may share data with trusted service providers (e.g., hosting, analytics, payments) bound by confidentiality.</li>
                <li>We implement reasonable security measures to protect your data.</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className={sectionClasses}
            >
              <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
                <Eye className="w-5 h-5 text-primary-400 mr-2" />
                Your Rights & Choices
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Access, update, or delete your personal information.</li>
                <li>Opt out of marketing communications at any time.</li>
                <li>Control cookie preferences via your browser.</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className={sectionClasses}
            >
              <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
                <Clock className="w-5 h-5 text-primary-400 mr-2" />
                Data Retention
              </h2>
              <p className="text-gray-300">
                We retain personal data only as long as necessary for the purposes outlined in this policy
                and to comply with legal obligations. When no longer needed, we securely delete or anonymize it.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className={sectionClasses}
            >
              <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
                <Mail className="w-5 h-5 text-primary-400 mr-2" />
                Contact Us
              </h2>
              <p className="text-gray-300">
                If you have questions about this Privacy Policy, contact us at
                <a href="mailto:unigatherindia@gmail.com" className="text-primary-400 font-medium hover:text-primary-300 ml-1">unigatherindia@gmail.com</a>.
              </p>
            </motion.div>

            <div className="text-sm text-gray-500 text-center pt-2">
              This policy may be updated from time to time. We will post any changes on this page.
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}


