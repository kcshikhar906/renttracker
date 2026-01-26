# Rent Tracker

A premium, modern web application for tracking rent and utility bill payments. Built with React (Vite), Tailwind CSS 4, and Firebase.

## 🚀 Features

- **Authentication**: Secure login and signup with Firebase Auth.
- **Transaction Management**: Add rent or bills with date, amount, and notes.
- **Proof of Payment**: Optional file upload (images/PDFs) stored in Firebase Storage.
- **Transaction History**: Real-time list of your payments, sorted by date.
- **Responsive Design**: Optimized for both desktop and mobile devices.
- **Premium UI**: Sleek glassmorphism design with Framer Motion animations.

## 🛠️ Setup Instructions

### 1. Clone & Install
```bash
# Navigate to project directory
cd Expenses

# Install dependencies
npm install
```

### 2. Firebase Configuration
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project named **Rent Tracker** (or use an existing one).
3. **Authentication**: Enable "Email/Password" sign-in provider.
4. **Firestore Database**: 
   - Create a database in **Production Mode**.
   - Set the location to your preferred region.
   - Update Rules to allow users to read/write their own data:
     ```javascript
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /transactions/{transaction} {
           allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
           allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
         }
       }
     }
     ```
5. **Storage**:
   - Enable Firebase Storage.
   - Update Rules:
     ```javascript
     rules_version = '2';
     service firebase.storage {
       match /b/{bucket}/o {
         match /receipts/{userId}/{allPaths=**} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
       }
     }
     ```

### 3. Environment Variables
1. Copy `.env.example` to `.env`.
2. Fill in your Firebase configuration keys:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

### 4. Run the App
```bash
npm run dev
```

## 🎨 Technologies
- **React 19** (Vite)
- **Tailwind CSS 4**
- **Firebase** (Auth, Firestore, Storage)
- **Lucide React** (Icons)
- **Framer Motion** (Animations)
- **React Router 7**
