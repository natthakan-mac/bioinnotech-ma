# Quick Start Guide

## What's New? 🎉

### 1. Enhanced Excel Export 📊
MA record export now includes **2 sheets** with complete data:
- **Summary Sheet**: All 13 columns including comments, attachments, timestamps
- **Line Items Sheet**: Detailed breakdown with one row per item

### 2. Share Buttons in LINE Notifications 📱
LINE Flex messages now have Email and Telegram share buttons for easy cross-platform sharing.

---

## How to Use

### Excel Export
1. Go to MA Records (ประวัติการซ่อมบำรุง)
2. Apply any filters you want
3. Click **"ส่งออก"** (Export) button
4. Excel file downloads with 2 sheets:
   - **สรุป** - Summary view
   - **รายการค่าใช้จ่าย** - Line items detail

### LINE Share Buttons
When you receive a LINE notification:

**Site Notification:**
```
┌─────────────────────────────┐
│ 🏢 มีการเพิ่มสถานที่ใหม่!   │
│ [Site details...]           │
│ [📍 ดูตำแหน่ง] [🏢 ดูข้อมูล] │
│ [📧 Email]   [📱 Telegram]  │
└─────────────────────────────┘
```

**MA Notification:**
```
┌─────────────────────────────┐
│ 📝 มีการเปิดเคสใหม่!        │
│ [Case details...]           │
│      [📋 ดูเคส]             │
│ [📧 Email]   [📱 Telegram]  │
└─────────────────────────────┘
```

**Click:**
- **📧 Email** → Opens email with pre-filled content
- **📱 Telegram** → Opens Telegram share dialog

---

## Deployment (For Admins)

### Excel Export
✅ Already active (no deployment needed)

### LINE Share Buttons
```bash
cd functions
firebase deploy --only functions
```

Wait 2-3 minutes for deployment to complete.

---

## Test It

### Test Excel Export
1. Go to MA Records
2. Click Export
3. Open Excel file
4. Verify 2 sheets exist
5. Check all columns are present

### Test LINE Buttons
1. Create a new site or MA record
2. Check LINE notification
3. Verify 4 buttons appear (site) or 3 buttons (MA)
4. Click Email button → Email client opens
5. Click Telegram button → Telegram opens

---

## What Each Button Does

| Button | Action | Opens |
|--------|--------|-------|
| 📍 ดูตำแหน่ง | View location | Google Maps |
| 🏢 ดูข้อมูล | View details | App site page |
| 📋 ดูเคส | View case | App case page |
| 📧 Email | Share via email | Email client with pre-filled content |
| 📱 Telegram | Share via Telegram | Telegram with share dialog |

---

## Benefits

### Excel Export
✅ Complete data in one file  
✅ Separate sheet for analysis  
✅ All comments included  
✅ Line items breakdown  
✅ Ready for pivot tables  

### Share Buttons
✅ Quick cross-platform sharing  
✅ No copy/paste needed  
✅ Pre-filled content  
✅ Direct links included  
✅ Works on mobile  

---

## Need Help?

**Excel Export Issues:**
- Check browser console for errors
- Verify filters are applied correctly
- Try exporting smaller date range

**LINE Button Issues:**
- Verify functions are deployed
- Check Firebase logs: `firebase functions:log`
- Test on different device

**Documentation:**
- Full guide: `NOTIFICATION_SHARING_GUIDE.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`

---

## Summary

✅ **Excel Export**: 2 sheets, 13 summary columns, detailed line items  
✅ **LINE Buttons**: Email + Telegram sharing from notifications  
✅ **Ready to Use**: Excel export active now, LINE buttons after deployment  

Enjoy the new features! 🚀
