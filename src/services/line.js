import { auth, db, functions } from '../config/firebase.js';
import { state } from '../store/state.js';
import { FirestoreService } from '../services/firestore.js';
import { signInWithCustomToken, updateProfile, linkWithPopup, unlink, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, updateDoc, serverTimestamp, deleteField } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { showDialog, showToast } from '../utils/ui.js';

const LIFF_ID = "2008894954-o8Us8rV9";
let liffInitialized = false;
let liffInitPromise = null;

async function initLiff() {
    if (liffInitialized) return true;
    if (liffInitPromise) return liffInitPromise;

    liffInitPromise = (async () => {
        try {
            if (typeof liff === 'undefined') {
                console.error('LIFF SDK not loaded');
                return false;
            }
            await liff.init({ liffId: LIFF_ID });
            liffInitialized = true;
            console.log('LIFF initialized successfully. In LINE browser:', liff.isInClient());
            return true;
        } catch (err) {
            console.error('LIFF init error:', err);
            liffInitPromise = null;
            return false;
        }
    })();

    return liffInitPromise;
}

/**
 * Get LINE access token via LIFF login
 * Returns access token string or null
 */
async function getLiffAccessToken(actionType = 'login') {
    const ok = await initLiff();
    if (!ok) {
        showToast('ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองใหม่', 'error');
        return null;
    }
    // Force logout if it's a login or link action to always show consent screen
    if (liff.isLoggedIn() && (actionType === 'login' || actionType === 'link')) {
        liff.logout();
    }

    // If not logged in to LINE, trigger LIFF login
    if (!liff.isLoggedIn()) {
        // Save current state for redirect-back (use localStorage to survive mobile redirects)
        localStorage.setItem('liff_pending_action', actionType);

        // Use clean base URL (origin + pathname) for redirectUri to avoid
        // query string / hash fragment issues that can cause redirect URI mismatch on mobile.
        const cleanRedirectUrl = window.location.origin + window.location.pathname;

        // Use prompt: 'consent' to force the LINE authorization screen to appear,
        // allowing the user to verify or switch their account.
        liff.login({
            redirectUri: cleanRedirectUrl,
            prompt: 'consent'
        });
        return null; // Page will redirect, return null
    }

    const accessToken = liff.getAccessToken();
    if (!accessToken) {
        showToast('ไม่สามารถรับ Token จาก LINE ได้', 'error');
        return null;
    }

    return accessToken;
}

/**
 * Handle LINE Login (from login page button)
 */
