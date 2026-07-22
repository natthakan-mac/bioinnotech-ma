import { auth, db, functions, storage } from '../config/firebase.js';
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { state } from '../store/state.js';
import { FirestoreService } from '../services/firestore.js';
import { updateProfile, updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showDialog, showToast } from '../utils/ui.js';
import { validateEmail } from '../utils/validation.js';
import { renderLineStatus } from '../services/line.js?v=1.1.9';

function isMobile() {
    const ua = navigator.userAgent;
    const standardMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isIpadOS = /Macintosh/i.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
    const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
    return standardMobile || isIpadOS || isAndroidTablet;
}

async function handleLogout() {
    if (await showDialog("คุณต้องการออกจากระบบหรือไม่?", { type: "confirm" })) {
        try {
            if (typeof teardownRealtimeListeners === 'function') {
                teardownRealtimeListeners();
            } else if (typeof window.teardownRealtimeListeners === 'function') {
                window.teardownRealtimeListeners();
            }

            await FirestoreService.logAction("AUTH", "LOGOUT", `User logged out`);

            if (typeof liff !== 'undefined' && typeof liffInitialized !== 'undefined' && liffInitialized && liff.isLoggedIn()) {
                liff.logout();
            }

            sessionStorage.setItem('skip_line_auto_login', 'true');
            await signOut(auth);
            window.location.reload();
        } catch (error) {
            console.error("Logout Error:", error);
        }
    }
}

async function saveProfileSignature(dataUrl) {
    const user = auth.currentUser;
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { signature: dataUrl });
    renderProfile();
    showToast("บันทึกลายเซ็นเรียบร้อย", "success");
}
window.saveProfileSignature = saveProfileSignature;

const btnHeaderLogout = document.getElementById("btn-header-logout");
if (btnHeaderLogout) btnHeaderLogout.addEventListener("click", handleLogout);

const headerAvatar = document.getElementById("header-avatar");
if (headerAvatar)
    headerAvatar.addEventListener("click", () => {
        switchView("profile-view");
        renderProfile();
    });

// const profileForm = document.getElementById('profile-form');
// Unified Profile Logic registration moved to Global or setupEventListeners

// Listener moved to renderProfile to handle dynamic state (Link/Unlink)
// const btnLinkLine = document.getElementById('btn-link-line');
// if (btnLinkLine) btnLinkLine.addEventListener('click', handleLinkLineAccount);

