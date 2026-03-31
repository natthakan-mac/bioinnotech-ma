# LINE Notification Debug Guide

## Issue: New site notifications not being sent

### Step 1: Check if functions are deployed
```bash
firebase functions:list
```

You should see:
- `onNewSiteAdded`
- `onNewMARecord`
- `onMAStatusUpdate`

### Step 2: Check function logs
```bash
firebase functions:log --limit 50
```

Look for:
- "Skipping notification for old site" - means site is older than 5 minutes
- "No notification settings found" - means settings aren't saved in Firestore
- "LINE notifications disabled or not configured" - means LINE is not enabled or missing credentials
- Any error messages from LINE API

### Step 3: Verify notification settings in Firestore

1. Go to Firebase Console → Firestore Database
2. Look for collection: `settings`
3. Look for document: `notificationSettings`
4. Check if it exists and has:
   ```json
   {
     "line": {
       "enabled": true,
       "channelAccessToken": "...",
       "userId": "...",
       "templates": { ... }
     }
   }
   ```

### Step 4: Check site document structure

When you create a new site, check if it has:
- `createdAt` field (Timestamp)
- If `createdAt` is missing or older than 5 minutes, notification will be skipped

### Step 5: Test manually

Create a test site and immediately check logs:
```bash
# In one terminal, watch logs
firebase functions:log --only onNewSiteAdded

# In another terminal or browser, create a new site
```

### Common Issues:

**Issue 1: "Skipping notification for old site"**
- Solution: The site's `createdAt` timestamp is older than 5 minutes
- This is by design to prevent duplicate notifications on function redeployment
- Create a NEW site to test

**Issue 2: "No notification settings found"**
- Solution: Go to app → Notification Settings → Configure LINE → Save Settings

**Issue 3: "LINE notifications disabled or not configured"**
- Solution: 
  1. Go to Notification Settings
  2. Enable LINE toggle (turn it ON)
  3. Fill in Channel Access Token
  4. Fill in User ID
  5. Click Save Settings

**Issue 4: LINE API errors**
- Check if Channel Access Token is valid
- Check if User ID is correct
- Verify LINE channel permissions

### Step 6: Verify site creation adds createdAt

Check your site creation code in app.js:
```javascript
// Should include:
createdAt: serverTimestamp()
```

### Step 7: Force notification for testing

Temporarily comment out the age check in functions/index.js:
```javascript
// Comment these lines:
// if (ageInMinutes > 5) {
//     console.log(`Skipping notification...`);
//     return { success: true, message: "Skipped old document" };
// }
```

Then redeploy and test with an existing site.

### Step 8: Check Firebase Functions quota

Go to Firebase Console → Functions → Usage
- Check if you've hit any limits
- Check if functions are running

## Quick Test

Run this in Firebase Console (Firestore):
1. Manually trigger by updating a site document
2. Watch the functions log
3. See what error appears

## Expected Log Output (Success)

```
Function execution started
LINE notification sent successfully for: [Site Name]
Notifications processed
Function execution took 1234 ms, finished with status: 'ok'
```

## Expected Log Output (Failure)

```
Function execution started
LINE notifications disabled or not configured
Notifications processed
Function execution took 123 ms, finished with status: 'ok'
```

This means LINE is not enabled in settings.
