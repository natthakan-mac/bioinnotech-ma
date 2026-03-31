const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const nodemailer = require("nodemailer");

admin.initializeApp();

const db = admin.firestore();

const EMAIL_SIGNATURE = `
<br>
<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
<p style="font-family: Arial, sans-serif; font-size: 13px; color: #888; margin-bottom: 8px;">หากพบปัญหาการใช้งาน กรุณาติดต่อทีมสนับสนุน</p>
<p style="font-family: Arial, sans-serif; font-size: 13px; margin: 0; line-height: 1.8;">
<b>Water Plant Maintenance System</b><br>
<b>Email:</b> <a href="mailto:it@bioinnotech.co.th">it@bioinnotech.co.th</a><br>
<b>Tel:</b> <a href="tel:0969267701">096-926-7701</a><br>
<b>LINE:</b> <a href="https://lin.ee/rEf6BGP">ITDS</a>
</p>`;

// Helper function to get notification settings from Firestore
async function getNotificationSettings() {
    try {
        const settingsDoc = await db.collection('settings').doc('notifications').get();
        if (settingsDoc.exists) {
            return settingsDoc.data();
        }
        return null;
    } catch (error) {
        console.error("Error fetching notification settings:", error);
        return null;
    }
}

// Helper function to build full address
function buildFullAddress(siteData) {
    const parts = [];
    
    if (siteData.villageName) parts.push(siteData.villageName);
    if (siteData.moo) parts.push(`หมู่ ${siteData.moo}`);
    if (siteData.subdistrict) parts.push(`ต.${siteData.subdistrict}`);
    if (siteData.district) parts.push(`อ.${siteData.district}`);
    if (siteData.province) parts.push(`จ.${siteData.province}`);
    if (siteData.zipcode) parts.push(siteData.zipcode);
    
    return parts.length > 0 ? parts.join(' ') : '-';
}

// Helper function to translate status to Thai
function getThaiStatus(status) {
    const statusMap = {
        'Open': 'เปิดงาน',
        'Planning': 'วางแผน',
        'On Process': 'กำลังดำเนินการ',
        'Cancel': 'ยกเลิก',
        'Done': 'เสร็จสิ้น',
        'Case Closed': 'ปิดเคส',
        'Completed': 'เสร็จสิ้น',
    };
    return statusMap[status] || status || '-';
}

// Send Telegram notification
async function sendTelegramNotification(botToken, chatId, siteInfo) {
    try {
        const appUrl = "https://water-plant-maintenance.web.app";
        const hasLocation = siteInfo.locationUrl && siteInfo.locationUrl !== "#" && siteInfo.locationUrl.startsWith("http");

        let message =
            `<b>[NEW SITE] มีการเพิ่มสถานที่ใหม่</b>\n\n` +
            `<b>รหัสสถานที่</b>: <code>${siteInfo.siteCode}</code>\n` +
            `<b>ชื่อสถานที่</b>: ${siteInfo.name}\n` +
            `<b>รายละเอียด</b>: ${siteInfo.description}\n` +
            `<b>ที่อยู่</b>: ${siteInfo.fullAddress}\n` +
            `<b>หน่วยงาน</b>: ${siteInfo.agency}\n` +
            `<b>เบอร์โทร</b>: <code>${siteInfo.contactPhone}</code>\n` +
            `<b>ประกันเริ่ม</b>: ${siteInfo.insuranceStartDate}\n` +
            `<b>ประกันสิ้นสุด</b>: ${siteInfo.insuranceEndDate}\n` +
            `<b>รอบซ่อมบำรุง</b>: ${siteInfo.maintenanceCycle}\n` +
            `<b>วันที่ MA ครั้งแรก</b>: ${siteInfo.firstMaDate}\n\n` +
            `<a href="${appUrl}?siteId=${siteInfo.id}">ดูข้อมูลสถานที่</a>` +
            `${hasLocation ? ` | <a href="${siteInfo.locationUrl}">ดูตำแหน่งแผนที่</a>` : ''}` +
            `\n\n<i>เพิ่มเมื่อ ${siteInfo.timestamp}</i>`;

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await axios.post(url, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: false
        });
        console.log("Telegram notification sent successfully for:", siteInfo.name);
        return response.data;
    } catch (error) {
        console.error("Error sending Telegram notification:", error.response ? error.response.data : error.message);
        throw error;
    }
}