// --- Unified Profile & Password Update Logic ---
const profileForm = document.getElementById("profile-form");
if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        let user = auth.currentUser;
        if (!user) return;


        // --- EMAIL FORMAT VALIDATION (Profile) ---
        const newEmailInput = document.getElementById("profile-email");
        const newEmailVal = newEmailInput ? newEmailInput.value.trim() : "";
        if (newEmailVal && !validateEmail(newEmailVal)) {
            await showDialog("รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง", { title: "รูปแบบไม่ถูกต้อง" });
            return;
        }
        // -----------------------------------------

        const newDisplayName = document.getElementById("profile-name").value.trim();
        const newEmail = document.getElementById("profile-email")?.value.trim();
        const newPassword = document.getElementById("new-password")?.value || "";
        const currentPassword =
            document.getElementById("current-password")?.value || "";

        try {
            const userDoc = await FirestoreService.getUser(user.uid);
            const currentPhone = userDoc && userDoc.phone ? userDoc.phone : "";
            const newPhone = window.itiInstances.profile
                ? window.itiInstances.profile.getNumber()
                : document.getElementById("profile-phone")?.value.trim() || "";

            const displayNameChanged =
                newDisplayName && newDisplayName !== user.displayName;
            const emailChanged = newEmail && newEmail !== user.email;
            const passwordChanged = !!newPassword;
            const phoneChanged = newPhone !== currentPhone;

            if (
                !displayNameChanged &&
                !emailChanged &&
                !passwordChanged &&
                !phoneChanged
            ) {
                await showDialog("ไม่มีการเปลี่ยนแปลงข้อมูล");
                return;
            }

            // 1. Update Display Name and Phone if changed (Not sensitive)
            if (displayNameChanged || phoneChanged) {
                const updates = {};

                if (displayNameChanged) {
                    await updateProfile(user, { displayName: newDisplayName });
                    updates.displayName = newDisplayName;
                }

                if (phoneChanged) {
                    updates.phone = newPhone;
                }

                if (Object.keys(updates).length > 0) {
                    await updateDoc(doc(db, "users", user.uid), updates);
                }
            }

            // --- SENSITIVE UPDATES (EMAIL / PASSWORD) ---
            if (emailChanged || passwordChanged) {
                // Helper to wrap sensitive actions that might need re-authentication
                const executeSensitiveUpdates = async () => {
                    let emailUpdatedLocally = false;
                    let passwordUpdatedLocally = false;

                    if (emailChanged) {
                        try {
                            await updateEmail(user, newEmail);
                            emailUpdatedLocally = true;
                            console.log("Email updated in Auth");
                        } catch (err) {
                            console.error("updateEmail Error:", err);
                            throw err;
                        }
                    }

                    if (passwordChanged) {
                        try {
                            await updatePassword(user, newPassword);
                            passwordUpdatedLocally = true;
                            console.log("Password updated in Auth");
                        } catch (err) {
                            console.error("updatePassword Error:", err);
                            throw err;
                        }
                    }

                    // Sync to Firestore only if Auth updates succeeded
                    if (emailUpdatedLocally) {
                        await updateDoc(doc(db, "users", user.uid), { email: newEmail });
                        console.log("Email synced to Firestore");
                    }
                };

                try {
                    await executeSensitiveUpdates();
                } catch (err) {
                    if (err.code === "auth/email-already-in-use") {
                        throw new Error("อีเมลนี้ถูกใช้งานแล้วโดยบัญชีอื่น");
                    } else if (err.code === "auth/invalid-email") {
                        throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
                    } else {
                        throw err;
                    }
                }
            }

            // Success: Force reload session to get fresh data
            await user.reload();
            user = auth.currentUser;

            await renderProfile(user);

            // Construct detailed log message
            const changes = [];
            if (displayNameChanged) changes.push("Name");
            if (emailChanged) changes.push("Email");
            if (passwordChanged) changes.push("Password");
            const changeDesc =
                changes.length > 0 ? changes.join(", ") : "Information";

            await FirestoreService.logAction(
                "USER",
                "EDIT",
                `Updated profile: ${changeDesc}`,
                {
                    changes: changes,
                    userId: user.uid,
                },
            );
            await showDialog("บันทึกข้อมูลเรียบร้อยแล้ว");

            // Clear password fields
            if (document.getElementById("current-password"))
                document.getElementById("current-password").value = "";
            if (document.getElementById("new-password"))
                document.getElementById("new-password").value = "";
        } catch (err) {
            console.error("Profile Update Error:", err);
            if (
                err.code === "auth/invalid-credential" ||
                err.code === "auth/wrong-password"
            ) {
                await showDialog("รหัสผ่านปัจจุบันไม่ถูกต้อง");
            } else if (err.code === "auth/weak-password") {
                await showDialog(
                    "รหัสผ่านใหม่ต้องมีความปลอดภัยมากกว่านี้ (อย่างน้อย 6 ตัวอักษร)",
                );
            } else if (err.code === "auth/requires-recent-login") {
                if (
                    await showDialog(
                        "เพื่อความปลอดภัย ระบบต้องการการยืนยันตัวตนล่าสุดก่อนแก้ไขข้อมูลสำคัญ\nคุณต้องการออกจากระบบเพื่อเข้าสู่ระบบใหม่หรือไม่?",
                        {
                            type: "confirm",
                            confirmText: "ออกจากระบบ",
                            title: "ยืนยันตัวตน",
                        },
                    )
                ) {
                    await signOut(auth);
                    window.location.reload();
                }
            } else {
                await showDialog("เกิดข้อผิดพลาด: " + err.message);
            }
        }
    });
}
// Old separate Change Password Logic removed

// --- Notification Settings Form Handler ---
const notificationSettingsForm = document.getElementById("notification-settings-form");
if (notificationSettingsForm) {
    notificationSettingsForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        try {
            const notificationSettings = {
                smtp: {
                    enabled: document.getElementById("email-enabled")?.checked || false,
                    host: document.getElementById("smtp-host")?.value.trim() || "",
                    port: parseInt(document.getElementById("smtp-port")?.value) || 587,
                    user: document.getElementById("smtp-user")?.value.trim() || "",
                    password: document.getElementById("smtp-password")?.value || "",
                    from: document.getElementById("smtp-from")?.value.trim() || "",
                    secure: document.getElementById("smtp-secure")?.checked || false,
                    recipients: getEmailRecipients()
                },

                telegram: {
                    enabled: document.getElementById("telegram-enabled")?.checked || false,
                    botToken: document.getElementById("telegram-bot-token")?.value.trim() || "",
                    chatId: document.getElementById("telegram-chat-id")?.value.trim() || ""
                },
                updatedAt: new Date().toISOString(),
                updatedBy: user.uid
            };

            // Save to Firestore
            await FirestoreService.updateNotificationSettings(notificationSettings);

            await FirestoreService.logAction(
                "SETTINGS",
                "EDIT",
                "Updated notification settings",
                { userId: user.uid }
            );

            showToast("บันทึกการตั้งค่าการแจ้งเตือนเรียบร้อยแล้ว", "success");
        } catch (err) {
            console.error("Notification Settings Update Error:", err);
            showToast("เกิดข้อผิดพลาดในการบันทึกการตั้งค่า: " + err.message, "error");
        }
    });
}

