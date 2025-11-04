'use client';

import React from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { RotateCcw, FileText, Clock, Mail, Info, CheckCircle, XCircle } from 'lucide-react';

export default function RefundPolicyPage() {
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
              <RotateCcw className="w-4 h-4 mr-2" />
              Refund Policy
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              Refunds, Cancellations & Rescheduling
            </h1>
            <p className="text-gray-300 text-base sm:text-lg">
              Clear guidelines on cancellations and refunds for Unigather events.
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
                We understand plans can change. This policy explains how cancellations, refunds,
                and rescheduling work for Unigather events.
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
                <FileText className="w-5 h-5 text-primary-400 mr-2" />
                Participant Cancellations
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>We are not providing any refunds until there is cancellation or reschdule from our side.</li>
    
              </ul>
              <p className="text-gray-400 text-sm mt-2">Refunds are processed to the original payment method.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={sectionClasses}
            >
              <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
                <Info className="w-5 h-5 text-primary-400 mr-2" />
                Event Changes by Unigather
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Event cancelled by us: full refund or free reschedule—your choice.</li>
                <li>Event rescheduled: option to accept new date or receive full refund.</li>
                <li>Significant event changes: you may request a full refund.</li>
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
                <CheckCircle className="w-5 h-5 text-primary-400 mr-2" />
                How to Request a Refund
              </h2>
              <p className="text-gray-300 mb-2">Please provide your booking ID and event details.</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Email: <a href="mailto:unigatherindia@gmail.com" className="text-primary-400 hover:text-primary-300">unigatherindia@gmail.com</a></li>
                <li>Response time: within 24 hours on business days</li>
                <li>Refund processing: typically 5–7 business days after approval</li>
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
                <XCircle className="w-5 h-5 text-primary-400 mr-2" />
                Non-Refundable Cases
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>No-shows or late arrivals causing missed activities.</li>
                <li>Violations of our Terms & Conditions or event code of conduct.</li>
                <li>Personal reasons outside the timelines mentioned above.</li>
              </ul>
            </motion.div>

            <div className="text-sm text-gray-500 text-center pt-2">
              This policy may be updated from time to time. We will post changes on this page.
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}