// Send LINE notification
async function sendLineNotification(channelAccessToken, userId, siteInfo) {
    try {
        // Construct URLs
        const appUrl = "https://water-plant-maintenance.web.app";
        const viewSiteUrl = `${appUrl}?siteId=${siteInfo.id}`;
        const hasLocation = siteInfo.locationUrl && siteInfo.locationUrl !== "#" && siteInfo.locationUrl.startsWith("http");
        const locationUrl = hasLocation ? siteInfo.locationUrl : viewSiteUrl;
            
            // Build footer buttons
            const footerContents = [
                {
                    type: "text",
                    text: `เพิ่มเมื่อ: ${siteInfo.timestamp}`,
                    size: "xs",
                    color: "#aaaaaa",
                    margin: "md"
                }
            ];

            // Primary action buttons - only show location button if valid URL exists
            if (hasLocation) {
                footerContents.push({
                    type: "box",
                    layout: "horizontal",
                    contents: [
                        {
                            type: "button",
                            action: {
                                type: "uri",
                                label: "📍 ดูตำแหน่ง",
                                uri: locationUrl
                            },
                            style: "primary",
                            color: "#17c1e8",
                            height: "sm"
                        },
                        {
                            type: "button",
                            action: {
                                type: "uri",
                                label: "🏢 ดูข้อมูล",
                                uri: viewSiteUrl
                            },
                            style: "primary",
                            color: "#17c1e8",
                            height: "sm"
                        }
                    ],
                    spacing: "sm",
                    margin: "md"
                });
            } else {
                footerContents.push({
                    type: "button",
                    action: {
                        type: "uri",
                        label: "🏢 ดูข้อมูล",
                        uri: viewSiteUrl
                    },
                    style: "primary",
                    color: "#17c1e8",
                    height: "sm",
                    margin: "md"
                });
            }

            const flexMessage = {
                type: "flex",
                altText: `[NEW SITE] มีการเพิ่มสถานที่ใหม่: ${siteInfo.name}`,
                contents: {
                    type: "bubble",
                    header: {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "text",
                                text: "🏢 [NEW SITE] มีการเพิ่มสถานที่ใหม่!",
                                weight: "bold",
                                size: "lg",
                                color: "#ffffff"
                            }
                        ],
                        backgroundColor: "#17c1e8"
                    },
                    body: {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "รหัส:", size: "sm", color: "#aaaaaa", flex: 3 },
                                    { type: "text", text: siteInfo.siteCode || "-", size: "sm", wrap: true, flex: 5 }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "ชื่อ:", size: "sm", color: "#aaaaaa", flex: 3 },
                                    { type: "text", text: siteInfo.name || "-", size: "sm", wrap: true, flex: 5, weight: "bold" }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "รายละเอียด:", size: "sm", color: "#aaaaaa", flex: 3 },
                                    { type: "text", text: siteInfo.description || "-", size: "sm", wrap: true, flex: 5 }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "ที่อยู่:", size: "sm", color: "#aaaaaa", flex: 3 },
                                    { type: "text", text: siteInfo.fullAddress || "-", size: "sm", wrap: true, flex: 5 }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "หน่วยงาน:", size: "sm", color: "#aaaaaa", flex: 3 },
                                    { type: "text", text: siteInfo.agency || "-", size: "sm", wrap: true, flex: 5 }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "เบอร์โทร:", size: "sm", color: "#aaaaaa", flex: 3 },
                                    { type: "text", text: siteInfo.contactPhone || "-", size: "sm", wrap: true, flex: 5 }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "ประกันเริ่ม:", size: "sm", color: "#aaaaaa", flex: 3 },
                                    { type: "text", text: siteInfo.insuranceStartDate || "-", size: "sm", wrap: true, flex: 5 }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "ประกันสิ้นสุด:", size: "sm", color: "#aaaaaa", flex: 3 },
                                    { type: "text", text: siteInfo.insuranceEndDate || "-", size: "sm", wrap: true, flex: 5 }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "รอบซ่อมบำรุง:", size: "sm", color: "#aaaaaa", flex: 3 },
                                    { type: "text", text: siteInfo.maintenanceCycle || "-", size: "sm", wrap: true, flex: 5 }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "MA ครั้งแรก:", size: "sm", color: "#aaaaaa", flex: 3 },
                                    { type: "text", text: siteInfo.firstMaDate || "-", size: "sm", wrap: true, flex: 5 }
                                ]
                            }
                        ],
                        spacing: "md"
                    },
                    footer: {
                        type: "box",
                        layout: "vertical",
                        contents: footerContents
                    }
                }
            };

        const payload = {
            to: userId,
            messages: [flexMessage]
        };

        console.log("Sending LINE site notification. Payload:", JSON.stringify(payload).substring(0, 500));

        const response = await axios.post("https://api.line.me/v2/bot/message/push", payload, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${channelAccessToken}`
            }
        });
        console.log("LINE notification sent successfully for:", siteInfo.name);
        return response.data;
    } catch (error) {
        console.error("Error sending LINE notification:", error.response ? error.response.data : error.message);
        throw error;
    }
}

// Send Email notification for new site
async function sendEmailNotification(smtpSettings, siteInfo) {
    try {
        // Check if recipients are configured
        if (!smtpSettings.recipients || smtpSettings.recipients.length === 0) {
            console.log("No email recipients configured, skipping email notification");
            return { success: true, message: "No recipients configured" };
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: smtpSettings.port || 587,
            secure: smtpSettings.secure || false,
            auth: {
                user: smtpSettings.user,
                pass: smtpSettings.password
            }
        });

        // Build email content
        const appUrl = "https://water-plant-maintenance.web.app";
        const viewSiteUrl = `${appUrl}?siteId=${siteInfo.id || ''}`;
        const hasLocation = siteInfo.locationUrl && siteInfo.locationUrl.startsWith("http");

        const subject = `[NEW SITE] มีการเพิ่มสถานที่ใหม่ - ${siteInfo.name}`;
        const body = `มีการเพิ่มสถานที่ใหม่ในระบบ:\n\n` +
            `รหัสสถานที่: ${siteInfo.siteCode}\n` +
            `ชื่อสถานที่: ${siteInfo.name}\n` +
            `รายละเอียด: ${siteInfo.description}\n` +
            `ที่อยู่: ${siteInfo.fullAddress}\n` +
            `หน่วยงาน: ${siteInfo.agency}\n` +
            `เบอร์โทร: ${siteInfo.contactPhone}\n` +
            `ประกันเริ่ม: ${siteInfo.insuranceStartDate}\n` +
            `ประกันสิ้นสุด: ${siteInfo.insuranceEndDate}\n` +
            `รอบซ่อมบำรุง: ${siteInfo.maintenanceCycle}\n` +
            `วันที่ MA ครั้งแรก: ${siteInfo.firstMaDate}\n` +
            `${hasLocation ? `Google Maps: ${siteInfo.locationUrl}\n` : ''}` +
            `\nดูข้อมูลสถานที่: ${viewSiteUrl}\n` +
            `\nเพิ่มเมื่อ: ${siteInfo.timestamp}\n\n---\nWater Plant Maintenance System`;

        const htmlBody = `<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<b>มีการเพิ่มสถานที่ใหม่ในระบบ</b><br><br>
<b>รหัสสถานที่:</b> ${siteInfo.siteCode}<br>
<b>ชื่อสถานที่:</b> ${siteInfo.name}<br>
<b>รายละเอียด:</b> ${siteInfo.description}<br>
<b>ที่อยู่:</b> ${siteInfo.fullAddress}<br>
<b>หน่วยงาน:</b> ${siteInfo.agency}<br>
<b>เบอร์โทร:</b> ${siteInfo.contactPhone}<br>
<b>ประกันเริ่ม:</b> ${siteInfo.insuranceStartDate}<br>
<b>ประกันสิ้นสุด:</b> ${siteInfo.insuranceEndDate}<br>
<b>รอบซ่อมบำรุง:</b> ${siteInfo.maintenanceCycle}<br>
<b>วันที่ MA ครั้งแรก:</b> ${siteInfo.firstMaDate}<br>
${hasLocation ? `<b>Google Maps:</b> <a href="${siteInfo.locationUrl}">${siteInfo.locationUrl}</a><br>` : ''}
<br><a href="${viewSiteUrl}">ดูข้อมูลสถานที่</a><br>
<br><i>เพิ่มเมื่อ: ${siteInfo.timestamp}</i>
${EMAIL_SIGNATURE}
</body></html>`;

        // Send email to all recipients
        const mailOptions = {
            from: smtpSettings.from || smtpSettings.user,
            to: smtpSettings.recipients.join(', '),
            subject: subject,
            text: body,
            html: htmlBody
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email notification sent successfully:", info.messageId);
        console.log("Recipients:", smtpSettings.recipients.join(', '));
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email notification:", error);
        throw error;
    }
}

// Send Email notification for MA record
async function sendEmailMANotification(smtpSettings, maInfo, isNew = true) {
    try {
        // Check if recipients are configured
        if (!smtpSettings.recipients || smtpSettings.recipients.length === 0) {
            console.log("No email recipients configured, skipping email notification");
            return { success: true, message: "No recipients configured" };
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: smtpSettings.port || 587,
            secure: smtpSettings.secure || false,
            auth: {
                user: smtpSettings.user,
                pass: smtpSettings.password
            }
        });

        // Build email content
        const appUrl = "https://water-plant-maintenance.web.app";
        const viewCaseUrl = `${appUrl}?logId=${maInfo.logId}`;

        const subject = isNew
            ? `[NEW CASE] มีการเปิดเคสใหม่ - ${maInfo.caseId}`
            : `[UPDATE CASE] มีการอัปเดตสถานะเคส - ${maInfo.caseId}`;

        const body = (isNew ? `มีการเปิดเคสใหม่:\n\n` : `มีการอัปเดตสถานะเคส:\n\n`) +
            `รหัสเคส: ${maInfo.caseId}\n` +
            `สถานที่: ${maInfo.siteName}\n` +
            `ประเภท: ${maInfo.category}\n` +
            `สถานะ: ${maInfo.status}\n` +
            `วันที่: ${maInfo.date}\n` +
            `${maInfo.objective ? `รายละเอียด: ${maInfo.objective}\n` : ''}` +
            `\nดูรายละเอียดเคส: ${viewCaseUrl}\n` +
            `\n${isNew ? 'เปิดเคสเมื่อ' : 'อัปเดตเมื่อ'}: ${maInfo.timestamp}\n\n---\nWater Plant Maintenance System`;

        const htmlBody = `<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<b>${isNew ? 'มีการเปิดเคสใหม่' : 'มีการอัปเดตสถานะเคส'}</b><br><br>
<b>รหัสเคส:</b> ${maInfo.caseId}<br>
<b>สถานที่:</b> ${maInfo.siteName}<br>
<b>ประเภท:</b> ${maInfo.category}<br>
<b>สถานะ:</b> ${maInfo.status}<br>
<b>วันที่:</b> ${maInfo.date}<br>
${maInfo.objective ? `<b>รายละเอียด:</b> ${maInfo.objective}<br>` : ''}
<br><a href="${viewCaseUrl}">ดูรายละเอียดเคส</a><br>
<br><i>${isNew ? 'เปิดเคสเมื่อ' : 'อัปเดตเมื่อ'}: ${maInfo.timestamp}</i>
${EMAIL_SIGNATURE}
</body></html>`;

        // Send email to all recipients
        const mailOptions = {
            from: smtpSettings.from || smtpSettings.user,
            to: smtpSettings.recipients.join(', '),
            subject: subject,
            text: body,
            html: htmlBody
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email MA notification sent successfully:", info.messageId);
        console.log("Recipients:", smtpSettings.recipients.join(', '));
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email MA notification:", error);
        throw error;
    }
}

// Send Telegram notification for MA record
async function sendTelegramMANotification(botToken, chatId, maInfo, isNew = true) {
    try {
        const appUrl = "https://water-plant-maintenance.web.app";
        const viewCaseUrl = `${appUrl}?logId=${maInfo.logId}`;

        const message = isNew
            ? (
                `<b>[NEW CASE] มีการเปิดเคสใหม่</b>\n\n` +
                `<b>รหัสเคส</b>: <code>${maInfo.caseId}</code>\n` +
                `<b>สถานที่</b>: ${maInfo.siteName}\n` +
                `<b>ประเภท</b>: ${maInfo.category}\n` +
                `<b>สถานะ</b>: ${maInfo.status}\n` +
                `<b>วันที่</b>: ${maInfo.date}\n` +
                `${maInfo.objective ? `<b>รายละเอียด</b>: ${maInfo.objective}\n` : ''}` +
                `\n<a href="${viewCaseUrl}">ดูรายละเอียดเคส</a>\n\n` +
                `<i>เปิดเคสเมื่อ ${maInfo.timestamp}</i>`
            )
            : (
                `<b>[UPDATE CASE] มีการอัปเดตสถานะเคส</b>\n\n` +
                `<b>รหัสเคส</b>: <code>${maInfo.caseId}</code>\n` +
                `<b>สถานที่</b>: ${maInfo.siteName}\n` +
                `<b>ประเภท</b>: ${maInfo.category}\n` +
                `<b>สถานะ</b>: <u>${maInfo.status}</u>\n` +
                `<b>วันที่</b>: ${maInfo.date}\n` +
                `${maInfo.objective ? `<b>รายละเอียด</b>: ${maInfo.objective}\n` : ''}` +
                `\n<a href="${viewCaseUrl}">ดูรายละเอียดเคส</a>\n\n` +
                `<i>อัปเดตเมื่อ ${maInfo.timestamp}</i>`
            );

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await axios.post(url, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        console.log("Telegram MA notification sent successfully for:", maInfo.caseId);
        return response.data;
    } catch (error) {
        console.error("Error sending Telegram MA notification:", error.response ? error.response.data : error.message);
        throw error;
    }
}

// Send LINE notification for MA record
async function sendLineMANotification(channelAccessToken, userId, maInfo, isNew = true) {
    try {
        const headerText = isNew ? "📝 [NEW CASE] มีการเปิดเคสใหม่!" : "🔄 [UPDATE CASE] มีการอัปเดตสถานะเคส!";
        const headerColor = isNew ? "#82b440" : "#f39c12";
            
            const bodyContents = [
                {
                    type: "box",
                    layout: "baseline",
                    contents: [
                        { type: "text", text: "รหัสเคส:", size: "sm", color: "#aaaaaa", flex: 2 },
                        { type: "text", text: maInfo.caseId, size: "sm", wrap: true, flex: 5, weight: "bold" }
                    ]
                },
                {
                    type: "box",
                    layout: "baseline",
                    contents: [
                        { type: "text", text: "สถานที่:", size: "sm", color: "#aaaaaa", flex: 2 },
                        { type: "text", text: maInfo.siteName, size: "sm", wrap: true, flex: 5 }
                    ]
                },
                {
                    type: "box",
                    layout: "baseline",
                    contents: [
                        { type: "text", text: "ประเภท:", size: "sm", color: "#aaaaaa", flex: 2 },
                        { type: "text", text: maInfo.category, size: "sm", wrap: true, flex: 5 }
                    ]
                },
                {
                    type: "box",
                    layout: "baseline",
                    contents: [
                        { type: "text", text: "สถานะ:", size: "sm", color: "#aaaaaa", flex: 2 },
                        { type: "text", text: maInfo.status, size: "sm", wrap: true, flex: 5, weight: "bold", color: "#17c1e8" }
                    ]
                },
                {
                    type: "box",
                    layout: "baseline",
                    contents: [
                        { type: "text", text: "วันที่:", size: "sm", color: "#aaaaaa", flex: 2 },
                        { type: "text", text: maInfo.date, size: "sm", wrap: true, flex: 5 }
                    ]
                }
            ];

            // Add objective if exists
            if (maInfo.objective) {
                bodyContents.push({
                    type: "box",
                    layout: "baseline",
                    contents: [
                        { type: "text", text: "รายละเอียด:", size: "sm", color: "#aaaaaa", flex: 2 },
                        { type: "text", text: maInfo.objective, size: "sm", wrap: true, flex: 5 }
                    ]
                });
            }

            const flexMessage = {
                type: "flex",
                altText: `${headerText} ${maInfo.caseId}`,
                contents: {
                    type: "bubble",
                    header: {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "text",
                                text: headerText,
                                weight: "bold",
                                size: "lg",
                                color: "#ffffff"
                            }
                        ],
                        backgroundColor: headerColor
                    },
                    body: {
                        type: "box",
                        layout: "vertical",
                        contents: bodyContents,
                        spacing: "md"
                    },
                    footer: {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "text",
                                text: `${isNew ? 'เปิดเคสเมื่อ' : 'อัปเดตเมื่อ'}: ${maInfo.timestamp}`,
                                size: "xs",
                                color: "#aaaaaa",
                                margin: "md"
                            },
                            {
                                type: "button",
                                action: {
                                    type: "uri",
                                    label: "📋 ดูเคส",
                                    uri: `https://water-plant-maintenance.web.app?logId=${maInfo.logId}`
                                },
                                style: "primary",
                                color: headerColor,
                                height: "sm",
                                margin: "md"
                            }
                        ]
                    }
                }
            };

        const payload = {
            to: userId,
            messages: [flexMessage]
        };

        const response = await axios.post("https://api.line.me/v2/bot/message/push", payload, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${channelAccessToken}`
            }
        });
        console.log("LINE MA notification sent successfully for:", maInfo.caseId);
        return response.data;
    } catch (error) {
        console.error("Error sending LINE MA notification:", error.response ? error.response.data : error.message);
        throw error;
    }
}

exports.onNewSiteAdded = functions.region("asia-southeast1").firestore
    .document("sites/{siteId}")
    .onCreate(async (snap, context) => {
        const siteData = snap.data();
        const siteId = context.params.siteId;

        // Prevent notifications for old documents (created more than 5 minutes ago)
        // This prevents re-triggering notifications if functions are redeployed
        const createdAt = siteData.createdAt?.toDate?.() || new Date();
        const now = new Date();
        const ageInMinutes = (now - createdAt) / 1000 / 60;
        
        if (ageInMinutes > 5) {
            console.log(`Skipping notification for old site (${ageInMinutes.toFixed(1)} minutes old):`, siteData.name);
            return { success: true, message: "Skipped old document" };
        }

        // Get notification settings
        const settings = await getNotificationSettings();

        // If no settings configured, skip all notifications
        if (!settings) {
            console.log("No notification settings found, skipping notifications");
            return { success: true, message: "No notification settings configured" };
        }

        // Prepare standardized notification data
        const siteInfo = {
            id: siteId,
            siteCode: siteData.siteCode || "-",
            name: siteData.name || "-",
            description: siteData.description || "-",
            fullAddress: buildFullAddress(siteData),
            agency: siteData.responsibleAgency || "-",
            contactPhone: siteData.contactPhone || "-",
            locationUrl: siteData.locationUrl || "",
            province: siteData.province || "-",
            district: siteData.district || "-",
            subdistrict: siteData.subdistrict || "-",
            insuranceStartDate: siteData.insuranceStartDate || "-",
            insuranceEndDate: siteData.insuranceEndDate || "-",
            maintenanceCycle: siteData.maintenanceCycle ? `${siteData.maintenanceCycle} วัน` : "-",
            firstMaDate: siteData.firstMaDate || "-",
            timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
        };

        // Send notifications to enabled channels
        const notifications = [];

        if (settings.telegram && settings.telegram.enabled && settings.telegram.botToken && settings.telegram.chatId) {
            notifications.push(sendTelegramNotification(settings.telegram.botToken, settings.telegram.chatId, siteInfo));
        } else {
            console.log("Telegram notifications disabled or not configured");
        }

        if (settings.line && settings.line.enabled && settings.line.channelAccessToken && settings.line.userId) {
            notifications.push(sendLineNotification(settings.line.channelAccessToken, settings.line.userId, siteInfo));
        } else {
            console.log("LINE notifications disabled or not configured");
        }

        if (settings.smtp && settings.smtp.enabled && settings.smtp.host && settings.smtp.user) {
            notifications.push(sendEmailNotification(settings.smtp, siteInfo));
        } else {
            console.log("Email notifications disabled or not configured");
        }

        // Wait for all notifications to complete
        await Promise.allSettled(notifications);

        return { success: true, message: "Notifications processed" };
    });

// Trigger when a new MA record is created
exports.onNewMARecord = functions.region("asia-southeast1").firestore
    .document("logs/{logId}")
    .onCreate(async (snap, context) => {
        const logData = snap.data();
        const logId = context.params.logId;

        // Prevent notifications for old documents (created more than 5 minutes ago)
        const createdAt = logData.createdAt?.toDate?.() || new Date();
        const now = new Date();
        const ageInMinutes = (now - createdAt) / 1000 / 60;
        
        if (ageInMinutes > 5) {
            console.log(`Skipping notification for old MA record (${ageInMinutes.toFixed(1)} minutes old):`, logData.caseId);
            return { success: true, message: "Skipped old document" };
        }

        // Get notification settings
        const settings = await getNotificationSettings();

        // If no settings configured, skip all notifications
        if (!settings) {
            console.log("No notification settings found, skipping notifications");
            return { success: true, message: "No notification settings configured" };
        }

        // Get site information
        let siteName = "-";
        if (logData.siteId) {
            try {
                const siteDoc = await db.collection('sites').doc(logData.siteId).get();
                if (siteDoc.exists) {
                    siteName = siteDoc.data().name || "-";
                }
            } catch (error) {
                console.error("Error fetching site:", error);
            }
        }

        // Prepare standardized notification data
        const maInfo = {
            logId: logId,
            caseId: logData.caseId || logId,
            siteName: siteName,
            category: logData.category || "-",
            status: getThaiStatus(logData.status),
            date: logData.date ? new Date(logData.date).toLocaleDateString('th-TH') : "-",
            objective: logData.objective || "",
            timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
        };

        // Send notifications to enabled channels
        const notifications = [];

        if (settings.telegram && settings.telegram.enabled && settings.telegram.botToken && settings.telegram.chatId) {
            notifications.push(sendTelegramMANotification(settings.telegram.botToken, settings.telegram.chatId, maInfo, true));
        } else {
            console.log("Telegram notifications disabled or not configured");
        }

        if (settings.line && settings.line.enabled && settings.line.channelAccessToken && settings.line.userId) {
            notifications.push(sendLineMANotification(settings.line.channelAccessToken, settings.line.userId, maInfo, true));
        } else {
            console.log("LINE notifications disabled or not configured");
        }

        if (settings.smtp && settings.smtp.enabled && settings.smtp.host && settings.smtp.user && settings.smtp.recipients && settings.smtp.recipients.length > 0) {
            notifications.push(sendEmailMANotification(settings.smtp, maInfo, true));
        } else {
            console.log("Email notifications disabled or not configured");
        }

        // Wait for all notifications to complete
        await Promise.allSettled(notifications);

        return { success: true, message: "MA record notifications processed" };
    });

// Trigger when MA record status is updated
exports.onMAStatusUpdate = functions.region("asia-southeast1").firestore
    .document("logs/{logId}")
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();
        const logId = context.params.logId;

        // Only trigger if status changed
        if (beforeData.status === afterData.status) {
            console.log("Status unchanged, skipping notification");
            return { success: true, message: "Status unchanged" };
        }

        // Get notification settings
        const settings = await getNotificationSettings();

        // If no settings configured, skip all notifications
        if (!settings) {
            console.log("No notification settings found, skipping notifications");
            return { success: true, message: "No notification settings configured" };
        }

        // Get site information
        let siteName = "-";
        if (afterData.siteId) {
            try {
                const siteDoc = await db.collection('sites').doc(afterData.siteId).get();
                if (siteDoc.exists) {
                    siteName = siteDoc.data().name || "-";
                }
            } catch (error) {
                console.error("Error fetching site:", error);
            }
        }

        // Prepare standardized notification data
        const maInfo = {
            logId: logId,
            caseId: afterData.caseId || logId,
            siteName: siteName,
            category: afterData.category || "-",
            status: getThaiStatus(afterData.status),
            date: afterData.date ? new Date(afterData.date).toLocaleDateString('th-TH') : "-",
            objective: afterData.objective || "",
            timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
        };

        // Send notifications to enabled channels
        const notifications = [];

        if (settings.telegram && settings.telegram.enabled && settings.telegram.botToken && settings.telegram.chatId) {
            notifications.push(sendTelegramMANotification(settings.telegram.botToken, settings.telegram.chatId, maInfo, false));
        } else {
            console.log("Telegram notifications disabled or not configured");
        }

        if (settings.line && settings.line.enabled && settings.line.channelAccessToken && settings.line.userId) {
            notifications.push(sendLineMANotification(settings.line.channelAccessToken, settings.line.userId, maInfo, false));
        } else {
            console.log("LINE notifications disabled or not configured");
        }

        if (settings.smtp && settings.smtp.enabled && settings.smtp.host && settings.smtp.user && settings.smtp.recipients && settings.smtp.recipients.length > 0) {
            notifications.push(sendEmailMANotification(settings.smtp, maInfo, false));
        } else {
            console.log("Email notifications disabled or not configured");
        }

        // Wait for all notifications to complete
        await Promise.allSettled(notifications);

        return { success: true, message: "MA status update notifications processed" };
    });