// --- System Settings Form Handler ---
const systemSettingsForm = document.getElementById("system-settings-form");
if (systemSettingsForm) {
    systemSettingsForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        try {
            const newSessionTimeoutHoursStr = document.getElementById("profile-session-timeout")?.value || "2";
            const newSessionTimeoutHours = parseFloat(newSessionTimeoutHoursStr);
            if (isNaN(newSessionTimeoutHours) || newSessionTimeoutHours <= 0) {
                throw new Error("กรุณาระบุเวลาหมดอายุที่ถูกต้อง (มากกว่า 0 ชั่วโมง)");
            }
            const newSessionTimeoutMinutes = Math.round(newSessionTimeoutHours * 60);

            await updateDoc(doc(db, "users", user.uid), {
                sessionTimeout: newSessionTimeoutMinutes
            });

            currentSessionTimeoutMs = newSessionTimeoutMinutes * 60 * 1000;
            resetIdleTimer();

            await FirestoreService.logAction(
                "SETTINGS",
                "EDIT",
                `Updated system settings: Session Timeout set to ${newSessionTimeoutHours} hours (${newSessionTimeoutMinutes} minutes)`,
                { userId: user.uid }
            );

            showToast("บันทึกการตั้งค่าระบบเรียบร้อยแล้ว", "success");
        } catch (err) {
            console.error("System Settings Update Error:", err);
            showToast("เกิดข้อผิดพลาดในการบันทึกการตั้งค่า: " + err.message, "error");
        }
    });
}

// Clear Notification Settings Button
const btnClearNotificationSettings = document.getElementById("btn-clear-notification-settings");
if (btnClearNotificationSettings) {
    btnClearNotificationSettings.addEventListener("click", async () => {
        const confirmed = await showDialog(
            "คุณต้องการล้างการตั้งค่าการแจ้งเตือนทั้งหมดหรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้",
            {
                type: "confirm",
                confirmText: "ล้างข้อมูล",
                title: "ยืนยันการล้างข้อมูล"
            }
        );

        if (!confirmed) return;

        try {
            await FirestoreService.deleteNotificationSettings();

            // Clear all form fields
            document.getElementById("email-enabled").checked = false;
            document.getElementById("smtp-host").value = "";
            document.getElementById("smtp-port").value = "587";
            document.getElementById("smtp-user").value = "";
            document.getElementById("smtp-password").value = "";
            document.getElementById("smtp-from").value = "";
            document.getElementById("smtp-secure").checked = false;
            loadEmailRecipients([]);

            document.getElementById("telegram-enabled").checked = false;
            document.getElementById("telegram-bot-token").value = "";
            document.getElementById("telegram-chat-id").value = "";

            await FirestoreService.logAction(
                "SETTINGS",
                "DELETE",
                "Cleared all notification settings",
                { userId: auth.currentUser?.uid }
            );

            showToast("ล้างการตั้งค่าการแจ้งเตือนเรียบร้อยแล้ว", "success");
        } catch (err) {
            console.error("Error clearing notification settings:", err);
            showToast("เกิดข้อผิดพลาดในการล้างการตั้งค่า: " + err.message, "error");
        }
    });
}

// Email Recipients Management
function initEmailRecipients() {
    const container = document.getElementById("email-recipients-container");
    const addButton = document.getElementById("btn-add-email-recipient");

    if (!container || !addButton) return;

    // Add recipient button
    addButton.addEventListener("click", () => {
        addEmailRecipientRow();
    });

    // Setup initial row
    setupRecipientRow(container.querySelector(".email-recipient-row"));
}

function addEmailRecipientRow(value = "") {
    const container = document.getElementById("email-recipients-container");
    const row = document.createElement("div");
    row.className = "email-recipient-row";
    row.style.cssText = "display: flex; gap: 0.5rem; align-items: center;";

    const input = document.createElement("input");
    input.type = "email";
    input.className = "email-recipient-input";
    input.placeholder = "recipient@example.com";
    input.autocomplete = "off";
    input.style.flex = "1";
    input.value = value;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-icon btn-remove-recipient";
    removeBtn.title = "Remove";
    removeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';

    row.appendChild(input);
    row.appendChild(removeBtn);
    container.appendChild(row);

    setupRecipientRow(row);
    updateRemoveButtons();
}

function setupRecipientRow(row) {
    if (!row) return;

    const removeBtn = row.querySelector(".btn-remove-recipient");
    if (removeBtn) {
        removeBtn.addEventListener("click", () => {
            row.remove();
            updateRemoveButtons();
        });
    }
}

