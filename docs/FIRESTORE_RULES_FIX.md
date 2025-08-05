# Fixing "Failed to Load Cards" Error - Firestore Security Rules

## Most Common Cause: Firestore Security Rules

The "failed to load cards" error is typically caused by Firestore security rules that are blocking read access. Here's how to fix it:

### Step 1: Check the Error Details

1. Open your browser's Developer Console (F12)
2. Look for the specific error message - it will likely show "permission-denied"
3. Click the "Debug Firestore" button that appears with the error message

### Step 2: Update Firestore Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `flashcard-app-3f2a3`
3. Navigate to **Firestore Database** → **Rules**
4. Replace the existing rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own flashcards
    match /flashcards/{document} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // Allow users to read/write their own settings
    match /userSettings/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
    }
  }
}
```

5. Click **Publish**

### Step 3: Verify the Fix

1. Refresh your flashcard app
2. The error should be resolved
3. If not, check the console for more specific error messages

## Other Possible Causes

### 1. Network/Internet Issues
- Check your internet connection
- Try refreshing the page

### 2. Firebase Service Outage
- Check [Firebase Status](https://status.firebase.google.com/)
- Wait for service to be restored

### 3. Authentication Issues
- Log out and log back in
- Try using a different login method

### 4. Browser Cache
- Clear browser cache and cookies
- Try in an incognito/private window

## Debug Information

The app now includes enhanced error logging. When you see the error:
- Check the browser console for detailed error information
- Click the "Debug Firestore" button for diagnostic information
- The error message will be more specific (e.g., "Permission denied" vs "Service unavailable")

## Need More Help?

If the issue persists after trying these fixes:
1. Check the browser console for the specific error code
2. Verify your Firebase project configuration
3. Ensure your user account has the correct permissions