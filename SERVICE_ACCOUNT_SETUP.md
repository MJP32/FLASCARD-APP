# Firebase Service Account Setup

To run the local AWS cards fix script, you need to set up a Firebase service account.

## Steps:

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `flashcard-app-3f2a3`

2. **Navigate to Project Settings**
   - Click the gear icon ⚙️ next to "Project Overview"
   - Select "Project settings"

3. **Go to Service Accounts Tab**
   - Click on "Service accounts" tab
   - Scroll down to "Firebase Admin SDK"

4. **Generate New Private Key**
   - Click "Generate new private key"
   - This will download a JSON file (e.g., `flashcard-app-3f2a3-firebase-adminsdk-xxxxx.json`)

5. **Place the Key File**
   - Save the downloaded JSON file in this project root as: `service-account-key.json`
   - **IMPORTANT**: Add `service-account-key.json` to your `.gitignore` to avoid committing secrets

6. **Run the Script**
   ```bash
   node fix-aws-admin.js Wxww8kEiROTO6Jg8WfXQGpSAbMp1
   ```

## Security Notes:
- The service account key provides full admin access to your Firebase project
- Never commit this file to git
- Keep it secure and only use locally
- Consider deleting the key after fixing the issue

## Alternative: Environment Variable
Instead of a file, you can set the key as an environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"
```