function updateRemoveButtons() {
    const container = document.getElementById("email-recipients-container");
    const rows = container.querySelectorAll(".email-recipient-row");

    rows.forEach((row, index) => {
        const removeBtn = row.querySelector(".btn-remove-recipient");
        if (removeBtn) {
            // Show remove button only if there's more than one row
            removeBtn.style.display = rows.length > 1 ? "flex" : "none";
        }
    });
}

function getEmailRecipients() {
    const inputs = document.querySelectorAll(".email-recipient-input");
    const recipients = [];

    inputs.forEach(input => {
        const email = input.value.trim();
        if (email) {
            recipients.push(email);
        }
    });

    return recipients;
}

function loadEmailRecipients(recipients = []) {
    const container = document.getElementById("email-recipients-container");
    if (!container) return;

    // Clear existing rows
    container.innerHTML = "";

    // Add rows for each recipient, or at least one empty row
    if (recipients.length === 0) {
        addEmailRecipientRow();
    } else {
        recipients.forEach(email => {
            addEmailRecipientRow(email);
        });
    }
}

// Initialize email recipients on page load
initEmailRecipients();

// --- Profile Logic ---
// --- Referral Code Gate Logic ---
const referralGateForm = document.getElementById("form-referral-gate");
if (referralGateForm) {
    referralGateForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const codeInput = document
            .getElementById("referral-code-input")
            .value.toUpperCase()
            .trim();
        const masterCode = "960530";

        if (codeInput !== masterCode) {
            await showDialog(
                "รหัสแนะนำไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบเพื่อรับรหัสที่ถูกต้อง",
            );
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) return;

            // Mark as verified in Firestore
            await updateDoc(doc(db, "users", user.uid), { referralVerified: true });

            await showDialog("ยืนยันรหัสแนะนำสำเร็จ! ยินดีต้อนรับเข้าสูระบบ");
            document.getElementById("modal-referral-gate").classList.add("hidden");

            // Now check if they ALSO need to set password/email
            const hasPassword = user.providerData.some(
                (p) => p.providerId === "password",
            );
            const needsEmail = !user.email;
            if (!hasPassword || needsEmail) {
                // Trigger the next modal (the force check in listener will naturally handle this on refresh, but we do it manually for smooth flow)
                const modal = document.getElementById("modal-force-password");
                if (modal) {
                    modal.classList.remove("hidden");
                    const emailCont = document.getElementById("force-email-container");
                    const emailInput = document.getElementById("force-email-input");
                    if (needsEmail) {
                        emailCont?.classList.remove("hidden");
                        if (emailInput) emailInput.required = true;
                    } else {
                        emailCont?.classList.add("hidden");
                        if (emailInput) emailInput.required = false;
                    }
                }
            }
        } catch (err) {
            console.error("Referral Verification Error:", err);
            await showDialog("เกิดข้อผิดพลาดในการยืนยันรหัส: " + err.message);
        }
    });
}

const btnCancelReferral = document.getElementById("btn-cancel-referral");
if (btnCancelReferral) {
    btnCancelReferral.addEventListener("click", async () => {
        const confirmExit = await showDialog(
            "คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ? บัญชีของคุณจะถูกลบหากยังไม่ได้รับการยืนยัน",
            { type: "confirm" },
        );
        if (!confirmExit) return;

        try {
            const user = auth.currentUser;
            if (user) {
                // Delete user from Firestore first
                await deleteDoc(doc(db, "users", user.uid));
                // Delete from Auth
                await user.delete();
                console.log("Unauthorized account deleted successfully");
            }
            window.location.reload();
        } catch (err) {
            console.error("Error during account cleanup:", err);
            // Fallback: just logout
            await auth.signOut();
            window.location.reload();
        }
    });
}
// --- Force Password Setup Logic ---
const forcePasswordForm = document.getElementById("form-force-password");
if (forcePasswordForm) {
    forcePasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const newEmail = document.getElementById("force-email-input")?.value.trim();
        const p1 = document.getElementById("force-password-input").value;
        const p2 = document.getElementById("force-password-confirm").value;

        if (p1 !== p2) {
            await showDialog("รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
            return;
        }

        try {
            // 1. Identify which email to use
            let loginEmail = user.email || newEmail;

            if (!loginEmail) {
                await showDialog("กรุณาระบุอีเมลเพื่อความปลอดภัย");
                return;
            }

            // Note: We removed the direct updateEmail call because it often triggers
            // security restrictions (auth/operation-not-allowed) in modern Firebase projects.
            // linkWithCredential will automatically populate the email field if it's currently missing.

            // 2. Link Password Credential
            const credential = EmailAuthProvider.credential(loginEmail, p1);
            await linkWithCredential(user, credential);

            // 3. Sync to Firestore
            await updateDoc(doc(db, "users", user.uid), { email: loginEmail });

            await showDialog(
                "บันทึกข้อมูลอีเมลและรหัสผ่านเรียบร้อยแล้ว! ขอบคุณที่ร่วมสร้างความปลอดภัยให้กับระบบ",
            );
            document.getElementById("modal-force-password").classList.add("hidden");

            renderProfile();
        } catch (err) {
            console.error("Force Setup Error:", err);
            if (
                err.code === "auth/credential-already-in-use" ||
                err.code === "auth/email-already-in-use"
            ) {
                await showDialog(
                    "อีเมลนี้ถูกใช้งานร่วมกับบัญชีอื่นแล้ว กรุณาใช้อีเมลอื่น",
                );
            } else if (err.code === "auth/invalid-email") {
                await showDialog("รูปแบบอีเมลไม่ถูกต้อง");
            } else if (err.code === "auth/weak-password") {
                await showDialog(
                    "รหัสผ่านมีความปลอดภัยต่ำเกินไป (ต้องมี 6 ตัวอักษรขึ้นไป)",
                );
            } else if (err.code === "auth/requires-recent-login") {
                await showDialog(
                    "เซสชันหมดอายุหรือมีการทำรายการสำคัญ กรุณารีเฟรชหน้าแล้วเข้าสู่ระบบ LINE ใหม่อีกครั้ง",
                );
            } else {
                await showDialog("ไม่สามารถบันทึกข้อมูลได้: " + err.message);
            }
        }
    });
}


