/**
 * Script to add a test event with ₹1 charge for testing payment flow
 * Run this script once: node scripts/add-test-event.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCc-F41t0oxvz2q_OdhJPtxsoxyR8_2W8I",
  authDomain: "unigather-51c3b.firebaseapp.com",
  projectId: "unigather-51c3b",
  storageBucket: "unigather-51c3b.firebasestorage.app",
  messagingSenderId: "413835533649",
  appId: "1:413835533649:web:b7fc011e618beba8694770",
  measurementId: "G-M68DQL6Q3G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addTestEvent() {
  try {
    console.log('🔄 Adding test event to Firestore...');

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];

    const testEvent = {
      title: "Test Event - ₹1 Payment Test",
      description: "This is a test event created for testing the payment flow. Only ₹1 will be charged. You can book this event to test authentication, payment gateway, and email confirmation.",
      category: "Social",
      date: dateString,
      time: "14:00",
      location: "Test Venue",
      address: "123 Test Street, Test City, India",
      priceMale: 1,
      priceFemale: 1,
      maxCapacity: 50,
      duration: "2 hours",
      difficulty: "Easy",
      currentParticipants: {
        male: 0,
        female: 0
      },
      rating: 5,
      reviews: 1,
      highlights: [
        "Test authentication flow",
        "Test Razorpay payment (₹1 only)",
        "Test email confirmation",
        "Complete booking experience"
      ],
      organizer: {
        name: "Unigather",
        avatar: "/api/placeholder/40/40",
        rating: 5
      },
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
      featured: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'events'), testEvent);
    
    console.log('✅ Test event added successfully!');
    console.log('📝 Event ID:', docRef.id);
    console.log('📅 Event Date:', dateString);
    console.log('💰 Price: ₹1 (both male and female)');
    console.log('');
    console.log('🎉 You can now test the booking flow with this event!');
    console.log('');
    console.log('Test Steps:');
    console.log('1. Go to Events page');
    console.log('2. Find "Test Event - ₹1 Payment Test"');
    console.log('3. Click "Book Now"');
    console.log('4. Sign in/Sign up if not authenticated');
    console.log('5. Fill booking form');
    console.log('6. Proceed to payment (₹1 will be charged)');
    console.log('7. Complete payment with real card');
    console.log('8. Check email for confirmation');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test event:', error);
    process.exit(1);
  }
}

addTestEvent();

