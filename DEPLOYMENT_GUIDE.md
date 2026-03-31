# Deployment Guide - Notification System Migration

## What Changed?

The notification system has been completely migrated from environment variables to app-based settings management. The system now supports notifications for:
- New site additions
- New MA record creation
- MA status updates

### Old System (Removed):
- LINE credentials stored in `functions/.env`
- Hardcoded in Firebase Functions
- No way to disable without redeploying

### New System:
- All settings managed in Profile → Notification Settings
- Enable/disable toggles for each channel
- Stored in Firestore
- No redeployment needed to change settings
- Automatic notifications for sites and MA records

## Steps to Complete Migration

### 1. Clear Old LINE Settings from Firestore

**Option A: Using the App (Recommended)**
1. Log in to the application
2. Go to Profile → Notification Settings
3. Click "ล้างการตั้งค่าทั้งหมด" (Clear All Settings)
4. Confirm the action

**Option B: Using Firebase Console**
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Find collection: `settings`
4. Find document: `notifications`
5. Delete the document

### 2. Deploy Updated Firebase Function

```bash
cd functions
firebase deploy --only functions
```

Wait for deployment to complete (1-2 minutes).

### 3. Verify Deployment

Check the logs to ensure the new function is running:

```bash
firebase functions:log
```

### 4. Configure New Settings (If Needed)

If you want to enable notifications:

1. Go to Profile → Notification Settings
2. Enable the channel you want (toggle ON)
3. Fill in the credentials:
   - **Telegram**: Bot Token + Chat ID
   - **LINE**: Channel Access Token + Channel Secret + User ID
4. Click "บันทึกการตั้งค่า"

### 5. Test

Test all notification scenarios:

1. **New Site**: Add a new site
2. **New MA Record**: Create a new maintenance/incident case
3. **Status Update**: Change the status of an existing case
4. Check if notifications are received (if enabled)
5. Check Firebase logs for confirmation

## Verification Checklist

- [ ] Old `.env` file is cleared (only contains comments)
- [ ] Firebase function deployed successfully
- [ ] Old Firestore settings cleared
- [ ] New settings configured (if needed)
- [ ] Toggles are OFF by default
- [ ] Test notification works when enabled
- [ ] No notification sent when disabled

## Troubleshooting

### Still receiving notifications after clearing?
- Make sure you deployed the function: `firebase deploy --only functions`
- Check Firestore to ensure settings are cleared
- Verify the toggle is OFF in the app

### Notifications not working when enabled?
- Check all required fields are filled
- Verify credentials are correct
- Check Firebase function logs for errors
- Ensure toggle is ON

### How to check current settings?
1. Firebase Console → Firestore
2. Collection: `settings` → Document: `notifications`
3. Check the `enabled` flags for each channel

## Important Notes

- **All notification settings are now in the app** - no need to touch `.env` or redeploy for settings changes
- **Toggles default to OFF** - you must explicitly enable each channel
- **Credentials are stored in Firestore** - secure and accessible from the app
- **Changes take effect immediately** - no redeployment needed (except for the initial migration)

## Support

If you encounter issues:
1. Check Firebase function logs: `firebase functions:log`
2. Check browser console for errors
3. Verify Firestore settings document structure