async function handleResetToDefaultPhoto() {
    console.log("handleResetToDefaultPhoto triggered");
    const user = auth.currentUser;
    if (!user) return;

    if (
        !(await showDialog("คุณต้องการใช้รูปโปรไฟล์พื้นฐานใช่หรือไม่?", {
            type: "confirm",
        }))
    )
        return;

    try {
        await updateProfile(user, { photoURL: "" });
        await updateDoc(doc(db, "users", user.uid), { photoURL: "" });

        await user.reload(); // Force refresh
        console.log("Photo Reset. Current URL:", auth.currentUser.photoURL);

        await FirestoreService.logAction(
            "USER",
            "UPDATE_PHOTO",
            "Reset profile photo to default",
        );
        showToast("ลบรูปโปรไฟล์เรียบร้อย", "success");
        renderProfile();
    } catch (error) {
        console.error("Reset Photo Error:", error);
        await showDialog("ไม่สามารถลบรูปได้: " + error.message);
    }
}






async function renderProfile(userArg = null) {
    const user = userArg || auth.currentUser;
    // console.log("Rendering profile for:", user?.uid, user?.email); // Debug
    if (!user) return;

    // Check if user is admin to show admin-only tabs (user management and notification settings)
    const currentUserDoc = await FirestoreService.getUser(user.uid);
    const isAdmin = currentUserDoc?.role === 'admin';

    // User Management tab - admin only
    const userManagementTab = document.getElementById('user-management-tab');
    if (userManagementTab) {
        userManagementTab.style.display = isAdmin ? 'flex' : 'none';
    }

    // Notification Settings tab - admin only
    const notificationSettingsTab = document.getElementById('notification-settings-tab');
    if (notificationSettingsTab) {
        notificationSettingsTab.style.display = isAdmin ? 'flex' : 'none';
    }

    // Company Settings tab - admin only
    const companySettingsTab = document.getElementById('company-settings-tab');
    if (companySettingsTab) {
        companySettingsTab.style.display = isAdmin ? 'flex' : 'none';
    }

    // Setup company settings form
    if (isAdmin) {
        setupCompanySettingsForm();
    }

    // Setup tab switching
    setupProfileTabs();

    // Header Avatar
    const avatarContainer = document.getElementById("header-avatar");
    if (avatarContainer) {
        const initial = (user.displayName || user.email || "U")
            .charAt(0)
            .toUpperCase();
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=38bdf8&color=fff&bold=true`;
        if (user.photoURL) {
            avatarContainer.innerHTML = `<img src="${user.photoURL}" alt="User" onerror="this.onerror=null;this.src='${fallbackUrl}'">`;
        } else {
            avatarContainer.innerHTML = `<img src="${fallbackUrl}" alt="User">`;
        }
    }

    // Profile View Fields
    const profileDisplayNameHeading = document.getElementById(
        "profile-display-name-heading",
    );
    const profileEmailDisplay = document.getElementById("profile-email-display");
    const profileNameInput = document.getElementById("profile-name");
    const profileEmailInput = document.getElementById("profile-email");

    if (profileDisplayNameHeading)
        profileDisplayNameHeading.textContent = user.displayName || "ผู้ใช้งาน";
    if (profileEmailDisplay)
        profileEmailDisplay.textContent = user.email || "No Email";
    if (profileNameInput) profileNameInput.value = user.displayName || "";
    if (profileEmailInput) profileEmailInput.value = user.email || "";

    const profilePhoneInput = document.getElementById("profile-phone");
    if (profilePhoneInput) {
        profilePhoneInput.value = "กำลังโหลด...";
        FirestoreService.getUser(user.uid).then((userDoc) => {
            if (profilePhoneInput) {
                const phoneVal = userDoc && userDoc.phone ? userDoc.phone : "";
                if (window.itiInstances.profile) {
                    window.itiInstances.profile.setNumber(phoneVal);
                } else {
                    profilePhoneInput.value = phoneVal;
                }
            }
            // Load session timeout
            const sessionTimeoutInput = document.getElementById("profile-session-timeout");
            if (sessionTimeoutInput) {
                const timeoutValMinutes = userDoc && userDoc.sessionTimeout ? parseInt(userDoc.sessionTimeout, 10) : 120;
                const timeoutValHours = timeoutValMinutes / 60;
                sessionTimeoutInput.value = Math.round(timeoutValHours * 100) / 100;
            }
            // Load signature
            const sigImg = document.getElementById("profile-signature-img");
            const sigEmpty = document.getElementById("profile-signature-empty");
            const sigClearBtn = document.getElementById("btn-clear-profile-signature");
            if (userDoc && userDoc.signature) {
                if (sigImg) { sigImg.src = userDoc.signature; sigImg.style.display = "inline-block"; }
                if (sigEmpty) sigEmpty.style.display = "none";
                if (sigClearBtn) sigClearBtn.style.display = "inline-flex";
            } else {
                if (sigImg) sigImg.style.display = "none";
                if (sigEmpty) sigEmpty.style.display = "block";
                if (sigClearBtn) sigClearBtn.style.display = "none";
            }
        });
    }

    // Accessibility: Update Alt Text
    const previewImg = document.getElementById("profile-image-preview");
    const btnResetPhoto = document.getElementById("btn-reset-photo");

    if (previewImg) {
        previewImg.alt = `รูปโปรไฟล์ของ ${user.displayName || "ผู้ใช้งาน"}`;

        const initial = (user.displayName || user.email || "U")
            .charAt(0)
            .toUpperCase();
        const fallbackSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=38bdf8&color=fff&size=256&bold=true`;

        if (user.photoURL) {
            previewImg.src = user.photoURL;
            previewImg.onerror = () => {
                previewImg.onerror = null; // prevent infinite loop
                previewImg.src = fallbackSrc;
                if (btnResetPhoto) btnResetPhoto.style.display = "none";
            };
            if (btnResetPhoto) {
                btnResetPhoto.style.display = "flex";
                btnResetPhoto.onclick = handleResetToDefaultPhoto;
            }
        } else {
            previewImg.src = fallbackSrc;
            previewImg.onerror = null;
            if (btnResetPhoto) btnResetPhoto.style.display = "none";
        }
    }



    // Render User Roles Management (only if admin)
    if (isAdmin) {
        await renderUserRoles();
    }

    // Render LINE link status
    if (typeof renderLineStatus === 'function') {
        renderLineStatus(user);
    } else if (typeof window.renderLineStatus === 'function') {
        window.renderLineStatus(user);
    }
}

function setupProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const tabContents = document.querySelectorAll('.profile-tab-content');

    function switchTab(targetTab) {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.pmn-btn').forEach(b => b.classList.remove('active'));

        const matchingTab = document.querySelector(`.profile-tab[data-tab="${targetTab}"]`);
        if (matchingTab) matchingTab.classList.add('active');

        const matchingMobileBtn = document.querySelector(`.pmn-btn[data-tab="${targetTab}"]`);
        if (matchingMobileBtn) matchingMobileBtn.classList.add('active');

        const targetContent = document.getElementById(targetTab);
        if (targetContent) targetContent.classList.add('active');
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            const targetTab = tab.getAttribute('data-tab');
            switchTab(targetTab);
            if (targetTab === 'notification-settings') await loadNotificationSettings();
        });
    });

    // Mobile nav buttons
    document.querySelectorAll('.pmn-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetTab = btn.getAttribute('data-tab');
            if (!targetTab) return;
            switchTab(targetTab);
            if (targetTab === 'notification-settings') await loadNotificationSettings();
        });
    });

    // Mobile logout button
    const pmnLogout = document.getElementById('pmn-logout');
    if (pmnLogout) {
        pmnLogout.addEventListener('click', () => {
            const desktopLogout = document.getElementById('btn-logout-profile');
            if (desktopLogout) desktopLogout.click();
        });
    }

    // Sync mobile nav visibility with desktop tab visibility
    function syncMobileNavVisibility() {
        const userMgmtTab = document.getElementById('user-management-tab');
        const notifTab = document.getElementById('notification-settings-tab');
        const companyTab = document.getElementById('company-settings-tab');
        const pmnUserMgmt = document.getElementById('pmn-user-management');
        const pmnNotif = document.getElementById('pmn-notification-settings');
        const pmnCompany = document.getElementById('pmn-company-settings');
        if (pmnUserMgmt && userMgmtTab) {
            pmnUserMgmt.style.display = userMgmtTab.style.display === 'none' ? 'none' : 'inline-flex';
        }
        if (pmnNotif && notifTab) {
            pmnNotif.style.display = notifTab.style.display === 'none' ? 'none' : 'inline-flex';
        }
        if (pmnCompany && companyTab) {
            pmnCompany.style.display = companyTab.style.display === 'none' ? 'none' : 'inline-flex';
        }
    }

    // Observe desktop tab visibility changes
    const observer = new MutationObserver(syncMobileNavVisibility);
    ['user-management-tab', 'notification-settings-tab', 'company-settings-tab'].forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el, { attributes: true, attributeFilter: ['style'] });
    });

    syncMobileNavVisibility();
}


