# Firestore Database Setup Guide

If you're seeing "No users found" in the admin panel even though users are registered in Firebase Authentication, you need to set up Firestore Database.

## Why This Happens

Firebase Authentication and Firestore Database are separate services:
- **Firebase Authentication**: Stores user login credentials (email, password)
- **Firestore Database**: Stores user profile data (name, phone, join date, etc.)

Users in Authentication don't automatically appear in Firestore - they need to be saved there.

## Step 1: Enable Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **unigatherwebsite**
3. Click on **Firestore Database** in the left sidebar
4. Click **Create database**
5. Choose **Start in test mode** (for development)
6. Select a **location** (choose the closest to your users)
7. Click **Enable**

## Step 2: Set Up Security Rules

1. In Firestore Database, go to the **Rules** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - allow read/write for now (update for production)
    match /users/{userId} {
      allow read, write: if true;
    }
    
    // Events collection - allow read for everyone, write for now (update for production)
    match /events/{eventId} {
      allow read: if true;  // Anyone can read events
      allow write: if true; // Allow writes for now (restrict in production)
    }
    
    // Gallery collection - allow read for everyone, write for now (update for production)
    match /gallery/{imageId} {
      allow read: if true;  // Anyone can read gallery images
      allow write: if true; // Allow writes for now (restrict in production)
    }
    
    // Team Members collection - allow read for everyone, write for now (update for production)
    match /teamMembers/{memberId} {
      allow read: if true;  // Anyone can read team members
      allow write: if true; // Allow writes for now (restrict in production)
    }
    
    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish**

**⚠️ Important:** These rules allow anyone to read/write to users and events collections. For production, implement proper authentication-based rules.

**⚠️ Current Issue:** If your rules have `allow read, write: if false;` for all documents, this will block all operations. Make sure you have specific rules for `users` and `events` collections BEFORE the catch-all deny rule.

## Step 3: Create Firestore Index (Optional but Recommended)

If you see an error about missing index:

1. Check the browser console for the error message
2. Click the link provided in the error (or go to Firestore > Indexes)
3. Click **Create Index**
4. Wait for the index to build (usually takes a few minutes)

## Step 4: Verify Setup

1. Create a new test account at `/sign-up`
2. Go to Firebase Console > Firestore Database
3. You should see a `users` collection with a document for the new user

## Troubleshooting

### "Permission denied" Error
- Go to Firestore > Rules
- Make sure the rules allow read access
- Rules should be published (not just saved)

### "Index required" Error
- Click the link in the error message to create the index
- Or manually create it in Firestore > Indexes

### Users Still Not Showing

1. **Check Firestore Database is enabled:**
   - Firebase Console > Firestore Database
   - You should see "Cloud Firestore" enabled

2. **Check if users collection exists:**
   - Firestore Database > Data
   - Look for a `users` collection

3. **Verify new sign-ups create Firestore documents:**
   - Sign up a new test user
   - Check Firestore Database immediately after
   - If no document is created, check browser console for errors

4. **Existing users won't appear:**
   - Users who signed up BEFORE Firestore was enabled won't appear
   - Only users who sign up AFTER Firestore setup will be saved to Firestore
   - You may need to ask existing users to sign up again, or manually migrate them

## Manual User Migration (If Needed)

If you have users in Firebase Authentication but not in Firestore, you can:

1. Use Firebase Admin SDK to migrate them
2. Or ask users to sign up again (they'll get a "email already in use" error, so they should sign in instead)
3. The admin panel will only show users with Firestore documents

## Production Security Rules

For production, update Firestore rules to:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Allow read if authenticated, write only for admins or own profile
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

## Need Help?

If users still don't appear after setting up Firestore:
1. Check browser console for errors
2. Check Firebase Console > Firestore Database > Data for the `users` collection
3. Verify the `.env.local` file has correct Firebase credentials
4. Make sure you've restarted the development server after adding `.env.local`

