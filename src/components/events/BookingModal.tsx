'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, User, Mail, Phone, Calendar, MapPin, IndianRupee, 
  CreditCard, Check, AlertCircle, Users, Clock 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  address: string;
  price: {
    male: number;
    female: number;
  };
  maxCapacity: number;
  currentParticipants: {
    male: number;
    female: number;
  };
  duration: string;
  highlights: string[];
}

interface BookingModalProps {
  event: Event;
  onClose: () => void;
}

interface BookingForm {
  name: string;
  email: string;
  phone: string;
  gender: 'male' | 'female';
  age: string;
  dietaryRestrictions: string;
  experience: string;
  terms: boolean;
}

const BookingModal: React.FC<BookingModalProps> = ({ event, onClose }) => {
  const [step, setStep] = useState(1); // 1: Form, 2: Payment, 3: Confirmation
  const [isLoading, setIsLoading] = useState(false);
  
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    name: '',
    email: '',
    phone: '',
    gender: 'male',
    age: '',
    dietaryRestrictions: '',
    experience: '',
    terms: false
  });

  const handleInputChange = (field: keyof BookingForm, value: string | boolean) => {
    setBookingForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const required = ['name', 'email', 'phone', 'age'];
    for (let field of required) {
      if (!bookingForm[field as keyof BookingForm]) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    
    if (!bookingForm.terms) {
      toast.error('Please accept the terms and conditions');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingForm.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    // Phone validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(bookingForm.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return false;
    }

    return true;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setStep(2);
  };

  const handlePayment = async () => {
    setIsLoading(true);
    
    // Simulate payment process (demo only)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setStep(3);
    toast.success('Booking confirmed! (Demo Mode - No actual payment processed)');
    setIsLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const selectedPrice = event.price[bookingForm.gender];
  const totalParticipants = event.currentParticipants.male + event.currentParticipants.female;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-dark-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {step === 1 ? 'Book Event' : step === 2 ? 'Payment' : 'Booking Confirmed'}
            </h2>
            <p className="text-gray-400 text-sm">{event.title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-dark-700 hover:bg-dark-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    stepNumber <= step
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-600 text-gray-400'
                  }`}
                >
                  {stepNumber < step ? <Check className="w-4 h-4" /> : stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div
                    className={`w-12 h-0.5 mx-2 transition-colors ${
                      stepNumber < step ? 'bg-primary-500' : 'bg-dark-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className={step >= 1 ? 'text-primary-400' : 'text-gray-500'}>Details</span>
            <span className={step >= 2 ? 'text-primary-400' : 'text-gray-500'}>Payment</span>
            <span className={step >= 3 ? 'text-primary-400' : 'text-gray-500'}>Confirmation</span>
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Booking Form */}
          {step === 1 && (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Event Summary */}
              <div className="bg-dark-700 rounded-2xl p-4 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{event.title}</h3>
                    <div className="space-y-1 text-sm text-gray-300">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-primary-400" />
                        {formatDate(event.date)} at {event.time}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-primary-400" />
                        {event.location}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-primary-400" />
                        {event.duration}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2 text-primary-400" />
                        {totalParticipants}/{event.maxCapacity} participants
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={bookingForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Gender *
                  </label>
                  <select
                    value={bookingForm.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={bookingForm.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={bookingForm.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Age *
                  </label>
                  <input
                    type="number"
                    value={bookingForm.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    placeholder="25"
                    min="18"
                    max="80"
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dietary Restrictions (Optional)
                </label>
                <textarea
                  value={bookingForm.dietaryRestrictions}
                  onChange={(e) => handleInputChange('dietaryRestrictions', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  placeholder="Any dietary restrictions or allergies..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Previous Experience (Optional)
                </label>
                <textarea
                  value={bookingForm.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  placeholder="Tell us about your experience with similar events..."
                  rows={3}
                />
              </div>

              {/* Price Display */}
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IndianRupee className="w-5 h-5 text-primary-400" />
                    <span className="text-white font-medium">
                      {bookingForm.gender === 'male' ? 'Male' : 'Female'} Ticket
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-primary-400">
                    ₹{selectedPrice}
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={bookingForm.terms}
                  onChange={(e) => handleInputChange('terms', e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary-500 bg-dark-700 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                />
                <label htmlFor="terms" className="text-sm text-gray-300 leading-relaxed">
                  I agree to the{' '}
                  <a href="#" className="text-primary-400 hover:text-primary-300 underline">
                    Terms and Conditions
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-primary-400 hover:text-primary-300 underline">
                    Privacy Policy
                  </a>
                  . I understand the event details and cancellation policy.
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-primary-500 to-primary-400 text-white py-4 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <CreditCard className="w-5 h-5" />
                <span>Proceed to Payment</span>
              </button>
            </form>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Booking Summary */}
              <div className="bg-dark-700 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Booking Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Event</span>
                    <span className="text-white">{event.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Participant</span>
                    <span className="text-white">{bookingForm.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Ticket Type</span>
                    <span className="text-white">{bookingForm.gender} Ticket</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Date & Time</span>
                    <span className="text-white">{formatDate(event.date)} at {event.time}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-3 mt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-white">Total Amount</span>
                      <span className="text-primary-400">₹{selectedPrice}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo Notice */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <div className="text-yellow-400 font-medium mb-1">Demo Mode</div>
                    <div className="text-sm text-gray-300">
                      This is a frontend demo. No actual payment will be processed.
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-6 bg-dark-600 text-white rounded-xl font-medium hover:bg-dark-500 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handlePayment}
                  disabled={isLoading}
                  className="flex-2 bg-gradient-to-r from-primary-500 to-primary-400 text-white py-3 px-6 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Pay ₹{selectedPrice} (Demo)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, type: 'spring', bounce: 0.5 }}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto"
              >
                <Check className="w-10 h-10 text-white" />
              </motion.div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Booking Demo Completed!
                </h3>
                <p className="text-gray-300">
                  This is a demo booking flow. In production, this would process a real payment.
                </p>
              </div>

              <div className="bg-dark-700 rounded-2xl p-6 text-left">
                <h4 className="text-lg font-semibold text-white mb-4">Booking Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Booking ID</span>
                    <span className="text-white font-mono">UG{Date.now().toString().slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Event</span>
                    <span className="text-white">{event.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Date</span>
                    <span className="text-white">{formatDate(event.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount</span>
                    <span className="text-green-400">₹{selectedPrice}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-400 text-white py-3 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BookingModal;