async function handleLineLogin() {
    const btn = document.getElementById('btn-line-login');
    if (!btn) return;

    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>กำลังเชื่อมต่อ LINE...</span>';

    try {
        const accessToken = await getLiffAccessToken('login');
        if (!accessToken) {
            // LIFF login triggered a redirect, or failed silently
            // Restore button if no redirect happened (error case)
            setTimeout(() => {
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
            }, 2000);
            return;
        }

        // Call Cloud Function to verify token and get Firebase custom token
        const lineLoginFn = httpsCallable(functions, 'lineLogin');
        const result = await lineLoginFn({ accessToken });

        if (result.data.success) {
            // Sign in with Firebase custom token
            await signInWithCustomToken(auth, result.data.customToken);
            showToast('เข้าสู่ระบบด้วย LINE สำเร็จ!', 'success');

            // Log action
            FirestoreService.logAction('AUTH', 'LOGIN', `User logged in via LINE (${result.data.lineProfile?.displayName || 'unknown'})`);
        } else if (result.data.error === 'NOT_LINKED') {
            if (liffInitialized && liff.isLoggedIn()) liff.logout();
            // LINE not linked to any account
            await showDialog(result.data.message || 'ไม่พบบัญชีที่เชื่อมต่อกับ LINE นี้\n\nกรุณาเข้าสู่ระบบด้วยอีเมล/เบอร์โทร แล้วเชื่อมต่อ LINE ที่หน้าโปรไฟล์ก่อน');
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        } else {
            if (liffInitialized && liff.isLoggedIn()) liff.logout();
            showToast(result.data.message || 'เกิดข้อผิดพลาด', 'error');
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    } catch (error) {
        if (liffInitialized && liff.isLoggedIn()) liff.logout();
        console.error('LINE Login error:', error);
        showToast('เข้าสู่ระบบด้วย LINE ไม่สำเร็จ: ' + (error.message || 'Unknown error'), 'error');
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

/**
 * Handle LINE Account Linking (from profile page)
 */
async function handleLinkLine() {
    const btn = document.getElementById('btn-link-line');
    if (!btn) return;

    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังเชื่อมต่อ...';

    try {
        const accessToken = await getLiffAccessToken('link');
        if (!accessToken) {
            setTimeout(() => {
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
            }, 2000);
            return;
        }

        // Call Cloud Function to link LINE account
        const linkFn = httpsCallable(functions, 'linkLineAccount');
        const result = await linkFn({ accessToken });

        if (result.data.success) {
            showToast(result.data.message || 'เชื่อมต่อ LINE สำเร็จ!', 'success');
            // Re-render profile to show linked status
            renderProfile();
        } else if (result.data.error === 'ALREADY_LINKED') {
            if (liffInitialized && liff.isLoggedIn()) liff.logout();
            await showDialog(result.data.message || 'บัญชี LINE นี้ถูกเชื่อมต่อกับผู้ใช้งานอื่นแล้ว');
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        } else {
            if (liffInitialized && liff.isLoggedIn()) liff.logout();
            showToast(result.data.message || 'เกิดข้อผิดพลาด', 'error');
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    } catch (error) {
        if (liffInitialized && liff.isLoggedIn()) liff.logout();
        console.error('Link LINE error:', error);
        showToast('เชื่อมต่อ LINE ไม่สำเร็จ: ' + (error.message || 'Unknown error'), 'error');
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

/**
 * Handle LINE Profile Photo Sync (from profile page)
 */
async function handleSyncLinePhoto() {
    const btn = document.getElementById('btn-sync-line-photo');
    if (!btn) return;

    const originalHTML = btn.innerHTML;
    btn.classList.add('syncing');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังซิงค์...';

    try {
        const accessToken = await getLiffAccessToken('sync');
        if (!accessToken) {
            showToast('ไม่สามารถซิงค์ได้ กรุณาลองใหม่', 'error');
            btn.classList.remove('syncing');
            btn.innerHTML = originalHTML;
            return;
        }

        // Call Cloud Function to refresh LINE profile data
        const linkFn = httpsCallable(functions, 'linkLineAccount');
        const result = await linkFn({ accessToken });

        if (result.data.success) {
            showToast('ซิงค์รูปโปรไฟล์สำเร็จ!', 'success');
            // Re-render profile to show updated photo
            renderProfile();
        } else {
            showToast(result.data.message || 'เกิดข้อผิดพลาดในการซิงค์', 'error');
        }
    } catch (error) {
        console.error('Sync LINE photo error:', error);
        showToast('เกิดข้อผิดพลาดในการซิงค์: ' + (error.message || 'Unknown error'), 'error');
    } finally {
        btn.classList.remove('syncing');
        btn.innerHTML = originalHTML;
    }
}

/**
 * Handle LINE Account Unlinking (from profile page)
 */
async function handleUnlinkLine() {
    const confirmed = await showDialog(
        'ต้องการยกเลิกการเชื่อมต่อ LINE หรือไม่?\n\nหลังจากยกเลิก คุณจะไม่สามารถใช้ LINE เข้าสู่ระบบได้',
        { type: 'confirm' }
    );

    if (!confirmed) return;

    try {
        const user = auth.currentUser;
        if (!user) return;

        // Remove LINE fields from Firestore
        const { deleteField } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        await updateDoc(doc(db, 'users', user.uid), {
            lineUserId: deleteField(),
            lineDisplayName: deleteField(),
            linePictureUrl: deleteField(),
            lineLinkedAt: deleteField()
        });

        // LIFF logout if logged in
        try {
            if (liffInitialized && liff.isLoggedIn()) {
                liff.logout();
            }
        } catch (e) {
            console.warn('LIFF logout warning:', e);
        }

        showToast('ยกเลิกการเชื่อมต่อ LINE เรียบร้อย', 'success');
        renderProfile();
    } catch (error) {
        console.error('Unlink LINE error:', error);
        showToast('เกิดข้อผิดพลาดในการยกเลิกเชื่อมต่อ', 'error');
    }
}

/**
 * Render LINE link status in profile page
 */
async function renderLineStatus(userArg = null) {
    const container = document.getElementById('line-link-status');
    if (!container) return;

    const user = userArg || auth.currentUser;
    if (!user) {
        container.innerHTML = '';
        return;
    }

    try {
        const userDoc = await FirestoreService.getUser(user.uid);

        if (userDoc && userDoc.lineUserId) {
            // LINE is linked
            const linkedDate = userDoc.lineLinkedAt
                ? new Date(userDoc.lineLinkedAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
                : '';

            const avatarSrc = userDoc.linePictureUrl || 'https://ui-avatars.com/api/?name=L&background=06C755&color=fff&size=88';
            const displayName = userDoc.lineDisplayName || 'LINE User';

            container.innerHTML = `
                <div class="line-linked-card">
                    <img class="line-linked-avatar" src="${avatarSrc}" alt="LINE Avatar" onerror="this.src='https://ui-avatars.com/api/?name=L&background=06C755&color=fff&size=88'">
                    <div class="line-linked-info">
                        <div class="line-linked-name">
                            ${displayName}
                            <span class="line-badge">
                                <i class="fa-solid fa-check" style="font-size: 0.6rem;"></i> เชื่อมต่อแล้ว
                            </span>
                        </div>
                        ${linkedDate ? `<div class="line-linked-date">เชื่อมต่อเมื่อ ${linkedDate}</div>` : ''}
                    </div>
                    <div class="line-linked-actions">
                        <button class="btn-line-sync" id="btn-sync-line-photo" type="button" title="ซิงค์รูปโปรไฟล์จาก LINE">
                            <i class="fa-solid fa-rotate"></i> ซิงค์รูป
                        </button>
                        <button class="btn-line-unlink" id="btn-unlink-line" type="button">
                            <i class="fa-solid fa-link-slash"></i> ยกเลิก
                        </button>
                    </div>
                </div>
            `;

            // Attach unlink handler
            const unlinkBtn = document.getElementById('btn-unlink-line');
            if (unlinkBtn) unlinkBtn.addEventListener('click', handleUnlinkLine);

            // Attach sync handler
            const syncBtn = document.getElementById('btn-sync-line-photo');
            if (syncBtn) syncBtn.addEventListener('click', handleSyncLinePhoto);

        } else {
            // LINE is NOT linked
            container.innerHTML = `
                <div class="line-not-linked-card">
                    <p><i class="fa-solid fa-link" style="margin-right: 0.3rem;"></i> ยังไม่ได้เชื่อมต่อบัญชี LINE</p>
                    <button class="btn-line-link" id="btn-link-line" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#ffffff">
                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                        </svg>
                        เชื่อมต่อบัญชี LINE
                    </button>
                </div>
            `;

            // Attach link handler
            const linkBtn = document.getElementById('btn-link-line');
            if (linkBtn) linkBtn.addEventListener('click', handleLinkLine);
        }
    } catch (error) {
        console.error('Error rendering LINE status:', error);
        container.innerHTML = `
            <div class="line-not-linked-card">
                <p style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> ไม่สามารถโหลดสถานะ LINE ได้</p>
            </div>
        `;
    }
}


export { initLiff, getLiffAccessToken, handleLineLogin, handleLinkLine, handleSyncLinePhoto, handleUnlinkLine, renderLineStatus };