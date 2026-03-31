# LINE Flex Message Update Guide

## Problem
LINE notifications are still showing plain text instead of Flex Messages even after clearing settings.

## Root Cause
Old plain text templates are still saved in Firestore, and Firebase Cloud Functions need to be redeployed with the new code.

## Solution

### Step 1: Deploy Updated Cloud Functions
```bash
cd functions
npm install
firebase deploy --only functions
```

This will deploy the updated functions that:
- Use Flex Messages as default
- Validate templates and fall back to Flex Messages if invalid

### Step 2: Clear Old Templates in Firestore

Option A - Using the App (Recommended):
1. Open the app
2. Go to Notification Settings
3. Scroll to LINE section
4. You should see Flex Message JSON in the template fields
5. Click "Save Settings"

Option B - Clear All Settings:
1. Open the app
2. Go to Notification Settings
3. Click "Clear All Settings" button
4. Re-enter your LINE credentials
5. The Flex Message templates will be loaded automatically
6. Click "Save Settings"

### Step 3: Test
Create a new site or MA case to test the notifications.

## What Changed

### functions/index.js
- `sendLineNotification()` now uses Flex Message as default
- `sendLineMANotification()` now uses Flex Message as default
- Both functions validate JSON and fall back to Flex Message if template is invalid

### app.js
- Default templates are now Flex Message JSON
- Loading function validates templates and replaces plain text with Flex Messages
- Save function uses Flex Message defaults when fields are empty

## Verification
After deploying and saving settings, check:
1. Firestore → settings → notificationSettings → line → templates
2. Should contain JSON objects starting with `{"type":"flex"...}`
3. Not plain text like `"📝 มีการเปิดเคส..."`

## If Still Not Working
1. Check Firebase Functions logs: `firebase functions:log`
2. Look for "Using custom Flex Message template" or "Falling back to default Flex Message"
3. Verify the template in Firestore is valid JSON
