'use client';

import React from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { FileText, Shield, Scale, CheckCircle, AlertTriangle, Clock, Mail } from 'lucide-react';

export default function TermsPage() {
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
              <FileText className="w-4 h-4 mr-2" />
              Terms & Conditions
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              Terms of Use
            </h1>
            <p className="text-gray-300 text-base sm:text-lg">
              Please read these terms and conditions carefully before using Unigather.
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
                These Terms & Conditions ("Terms") govern your use of Unigather's website and services.
                By accessing or using Unigather, you agree to be bound by these Terms.
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
                <Shield className="w-5 h-5 text-primary-400 mr-2" />
                Eligibility & Account
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>You must be at least 18 years old to participate in events.</li>
                <li>You are responsible for maintaining the confidentiality of your account.</li>
                <li>You agree that your account details are accurate and up-to-date.</li>
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
                <Scale className="w-5 h-5 text-primary-400 mr-2" />
                Event Participation
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>You agree to follow event guidelines and instructions from organizers.</li>
                <li>Unigather reserves the right to refuse or cancel participation for misconduct.</li>
                <li>Payments, refunds, and cancellations are governed by our Refund Policy.</li>
                <li>We are only responsible for the events taking place during the UniGather program and not for any matters occurring before or after the event.</li>
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
                <AlertTriangle className="w-5 h-5 text-primary-400 mr-2" />
                Safety & Conduct
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Respectful behavior is required at all times; harassment or abuse is not tolerated.</li>
                <li>Participants are responsible for their own safety and belongings.</li>
                <li>Report any issues to our team immediately so we can assist.</li>
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
                <CheckCircle className="w-5 h-5 text-primary-400 mr-2" />
                Content & Intellectual Property
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>All content on Unigather is protected by copyright and related laws.</li>
                <li>You may not reproduce, distribute, or modify site content without permission.</li>
                <li>By submitting content, you grant Unigather a right to use it for service delivery and promotion.</li>
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
                <FileText className="w-5 h-5 text-primary-400 mr-2" />
                Changes to Terms
              </h2>
              <p className="text-gray-300">
                We may update these Terms from time to time. Continued use of the website after changes
                constitutes acceptance of the revised Terms. Please check this page periodically.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className={sectionClasses}
            >
              <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
                <Mail className="w-5 h-5 text-primary-400 mr-2" />
                Contact Us
              </h2>
              <p className="text-gray-300">
                Questions about these Terms? Email us at
                <a href="mailto:unigatherindia@gmail.com" className="text-primary-400 font-medium hover:text-primary-300 ml-1">unigatherindia@gmail.com</a>.
              </p>
            </motion.div>

            <div className="text-sm text-gray-500 text-center pt-2">
              These Terms are effective as of the date above.
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}


