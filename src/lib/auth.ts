import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
  updateProfile,
  UserCredential
} from 'firebase/auth';
import { auth, db } from './firebase';
import { collection, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

// Sign up with email and password
export const signUp = async (
  email: string, 
  password: string, 
  name?: string,
  phone?: string
): Promise<UserCredential> => {
  try {
    // Check if auth is initialized
    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Please check your Firebase configuration.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update user profile with name if provided
    if (name && userCredential.user) {
      try {
        await updateProfile(userCredential.user, {
          displayName: name,
        });
      } catch (profileError) {
        console.warn('Failed to update profile, but user was created:', profileError);
        // Don't throw - user creation was successful
      }
    }
    
    // Save user data to Firestore (non-blocking - don't fail sign-up if this fails)
    if (userCredential.user) {
      if (!db) {
        console.warn('Firestore is not initialized. User created in Auth but not saved to Firestore. Please check your Firebase configuration.');
        // Don't throw - allow sign-up to succeed
      } else {
        // Save to Firestore in the background (don't block sign-up)
        setDoc(doc(db, 'users', userCredential.user.uid), {
          name: name || userCredential.user.displayName || '',
          email: email,
          phone: phone || '',
          joinedDate: new Date().toISOString().split('T')[0], // Format: YYYY-MM-DD
          eventsAttended: 0,
          status: 'active',
          createdAt: Timestamp.now(),
          uid: userCredential.user.uid
        }).then(() => {
          console.log('User data saved to Firestore successfully');
        }).catch((firestoreError: any) => {
          const errorCode = firestoreError?.code || 'unknown';
          const errorMessage = firestoreError?.message || 'Unknown error';
          
          console.error('Failed to save user to Firestore:', {
            code: errorCode,
            message: errorMessage,
            error: firestoreError
          });
          
          // Log helpful messages but don't throw - sign-up succeeded
          if (errorCode === 'permission-denied') {
            console.warn('Firestore permission denied. Please check your Firestore security rules in Firebase Console.');
          } else if (errorCode === 'unavailable' || errorCode === 'failed-precondition') {
            console.warn('Firestore service is unavailable or not enabled. Please enable Firestore Database in Firebase Console.');
          } else {
            console.warn(`Firestore save failed: ${errorMessage}. User was created in Auth but not saved to Firestore.`);
          }
        });
      }
    }
    
    return userCredential;
  } catch (error: any) {
    console.error('Sign up error:', error);
    throw error;
  }
};

// Sign in with email and password
export const signIn = async (
  email: string, 
  password: string
): Promise<UserCredential> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error: any) {
    throw error;
  }
};

// Sign out
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw error;
  }
};

// Send password reset email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw error;
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Helper function to get Firebase error message
export const getFirebaseErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Invalid email address. Please check your email and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return 'An error occurred. Please try again.';
  }
};

// Sync existing user from Auth to Firestore (for users created before Firestore integration)
export const syncUserToFirestore = async (user: User, name?: string, phone?: string): Promise<void> => {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  try {
    // Check if user already exists in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      console.log('User already exists in Firestore:', user.uid);
      return;
    }

    // Get creation date from Auth metadata or use current date
    const createdAt = user.metadata.creationTime 
      ? Timestamp.fromDate(new Date(user.metadata.creationTime))
      : Timestamp.now();

    const userData = {
      name: name || user.displayName || '',
      email: user.email || '',
      phone: phone || '',
      joinedDate: user.metadata.creationTime 
        ? new Date(user.metadata.creationTime).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      eventsAttended: 0,
      status: 'active',
      createdAt: createdAt,
      uid: user.uid
    };

    await setDoc(userDocRef, userData);
    console.log('User synced to Firestore successfully:', user.uid);
  } catch (error: any) {
    console.error('Failed to sync user to Firestore:', error);
    throw error;
  }
};

