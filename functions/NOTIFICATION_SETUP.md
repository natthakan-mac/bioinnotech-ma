# Notification Setup Guide

## Overview
The system supports automatic notifications for:
- **New site added**: When a new site is created
- **New MA record**: When a new maintenance/incident case is opened
- **MA status update**: When a case status changes

Notifications can be sent via:
- Telegram Bot
- LINE Messaging API

**IMPORTANT**: All notification settings are managed through the application's Profile → Notification Settings page. Environment variables are no longer used.

## Configuration

### 1. Configure Notification Settings in the App
1. Log in to the application
2. Go to Profile → Notification Settings tab
3. Enable the notification channel you want to use (toggle switch)
4. Fill in the required credentials:

#### Telegram Settings:
- **Enable Toggle**: Turn ON to enable Telegram notifications
- **Bot Token**: Get from @BotFather on Telegram
  - Start a chat with @BotFather
  - Send `/newbot` and follow instructions
  - Copy the token provided
- **Chat ID**: Your chat or group ID
  - For personal chat: Use @userinfobot to get your chat ID
  - For group: Add @RawDataBot to your group to get the chat ID

#### LINE Settings:
- **Enable Toggle**: Turn ON to enable LINE notifications
- **Channel Access Token**: From LINE Developers Console
- **Channel Secret**: From LINE Developers Console
- **User ID** (REQUIRED): Specific user or group ID to send messages to
  - This is now required for LINE notifications to work

### 2. Deploy Firebase Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies (if not already done)
npm install
### 3. Test the Notifications

1. Make sure the notification channel is ENABLED (toggle switch is ON)
2. Test scenarios:
   - Add a new site in the application
   - Create a new MA record
   - Update the status of an existing MA record
3. Check your Telegram chat or LINE for the notifications
### 3. Test the Notification

1. Make sure the notification channel is ENABLED (toggle switch is ON)
2. Add a new site in the application
3. Check your Telegram chat or LINE for the notification

## Important Notes

- **Notifications will ONLY be sent if**:
  1. The notification channel is enabled (toggle is ON)
## Notification Formats

### New Site Added

#### Telegram Message:
```
🏢 มีการเพิ่มสถานที่ใหม่!

🆔 รหัสสถานที่: [Site Code]
📍 ชื่อสถานที่: [Site Name]
� ที่อยู่: [Full Address]
🏛 หน่วยงาน: [Agency]
👤 ผู้ติดต่อ: [Contact Person]
📞 เบอร์โทร: [Contact Phone]
� ดูตำแหน่งใน Google Maps (if available)

⏰ เพิ่มเมื่อ: [Timestamp]
```

#### LINE Message:
A Flex Message card with:
- Header: "NEW SITE ADDED / เพิ่มสถานที่ใหม่"
- Body: Site details (Code, Name, Address, Agency, Contact)
- Footer: Google Maps button (if available)

### New MA Record

#### Telegram Message:
```
📝 มีการเปิดเคสใหม่!

🆔 รหัสเคส: [Case ID]
📍 สถานที่: [Site Name]
📋 ประเภท: [Category]
🚦 สถานะ: [Status]
📅 วันที่: [Date]
📝 รายละเอียด: [Objective]

⏰ เปิดเคสเมื่อ: [Timestamp]
```

#### LINE Message:
A Flex Message card with:
- Header: "NEW CASE OPENED / เปิดเคสใหม่"
- Body: Case details (Case ID, Site, Category, Status, Date, Objective)

### MA Status Update

#### Telegram Message:
```
🔄 มีการอัปเดตสถานะเคส!

🆔 รหัสเคส: [Case ID]
📍 สถานที่: [Site Name]
📋 ประเภท: [Category]
## Future Enhancements

Potential additions:
- Email notifications via SMTP
- Notifications for site updates/deletions
- Custom notification templates
- Notification scheduling
- Notification filtering by category or status
A Flex Message card with:
- Header: "CASE STATUS UPDATED / อัปเดตสถานะเคส"
- Body: Case details with updated status
⏰ เพิ่มเมื่อ: [Timestamp]
```

### LINE Message:
A Flex Message card with:
- Header: "NEW SITE ADDED / เพิ่มสถานที่ใหม่"
- Body: Site details (Name, Code, Province, Agency)

## Troubleshooting

### Notifications not sending:
1. Check Firebase Functions logs:
   ```bash
   firebase functions:log
   ```

2. Verify notification settings are saved in Firestore:
   - Collection: `settings`
   - Document: `notifications`

3. Ensure Firebase Functions are deployed:
   ```bash
   firebase deploy --only functions
   ```

### Telegram Bot Issues:
- Make sure the bot token is correct
- Verify the chat ID is correct
- Ensure the bot has been started (send `/start` to the bot)
- For groups, make sure the bot is added to the group

### LINE Issues:
- Verify the Channel Access Token is valid
- Check that the channel is properly configured in LINE Developers Console
- Ensure the User ID is correct (if specified)

## Security Notes

- Notification settings are stored in Firestore
- Only authenticated users can modify notification settings
- Bot tokens and API keys are stored securely in Firestore
- Firebase Functions run in a secure environment

## Future Enhancements

Potential additions:
- Email notifications via SMTP
- Notifications for site updates/deletions
- Notifications for maintenance logs
- Custom notification templates
- Notification scheduling