// --- Profile Photo Upload & Cropping Logic ---
const profileUploadInput = document.getElementById("profile-upload-input");
const profileImagePreview = document.getElementById("profile-image-preview");
const btnResetPhoto = document.getElementById("btn-reset-photo");

// Cropper Variables
let cropper;
const imageToCrop = document.getElementById("image-to-crop");
const cropModal = document.getElementById("modal-crop-image");
const btnCloseCrop = document.getElementById("btn-close-crop");
const btnCancelCrop = document.getElementById("btn-cancel-crop");
const btnSaveCrop = document.getElementById("btn-save-crop");

// 1. File Selection Handler
if (profileUploadInput) {
    profileUploadInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Valid File Types
        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!validTypes.includes(file.type)) {
            showToast("กรุณาเลือกไฟล์รูปภาพ (JPG, PNG)", "error");
            profileUploadInput.value = ""; // Reset
            return;
        }

        // Limit File Size (e.g. 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast("ขนาดไฟล์ต้องไม่เกิน 10MB", "error");
            profileUploadInput.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (imageToCrop) {
                imageToCrop.src = e.target.result;
                openCropModal();
            }
        };
        reader.readAsDataURL(file);
    });
}

// 2. Crop Modal Logic
function openCropModal() {
    if (!cropModal) return;
    cropModal.classList.remove("hidden");

    // Initialize Cropper (Destroy previous if exists)
    if (cropper) {
        cropper.destroy();
    }

    if (imageToCrop) {
        cropper = new Cropper(imageToCrop, {
            aspectRatio: 1, // 1:1 Square
            viewMode: 1,
            dragMode: "move",
            autoCropArea: 0.8,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            background: false, // Transparent background
            minCropBoxWidth: 100,
            minCropBoxHeight: 100,
        });
    }
}

function closeCropModal() {
    if (!cropModal) return;
    cropModal.classList.add("hidden");
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    // Clear input
    if (profileUploadInput) profileUploadInput.value = "";
}

if (btnCloseCrop) btnCloseCrop.onclick = closeCropModal;
if (btnCancelCrop) btnCancelCrop.onclick = closeCropModal;

// 3. Save Cropped Image
if (btnSaveCrop) {
    btnSaveCrop.onclick = async () => {
        if (!cropper) return;

        // Get Canvas
        const canvas = cropper.getCroppedCanvas({
            width: 500, // Resize for storing
            height: 500,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: "high",
        });

        if (!canvas) {
            showToast("เกิดข้อผิดพลาดในการตัดภาพ", "error");
            return;
        }

        // Convert to Blob
        canvas.toBlob(
            async (blob) => {
                if (!blob) return;

                // Show Loading State
                const oldText = btnSaveCrop.innerHTML;
                btnSaveCrop.innerHTML =
                    '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
                btnSaveCrop.disabled = true;

                try {
                    // Upload Blob
                    const user = auth.currentUser;
                    if (!user) throw new Error("No user logged in");

                    const filename = `profile_${user.uid}_${Date.now()}.jpg`;
                    const fileRef = ref(
                        storage,
                        `profile_photos/${user.uid}/${filename}`,
                    );

                    const uploadTask = await uploadBytes(fileRef, blob);
                    const downloadURL = await getDownloadURL(uploadTask.ref);

                    // Update Profile
                    await updateProfile(user, { photoURL: downloadURL });
                    await updateDoc(doc(db, "users", user.uid), {
                        photoURL: downloadURL,
                    });

                    await FirestoreService.logAction(
                        "USER",
                        "UPDATE_PHOTO",
                        "Uploaded new profile photo",
                    );

                    showToast("อัปเดตรูปโปรไฟล์เรียบร้อย", "success");
                    renderProfile(); // Refresh UI
                    closeCropModal();
                } catch (error) {
                    console.error("Upload Error:", error);
                    showToast(`ไม่สามารถอัปเดตรูปได้: ${error.message}`, "error");
                } finally {
                    // Reset Button
                    btnSaveCrop.innerHTML = oldText;
                    btnSaveCrop.disabled = false;
                }
            },
            "image/jpeg",
            0.9,
        ); // Quality 0.9
    };
}

