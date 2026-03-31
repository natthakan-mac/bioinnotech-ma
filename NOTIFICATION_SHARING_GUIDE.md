# Notification Sharing Feature Guide

## Overview
LINE Flex message notifications now include sharing buttons that allow recipients to forward notifications to other platforms directly from the LINE message.

## New Features

### Share Buttons Added
Each LINE notification now includes two additional sharing buttons:

1. **📧 Email Button** - Opens default email client with pre-filled content
2. **📱 Telegram Button** - Opens Telegram share dialog with pre-filled message

### Button Layout

#### Site Notifications
```
┌─────────────────────────────────┐
│  🏢 มีการเพิ่มสถานที่ใหม่!      │
├─────────────────────────────────┤
│  Site Details...                │
├─────────────────────────────────┤
│  [📍 ดูตำแหน่ง] [🏢 ดูข้อมูล]   │  ← Primary Actions
│  [📧 Email]    [📱 Telegram]    │  ← Share Actions
└─────────────────────────────────┘
```

#### MA Record Notifications
```
┌─────────────────────────────────┐
│  📝 มีการเปิดเคสใหม่!           │
├─────────────────────────────────┤
│  Case Details...                │
├─────────────────────────────────┤
│      [📋 ดูเคส]                 │  ← Primary Action
│  [📧 Email]    [📱 Telegram]    │  ← Share Actions
└─────────────────────────────────┘
```

## How It Works

### Email Button (📧)
When clicked, opens the device's default email client with:
- **Subject**: Pre-filled with notification title
- **Body**: Contains key information and direct link to view details
- **Recipient**: Empty (user can add recipients)

**Example Email Content (Site):**
```
Subject: New Site: [Site Name]

Site: [Site Name]
Code: [Site Code]
Address: [Full Address]
View: https://water-plant-maintenance.web.app?siteId=[ID]
```

**Example Email Content (MA Case):**
```
Subject: New Case: [Case ID]

Case ID: [Case ID]
Site: [Site Name]
Category: [Category]
Status: [Status]
Date: [Date]
Details: [Objective]
View: https://water-plant-maintenance.web.app?logId=[ID]
```

### Telegram Button (📱)
When clicked, opens Telegram share dialog with:
- **URL**: Direct link to view the record in the app
- **Text**: Summary of the notification with key details

**Example Telegram Share (Site):**
```
🏢 New Site: [Site Name]
Code: [Site Code]

https://water-plant-maintenance.web.app?siteId=[ID]
```

**Example Telegram Share (MA Case):**
```
📝 New Case: [Case ID]
Site: [Site Name]
Status: [Status]

https://water-plant-maintenance.web.app?logId=[ID]
```

## Technical Implementation

### Changes Made

#### 1. Site Notification Footer (functions/index.js)
```javascript
footer: {
    type: "box",
    layout: "vertical",
    contents: [
        // Timestamp
        { type: "text", text: "เพิ่มเมื่อ: ..." },
        
        // Primary action buttons
        {
            type: "box",
            layout: "horizontal",
            contents: [
                { type: "button", label: "📍 ดูตำแหน่ง" },
                { type: "button", label: "🏢 ดูข้อมูล" }
            ]
        },
        
        // Share buttons (NEW)
        {
            type: "box",
            layout: "horizontal",
            contents: [
                { 
                    type: "button", 
                    label: "📧 Email",
                    action: { 
                        type: "uri", 
                        uri: "mailto:?subject=...&body=..." 
                    }
                },
                { 
                    type: "button", 
                    label: "📱 Telegram",
                    action: { 
                        type: "uri", 
                        uri: "https://t.me/share/url?..." 
                    }
                }
            ]
        }
    ]
}
```

#### 2. MA Notification Footer (functions/index.js)
Similar structure with case-specific content.

### URL Encoding
All URLs and text content are properly encoded using `encodeURIComponent()` to ensure:
- Special characters are handled correctly
- URLs work across all platforms
- Thai language characters display properly

## Deployment

### Deploy Updated Functions
```bash
cd functions
firebase deploy --only functions
```

### Verify Deployment
1. Create a new site or MA record
2. Check LINE notification
3. Verify all 4 buttons appear (2 primary + 2 share)
4. Test each button functionality

## User Experience

### Benefits
1. **Quick Sharing**: Recipients can instantly share notifications without copying/pasting
2. **Consistent Format**: Shared content maintains proper formatting
3. **Direct Links**: All shares include direct links to view full details
4. **Multi-Platform**: Works with Email and Telegram from LINE
5. **Mobile-Friendly**: Buttons work seamlessly on mobile devices

### Use Cases
- **Email**: Forward to colleagues who don't use LINE
- **Telegram**: Share with team groups on Telegram
- **Documentation**: Create email trail for record-keeping
- **Escalation**: Quickly notify management via their preferred platform

## Button Styles

### Primary Buttons
- Style: `"primary"`
- Colors: Custom (blue for location, green for view)
- Purpose: Main actions (view details, see location)

### Share Buttons
- Style: `"link"`
- Colors: Default (gray/subtle)
- Purpose: Secondary actions (share to other platforms)

## Limitations

### Email Button
- Requires device to have email client configured
- Some mobile devices may not support `mailto:` links
- Email content is plain text (no HTML formatting)

### Telegram Button
- Requires Telegram app installed
- Opens Telegram app or web version
- User must select chat/group to share to

## Future Enhancements

Potential additions:
- WhatsApp share button
- Facebook Messenger share button
- Copy to clipboard button
- QR code for quick sharing
- Custom share templates per notification type

## Troubleshooting

### Buttons Not Appearing
1. Verify functions are deployed: `firebase functions:log`
2. Check LINE Flex Message structure in logs
3. Ensure custom templates don't override default structure

### Email Button Not Working
- Check if device has email client configured
- Try on different device/platform
- Verify `mailto:` links are not blocked

### Telegram Button Not Working
- Ensure Telegram app is installed
- Check if Telegram share URLs are properly encoded
- Try opening link in browser first

## Testing Checklist

- [ ] Site notification shows all 4 buttons
- [ ] MA new case notification shows all 3 buttons (1 primary + 2 share)
- [ ] MA update notification shows all 3 buttons
- [ ] Email button opens email client with correct content
- [ ] Telegram button opens Telegram with correct content
- [ ] All links work and navigate to correct pages
- [ ] Thai characters display correctly in shared content
- [ ] Buttons work on both iOS and Android LINE apps

## Support

For issues or questions:
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify LINE Flex Message structure
3. Test on multiple devices
4. Review this guide for proper implementation
