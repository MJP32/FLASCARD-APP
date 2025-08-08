# Firestore Connection Issues

## Summary
You're experiencing two related issues:
1. **Firestore permissions error** when updating cards (even with permissive rules)
2. **Settings not persisting** (Gemini API selection reverting to OpenAI)

Both issues indicate that Firestore is not properly connected or functioning.

## Things to Check

### 1. Browser Console Errors
Enable console logging and check for:
```javascript
window.enableDebugMode()
```

Look for:
- CORS errors
- Network errors to `firestore.googleapis.com`
- Authentication errors
- Quota exceeded errors

### 2. Firebase Project Status
Check in [Firebase Console](https://console.firebase.google.com/):
- Is the project active (not suspended)?
- Is Firestore database created?
- Are there any billing/quota warnings?
- Check the usage tab for any limits

### 3. Network Tab
In browser DevTools:
- Open Network tab
- Try to review a card
- Look for failed requests to Firebase/Firestore
- Check response codes (403, 404, 500, etc.)

### 4. Firebase Configuration
The Firebase config in your app might be outdated. Verify in Firebase Console:
- Project settings → General → Your apps
- Compare the config with what's in App.js

## Temporary Workaround

For the API provider issue, you can manually save it:
```javascript
// Force save Gemini as provider
localStorage.setItem('selected_ai_provider', 'gemini');
location.reload();
```

## Root Cause
The fact that BOTH Firestore operations (card updates AND settings) are failing suggests:
1. Firestore database might be offline/suspended
2. Authentication token might be corrupted
3. Browser security settings blocking Firestore
4. Firebase project configuration issue

## Next Steps
1. Check browser console for specific errors
2. Verify Firebase project is active
3. Try in incognito window to rule out extensions/cache
4. Check if other users are experiencing the same issue