// Password Toggle Logic
function setupPasswordToggles() {
    document.querySelectorAll(".btn-toggle-password").forEach((btn) => {
        btn.addEventListener("click", function () {
            const wrapper = this.closest(".password-wrapper");
            if (!wrapper) return;

            const input = wrapper.querySelector("input");
            const icon = this.querySelector("i");

            if (input.type === "password") {
                input.type = "text";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            } else {
                input.type = "password";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        });
    });
}

// PIN Input Validation (Numbers Only)
function setupPinValidation() {
    document.querySelectorAll(".pin-input").forEach((input) => {
        input.addEventListener("input", function (e) {
            this.value = this.value.replace(/[^0-9]/g, "");
        });
    });
}

// Initialize Password Toggles, PIN Validation & Public Report Page (Called centrally from app.js)

// ============================================================
// ANNUAL MAINTENANCE PLAN
// ============================================================


async function handleLogin(e) {
    e.preventDefault();
    let loginId = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const btn = document.getElementById("btn-login-email");

    if (!loginId || !password) return;

    const originalText = btn.textContent;
    btn.textContent = "กำลังเข้าสู่ระบบ...";
    btn.disabled = true;

    try {
        let email = loginId;

        // Check if loginId is a Phone Number
        // Remove spaces, hyphens, parentheses, and other formatting characters
        const digitsOnly = loginId.replace(/[^\d]/g, "");
        const hasPlus = loginId.startsWith("+");

        // A valid phone number usually has between 9 and 12 digits (e.g. 0812345678, +66812345678, 66812345678)
        if ((digitsOnly.length >= 9 && digitsOnly.length <= 12) || hasPlus) {
            let possiblePhoneFormats = [];

            // Add raw digits format (e.g. 0812345678 or 66812345678)
            possiblePhoneFormats.push(digitsOnly);

            // Add formatted formats
            if (hasPlus) {
                possiblePhoneFormats.push("+" + digitsOnly);
            } else if (digitsOnly.startsWith("66")) {
                possiblePhoneFormats.push("+" + digitsOnly);
            }

            // Convert local Thai number to international (e.g., 0812345678 -> +66812345678)
            if (digitsOnly.startsWith("0") && digitsOnly.length === 10) {
                possiblePhoneFormats.push("+66" + digitsOnly.slice(1));
            }

            // Deduplicate format array
            possiblePhoneFormats = Array.from(new Set(possiblePhoneFormats));
            console.log("Phone login detected. Querying email via secure Cloud Function with formats:", possiblePhoneFormats);

            try {
                const lookupEmailByPhone = httpsCallable(functions, "lookupEmailByPhone");
                const result = await lookupEmailByPhone({ phoneFormats: possiblePhoneFormats });
                if (result.data && result.data.success && result.data.email) {
                    email = result.data.email;
                    console.log("Found user email for phone via Cloud Function:", email);
                } else {
                    console.log("No user found matching phone formats via Cloud Function:", possiblePhoneFormats);
                }
            } catch (lookupErr) {
                console.error("Error looking up email by phone:", lookupErr);
            }
        }

        await signInWithEmailAndPassword(auth, email, password);
        await FirestoreService.logAction(
            "AUTH",
            "LOGIN",
            `User logged in via ${email === loginId ? "email" : "phone"}`,
        );
        showToast("ยินดีต้อนรับ! เข้าสู่ระบบเรียบร้อยแล้ว", "success");
    } catch (error) {
        console.error("Login failed:", error);
        let msg = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
        if (
            error.code === "auth/user-not-found" ||
            error.code === "auth/invalid-email"
        )
            msg = "ไม่พบผู้ใช้งานนี้";
        if (
            error.code === "auth/wrong-password" ||
            error.code === "auth/invalid-credential"
        )
            msg = "รหัสผ่าน/ข้อมูลไม่ถูกต้อง";
        if (error.code === "auth/too-many-requests")
            msg = "เข้าสู่ระบบถี่เกินไป (โปรดรอสักครู่)";

        showToast(msg, "error");
        btn.textContent = originalText;
        btn.disabled = false;
    }
}




export { isMobile, handleLogout, saveProfileSignature, renderProfile, setupProfileTabs, setupPasswordToggles, setupPinValidation, handleLogin };
