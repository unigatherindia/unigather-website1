# Firebase Setup Guide

This guide will help you connect your Unigather website to Google Firebase for authentication.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard to create your project

## Step 2: Enable Email/Password Authentication

1. In your Firebase project, go to **Authentication** > **Sign-in method**
2. Click on **Email/Password**
3. Enable the first toggle (Email/Password)
4. Click **Save**

## Step 3: Get Your Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. If you haven't added a web app, click **Web** icon (`</>`) to add one
4. Register your app with a nickname (e.g., "Unigather Web")
5. Copy the configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in the root of your project (same directory as `package.json`)
2. Add the following environment variables with your Firebase config values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Important:** Replace the placeholder values with your actual Firebase configuration values.

## Step 5: Restart Your Development Server

After adding the environment variables, restart your Next.js development server:

```bash
npm run dev
```

## Testing

1. Go to `/sign-up` and create a test account
2. Try signing in at `/sign-in` with the credentials you just created
3. Check the Firebase Console > Authentication > Users to see your registered users

## Features

✅ Email/Password Authentication
✅ User Registration with Name
✅ Sign In with Email/Password
✅ Error Handling with User-Friendly Messages
✅ Automatic Redirect after Successful Authentication
✅ Password Validation
✅ Email Validation

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure you've created the `.env.local` file with all required variables
- Verify all environment variable names start with `NEXT_PUBLIC_`
- Restart your development server after adding environment variables

### "Firebase: Error (auth/invalid-api-key)"
- Double-check your API key in `.env.local`
- Make sure there are no extra spaces or quotes around the values

### "Firebase: Error (auth/operation-not-allowed)"
- Go to Firebase Console > Authentication > Sign-in method
- Make sure Email/Password authentication is enabled

## Security Notes

- Never commit `.env.local` to version control (it's already in `.gitignore`)
- Keep your Firebase API keys secure
- In production, use Firebase App Check for additional security
- Configure authorized domains in Firebase Console for production

## Next Steps

After setting up authentication, you can:
- Add user profile management
- Implement role-based access control
- Add email verification
- Set up password reset functionality
- Integrate with Firestore for user data storage

