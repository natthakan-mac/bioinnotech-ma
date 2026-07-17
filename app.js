/**
 * BioInnotech Maintenance System
 * Core Application Logic (Thai Localized) - Firebase Integrated
 */

window.onerror = function (msg, url, line, col, error) {
    // Note that col & error are new to the HTML 5 spec and may not be supported in every browser.
    var extra = !col ? "" : "\ncolumn: " + col;
    extra += !error ? "" : "\nerror: " + error;
    console.error("Error: " + msg + "\nurl: " + url + "\nline: " + line + extra);
    // alert("Global Error: " + msg); // Optional: alert user
};

console.log("--- App.js Module Evaluating ---");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    setDoc,
    getDoc,
    query,
    orderBy,
    serverTimestamp,
    onSnapshot,
    limit,
    where,
    startAfter,
    getCountFromServer,
    getAggregateFromServer,
    sum,
    count,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
    getStorage,
    ref,
    getDownloadURL,
    uploadBytes,
    uploadBytesResumable,
    deleteObject,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithCustomToken,
    updateProfile,
    unlink,
    signOut,
    updatePassword,
    updateEmail,
    verifyBeforeUpdateEmail,
    reauthenticateWithCredential,
    EmailAuthProvider,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    getAdditionalUserInfo,
    deleteUser,
    OAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    linkWithPopup,
    signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    getFunctions,
    httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";



// Helper: check if category is a maintenance-type category
function isMaCategory(cat) {
    return cat === "บำรุงรักษาตามรอบ" || cat === "ตามสัญญาจ้าง" || cat === "ตามใบสั่งซื้อ" || cat === "Maintenance" || cat === "อื่นๆ";
}

/**
 * Unified helper to generate a standardized device information banner.
 * Used across Dashboard (Site Details), QR Modal, and Public Report Portal.
 */
function createDeviceBannerHTML(site, caseId = '', actionsHTML = '') {
    if (!site) return '';
    if (actionsHTML) {
        return `
            <div class="report-device-loaded" style="display: flex; align-items: flex-start; justify-content: space-between; width: 100%; gap: 1.5rem; flex-wrap: wrap; border-radius: 0 !important; margin-bottom: 0 !important; border: none !important; background: #ffffff !important; border-bottom: 1.5px solid #e5e5e5 !important; padding: 1rem 1.5rem !important;">
                <div style="display: flex; align-items: flex-start; gap: 1rem; min-width: 240px; flex: 1 1 auto; cursor: pointer;" onclick="event.stopPropagation(); viewSiteDetails('${site.id}')" title="ดูรายละเอียดสถานที่">
                    <div class="report-device-icon" style="width: 52px; height: 52px; border-radius: 14px; background: #111111 !important; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 1.45rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15) !important; margin-top: 2px;"><i class="fa-solid fa-microchip"></i></div>
                    <div class="report-device-details" style="min-width: 0; flex: 1;">
                        <div class="report-device-name" style="font-size: 1.35rem; font-weight: 800; color: #111111 !important; letter-spacing: -0.025em !important; line-height: 1.25 !important; margin-bottom: 0.15rem;">${site.name || 'เครื่อง'}</div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.35rem;">
                            ${caseId ? `
                                <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(0, 0, 0, 0.04) !important; color: #111111 !important; border: 1.2px solid rgba(0, 0, 0, 0.08) !important; font-size: 0.75rem !important; font-weight: 700 !important; padding: 3px 10px !important; border-radius: 10px !important; text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap; flex-shrink: 0;">
                                    <i class="fa-solid fa-folder-open" style="font-size: 0.7rem; color: #555555;"></i> Case: ${caseId.replace(/^CASE-/, '')}
                                </span>
                            ` : ''}
                            ${site.siteCode ? `
                                <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(0, 0, 0, 0.04) !important; color: #111111 !important; border: 1.2px solid rgba(0, 0, 0, 0.08) !important; font-size: 0.75rem !important; font-weight: 700 !important; padding: 3px 10px !important; border-radius: 10px !important; text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap; flex-shrink: 0;">
                                    <i class="fa-solid fa-location-dot" style="font-size: 0.7rem; color: #555555;"></i> Site: ${site.siteCode}
                                </span>
                            ` : ''}
                            ${site.serialNumber ? `
                                <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(0, 0, 0, 0.04) !important; color: #111111 !important; border: 1.2px solid rgba(0, 0, 0, 0.08) !important; font-size: 0.75rem !important; font-weight: 700 !important; padding: 3px 10px !important; border-radius: 10px !important; text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap; flex-shrink: 0;">
                                    <i class="fa-solid fa-barcode" style="font-size: 0.7rem; color: #555555;"></i> S/N: ${site.serialNumber}
                                </span>
                            ` : ''}
                            ${(site.brand || site.model) ? `
                                <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(0, 0, 0, 0.04) !important; color: #111111 !important; border: 1.2px solid rgba(0, 0, 0, 0.08) !important; font-size: 0.75rem !important; font-weight: 700 !important; padding: 3px 10px !important; border-radius: 10px !important; text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap; flex-shrink: 0;">
                                    <i class="fa-solid fa-cube" style="font-size: 0.7rem; color: #555555;"></i> Model: ${[site.brand, site.model].filter(Boolean).join(' / ')}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; margin-left: auto; margin-top: 0.5rem;" onclick="event.stopPropagation();">
                    ${actionsHTML}
                    <button class="close-modal" onclick="const m=document.getElementById('modal-log-details'); m.classList.add('hidden'); m.style.display='none';"
                        style="display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; background:#ffffff; color:#111111; border:1.5px solid #e5e5e5; border-radius:10px; font-size:1.1rem; cursor:pointer; transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); flex-shrink:0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
                        onmouseover="this.style.background='#f3f4f6';this.style.color='#111111';this.style.borderColor='#d1d5db';this.style.transform='scale(1.05)';"
                        onmouseout="this.style.background='#ffffff';this.style.color='#111111';this.style.borderColor='#e5e5e5';this.style.transform='none';">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
        `;
    }
    return `
        <div class="report-device-loaded">
            <div class="report-device-icon"><i class="fa-solid fa-microchip"></i></div>
            <div class="report-device-details">
                <div class="report-device-name">${site.name || 'เครื่อง'}</div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.35rem;">
                    ${caseId ? `<span class="report-device-code">${caseId}</span>` : ''}
                    ${site.siteCode ? `<span class="report-device-code">${site.siteCode}</span>` : ''}
                    ${site.serialNumber ? `<span class="report-device-code">${site.serialNumber}</span>` : ''}
                    ${(site.brand || site.model) ? `<span class="report-device-code">${[site.brand, site.model].filter(Boolean).join(' / ')}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyDIgPA8WHnxP5X_JoRQtwdGDIqGYRdCZOI",
    authDomain: "casp-ma.firebaseapp.com",
    projectId: "casp-ma",
    storageBucket: "casp-ma.firebasestorage.app",
    messagingSenderId: "155537603365",
    appId: "1:155537603365:web:df993623c42b613b6278cc",
    measurementId: "G-SKXRYFVDHR",
};

// Initialize Firebase
// --- Image Viewer Logic ---
const imageViewer = {
    modal: null,
    img: null,
    container: null,
    scale: 1,
    panning: false,
    pointX: 0,
    pointY: 0,
    startX: 0,
    startY: 0,

    init: function () {
        this.modal = document.getElementById("image-viewer-modal");
        if (!this.modal) return;
        this.img = document.getElementById("image-viewer-img");
        this.container = document.getElementById("image-viewer-container");

        // Controls
        const btnClose = document.getElementById("btn-viewer-close");
        if (btnClose) btnClose.onclick = () => this.close();

        const btnIn = document.getElementById("btn-zoom-in");
        if (btnIn)
            btnIn.onclick = (e) => {
                e.stopPropagation();
                this.zoom(0.5);
            };

        const btnOut = document.getElementById("btn-zoom-out");
        if (btnOut)
            btnOut.onclick = (e) => {
                e.stopPropagation();
                this.zoom(-0.5);
            };

        const btnReset = document.getElementById("btn-zoom-reset");
        if (btnReset)
            btnReset.onclick = (e) => {
                e.stopPropagation();
                this.reset();
            };

        // Background Close
        this.modal.onclick = (e) => {
            if (e.target === this.modal || e.target === this.container) this.close();
        };

        // Zoom/Pan Events
        this.container.onwheel = (e) => {
            e.preventDefault();
            this.zoom(e.deltaY * -0.001 * 2);
        };

        this.container.onmousedown = (e) => {
            e.preventDefault();
            this.panning = true;
            this.startX = e.clientX - this.pointX;
            this.startY = e.clientY - this.pointY;
            this.container.style.cursor = "grabbing";
        };

        // Global mouse events for dragging outside container
        document.addEventListener("mousemove", (e) => {
            if (!this.panning) return;
            e.preventDefault();
            this.pointX = e.clientX - this.startX;
            this.pointY = e.clientY - this.startY;
            this.updateTransform();
        });

        document.addEventListener("mouseup", () => {
            this.panning = false;
            if (this.container) this.container.style.cursor = "grab";
        });
    },

    open: function (src) {
        if (!this.modal) this.init();
        if (!this.modal) return;

        this.img.src = src;
        this.reset();
        this.modal.classList.add("visible");
        this.modal.classList.remove("hidden");
    },

    close: function () {
        if (this.modal) {
            this.modal.classList.remove("visible");
            setTimeout(() => {
                if (!this.modal.classList.contains("visible")) {
                    // hidden
                }
            }, 300);
        }
    },

    reset: function () {
        this.scale = 1;
        this.pointX = 0;
        this.pointY = 0;
        this.updateTransform();
    },

    zoom: function (delta) {
        this.scale += delta;
        if (this.scale < 0.2) this.scale = 0.2;
        if (this.scale > 5) this.scale = 5;
        this.updateTransform();
    },

    updateTransform: function () {
        if (this.img) {
            this.img.style.transform = `translate(${this.pointX}px, ${this.pointY}px) scale(${this.scale})`;
        }
    },
};

window.openImageViewer = (src) => imageViewer.open(src);

// --- Image Loader Helper (Inline) ---
function createLoaderImage(src, cssText) {
    const wrapper = document.createElement("div");
    wrapper.className = "inline-loader-wrapper";
    wrapper.style.cssText =
        "position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.5); overflow: hidden;";

    const spinner = document.createElement("div");
    spinner.className = "inline-loader-spinner";
    wrapper.appendChild(spinner);

    const img = document.createElement("img");
    img.className = "inline-loader-img";
    if (cssText) img.style.cssText = cssText;

    img.style.opacity = "0";
    img.style.transition = "opacity 0.3s ease-in";

    img.onload = () => {
        spinner.style.display = "none";
        img.style.opacity = "1";
        img.classList.add("loaded");
    };

    img.onerror = () => {
        spinner.style.display = "none";
        img.style.opacity = "1";
    };

    img.src = src;
    wrapper.appendChild(img);
    return wrapper;
}
window.createLoaderImage = createLoaderImage;
// ------------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const functions = getFunctions(app, "asia-southeast1");




// --- Auth Workflow Initialization ---
const initAuthWorkflow = async () => {
    try {
        // 1. Set Persistence FIRST
        // Using browserLocalPersistence (localStorage) for better mobile redirect stability
        try {
            await setPersistence(auth, browserLocalPersistence);
            console.log("Persistence Established: LocalStorage");
        } catch (pErr) {
            console.warn("Persistence setup issue:", pErr);
        }

        // 2. Handle Redirect Results (Crucial to wait for persistence)
        // Add a small delay for mobile to ensure browser has restored storage context
        if (isMobile()) {
            console.log("Mobile detected: Delaying redirect processing...");
            await new Promise((r) => setTimeout(r, 800));
        }
        // LINE Login removed - Email/Password only

        // Firebase Redirect Logic (Keeping disabled or enabling as backup?)
        // The user says "missing initial state" fails, so we rely on Manual now for mobile.
        // await handleRedirectFlow();

        // 3. Start Auth State Listener
        setupAuthStateListener();
    } catch (err) {
        console.error("Auth Workflow Init Error:", err);
        // Force splash removal on critical init error
        const splash = document.getElementById("loading-splash");
        if (splash) {
            const p = splash.querySelector("p");
            if (p) p.innerHTML = "Init Error: " + err.message;
            setTimeout(() => splash.classList.add("hidden"), 3000);
        }
    }
};

// --- Custom Dialog Helper ---
function showDialog(message, options = {}) {
    console.log("showDialog called:", message);
    return new Promise((resolve) => {
        const modal = document.getElementById("modal-themed-dialog");

        // Fallback
        if (!modal) {
            console.warn("Modal not found, using fallback");
            if (options.type === "confirm") {
                resolve(confirm(message));
            } else {
                alert(message);
                resolve(true);
            }
            return;
        }

        const titleEl = document.getElementById("dialog-title");
        const messageEl = document.getElementById("dialog-message");
        const iconEl = document.getElementById("dialog-icon");
        const btnConfirm = document.getElementById("btn-dialog-confirm");
        const btnCancel = document.getElementById("btn-dialog-cancel");

        // Set contextual icon
        if (iconEl) {
            let iconClass = "fa-solid fa-circle-info"; // default
            let iconColor = "var(--primary-color)";
            if (options.type === "confirm") {
                iconClass = "fa-solid fa-triangle-exclamation";
                iconColor = "#f59e0b";
            }
            if (options.icon === "delete" || (message && (message.includes("ลบ") || message.includes("ล้าง")))) {
                iconClass = "fa-solid fa-trash-can";
                iconColor = "#ef4444";
            } else if (options.icon === "restore" || (message && message.includes("กู้คืน"))) {
                iconClass = "fa-solid fa-rotate-left";
                iconColor = "#22c55e";
            } else if (options.icon === "success") {
                iconClass = "fa-solid fa-circle-check";
                iconColor = "#22c55e";
            } else if (options.icon === "error") {
                iconClass = "fa-solid fa-circle-xmark";
                iconColor = "#ef4444";
            } else if (options.icon === "warning") {
                iconClass = "fa-solid fa-triangle-exclamation";
                iconColor = "#f59e0b";
            } else if (options.icon === "info") {
                iconClass = "fa-solid fa-circle-info";
                iconColor = "var(--primary-color)";
            } else if (options.icon) {
                iconClass = options.icon;
            }
            iconEl.className = iconClass;
            iconEl.style.color = iconColor;
        }

        titleEl.textContent = options.title || (options.type === "confirm" ? "การยืนยัน" : "การแจ้งเตือน");
        messageEl.textContent = message;

        btnConfirm.textContent = options.confirmText || "ตกลง";
        btnCancel.textContent = options.cancelText || "ยกเลิก";
        btnCancel.style.display =
            options.type === "confirm" ? "inline-block" : "none";

        // Style for danger actions
        if (options.danger) {
            btnConfirm.style.background = "#ef4444";
            btnConfirm.style.borderColor = "#ef4444";
            btnConfirm.style.color = "#fff";
        } else {
            btnConfirm.style.background = ""; // Revert to CSS default
            btnConfirm.style.borderColor = "";
            btnConfirm.style.color = "";
        }

        // Force Show (Direct Style)
        modal.classList.remove("hidden"); // Just in case
        modal.style.display = "flex";

        // Cleanup Helper
        const cleanup = (result) => {
            console.log("Dialog closing, result:", result);
            modal.style.display = "none";
            modal.classList.add("hidden"); // Sync with class

            // Clear handlers
            btnConfirm.onclick = null;
            btnCancel.onclick = null;
            modal.onclick = null;
            resolve(result);
        };

        // Assign handlers
        btnConfirm.onclick = () => cleanup(true);
        btnCancel.onclick = () => cleanup(false);

        // Handle Background Click
        modal.onclick = (e) => {
            if (e.target === modal) {
                console.log("Background clicked");
                cleanup(false);
            }
        };
    });
}

function showCancelReasonDialog(title = "ยกเลิกเคส") {
    return new Promise((resolve) => {
        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'custom-cancel-dialog';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
        modal.style.backdropFilter = 'blur(4px)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.style.transition = 'opacity 0.2s ease';

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 16px; padding: 2rem; width: 90%; max-width: 450px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.05); font-family: 'Outfit', 'Prompt', sans-serif;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                    <div style="width: 40px; height: 40px; background: rgba(239, 68, 68, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="fa-solid fa-ban" style="color: #ef4444; font-size: 1.2rem;"></i>
                    </div>
                    <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #111827;">${title}</h3>
                </div>
                <p style="margin: 0 0 1rem 0; font-size: 0.95rem; color: #4b5563; line-height: 1.5;">กรุณาระบุเหตุผลที่ขอยกเลิกเคสซ่อมบำรุงนี้:</p>
                <textarea id="cancel-reason-textarea" placeholder="ระบุเหตุผล เช่น ลูกค้าแจ้งยกเลิก, พิมพ์ข้อมูลซ้ำ..." style="width: 100%; height: 100px; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #d1d5db; font-size: 0.95rem; font-family: inherit; resize: none; outline: none; transition: all 0.2s; box-sizing: border-box;" onfocus="this.style.borderColor='#ef4444'; this.style.boxShadow='0 0 0 3px rgba(239, 68, 68, 0.15)'" onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"></textarea>
                <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
                    <button id="cancel-dialog-btn-close" style="padding: 0.625rem 1.25rem; border-radius: 10px; border: 1px solid #d1d5db; background: #ffffff; color: #374151; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='#ffffff'">ปิด</button>
                    <button id="cancel-dialog-btn-submit" style="padding: 0.625rem 1.25rem; border-radius: 10px; border: none; background: #ef4444; color: #ffffff; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">ยืนยันการยกเลิก</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const textarea = modal.querySelector('#cancel-reason-textarea');
        if (textarea) textarea.focus();

        const btnClose = modal.querySelector('#cancel-dialog-btn-close');
        const btnSubmit = modal.querySelector('#cancel-dialog-btn-submit');

        const cleanup = (val) => {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
            }, 200);
            resolve(val);
        };

        btnClose.onclick = () => cleanup(null);
        btnSubmit.onclick = () => {
            const reason = textarea.value.trim();
            if (!reason) {
                textarea.style.borderColor = '#ef4444';
                textarea.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
                textarea.placeholder = 'จำเป็นต้องระบุเหตุผลในการยกเลิกเคส!';
                return;
            }
            cleanup(reason);
        };

        modal.onclick = (e) => {
            if (e.target === modal) cleanup(null);
        };
    });
}

// --- Toast Notification Helper ---
function showToast(message, type = "success", duration = 3000) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    // Create toast element
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    // Icon based on type
    const icons = {
        success: "fa-circle-check",
        error: "fa-circle-xmark",
        info: "fa-circle-info",
        warning: "fa-triangle-exclamation",
    };

    toast.innerHTML = `
        <i class="fa-solid ${icons[type] || icons.success} toast-icon"></i>
        <div class="toast-content">${message}</div>
        <button class="toast-close" aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    // Add to container
    container.appendChild(toast);

    // Close button handler
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => {
        removeToast(toast);
    });

    // Auto-dismiss after duration
    if (duration > 0) {
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }

    return toast;
}

function removeToast(toast) {
    toast.classList.add("hiding");
    setTimeout(() => {
        toast.remove();
    }, 300); // Match animation duration
}

// --- Redirect Result Handler ---
async function handleRedirectFlow() {
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            console.log("Redirect Auth Success:", result.user.email);


            if (result.operationType === "link") {
                await showDialog("เชื่อมต่อ LINE Account สำเร็จ!");
                if (!result.user.photoURL) {
                    const profile = result.user.providerData.find(
                        (p) => p.providerId === "oidc.line",
                    );
                    if (profile && profile.photoURL) {
                        await updateProfile(result.user, { photoURL: profile.photoURL });
                    }
                }
                showToast("ยินดีต้อนรับ! เข้าสู่ระบบเรียบร้อยแล้ว", "success");
                // LOG ACTION
                FirestoreService.logAction(
                    "AUTH",
                    "LOGIN",
                    `User logged in via ${result.providerId}`,
                );
                renderProfile(result.user);
            }
        }
    } catch (error) {
        console.error("Redirect Auth Error Details:", {
            code: error.code,
            message: error.message,
            full: error,
        });

        const isStateError =
            error.code === "auth/internal-error" ||
            error.message.includes("initial state") ||
            error.code === "auth/web-storage-unsupported";

        if (isStateError) {
            console.warn(
                "Silent Redirect State Issue (Likely Storage Partitioning):",
                error.code,
            );
            // Show error dialog as requested, but make it helpful
            await showDialog(
                "ไม่สามารถเข้าสู่ระบบได้ (" + error.code + "): " + error.message,
            );
            return;
        } else if (
            error.code === "auth/popup-closed-by-user" ||
            error.code === "auth/cancelled-popup-request"
        ) {
            // Ignore
        } else {
            await showDialog(
                "ไม่สามารถเข้าสู่ระบบได้ (" + error.code + "): " + error.message,
            );
        }


    }
}

// --- New User Verification Logic ---
// verifyNewUser removed as requested

// --- Auth State Listener Wrapper ---
function setupAuthStateListener() {
    onAuthStateChanged(auth, async (user) => {
        try {
            if (user) {
                console.log("Auth State Changed: User Logged In", user.uid);

                if (user.isAnonymous) {
                    console.log("Anonymous user detected.");
                    const urlParams = new URLSearchParams(window.location.search);
                    if (!urlParams.get('report')) {
                        console.log("No report parameter, signing out anonymous user...");
                        await signOut(auth);
                    } else {
                        const splash = document.getElementById("loading-splash");
                        if (splash) splash.classList.add("hidden");
                    }
                    return;
                }

                let userDoc = await FirestoreService.getUser(user.uid);
                currentUserRole = userDoc?.role || 'user';

                // Auto-Register New Users (Except LINE)
                if (!userDoc) {

                    console.log("New user detected, registering...");
                    await FirestoreService.addUser(user);
                    userDoc = await FirestoreService.getUser(user.uid);
                    currentUserRole = userDoc?.role || 'user';
                    // Suppressed Welcome Toast here (moved to explicit login)
                } else {
                    // Sync Profile Data for existing users (Auth -> Firestore)
                    // Re-read user.photoURL AFTER possible updateProfile above
                    const freshPhotoURL = auth.currentUser?.photoURL || user.photoURL;
                    const updates = {};
                    if (user.displayName && userDoc.displayName !== user.displayName)
                        updates.displayName = user.displayName;
                    if (freshPhotoURL && userDoc.photoURL !== freshPhotoURL)
                        updates.photoURL = freshPhotoURL;

                    // Update last login time
                    updates.lastLogin = new Date().toISOString();

                    if (Object.keys(updates).length > 0) {
                        console.log("Syncing user profile...", updates);
                        await updateDoc(doc(db, "users", user.uid), updates);
                        userDoc = { ...userDoc, ...updates };

                        // Refresh users map to reflect name change immediately
                        FirestoreService.fetchUsers().then((users) => {
                            state.users = users;
                            renderLogs();
                        });
                    }
                }

                // UI Visibility: Everyone logged in has full access
                if (views.login) views.login.classList.add("hidden");

                // Reveal App directly (No PIN check)
                const appContainer = document.querySelector(".app-container");
                if (appContainer) appContainer.classList.remove("hidden");

                const navSites = document.getElementById("nav-sites");
                if (navSites) navSites.classList.remove("hidden"); // Always show to logged-in users

                // Show loading splash while data loads
                const splash = document.getElementById("loading-splash");
                if (splash) {
                    splash.classList.remove("hidden");
                    const splashText = splash.querySelector("p");
                    if (splashText) splashText.textContent = "กำลังโหลดข้อมูล...";
                }

                // Wait for init (data loading) to complete before hiding splash
                await init();
                renderProfile(user);
                await setupSessionTimeout(); // Start inactivity monitor

                if (splash) {
                    // Small delay for smooth transition
                    setTimeout(() => splash.classList.add("hidden"), 300);
                }
            } else {
                console.log("Auth State Changed: No User");
                currentUserRole = "user";
                if (views.login) views.login.classList.remove("hidden");
                const appContainer = document.querySelector(".app-container");
                if (appContainer) appContainer.classList.add("hidden");
                clearSessionTimeout(); // Stop monitor
                const splash = document.getElementById("loading-splash");
                if (splash) splash.classList.add("hidden");
            }
        } catch (err) {
            console.error("Critical Error in Auth Listener:", err);
            const errCode = err.code || "unknown";
            await showDialog(
                "พบข้อผิดพลาดในการตรวจสอบสิทธิ์ (Auth Error)\n\nCode: " +
                errCode +
                "\nMessage: " +
                err.message,
            );
            const splash = document.getElementById("loading-splash");
            if (splash) splash.classList.add("hidden");
        }
    });
}

// Start the Workflow
initAuthWorkflow();

// --- Session Timeout Logic ---
let idleTimer;
let currentSessionTimeoutMs = 120 * 60 * 1000; // default 2 hours (120 minutes)
let lastIdleStorageUpdate = 0;

function resetIdleTimer() {
    clearTimeout(idleTimer);

    if (!auth.currentUser) return;

    // Throttle localStorage writes
    const now = Date.now();
    if (now - lastIdleStorageUpdate > 10000) {
        localStorage.setItem("sessionLastActive", now.toString());
        lastIdleStorageUpdate = now;
    }

    // Set Timeout
    idleTimer = setTimeout(handleSessionTimeout, currentSessionTimeoutMs);
}

async function handleSessionTimeout() {
    console.log("Session Timeout detected.");
    try {
        localStorage.removeItem("sessionLastActive");

        await FirestoreService.logAction(
            "AUTH",
            "TIMEOUT",
            "Session timed out due to inactivity",
        );
        await signOut(auth);

        const minutes = Math.round(currentSessionTimeoutMs / (60 * 1000));
        let timeStr = `${minutes} นาที`;
        if (minutes >= 60) {
            const hours = minutes / 60;
            if (Number.isInteger(hours)) {
                timeStr = `${hours} ชั่วโมง`;
            } else {
                timeStr = `${hours.toFixed(1)} ชั่วโมง`;
            }
        }

        await showDialog(
            `เซสชันหมดอายุเนื่องจากไม่มีการใช้งานเกิน ${timeStr}\nกรุณาเข้าสู่ระบบใหม่`,
            { title: "Session Expired" },
        );
        window.location.reload();
    } catch (err) {
        console.error("Timeout Logout Error:", err);
    }
}

async function setupSessionTimeout() {
    const user = auth.currentUser;
    if (!user) return;

    let timeoutMs = 120 * 60 * 1000; // default 2 hours
    try {
        const userDoc = await FirestoreService.getUser(user.uid);
        if (userDoc && userDoc.sessionTimeout) {
            timeoutMs = parseInt(userDoc.sessionTimeout, 10) * 60 * 1000;
        }
    } catch (err) {
        console.error("Error loading session timeout setting:", err);
    }
    currentSessionTimeoutMs = timeoutMs;

    // Check persistent timestamp
    const lastActive = parseInt(
        localStorage.getItem("sessionLastActive") || "0",
        10,
    );
    const now = Date.now();

    if (lastActive > 0) {
        const elapsed = now - lastActive;
        if (elapsed > currentSessionTimeoutMs) {
            console.warn("Persistent session expired.");
            await handleSessionTimeout();
            return;
        }
    }

    if (lastActive === 0) {
        localStorage.setItem("sessionLastActive", now.toString());
    }

    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("mousedown", resetIdleTimer);
    window.addEventListener("keypress", resetIdleTimer);
    window.addEventListener("touchmove", resetIdleTimer);
    window.addEventListener("scroll", resetIdleTimer);
    resetIdleTimer();
}

function clearSessionTimeout() {
    clearTimeout(idleTimer);
    localStorage.removeItem("sessionLastActive");

    window.removeEventListener("mousemove", resetIdleTimer);
    window.removeEventListener("mousedown", resetIdleTimer);
    window.removeEventListener("keypress", resetIdleTimer);
    window.removeEventListener("touchmove", resetIdleTimer);
    window.removeEventListener("scroll", resetIdleTimer);
}

// --- State Management ---
let state = {
    isInitialLoading: true,
    sites: [],
    logs: [],
    addressData: [], // Raw JSON data
    currentDeleteId: null, // Track site to delete
    currentDeleteLogId: null, // Track log to delete

    // Pagination State
    isLoadingLogs: false,
    lastLogSnapshot: null,
    hasMoreLogs: false,

    // Calendar Specific State
    calendarLogs: [],
    isCalendarLoading: false,
    currentCalendarMonth: null, // "YYYY-MM"
    globalLogSummary: null, // Cache for accurate totals
};

window.state = state; // Expose for debugging
window.populateSiteFilters = populateSiteFilters; // Expose
window.renderSites = renderSites; // Expose

// --- Firestore Service ---
const FirestoreService = {
    async fetchSites() {
        const q = query(collection(db, "sites"), orderBy("updatedAt", "desc")); // Simplified sort
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },

    async fetchFilteredLogs(filters) {
        try {
            let q = query(collection(db, "logs"));
            const constraints = [];

            if (filters.siteId && filters.siteId !== "all") {
                constraints.push(where("siteId", "==", filters.siteId));
            }

            if (filters.startDate) {
                const startStr = filters.startDate.toISOString().split("T")[0];
                constraints.push(where("date", ">=", startStr));
            }
            if (filters.endDate) {
                const endStr = filters.endDate.toISOString().split("T")[0];
                constraints.push(where("date", "<=", endStr));
            }

            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error("fetchFilteredLogs failed:", e);
            throw e;
        }
    },

    async fetchLogsByMonth(year, month) {
        // month is 0-indexed (0 = Jan)
        const startStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const endStr = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;
        console.log(`[DEBUG] Fetching logs for calendar: ${startStr} to ${endStr}`);
        const q = query(
            collection(db, "logs"),
            where("date", ">=", startStr),
            where("date", "<=", endStr),
            orderBy("date", "asc"),
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },

    async fetchLogs() {
        // Reset state on fresh fetch
        state.hasMoreLogs = false;
        state.lastLogSnapshot = null;
        state.isLoadingLogs = false;

        const q = query(collection(db, "logs"), orderBy("date", "desc"), limit(20));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.docs.length > 0) {
            state.lastLogSnapshot = querySnapshot.docs[querySnapshot.docs.length - 1];
        }
        state.hasMoreLogs = querySnapshot.docs.length === 20;

        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },

    async fetchLogsForSite(siteId) {
        const q = query(collection(db, "logs"), where("siteId", "==", siteId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },

    async fetchGlobalLogCount() {
        const q = query(collection(db, "logs"));
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    },

    async fetchFilteredStats(filters) {
        try {
            let q = query(collection(db, "logs"));
            const constraints = [];

            if (filters.siteId && filters.siteId !== "all") {
                constraints.push(where("siteId", "==", filters.siteId));
            }

            if (filters.startDate) {
                const startStr = filters.startDate.toISOString().split("T")[0];
                constraints.push(where("date", ">=", startStr));
            }
            if (filters.endDate) {
                const endStr = filters.endDate.toISOString().split("T")[0];
                constraints.push(where("date", "<=", endStr));
            }

            // Note: Category and Search aren't easily aggregateable via simple where clauses
            // without complex indexing. For now, we'll prioritize Site and Date.

            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const snapshot = await getAggregateFromServer(q, {
                totalCost: sum("cost"),
                totalCount: count(),
            });

            const summary = snapshot.data();
            return {
                totalCost: summary.totalCost || 0,
                count: summary.totalCount || 0,
            };
        } catch (e) {
            console.warn("[FirestoreService] fetchFilteredStats failed (likely missing index). Falling back to client-side stats calculation.", e);
            return null;
        }
    },

    async fetchMoreLogs() {
        if (!state.lastLogSnapshot || state.isLoadingLogs) return [];
        state.isLoadingLogs = true;

        try {
            const q = query(
                collection(db, "logs"),
                orderBy("date", "desc"),
                startAfter(state.lastLogSnapshot),
                limit(20),
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.docs.length > 0) {
                state.lastLogSnapshot =
                    querySnapshot.docs[querySnapshot.docs.length - 1];
            }
            state.hasMoreLogs = querySnapshot.docs.length === 20;
            state.isLoadingLogs = false;

            return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            state.isLoadingLogs = false;
            throw e;
        }
    },
    // fetchMoreLogs removed

    async addSite(siteData) {
        siteData.updatedAt = serverTimestamp();
        siteData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, "sites"), siteData);
        const siteId = docRef.id;
        await this.logAction("SITE", "ADD", `Added new site: ${siteData.name}`, {
            siteId: siteId,
            data: siteData,
        });
        // Fire notification asynchronously (non-blocking)
        try {
            const notifyNewSite = httpsCallable(functions, 'notifyNewSite');
            notifyNewSite({ siteId: siteId, siteData: siteData }).catch(e => console.warn('notifyNewSite error:', e));
        } catch (e) { console.warn('notifyNewSite init error:', e); }
        return siteId;
    },

    async updateSite(id, siteData) {
        siteData.updatedAt = serverTimestamp();
        const siteRef = doc(db, "sites", id);

        // Fetch previous data for diffing
        let previousData = null;
        try {
            const docSnap = await getDoc(siteRef);
            if (docSnap.exists()) previousData = docSnap.data();
        } catch (e) {
            console.warn("Could not fetch previous site data", e);
        }

        await updateDoc(siteRef, siteData);

        // Write change history to subcollection
        try {
            await this.logSiteHistory(id, siteData, previousData);
        } catch (e) {
            console.warn("Could not write site history:", e);
        }

        await this.logAction("SITE", "EDIT", `Updated site: ${siteData.name}`, {
            siteId: id,
            data: siteData,
            previousData: previousData,
        });
    },

    async logSiteHistory(siteId, newData, oldData) {
        const user = auth.currentUser;
        const SKIP_FIELDS = new Set([
            'updatedAt', 'createdAt', 'maintenancePlans', 'attachments',
            '_cachedSiteName', 'statusHistory'
        ]);

        const FIELD_LABELS = {
            name: 'ชื่อโรงพยาบาล',
            siteCode: 'รหัสสถานที่',
            deviceType: 'ประเภทสัญญา',
            brand: 'ยี่ห้อ',
            model: 'รุ่น',
            serialNumber: 'Serial No.',
            installLocation: 'หน่วยงาน',
            villageName: 'ชื่อหมู่บ้าน',
            subdistrict: 'ตำบล',
            district: 'อำเภอ',
            province: 'จังหวัด',
            picName: 'ผู้ดูแล',
            contactPhone: 'เบอร์โทร',
            maintenanceCycle: 'รอบซ่อมบำรุง (วัน)',
            insuranceStartDate: 'วันเริ่มประกัน',
            insuranceEndDate: 'วันสิ้นสุดประกัน',
            warrantyNumber: 'เลขที่ใบรับประกัน',
            description: 'รายละเอียด',
            latitude: 'Latitude',
            longitude: 'Longitude',
        };

        const changes = [];
        const allKeys = new Set([
            ...Object.keys(newData || {}),
            ...Object.keys(oldData || {})
        ]);

        for (const key of allKeys) {
            if (SKIP_FIELDS.has(key)) continue;
            const oldVal = oldData ? (oldData[key] ?? '') : '';
            const newVal = newData ? (newData[key] ?? '') : '';
            if (String(oldVal) !== String(newVal)) {
                changes.push({
                    field: key,
                    label: FIELD_LABELS[key] || key,
                    from: oldVal || '-',
                    to: newVal || '-',
                });
            }
        }

        if (changes.length === 0) return; // Nothing changed

        const historyRef = collection(db, 'sites', siteId, 'history');
        await addDoc(historyRef, {
            changedBy: user ? (user.displayName || user.email || 'Unknown') : 'Unknown',
            changedById: user ? user.uid : null,
            changedAt: serverTimestamp(),
            changedAtISO: new Date().toISOString(),
            changes,
        });
    },

    async fetchSiteHistory(siteId, limitCount = 20) {
        try {
            const q = query(
                collection(db, 'sites', siteId, 'history'),
                orderBy('changedAt', 'desc'),
                limit(limitCount)
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn('Could not fetch site history:', e);
            return [];
        }
    },

    async deleteSite(id) {
        const docRef = doc(db, "sites", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            await this.logAction("SITE", "DELETE", `Deleted site`, {
                siteId: id,
                data: data,
            });
        }
        await deleteDoc(docRef);
    },

    async deleteLogsBySiteId(siteId) {
        const q = query(collection(db, "logs"), where("siteId", "==", siteId));
        const snap = await getDocs(q);
        const deletions = snap.docs.map(d => deleteDoc(doc(db, "logs", d.id)));
        await Promise.all(deletions);
    },

    // --- User Methods ---
    async addUser(user) {
        try {
            // Safely extract email from user or providerData
            const email =
                user.email ||
                (user.providerData && user.providerData[0]
                    ? user.providerData[0].email
                    : null);

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: email || null,
                displayName: user.displayName || "",
                photoURL: user.photoURL || "",
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                role: 'user', // Default role for new users
            });
        } catch (e) {
            console.error("Error adding user: ", e);
            throw e;
        }
    },

    async getUser(uid) {
        try {
            const docRef = doc(db, "users", uid);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data() : null;
        } catch (e) {
            console.error("Error fetching user: ", e);
            return null;
        }
    },

    async fetchUsers() {
        try {
            const q = query(collection(db, "users"));
            const querySnapshot = await getDocs(q);
            const map = {};
            querySnapshot.forEach((doc) => {
                map[doc.id] = doc.data();
            });
            return map;
        } catch (e) {
            console.warn("fetchUsers error:", e);
            return {};
        }
    },

    async getAllUsers() {
        try {
            // First, get all users without ordering to see what we have
            const q = query(collection(db, "users"));
            const querySnapshot = await getDocs(q);
            const allUsers = querySnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));

            console.log('=== FIRESTORE USERS DEBUG ===');
            console.log('Total documents in users collection:', allUsers.length);
            allUsers.forEach((user, index) => {
                console.log(`Document ${index + 1}:`, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    role: user.role
                });
            });

            // Filter out invalid users (users without email or with clearly invalid data)
            const validUsers = allUsers.filter(user => {
                // Must have a valid email
                if (!user.email || user.email === 'null' || user.email.trim() === '') {
                    console.log('Filtered out (no email):', user.uid, user.displayName);
                    return false;
                }

                // Filter out obvious test/dummy users
                if (user.displayName && user.displayName.includes('แพคอะกินแซบนอน')) {
                    console.log('Filtered out (test user):', user.email);
                    return false;
                }

                return true;
            });

            // Deduplicate by email address
            const uniqueUsersMap = new Map();
            validUsers.forEach(user => {
                const existing = uniqueUsersMap.get(user.email);
                if (!existing) {
                    uniqueUsersMap.set(user.email, user);
                } else {
                    const currentUid = auth.currentUser?.uid;
                    // Keep the one matching current user UID, or the one with displayName, or the higher role
                    const keepNew =
                        (user.uid === currentUid) ||
                        (!existing.displayName && user.displayName) ||
                        (existing.role === 'user' && (user.role === 'admin' || user.role === 'manager'));

                    if (keepNew) {
                        uniqueUsersMap.set(user.email, user);
                    }
                }
            });
            const uniqueUsers = Array.from(uniqueUsersMap.values());

            // Sort by displayName
            uniqueUsers.sort((a, b) => {
                const nameA = (a.displayName || a.email || '').toLowerCase();
                const nameB = (b.displayName || b.email || '').toLowerCase();
                return nameA.localeCompare(nameB, 'th');
            });

            console.log('Unique valid users:', uniqueUsers.length);
            console.log('Unique valid users:', uniqueUsers.map(u => ({ email: u.email, name: u.displayName })));
            console.log('=== END FIRESTORE DEBUG ===');

            return uniqueUsers;
        } catch (e) {
            console.error("Error fetching all users:", e);
            return [];
        }
    },

    async cleanupInvalidUsers() {
        try {
            const q = query(collection(db, "users"));
            const querySnapshot = await getDocs(q);
            const invalidUsers = [];

            querySnapshot.docs.forEach(doc => {
                const data = doc.data();
                // Identify invalid users
                if (!data.email ||
                    data.email === 'null' ||
                    data.email.trim() === '' ||
                    (data.displayName && data.displayName.includes('แพคอะกินแซบนอน'))) {
                    invalidUsers.push({
                        id: doc.id,
                        data: data
                    });
                }
            });

            console.log('Invalid users found:', invalidUsers.length);
            console.log('Invalid users:', invalidUsers.map(u => ({ id: u.id, email: u.data.email, name: u.data.displayName })));

            return invalidUsers;
        } catch (e) {
            console.error("Error checking invalid users:", e);
            return [];
        }
    },

    async deleteInvalidUser(userId) {
        try {
            await deleteDoc(doc(db, "users", userId));
            console.log("Deleted invalid user:", userId);
        } catch (e) {
            console.error("Error deleting invalid user:", e);
            throw e;
        }
    },

    async updateUserRole(userId, role) {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                role: role,
                updatedAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Error updating user role:", e);
            throw e;
        }
    },

    async fetchLogsByMonth(year, month) {
        // month is 0-indexed (0 = Jan)
        // Create range: 1st day of month to last day of month
        // Store dates as YYYY-MM-DD string for lexicographical string comparison in Firestore
        // (Assuming current data model uses YYYY-MM-DD string for 'date' field)

        const startStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;

        // Calculate last day
        const lastDay = new Date(year, month + 1, 0).getDate();
        const endStr = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;

        console.log(`[DEBUG] Fetching logs for calendar: ${startStr} to ${endStr}`);

        const q = query(
            collection(db, "logs"),
            where("date", ">=", startStr),
            where("date", "<=", endStr),
            orderBy("date", "asc"), // Ordered by date for calendar
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },

    async fetchLogsInRange(startDate, endDate) {
        let q = query(collection(db, "logs"), orderBy("date", "desc"));

        // If dates are provided, add filters
        if (startDate || endDate) {
            // Basic date string comparison YYYY-MM-DD
            const constraints = [];
            constraints.push(orderBy("date", "desc"));

            if (startDate) {
                // Assuming startDate is Date object
                const startStr = startDate.toISOString().split("T")[0];
                constraints.push(where("date", ">=", startStr));
            }
            if (endDate) {
                const endStr = endDate.toISOString().split("T")[0];
                constraints.push(where("date", "<=", endStr));
            }
            q = query(collection(db, "logs"), ...constraints);
        } else {
            // No date filter = All logs?
            // Warning: high read cost. Maybe limit to last 1000 or require date?
            // For now, let's allow it but we might want a safety limit if DB is huge.
            // q = query(collection(db, "logs"), orderBy("date", "desc"), limit(2000));
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },

    // Generate unique case ID (CASE-XXXXX format with random alphanumeric)
    generateCaseId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let caseId = 'CASE-';
        for (let i = 0; i < 5; i++) {
            caseId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return caseId;
    },

    async addLog(logData) {
        // Generate case ID if not provided
        if (!logData.caseId) {
            logData.caseId = this.generateCaseId();
        }
        const docRef = await addDoc(collection(db, "logs"), logData);
        const logId = docRef.id;
        await this.logAction("LOG", "ADD", `Added logs: ${logData.objective}`, {
            logId: logId,
            caseId: logData.caseId,
            data: { ...logData, _cachedSiteName: (state.sites.find(s => s.id === logData.siteId) || {}).name || '-' },
        });
        // Fire notification asynchronously (non-blocking)
        try {
            const notifyNewMARecord = httpsCallable(functions, 'notifyNewMARecord');
            notifyNewMARecord({ logId: logId, logData: logData }).catch(e => console.warn('notifyNewMARecord error:', e));
        } catch (e) { console.warn('notifyNewMARecord init error:', e); }
        return logId;
    },

    async updateLog(id, logData) {
        const logRef = doc(db, "logs", id);

        // Fetch previous data for logging and status-change notification
        let previousData = null;
        try {
            const docSnap = await getDoc(logRef);
            if (docSnap.exists()) previousData = docSnap.data();
        } catch (e) {
            console.warn("Could not fetch previous log data", e);
        }
        const beforeStatus = previousData ? previousData.status : undefined;

        // Overwrite Recorder with Current User
        if (auth.currentUser) {
            logData.recordedBy =
                auth.currentUser.displayName || auth.currentUser.email;
            logData.recorderId = auth.currentUser.uid;
        }

        await updateDoc(logRef, logData);
        await this.logAction("LOG", "EDIT", `Updated log: ${logData.objective}`, {
            logId: id,
            data: { ...logData, _cachedSiteName: (state.sites.find(s => s.id === logData.siteId) || {}).name || '-' },
            previousData: previousData,
        });
        // Fire status-change notification asynchronously (non-blocking)
        try {
            const notifyMAStatusUpdate = httpsCallable(functions, 'notifyMAStatusUpdate');
            notifyMAStatusUpdate({ logId: id, beforeStatus: beforeStatus, afterData: logData }).catch(e => console.warn('notifyMAStatusUpdate error:', e));
        } catch (e) { console.warn('notifyMAStatusUpdate init error:', e); }
    },

    async deleteLog(id) {
        const docRef = doc(db, "logs", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            await this.logAction("LOG", "DELETE", `Deleted log`, {
                logId: id,
                data: data,
            });
        }
        await deleteDoc(docRef);
    },

    async deleteAllLogs() {
        const logsRef = collection(db, "logs");
        const snapshot = await getDocs(logsRef);
        console.log(`Deleting ${snapshot.size} logs...`);
        const batchPromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(batchPromises);
        console.log("All logs deleted.");
    },

    // --- Action Logging ---
    async logAction(category, actionType, description, metadata = {}) {
        try {
            const user = auth.currentUser;
            const logEntry = {
                category: category, // SITE, LOG, AUTH, BIN, USER
                actionType: actionType,
                description: description,
                performedBy: user ? user.uid : "anonymous",
                performerName: user ? user.displayName || user.email : "System",
                timestamp: serverTimestamp(), // Use Server Time for ordering
                createdAt: new Date().toISOString(), // Local backup
                metadata: metadata,
            };
            // Fire and forget (don't await strictly if not needed, but good to ensure write)
            await addDoc(collection(db, "action_logs"), logEntry);
        } catch (e) {
            console.warn("Failed to log action:", e);
        }
    },

    async uploadFile(file, path, onProgress) {
        try {
            const storageRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(storageRef, file);

            return new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        if (onProgress) {
                            onProgress(progress);
                        }
                    },
                    (error) => {
                        console.error("Failed to upload file:", error);
                        reject(error);
                    },
                    async () => {
                        try {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(downloadURL);
                        } catch (e) {
                            reject(e);
                        }
                    }
                );
            });
        } catch (e) {
            console.error("Failed to upload file:", e);
            throw e;
        }
    },

    // --- Notification Settings Methods ---
    async updateNotificationSettings(settings) {
        try {
            const settingsRef = doc(db, "settings", "notifications");
            await setDoc(settingsRef, settings, { merge: true });
            console.log("Notification settings updated successfully");
        } catch (e) {
            console.error("Error updating notification settings:", e);
            throw e;
        }
    },

    async getNotificationSettings() {
        try {
            const settingsRef = doc(db, "settings", "notifications");
            const docSnap = await getDoc(settingsRef);
            return docSnap.exists() ? docSnap.data() : null;
        } catch (e) {
            console.error("Error fetching notification settings:", e);
            return null;
        }
    },

    // --- Company Settings Methods ---
    async updateCompanySettings(settings) {
        try {
            const ref = doc(db, "settings", "company");
            await setDoc(ref, settings, { merge: true });
        } catch (e) {
            console.error("Error updating company settings:", e);
            throw e;
        }
    },

    async getCompanySettings() {
        try {
            const ref = doc(db, "settings", "company");
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() : {
                name: 'บริษัท ไบโอ อินโน เทค จำกัด',
                hotline: '02-152-5405',
                address: '36/41 หมู่ 13 ต.บึงคำพร้อย อ.ลำลูกกา จ.ปทุมธานี 12150'
            };
        } catch (e) {
            console.error("Error fetching company settings:", e);
            return { name: 'บริษัท ไบโอ อินโน เทค จำกัด', hotline: '', address: '' };
        }
    },

    async deleteNotificationSettings() {
        try {
            const settingsRef = doc(db, "settings", "notifications");
            await deleteDoc(settingsRef);
            console.log("Notification settings deleted successfully");
        } catch (e) {
            console.error("Error deleting notification settings:", e);
            throw e;
        }
    },
};

// --- DOM Elements ---
const views = {
    admin: document.getElementById("admin-view"),
    engineer: document.getElementById("engineer-view"),
    plan: document.getElementById("plan-view"),
    login: document.getElementById("login-view"),
    profile: document.getElementById("profile-view"),
    inventory: document.getElementById("inventory-view"),
};

// Force hidden state on load just in case HTML/CSS didn't catch it
if (document.querySelector(".app-container")) {
    document.querySelector(".app-container").classList.add("hidden");
}

const modals = {
    addSite: "modal-add-site",
    logMaintenance: "modal-log-maintenance",
    deleteConfirm: "modal-delete-confirm",
    siteDetails: "modal-site-details",
    logDetails: "modal-log-details",
};

const grids = {
    sites: document.getElementById("sites-grid"),
    logs: document.getElementById("logs-feed"),
};

const selects = {
    filterInput: document.getElementById("site-filter-input"),
    filterHidden: document.getElementById("site-filter"), // Stores selected site filter ID
    logSiteInput: document.getElementById("log-site-input"),
    logSiteHidden: document.getElementById("log-site-select"), // Stores ID

    filterCategory: document.getElementById("filter-category"),
    filterStart: document.getElementById("filter-start-date"),
    filterEnd: document.getElementById("filter-end-date"),
};

const addressInputs = {
    province: document.getElementById("input-province"),
    amphoe: document.getElementById("input-amphoe"),
    tambon: document.getElementById("input-tambon"),
    moo: document.getElementById("input-moo"),
    zipcode: document.getElementById("input-zipcode"),
    // Dropdowns (divs)
    provinceDropdown: document.getElementById("dropdown-province"),
    amphoeDropdown: document.getElementById("dropdown-amphoe"),
    tambonDropdown: document.getElementById("dropdown-tambon"),
};

// --- Initialization ---
let isAppInitialized = false;

// --- Real-time Listener Unsubscribe Functions ---
let _unsubscribeSites = null;
let _unsubscribeLogs = null;
let _realtimeRenderDebounce = null;

/**
 * Debounced render: waits 300ms after last snapshot before re-rendering.
 * Prevents excessive renders when multiple documents change at once.
 */
function _scheduleRealtimeRender() {
    clearTimeout(_realtimeRenderDebounce);
    _realtimeRenderDebounce = setTimeout(() => {
        try {
            populateSiteFilters();
            updateLogDetailsDatalist();
            renderAll();
            // Also refresh calendar if in calendar view
            if (calendarState && calendarState.view === 'calendar') {
                fetchAndRenderCalendar();
            }
        } catch (e) {
            console.warn('[RealtimeListener] render error:', e);
        }
    }, 300);
}

/**
 * Sets up onSnapshot real-time listeners for sites and logs collections.
 * This makes the UI auto-update whenever any user saves data — no F5 needed.
 */
function setupRealtimeListeners() {
    // Cleanup any previous listeners first
    teardownRealtimeListeners();

    console.log('[RealtimeListener] Setting up real-time listeners...');

    let sitesReady = false;
    let logsReady = false;

    // --- Sites Listener ---
    const sitesQuery = query(collection(db, 'sites'), orderBy('updatedAt', 'desc'));
    _unsubscribeSites = onSnapshot(sitesQuery, (snapshot) => {
        // Skip the very first snapshot (already loaded by refreshData in init)
        if (!sitesReady) {
            sitesReady = true;
            return;
        }
        console.log('[RealtimeListener] Sites updated, re-rendering...');
        state.sites = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        _scheduleRealtimeRender();
    }, (error) => {
        console.warn('[RealtimeListener] Sites listener error:', error);
    });

    // --- Logs Listener ---
    const logsQuery = query(collection(db, 'logs'), orderBy('date', 'desc'), limit(20));
    _unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
        // Skip the very first snapshot (already loaded by refreshData in init)
        if (!logsReady) {
            logsReady = true;
            return;
        }
        console.log('[RealtimeListener] Logs updated, re-rendering...');
        state.logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Update pagination cursor
        if (snapshot.docs.length > 0) {
            state.lastLogSnapshot = snapshot.docs[snapshot.docs.length - 1];
        }
        state.hasMoreLogs = snapshot.docs.length === 20;
        _scheduleRealtimeRender();
    }, (error) => {
        console.warn('[RealtimeListener] Logs listener error:', error);
    });

    console.log('[RealtimeListener] Real-time listeners active.');
}

/**
 * Cleans up real-time listeners (call on logout).
 */
function teardownRealtimeListeners() {
    if (_unsubscribeSites) {
        _unsubscribeSites();
        _unsubscribeSites = null;
    }
    if (_unsubscribeLogs) {
        _unsubscribeLogs();
        _unsubscribeLogs = null;
    }
    clearTimeout(_realtimeRenderDebounce);
    console.log('[RealtimeListener] Listeners torn down.');
}

// --- Phone Input Handling ---
window.itiInstances = {
    profile: null,
    site: null,
};

// --- Global State for Phone Inputs ---
window.itiInstances = {};

// --- Phone Formatting Helper ---
function setupStrictPhoneFormat(input) {
    if (!input) return;

    input.addEventListener("input", function (e) {
        // Allow digits only, remove other chars
        let rawValue = e.target.value.replace(/\D/g, "");

        // Format into groups of 3 digits separated by hyphens (no length limit)
        const parts = [];
        for (let i = 0; i < rawValue.length; i += 3) {
            parts.push(rawValue.substring(i, i + 3));
        }
        const formattedValue = parts.join('-');

        e.target.value = formattedValue;
    });
}

function setupPhoneInputs() {
    // 1. Profile Phone
    const profileInput = document.getElementById("profile-phone");
    if (profileInput) {
        setupStrictPhoneFormat(profileInput); // Add formatting
        if (!window.itiInstances.profile) {
            window.itiInstances.profile = window.intlTelInput(profileInput, {
                initialCountry: "th",
                onlyCountries: ["th"],
                allowDropdown: false,
                utilsScript:
                    "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
                autoInsertDialCode: true,
                nationalMode: true,
            });
        }
    }

    // 2. Site Contact Phone
    const siteInput = document.getElementById("site-contact-phone");
    if (siteInput) {
        setupStrictPhoneFormat(siteInput); // Add formatting
        if (!window.itiInstances.site) {
            window.itiInstances.site = window.intlTelInput(siteInput, {
                initialCountry: "th",
                onlyCountries: ["th"],
                allowDropdown: false,
                utilsScript:
                    "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
                autoInsertDialCode: true,
                nationalMode: true,
            });
        }
    }
}

// --- Email Validation Helper ---
function validateEmail(email) {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

// --- Strict Thai Phone Validation Helper ---
function validateThaiPhone(inputElement, itiInstance) {
    if (!itiInstance || !inputElement.value) return true; // Allow empty if handled elsewhere

    // 1. Get national number (e.g. 081 234 5678)
    // We can rely on input value if nationalMode is true
    const rawValue = inputElement.value.replace(/\D/g, ""); // Digits only

    // 2. Strict Rules:
    // - Must start with '0'
    // - Must be exactly 10 digits
    if (rawValue.length !== 10) return false;
    if (!rawValue.startsWith("0")) return false;

    // 3. Lib Verification (Backup)
    if (!itiInstance.isValidNumber()) return false;

    return true;
}

async function init() {
    setupPhoneInputs();
    if (isAppInitialized) {
        console.log("init() already called, skipping");
        return;
    }
    console.log("init() called");
    isAppInitialized = true;

    try {
        // Set initial view immediately (UI First) - Restore state
        const savedView = localStorage.getItem("activeView");
        const allowedViews = [
            "admin-view",
            "engineer-view",
            "plan-view",
            "profile-view",
        ];
        const initialView = allowedViews.includes(savedView)
            ? savedView
            : "admin-view";
        switchView(initialView);

        await loadAddressData();
        setupEventListeners();

        setupCustomNameLogic(); // Initialize custom name logic
        setupSiteManagerFilters();

        // Restore Log View Sub-state
        const savedLogView = localStorage.getItem("activeLogView");
        if (
            savedLogView &&
            (savedLogView === "list" || savedLogView === "calendar")
        ) {
            switchLogView(savedLogView);
        }

        initSiteAutocompletes(); // Init Site & Details Autocompletes
        updateSiteFieldDataLists();
        initCalendarControls();
        setupAgencySelect(); // Load agency dropdown
        await refreshData();
        // Start real-time listeners AFTER initial data load
        setupRealtimeListeners();
        console.log("init() complete");

        // Startup check: create MA cases for any site that qualifies but has none yet.
        // Safe now because checkAndAutoCreateMaintenanceCase uses fresh Firestore data.
        // _autoMaStartupDone prevents duplicate runs within the same page session.
        if (!window._autoMaStartupDone) {
            window._autoMaStartupDone = true;
            setTimeout(() => runAutoMaintenanceCheckForAllSites(), 2000);
        }

        // Check for URL parameters to open specific views
        handleUrlParameters();
    } catch (err) {
        console.error("Error in init():", err);
        isAppInitialized = false; // Reset on error to allow retry
    }
}

// Handle URL parameters to open specific views
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for siteId parameter to open site detail modal
    const siteId = urlParams.get('siteId');
    if (siteId) {
        console.log('Opening site detail from URL parameter:', siteId);

        // Wait for data to be loaded, then open the modal
        const checkAndOpen = () => {
            if (state.sites && state.sites.length > 0) {
                const site = state.sites.find(s => s.id === siteId);
                if (site) {
                    viewSiteDetails(siteId);
                    // Clear the URL parameter after opening
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    console.warn('Site not found:', siteId);
                    showToast('ไม่พบข้อมูลสถานที่ที่ระบุ', 'error');
                    // Clear the URL parameter
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } else {
                // Data not loaded yet, try again
                setTimeout(checkAndOpen, 200);
            }
        };

        checkAndOpen();
    }

    // Check for logId parameter to open MA case detail modal
    const logId = urlParams.get('logId');
    if (logId) {
        console.log('Opening MA case detail from URL parameter:', logId);

        // Wait for data to be loaded, then open the modal
        const checkAndOpen = () => {
            if (state.logs && state.logs.length > 0) {
                const log = state.logs.find(l => l.id === logId);
                if (log) {
                    viewLogDetails(logId);
                    // Clear the URL parameter after opening
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    console.warn('Log not found:', logId);
                    showToast('ไม่พบข้อมูลเคสที่ระบุ', 'error');
                    // Clear the URL parameter
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } else {
                // Data not loaded yet, try again
                setTimeout(checkAndOpen, 200);
            }
        };

        checkAndOpen();
    }
}

function initCalendarControls() {
    // Populate Months according to system locale
    const monthSelect = document.getElementById("filter-cal-month");
    monthSelect.innerHTML = "";
    for (let i = 0; i < 12; i++) {
        const date = new Date(2000, i, 1); // Use any year, just need month names
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = date.toLocaleDateString(undefined, { month: 'long' });
        monthSelect.appendChild(opt);
    }

    // Populate Years (Current -10 to +10) according to system locale
    const yearSelect = document.getElementById("filter-cal-year");
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = "";
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
        const date = new Date(i, 0, 1);
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = date.toLocaleDateString(undefined, { year: 'numeric' });
        yearSelect.appendChild(opt);
    }

    // Set initial values
    const today = new Date();
    yearSelect.value = today.getFullYear();
    monthSelect.value = today.getMonth();

    // Listeners
    yearSelect.addEventListener("change", updateCalendarFromControls);
    monthSelect.addEventListener("change", updateCalendarFromControls);
}

function updateCalendarFromControls() {
    const year = parseInt(document.getElementById("filter-cal-year").value);
    const month = parseInt(document.getElementById("filter-cal-month").value);

    // Update state
    calendarState.currentDate = new Date(year, month, 1);

    // Render
    renderCalendar();
}

async function refreshData() {
    // Show loading state if needed
    try {
        const [sites, logs, users] = await Promise.all([
            FirestoreService.fetchSites(),
            FirestoreService.fetchLogs(),
            FirestoreService.fetchUsers(),
        ]);
        state.sites = sites;
        state.logs = logs;
        state.users = users;

        populateSiteFilters(); // Populate filters after loading sites
        updateLogDetailsDatalist(); // Populate autocomplete for line items

        state.isInitialLoading = false;
        renderAll();
    } catch (error) {
        console.error("Error fetching data:", error);
        await showDialog("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + error.message);
    }
}

// --- Data Wipe Helper (Via Console) ---
window.wipeAllDataExceptSites = async function () {
    if (
        !confirm(
            "WARNING: This will DELETE ALL logs, action history, and empty the recycle bin. Sites and Users will remain. Are you sure?",
        )
    )
        return;

    // Show splash manually
    const loading = document.getElementById("loading-splash");
    if (loading) {
        loading.classList.remove("hidden");
        const p = loading.querySelector("p");
        if (p) p.textContent = "Waping Data...";
    }

    try {
        console.log("--- STARTING WIPE ---");

        console.log("1. Deleting Maintenance Logs...");
        await FirestoreService.deleteAllLogs();

        console.log("--- WIPE COMPLETE ---");
        alert("Success: All data (except Sites/Users) has been wiped.");
        window.location.reload();
    } catch (e) {
        console.error("Wipe Failed:", e);
        alert("Error during wipe: " + e.message);
        if (loading) loading.classList.add("hidden");
    }
};

// --- Cleanup Duplicate Auto-MA Cases (Via Console) ---
// Usage: await cleanupDuplicateMACases()
window.cleanupDuplicateMACases = async function (dryRun = false) {
    console.log(`[Cleanup] Starting duplicate MA case cleanup (dryRun=${dryRun})...`);

    try {
        // Fetch ALL logs fresh from Firestore
        const { collection: col, getDocs: gd, query: q } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js').catch(() => ({ collection: null }));

        // Use the already-imported Firestore functions via FirestoreService
        const allLogs = await FirestoreService.fetchLogs();
        console.log(`[Cleanup] Fetched ${allLogs.length} total logs`);

        // Find auto-created MA cases: category='บำรุงรักษาตามรอบ', recordedBy='System', status='Open'
        const autoMACases = allLogs.filter(l =>
            l.category === 'บำรุงรักษาตามรอบ' &&
            l.recordedBy === 'System' &&
            l.status === 'Open'
        );
        console.log(`[Cleanup] Found ${autoMACases.length} auto-created open MA cases`);

        // Group by siteId + date key
        const groups = {};
        for (const log of autoMACases) {
            const key = `${log.siteId}__${log.date}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(log);
        }

        // Find groups with duplicates
        const duplicateGroups = Object.entries(groups).filter(([, logs]) => logs.length > 1);
        console.log(`[Cleanup] Found ${duplicateGroups.length} duplicate group(s)`);

        if (duplicateGroups.length === 0) {
            console.log('[Cleanup] No duplicates found. Nothing to delete.');
            showToast('ไม่พบเคสซ้ำ', 'success');
            return { deleted: 0, kept: 0 };
        }

        let totalDeleted = 0;
        let totalKept = 0;

        for (const [key, logs] of duplicateGroups) {
            // Sort by timestamp ascending → keep the OLDEST (first auto-created), delete the rest
            logs.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
            const keep = logs[0];
            const toDelete = logs.slice(1);

            const site = state.sites.find(s => s.id === keep.siteId);
            const siteName = site ? (site.name || site.id) : keep.siteId;
            console.log(`[Cleanup] Group "${siteName} / ${keep.date}": keeping ${keep.id}, deleting ${toDelete.length} duplicate(s)`);

            if (!dryRun) {
                for (const dup of toDelete) {
                    try {
                        // Direct Firestore delete (bypassing audit log for bulk cleanup)
                        const { doc: docFn, deleteDoc: delDoc } = window._firestoreExports || {};
                        if (delDoc && docFn) {
                            await delDoc(docFn(db, 'logs', dup.id));
                        } else {
                            // Fallback to FirestoreService.deleteLog
                            await FirestoreService.deleteLog(dup.id);
                        }
                        console.log(`[Cleanup]   Deleted ${dup.id}`);
                        totalDeleted++;
                    } catch (delErr) {
                        console.error(`[Cleanup]   Failed to delete ${dup.id}:`, delErr);
                    }
                }
            } else {
                console.log(`[Cleanup]   [DRY RUN] Would delete: ${toDelete.map(d => d.id).join(', ')}`);
                totalDeleted += toDelete.length;
            }
            totalKept++;
        }

        const msg = dryRun
            ? `[DRY RUN] จะลบ ${totalDeleted} เคสซ้ำจาก ${duplicateGroups.length} กลุ่ม`
            : `ลบเคสซ้ำสำเร็จ: ${totalDeleted} รายการจาก ${duplicateGroups.length} กลุ่ม`;
        console.log(`[Cleanup] Done. ${msg}`);
        showToast(msg, dryRun ? 'info' : 'success', 6000);

        if (!dryRun && totalDeleted > 0) {
            await refreshData();
        }

        return { deleted: totalDeleted, kept: totalKept, groups: duplicateGroups.length };
    } catch (err) {
        console.error('[Cleanup] Error:', err);
        showToast('เกิดข้อผิดพลาดระหว่างทำความสะอาดข้อมูล: ' + err.message, 'error', 6000);
        throw err;
    }
};


// State for Calendar
let calendarState = {
    view: "list", // 'list' or 'calendar'
    currentDate: new Date(),
    selectedDate: null,
};

// --- Google Map State ---
let siteMap = null;
let siteMarker = null;

function initSiteMap() {
    const mapContainer = document.getElementById("map-preview");
    if (!mapContainer) return;

    // Show container
    mapContainer.style.display = "block";

    if (typeof google === "undefined" || !google.maps) {
        console.warn("Google Maps API not loaded yet.");
        return;
    }

    if (!siteMap) {
        // Default to Bangkok if no location
        const defaultCenter = { lat: 13.7563, lng: 100.5018 };

        siteMap = new window.google.maps.Map(mapContainer, {
            center: defaultCenter,
            zoom: 10,
            mapTypeControl: false,
            streetViewControl: false,
            mapId: "DEMO_MAP_ID", // Required for AdvancedMarkerElement
        });

        // Use AdvancedMarkerElement (replaces deprecated google.maps.Marker)
        const { AdvancedMarkerElement } = google.maps.marker;
        siteMarker = new AdvancedMarkerElement({
            position: defaultCenter,
            map: siteMap,
            gmpDraggable: true,
        });

        // Handle marker drag
        siteMarker.addListener("dragend", function () {
            const pos = siteMarker.position;
            if (pos) {
                // AdvancedMarkerElement position is a LatLng object, use .lat() and .lng() methods
                updateLocationUrlInput(pos.lat(), pos.lng());
            }
        });

        // Handle map click to move marker
        siteMap.addListener("click", function (e) {
            if (e.latLng) {
                siteMarker.position = e.latLng;
                updateLocationUrlInput(e.latLng.lat(), e.latLng.lng());
            }
        });
    } else {
        // Trigger resize just in case container changed visibility
        window.google.maps.event.trigger(siteMap, "resize");
    }

    // Listen to manual URL input changes
    const urlInput = document.getElementById("input-location-url");
    if (urlInput && !urlInput.dataset.listenerAdded) {
        urlInput.dataset.listenerAdded = "true";
        urlInput.addEventListener("input", (e) => {
            const coords = parseLocationUrl(e.target.value);
            if (coords && siteMap && siteMarker) {
                const newPos = new window.google.maps.LatLng(coords.lat, coords.lng);
                siteMap.setCenter(newPos);
                siteMap.setZoom(15);
                siteMarker.position = newPos;
            }
        });
    }
}

function updateLocationUrlInput(lat, lng) {
    const input = document.getElementById("input-location-url");
    if (input) {
        input.value = `https://maps.google.com/?q=${lat},${lng}`;
    }
}

function parseLocationUrl(url) {
    if (!url) return null;
    try {
        // Try to match standard Google Maps q=lat,lon format
        let match = url.match(/q=([-+]?\d*\.\d+|\d+),\s*([-+]?\d*\.\d+|\d+)/);
        if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };

        // Try to match @lat,lon format
        match = url.match(/@([-+]?\d*\.\d+|\d+),\s*([-+]?\d*\.\d+|\d+)/);
        if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    } catch (e) {
        console.warn("Could not parse coordinates from URL", url);
    }
    return null;
}

// --- Currency Utils ---

// --- Currency Utils ---
function formatCurrency(value) {
    if (value === "" || value === null || value === undefined) return "";
    const formatted = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
    return formatted + ' บาท';
}

function parseCurrency(str) {
    if (typeof str === "number") return str;
    if (!str) return 0;
    // Remove anything that isn't a digit, dot, or minus
    const cleanStr = str.replace(/[^0-9.-]/g, "");
    return parseFloat(cleanStr) || 0;
}

// Helper for consistent site colors
const getSiteColor = (name) => {
    const colors = [
        "#3b82f6", // blue-500
        "#10b981", // emerald-500
        "#8b5cf6", // violet-500
        "#f59e0b", // amber-500
        "#f43f5e", // rose-500
        "#06b6d4", // cyan-500
        "#6366f1", // indigo-500
        "#14b8a6", // teal-500
        "#d946ef", // fuchsia-500
        "#f97316", // orange-500
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

// --- Setup Generic Autocomplete ---
// Modified to calculate remaining time from NOW to End Date
function calculateDuration(startDateStr, endDateStr) {
    if (!endDateStr) return null;
    const now = new Date();
    const end = new Date(endDateStr);

    // Reset hours to ensure clean day calculation
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // FIX: Detect Buddhist Year (BE) and convert to Christian Year (CE)
    // Heuristic: If year > 2400, assume it's BE (Current BE is ~2567)
    if (end.getFullYear() > 2400) {
        end.setFullYear(end.getFullYear() - 543);
    }

    if (isNaN(end)) return null;

    if (end < now) {
        return "หมดอายุสัญญา";
    }

    let years = end.getFullYear() - now.getFullYear();
    let months = end.getMonth() - now.getMonth();
    let days = end.getDate() - now.getDate();

    if (days < 0) {
        // Borrow days from previous month
        const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
        days += prevMonth.getDate();
        months--;
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} ปี`);
    if (months > 0) parts.push(`${months} เดือน`);
    // Days removed as per user request
    // if (days > 0) parts.push(`${days} วัน`);

    if (parts.length === 0) {
        // If remaining is less than a month (but not expired), show "< 1 เดือน" or similar?
        // Or if it was just days, it might show empty.
        // Let's check logic: logic borrows days to months, so months calculation is accurate.
        // If 0 years 0 months but 20 days -> parts empty.
        // Should we display something?
        // User requested ONLY year and month. If it's less than a month, maybe "น้อยกว่า 1 เดือน" or just "0 เดือน"?
        // Let's default to "น้อยกว่า 1 เดือน" if it's not expired but parts is empty.
        return "น้อยกว่า 1 เดือน";
    }

    return "เหลือ " + parts.join(" ");
}

function setupAutocomplete(
    inputId,
    dropdownId,
    getItems,
    onSelect,
    placeholder = "ค้นหา...",
    strict = true,
    minChars = 1,
) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    if (!input || !dropdown) return;

    // Get the wrapper element
    const wrapper = input.closest('.autocomplete-wrapper');

    const renderDropdown = (filterText = "") => {
        const items = getItems(); // Should return string array

        // Require minimum characters before showing dropdown
        if (filterText.trim().length < minChars) {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
            return;
        }

        const matches = items.filter((a) =>
            a.toLowerCase().includes(filterText.toLowerCase()),
        ).slice(0, 50);

        dropdown.innerHTML = "";
        if (matches.length === 0) {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
            return;
        }

        matches.forEach((item) => {
            const div = document.createElement("div");
            div.className = "autocomplete-item";
            div.textContent = item;
            div.onclick = () => {
                input.value = item;
                dropdown.classList.add("hidden");
                if (wrapper) wrapper.classList.remove("active");
                if (onSelect) onSelect(item);
            };
            dropdown.appendChild(div);
        });

        dropdown.classList.remove("hidden");
        if (wrapper) wrapper.classList.add("active");
    };

    input.addEventListener("input", (e) => {
        renderDropdown(e.target.value);
    });

    input.addEventListener("focus", () => {
        renderDropdown(input.value);
    });

    input.addEventListener("blur", () => {
        setTimeout(async () => {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");

            // Validate input against the exact list from the API
            if (strict && input.value.trim() !== "") {
                const items = getItems();
                if (!items.includes(input.value)) {
                    input.value = "";
                    await showDialog("กรุณาเลือกข้อมูลจากรายการที่แสดงให้เท่านั้น", {
                        title: "ข้อมูลไม่ถูกต้อง",
                    });

                    // Trigger input event to clear any dependent logic if necessary
                    input.dispatchEvent(new Event("input"));
                }
            }
        }, 200);
    });
}

async function handleProvinceSelect(provinceName) {
    // Clear downstream
    addressInputs.amphoe.value = "";
    addressInputs.amphoe.disabled = false;
    addressInputs.tambon.value = "";
    addressInputs.tambon.disabled = true; // wait for amphoe

    // Clear agencies until district is selected
    const select = document.getElementById("input-agency");
    if (select) {
        select.innerHTML = '<option value="">กรุณาเลือกอำเภอก่อน</option>';
    }

    updateSiteName();
}

async function handleAmphoeSelect(amphoeName) {
    const provinceName = addressInputs.province.value;
    if (!provinceName) return;

    addressInputs.tambon.value = "";
    addressInputs.tambon.disabled = false;

    // Filter agencies by province and district
    await filterAgenciesByLocation(provinceName, amphoeName);

    updateSiteName();
}

function handleTambonSelect(tambonName) {
    const provinceName = addressInputs.province.value;
    const amphoeName = addressInputs.amphoe.value;

    if (provinceName && amphoeName) {
        const entry = state.addressData.find(
            (d) =>
                d.province === provinceName &&
                d.amphoe === amphoeName &&
                d.district === tambonName,
        );
        if (entry && addressInputs.zipcode) {
            addressInputs.zipcode.value = entry.zipcode;
        }
    }
    updateSiteName();
}

// Data Getters for Autocomplete
function getProvinces() {
    return state.uniqueProvinces;
}

function getAmphoes() {
    const provinceName = addressInputs.province.value;
    if (!provinceName) return [];
    return [
        ...new Set(
            state.addressData
                .filter((d) => d.province === provinceName)
                .map((d) => d.amphoe),
        ),
    ].sort();
}

function getTambons() {
    const provinceName = addressInputs.province.value;
    const amphoeName = addressInputs.amphoe.value;
    if (!provinceName || !amphoeName) return [];

    // Removed zipcode filtering as it restricts Tambon selection when editing a site.
    return [
        ...new Set(
            state.addressData
                .filter((d) => d.province === provinceName && d.amphoe === amphoeName)
                .map((d) => d.district),
        ),
    ].sort();
}

// --- Init Address --
// call this in init() or loadAddressData
function initAddressAutocompletes() {
    setupAutocomplete(
        "input-province",
        "dropdown-province",
        getProvinces,
        handleProvinceSelect,
        "ค้นหา...",
        true,
        0,
    );
    setupAutocomplete(
        "input-amphoe",
        "dropdown-amphoe",
        getAmphoes,
        handleAmphoeSelect,
        "ค้นหา...",
        true,
        0,
    );
    setupAutocomplete(
        "input-tambon",
        "dropdown-tambon",
        getTambons,
        handleTambonSelect,
        "ค้นหา...",
        true,
        0,
    );

    // Keep zipcode logic?
    // The existing 'input' listener works if fields are inputs.
}

// --- Init Site Autocompletes ---
function initSiteAutocompletes() {
    // Hospital autocomplete
    initHospitalAutocomplete();
    const siteFilterInput = document.getElementById("site-filter-input");
    if (siteFilterInput) {
        siteFilterInput.addEventListener("input", () => {
            const filterHidden = document.getElementById("site-filter");
            if (filterHidden) {
                filterHidden.value = "all";
            }
            renderCurrentView();
        });
    }

    // 2. Log Maintenance Site Select
    setupAutocomplete(
        "log-site-input",
        "dropdown-log-site",
        () => state.sites.map((s) => (s.siteCode ? `${s.siteCode} - ${s.name}` : s.name)).sort(),
        (displayName) => {
            const site = state.sites.find((s) => {
                const display = s.siteCode ? `${s.siteCode} - ${s.name}` : s.name;
                return display === displayName;
            });
            if (site && selects.logSiteHidden) {
                selects.logSiteHidden.value = site.id;
            }
        },
        "ค้นหาอุปกรณ์...",
        true,
        0,
    );

    // 3. Log Maintenance Details Autocomplete (New)
    setupAutocomplete(
        "log-details-input",
        "dropdown-log-details",
        () => {
            // Get unique details from all logs
            const details = state.logs
                .map((l) => l.details)
                .filter((d) => d) // Remove null/undefined/empty
                .map((d) => d.trim());
            return [...new Set(details)].sort();
        },
        (val) => {
            console.log("Selected detail:", val);
        },
        "ค้นหา...",
        false, // strict = false for details
    );

    // Removed deprecated input-agency setup since it's now a native select
}

// --- Auto-populate Line Items Datalist ---
function updateLogDetailsDatalist() {
    const datalist = document.getElementById("log-details-list");
    if (!datalist) return;

    // Collect unique items from lineItems across all logs
    const items = new Set();
    state.logs.forEach(log => {
        if (log.lineItems && log.lineItems.length > 0) {
            log.lineItems.forEach(li => {
                if (li.item && li.item.trim() !== "" && !li.item.includes("ซ่อมบำรุงตามรอบ") && !li.item.includes("Maintenance Cycle")) {
                    items.add(li.item.trim());
                }
            });
        }
    });

    datalist.innerHTML = Array.from(items)
        .sort()
        .map(item => `<option value="${item.replace(/"/g, "&quot;")}">`)
        .join("");
}

// --- View Actions ---
function switchView(viewName) {
    if (viewName !== "login-view") {
        localStorage.setItem("activeView", viewName);
    }
    document.querySelectorAll(".nav-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.view === viewName);
    });

    Object.values(views).forEach((el) => {
        if (el) el.classList.remove("active");
    });

    if (views.admin && viewName === "admin-view") {
        views.admin.classList.add("active");
        // Re-render sites & map so the SVG uses correct container dimensions
        // (fixes dashboard sizing when navigating back from a different view after F5)
        if (typeof renderSites === 'function') renderSites();
    }
    if (views.engineer && viewName === "engineer-view")
        views.engineer.classList.add("active");
    if (views.profile && viewName === "profile-view") {
        views.profile.classList.add("active");
        renderProfile();
    }
    if (views.inventory && viewName === "inventory-view") {
        views.inventory.classList.add("active");
        fetchInventory(); // We will define this later
    }
    if (views.plan && viewName === "plan-view") {
        views.plan.classList.add("active");
        if (typeof renderMaintenancePlan === 'function') renderMaintenancePlan();
    }
    if (views.login && viewName === "login-view")
        views.login.classList.add("active"); // Typically handled separately but good for safety

    // Update Container Attribute for CSS-based FAB toggle (Instant)
    const container = document.querySelector(".app-container");
    if (container) {
        container.setAttribute("data-view", viewName);
    }

    // Toggle Mobile Header Search (Only for Site Manager / Admin View)
    const mobileSearch = document.getElementById("mobile-header-search");
    if (mobileSearch) {
        if (viewName === "admin-view") {
            mobileSearch.classList.remove("hidden");
        } else {
            mobileSearch.classList.add("hidden");
        }
    }

}

function toggleModal(name, show) {
    const modalId = modals[name];
    const modal = document.getElementById(modalId);

    if (!modal) {
        console.warn(`Modal key '${name}' id '${modalId}' not found.`);
        return;
    }

    if (show) {
        modal.classList.remove("hidden");
        modal.style.display = "flex";
    } else {
        modal.classList.add("hidden");
        modal.style.display = "none";
    }
}

function resetSiteForm() {
    const form = document.getElementById("form-add-site");
    form.reset();
    if (window.itiInstances.site) window.itiInstances.site.setNumber(""); // Clear Phone Instance
    document.getElementById("site-id-hidden").value = "";

    document.getElementById("modal-site-title").textContent =
        "เพิ่มเครื่อง";
    document.getElementById("btn-submit-site").textContent = "บันทึกข้อมูล";

    if (addressInputs.province) addressInputs.province.value = "";
    if (addressInputs.amphoe) {
        addressInputs.amphoe.value = "";
        addressInputs.amphoe.disabled = true;
    }
    if (addressInputs.tambon) {
        addressInputs.tambon.value = "";
        addressInputs.tambon.disabled = true;
    }
    if (addressInputs.moo) addressInputs.moo.value = "";
    if (addressInputs.zipcode) addressInputs.zipcode.value = "";

    // Clear inputs manually if needed (browsers sometimes sticky)
    [
        "insuranceStartDate",
        "insuranceEndDate",
        "contactName",
        "contactPhone",
        "installLocation",
        "locationUrl",
        "maintenanceCycle",
        "firstMaDate",
        "installationDate",
        "siteName",
        "deviceType",
        "brand",
        "model",
        "serialNumber",
        "hospital"
    ].forEach((name) => {
        const input = form.querySelector(`[name="${name}"]`);
        if (input) input.value = "";
    });

    // Clear hospital input
    const hospitalTextInput = document.getElementById("input-hospital-text");
    if (hospitalTextInput) hospitalTextInput.value = "";

    // Hide all autocomplete dropdowns
    document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
    });

    // Clear pending uploads & deletions
    if (typeof pendingSiteUploads !== "undefined") pendingSiteUploads = [];
    if (typeof pendingSiteDeletions !== "undefined") pendingSiteDeletions = [];

    // Clear Preview
    const container = document.getElementById(
        "site-attachment-preview-container",
    );
    if (container) container.innerHTML = "";
    const countSpan = document.getElementById("site-attachment-count");
    if (countSpan) countSpan.textContent = "ไม่ได้เลือกไฟล์";

    const hiddenExisting = form.querySelector(
        'input[name="existingAttachmentsJSON"]',
    );
    if (hiddenExisting) hiddenExisting.value = "";

    const formLinkEl = document.getElementById("install-case-link-form");
    if (formLinkEl) formLinkEl.innerHTML = "";

    // Unlock manual name edit
    const siteNameInput = form.querySelector('input[name="siteName"]');
    if (siteNameInput) delete siteNameInput.dataset.manual;

    // Reset Map - Show with current location preview
    const mapContainer = document.getElementById("map-preview");
    if (mapContainer) mapContainer.style.display = "block";

    // Initialize map if not already done
    if (!siteMap) {
        initSiteMap();
    }

    if (siteMap && siteMarker && typeof google !== "undefined" && google.maps) {
        // Set default location to Bangkok (don't auto-request GPS)
        const defaultPos = new google.maps.LatLng(13.7563, 100.5018);
        siteMap.setCenter(defaultPos);
        siteMap.setZoom(10);
        siteMarker.position = defaultPos;

        // Trigger resize
        setTimeout(() => {
            window.google.maps.event.trigger(siteMap, "resize");
            siteMap.setCenter(defaultPos);
        }, 100);
    }

    // Reset Get Location Button State
    const btnGetLocation = document.getElementById("btn-get-location");
    if (btnGetLocation) {
        btnGetLocation.innerHTML =
            '<i class="fa-solid fa-location-crosshairs"></i> ดึงตำแหน่งปัจจุบัน';
        btnGetLocation.disabled = false;
    }

    // Populate PIC name suggestions handled by updateSiteFieldDataLists
}

// --- Site Name Auto-Generation ---
function updateSiteName() {
    // Device name is entered manually — no auto-generation needed
}

function setupSiteNameAutoGeneration() {
    // No-op for device manager
}

function updateSiteFieldDataLists() {
    const fields = ["deviceType", "brand", "model", "picName"];
    fields.forEach(field => {
        setupAutocomplete(
            `input-${field}`,
            `dropdown-${field}`,
            () => {
                let options = [...new Set(state.sites.map(s => s[field]).filter(Boolean))];
                if (field === 'deviceType') {
                    if (!options.includes('เครื่องเช่า')) {
                        options.push('เครื่องเช่า');
                    }
                }
                return options.sort((a, b) => a.localeCompare(b, 'th'));
            },
            () => { },
            "ค้นหา...",
            false,
            0
        );
    });
}

function initHospitalAutocomplete() {
    const textInput = document.getElementById("input-hospital-text");
    const dropdown = document.getElementById("dropdown-hospital");
    if (!textInput || !dropdown) return;

    const wrapper = textInput.closest('.autocomplete-wrapper');
    const hospitals = (typeof HOSPITAL_LIST !== 'undefined') ? HOSPITAL_LIST : [];

    function renderHospitalDropdown(query) {
        const q = query.trim().toLowerCase();

        // Require at least 1 character before showing dropdown
        if (q.length < 1) {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
            return;
        }

        const matches = hospitals.filter(h => h.name.toLowerCase().includes(q)).slice(0, 50);

        if (matches.length === 0) {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
            return;
        }

        dropdown.innerHTML = matches.map(h =>
            `<div class="autocomplete-item" data-value="${h.name}" data-province="${h.province || ''}">${h.name}${h.province ? ` <span style="color:var(--text-muted);font-size:0.8em;">(${h.province})</span>` : ''}</div>`
        ).join('');
        dropdown.classList.remove("hidden");
        if (wrapper) wrapper.classList.add("active");

        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener("mousedown", (e) => {
                e.preventDefault();
                textInput.value = item.dataset.value;
                dropdown.classList.add("hidden");
                if (wrapper) wrapper.classList.remove("active");

                // Auto-fill province if available
                const province = item.dataset.province;
                if (province && addressInputs.province) {
                    addressInputs.province.value = province;
                    handleProvinceSelect(province);
                }
            });
        });
    }

    textInput.addEventListener("input", () => renderHospitalDropdown(textInput.value));
    textInput.addEventListener("focus", () => renderHospitalDropdown(textInput.value));
    textInput.addEventListener("blur", () => {
        setTimeout(() => {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
        }, 150);
    });
}

// --- Data Handlers ---

// Helper to enforce CE years (Standardize Date System)
function sanitizeDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr; // Fallback

    // Check year
    const year = d.getFullYear();
    if (year > 2400) {
        // Assume BE, convert to CE
        d.setFullYear(year - 543);
        console.log(
            `Sanitized Date: ${dateStr} -> ${d.toISOString().split("T")[0]}`,
        );
        return d.toISOString().split("T")[0];
    }
    return dateStr;
}

// Helper to safely format Thai Date (Avoids double conversion)
function formatThaiDate(
    dateStr,
    options = { year: "2-digit", month: "short", day: "numeric" },
) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";

    let year = d.getFullYear();
    // If year is already BE (> 2400), don't let toLocaleDateString add 543 again
    if (year > 2400) {
        year -= 543;
        d.setFullYear(year);
    }

    return d.toLocaleDateString(undefined, options);
}

// Helper to format date as DD/MM/YYYY
function formatDateDDMMYYYY(dateInput) {
    if (!dateInput) return "-";
    const d = new Date(dateInput);
    if (isNaN(d)) return "-";

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}

function formatDateTimeDDMMYYYY(dateInput) {
    if (!dateInput) return "-";
    const d = new Date(dateInput);
    if (isNaN(d)) return "-";

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    if (hours === '00' && minutes === '00') return `${day}/${month}/${year}`;
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// --- Global State for Site Uploads ---
let pendingSiteUploads = [];
let pendingSiteDeletions = [];

// Helper to render site previews (Legacy wrapper)
function renderPendingSitePreviews() {
    refreshSiteAttachmentPreviews();
}

// --- MA Round Sections Toggle ---
function toggleMaRoundSections(category) {
    const roundSection = document.getElementById('ma-round-sections');
    const installSection = document.getElementById('ma-install-sections');
    const repairSection = document.getElementById('ma-repair-sections');
    if (roundSection) {
        roundSection.style.display = category === 'บำรุงรักษาตามรอบ' ? 'block' : 'none';
    }
    if (installSection) {
        installSection.style.display = (category === 'ติดตั้ง' || category === 'รื้อถอน') ? 'block' : 'none';
        // Auto-select install type pill (hidden row still saves correctly)
        if (category === 'ติดตั้ง' || category === 'รื้อถอน') {
            const r = document.querySelector('input[name="installType"][value="' + category + '"]');
            if (r) r.checked = true;
            // Show the job type badge in the section header
            const badge = document.getElementById('install-type-badge');
            if (badge) {
                badge.textContent = category;
                badge.style.background = category === 'ติดตั้ง' ? '#22c55e' : '#f59e0b';
                badge.style.display = 'inline-block';
            }
        }
    }
    if (repairSection) {
        repairSection.style.display = category === 'ซ่อม' ? 'block' : 'none';
    }
    const descAttachmentGroup = document.getElementById('description-attachment-group');
    if (descAttachmentGroup) {
        descAttachmentGroup.style.display = category === 'ซ่อม' ? 'block' : 'none';
    }
    // Hide precheck section for รื้อถอน
    const precheckSection = document.getElementById('precheck-section');
    if (precheckSection) {
        precheckSection.style.display = category === 'รื้อถอน' ? 'none' : '';
    }
}
window.toggleMaRoundSections = toggleMaRoundSections;

// --- Repair Checklist Logic ---
let repairChecklistData = [];

function renderRepairChecklist() {
    const container = document.getElementById('repair-checklist-rows');
    const jsonInput = document.getElementById('repair-checklist-json');
    if (!container) return;
    container.innerHTML = '';
    var H = 36;
    repairChecklistData.forEach(function (item, idx) {
        var row = document.createElement('div');
        row.style.cssText = 'display:grid; grid-template-columns:24px 1fr auto 1fr 28px; gap:8px; align-items:stretch; padding:4px 0;';

        // Number
        var num = document.createElement('span');
        num.style.cssText = 'font-size:0.82rem; font-weight:600; color:#555; text-align:center; display:flex; align-items:center; justify-content:center;';
        num.textContent = (idx + 1) + '.';
        row.appendChild(num);

        // Label input
        var labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.dataset.repairIdx = idx;
        labelInput.dataset.field = 'label';
        labelInput.value = item.label || '';
        labelInput.placeholder = 'รายการตรวจสอบ';
        labelInput.style.cssText = 'height:' + H + 'px; padding:0 10px; font-size:0.82rem; border:1px solid rgba(0,0,0,0.12); border-radius:6px; box-sizing:border-box; width:100%;';
        row.appendChild(labelInput);

        // Pill group
        var pillWrap = document.createElement('div');
        pillWrap.style.cssText = 'display:flex; border-radius:6px; overflow:hidden; border:1px solid rgba(0,0,0,0.12); box-sizing:border-box;';

        var makeBtn = function (val, label, activeColor) {
            var btn = document.createElement('div');
            var isActive = item.status === val;
            btn.style.cssText = 'display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0 14px; font-size:0.78rem; font-weight:500; user-select:none; white-space:nowrap; min-width:52px; background:' + (isActive ? activeColor : '#fff') + '; color:' + (isActive ? '#fff' : '#999') + ';';
            btn.textContent = label;
            btn.addEventListener('click', function () {
                repairChecklistData[idx].status = val;
                if (jsonInput) jsonInput.value = JSON.stringify(repairChecklistData);
                renderRepairChecklist();
            });
            return btn;
        };

        pillWrap.appendChild(makeBtn('pass', 'ผ่าน', '#22c55e'));
        var sep = document.createElement('div');
        sep.style.cssText = 'width:1px; background:rgba(0,0,0,0.1);';
        pillWrap.appendChild(sep);
        pillWrap.appendChild(makeBtn('fail', 'ไม่ผ่าน', '#ef4444'));
        row.appendChild(pillWrap);

        // Note input
        var noteInput = document.createElement('input');
        noteInput.type = 'text';
        noteInput.dataset.repairIdx = idx;
        noteInput.dataset.field = 'note';
        noteInput.value = item.note || '';
        noteInput.placeholder = 'หมายเหตุ';
        noteInput.style.cssText = 'height:' + H + 'px; padding:0 10px; font-size:0.82rem; border:1px solid rgba(0,0,0,0.12); border-radius:6px; box-sizing:border-box; width:100%;';
        row.appendChild(noteInput);

        // Delete button
        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.dataset.removeRepair = idx;
        delBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        delBtn.style.cssText = 'background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.9rem; padding:0; display:flex; align-items:center; justify-content:center;';
        row.appendChild(delBtn);

        container.appendChild(row);
    });
    if (jsonInput) jsonInput.value = JSON.stringify(repairChecklistData);
}

document.addEventListener('click', function (e) {
    if (e.target.closest('#btn-add-repair-row')) {
        repairChecklistData.push({ label: '', status: '', note: '' });
        renderRepairChecklist();
    }
    var removeBtn = e.target.closest('[data-remove-repair]');
    if (removeBtn) {
        repairChecklistData.splice(parseInt(removeBtn.dataset.removeRepair), 1);
        renderRepairChecklist();
    }
});

document.addEventListener('input', function (e) {
    if (e.target.dataset.repairIdx !== undefined && e.target.dataset.field) {
        var idx = parseInt(e.target.dataset.repairIdx);
        if (repairChecklistData[idx]) {
            repairChecklistData[idx][e.target.dataset.field] = e.target.value;
            var jsonInput = document.getElementById('repair-checklist-json');
            if (jsonInput) jsonInput.value = JSON.stringify(repairChecklistData);
        }
    }
});

document.addEventListener('change', function (e) {
    if (e.target.name && e.target.name.startsWith('repair_status_')) {
        var idx = parseInt(e.target.name.replace('repair_status_', ''));
        if (repairChecklistData[idx]) {
            repairChecklistData[idx].status = e.target.value;
            var jsonInput = document.getElementById('repair-checklist-json');
            if (jsonInput) jsonInput.value = JSON.stringify(repairChecklistData);
            renderRepairChecklist();
        }
    }
});

window.repairChecklistData = repairChecklistData;
window.renderRepairChecklist = renderRepairChecklist;

// --- Return Product List Logic ---
let returnProductData = [];

function renderReturnProductList() {
    var container = document.getElementById('return-product-rows');
    var jsonInput = document.getElementById('return-product-json');
    if (!container) return;
    container.innerHTML = '';
    returnProductData.forEach(function (item, idx) {
        var row = document.createElement('div');
        row.style.cssText = 'display:grid; grid-template-columns:24px 1fr 1fr 24px; gap:8px; align-items:center; padding:4px 0;';

        var num = document.createElement('span');
        num.style.cssText = 'font-size:0.82rem; font-weight:600; color:#555; text-align:center;';
        num.textContent = (idx + 1) + '.';
        row.appendChild(num);

        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.dataset.returnIdx = idx;
        nameInput.dataset.field = 'name';
        nameInput.value = item.name || '';
        nameInput.placeholder = '\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32';
        nameInput.style.cssText = 'height:34px; padding:0 10px; font-size:0.82rem; border:1px solid rgba(0,0,0,0.12); border-radius:6px; box-sizing:border-box; width:100%;';
        row.appendChild(nameInput);

        var noteInput = document.createElement('input');
        noteInput.type = 'text';
        noteInput.dataset.returnIdx = idx;
        noteInput.dataset.field = 'note';
        noteInput.value = item.note || '';
        noteInput.placeholder = '\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38';
        noteInput.style.cssText = 'height:34px; padding:0 10px; font-size:0.82rem; border:1px solid rgba(0,0,0,0.12); border-radius:6px; box-sizing:border-box; width:100%;';
        row.appendChild(noteInput);

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.dataset.removeReturn = idx;
        delBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        delBtn.style.cssText = 'background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.85rem; padding:0; display:flex; align-items:center; justify-content:center;';
        row.appendChild(delBtn);

        container.appendChild(row);
    });
    if (jsonInput) jsonInput.value = JSON.stringify(returnProductData);
}

document.addEventListener('click', function (e) {
    if (e.target.closest('#btn-add-return-product')) {
        returnProductData.push({ name: '', status: '', qty: '', note: '' });
        renderReturnProductList();
    }
    var removeBtn = e.target.closest('[data-remove-return]');
    if (removeBtn) {
        returnProductData.splice(parseInt(removeBtn.dataset.removeReturn), 1);
        renderReturnProductList();
    }
});

document.addEventListener('input', function (e) {
    if (e.target.dataset.returnIdx !== undefined && e.target.dataset.field) {
        var idx = parseInt(e.target.dataset.returnIdx);
        if (returnProductData[idx]) {
            returnProductData[idx][e.target.dataset.field] = e.target.value;
            var jsonInput = document.getElementById('return-product-json');
            if (jsonInput) jsonInput.value = JSON.stringify(returnProductData);
        }
    }
});

window.returnProductData = returnProductData;
window.renderReturnProductList = renderReturnProductList;

document.addEventListener('change', function (e) {
    if (e.target.name === 'category') {
        toggleMaRoundSections(e.target.value);
    }
    // Toggle ramp width field
    if (e.target.name === 'useRamp') {
        const field = document.getElementById('ramp-width-field');
        if (field) field.style.display = e.target.value === 'yes' ? 'flex' : 'none';
    }
    // Toggle elevator detail fields
    if (e.target.name === 'useElevator') {
        const field = document.getElementById('elevator-detail-fields');
        if (field) field.style.display = e.target.value === 'yes' ? 'flex' : 'none';
    }
});

// Dynamic door size fields
function renderDoorSizeFields(count) {
    const container = document.getElementById('install-door-sizes');
    if (!container) return;
    count = parseInt(count) || 0;
    container.style.display = count > 0 ? 'flex' : 'none';
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;';
        row.innerHTML = '<label style="margin:0; font-size:0.85rem; font-weight:600; min-width:100px;">ขนาดประตูที่ ' + i + '</label>'
            + '<div style="display:flex; align-items:center; gap:0.3rem;"><label style="margin:0; font-size:0.82rem;">กว้าง:</label><input type="number" name="doorWidth_' + i + '" placeholder="0" min="0" step="any" inputmode="decimal" autocomplete="off" style="width:60px; height:30px; padding:0.25rem 0.4rem; font-size:0.82rem; border-radius:6px;"><span style="font-size:0.82rem; color:#888;">ม.</span></div>'
            + '<div style="display:flex; align-items:center; gap:0.3rem;"><label style="margin:0; font-size:0.82rem;">สูง:</label><input type="number" name="doorHeight_' + i + '" placeholder="0" min="0" step="any" inputmode="decimal" autocomplete="off" style="width:60px; height:30px; padding:0.25rem 0.4rem; font-size:0.82rem; border-radius:6px;"><span style="font-size:0.82rem; color:#888;">ม.</span></div>';
        container.appendChild(row);
    }
}

document.addEventListener('input', function (e) {
    if (e.target.name === 'doorCount') {
        renderDoorSizeFields(e.target.value);
    }
});

// Door count plus/minus buttons
function updateDoorCount(delta) {
    const input = document.getElementById('install-door-count');
    const display = document.getElementById('install-door-count-display');
    if (!input) return;
    let count = Math.max(0, Math.min(10, (parseInt(input.value) || 0) + delta));
    input.value = count;
    if (display) display.textContent = count;
    renderDoorSizeFields(count);
}

document.addEventListener('click', function (e) {
    if (e.target.closest('#btn-door-plus')) updateDoorCount(1);
    if (e.target.closest('#btn-door-minus')) updateDoorCount(-1);
});

// --- Install Photo Upload Logic ---
let installPhotoPending = [];
let preInstallPhotoPending = [];

// Pre-install photos
const btnPreInstallPhoto = document.getElementById('btn-pre-install-photo');
const preInstallPhotoInput = document.getElementById('pre-install-photo-input');
if (btnPreInstallPhoto && preInstallPhotoInput) {
    btnPreInstallPhoto.addEventListener('click', function () { preInstallPhotoInput.click(); });
    preInstallPhotoInput.addEventListener('change', function (e) {
        const files = Array.from(e.target.files);
        preInstallPhotoPending.push(...files);
        renderPreInstallPhotoPreview();
        e.target.value = '';
    });
}

function renderPreInstallPhotoPreview() {
    const container = document.getElementById('pre-install-photo-preview');
    const countEl = document.getElementById('pre-install-photo-count');
    if (!container) return;
    container.innerHTML = '';
    if (countEl) countEl.textContent = preInstallPhotoPending.length > 0 ? preInstallPhotoPending.length + ' ไฟล์' : 'ไม่ได้เลือกไฟล์';
    preInstallPhotoPending.forEach(function (file, idx) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative; width:80px; height:80px; border-radius:6px; overflow:hidden; border:1px solid rgba(0,0,0,0.1);';
        const img = document.createElement('img');
        img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
        if (file instanceof File) { img.src = URL.createObjectURL(file); } else if (file.url) { img.src = file.url; }
        wrapper.appendChild(img);
        const removeBtn = document.createElement('div');
        removeBtn.innerHTML = '&times;';
        removeBtn.style.cssText = 'position:absolute; top:2px; right:2px; width:18px; height:18px; background:rgba(239,68,68,0.9); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; cursor:pointer;';
        // Use reference-based removal to avoid stale index issues
        var fileRef = file;
        removeBtn.onclick = function (e) {
            e.stopPropagation();
            if (removeBtn._deleted) return; // Guard against double-click
            removeBtn._deleted = true;
            var currentIdx = preInstallPhotoPending.indexOf(fileRef);
            if (currentIdx !== -1) {
                preInstallPhotoPending.splice(currentIdx, 1);
            }
            renderPreInstallPhotoPreview();
        };
        wrapper.appendChild(removeBtn);
        container.appendChild(wrapper);
    });
}

window.preInstallPhotoPending = preInstallPhotoPending;
window.renderPreInstallPhotoPreview = renderPreInstallPhotoPreview;

// Helper to upload photo arrays
async function uploadPhotoArray(photos, logId, prefix) {
    var urls = [];
    for (var i = 0; i < photos.length; i++) {
        var pFile = photos[i];
        if (pFile instanceof File) {
            var pRef = ref(storage, 'logs/' + prefix + '_' + logId + '_' + Date.now() + '_' + pFile.name);
            var pSnap = await uploadBytes(pRef, pFile);
            var pUrl = await getDownloadURL(pSnap.ref);
            urls.push({ url: pUrl, name: pFile.name, type: pFile.type });
        } else if (pFile.url) {
            urls.push(pFile);
        }
    }
    return urls;
}

// Post-install photos

const btnInstallPhoto = document.getElementById('btn-install-photo');
const installPhotoInput = document.getElementById('install-photo-input');
if (btnInstallPhoto && installPhotoInput) {
    btnInstallPhoto.addEventListener('click', function () { installPhotoInput.click(); });
    installPhotoInput.addEventListener('change', function (e) {
        const files = Array.from(e.target.files);
        installPhotoPending.push(...files);
        renderInstallPhotoPreview();
        e.target.value = '';
    });
}

function renderInstallPhotoPreview() {
    const container = document.getElementById('install-photo-preview');
    const countEl = document.getElementById('install-photo-count');
    if (!container) return;
    container.innerHTML = '';
    if (countEl) countEl.textContent = installPhotoPending.length > 0 ? installPhotoPending.length + ' ไฟล์' : 'ไม่ได้เลือกไฟล์';
    installPhotoPending.forEach(function (file, idx) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative; width:80px; height:80px; border-radius:6px; overflow:hidden; border:1px solid rgba(0,0,0,0.1);';
        const img = document.createElement('img');
        img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
        if (file instanceof File) {
            img.src = URL.createObjectURL(file);
        } else if (file.url) {
            img.src = file.url;
        }
        wrapper.appendChild(img);
        const removeBtn = document.createElement('div');
        removeBtn.innerHTML = '&times;';
        removeBtn.style.cssText = 'position:absolute; top:2px; right:2px; width:18px; height:18px; background:rgba(239,68,68,0.9); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; cursor:pointer;';
        // Use reference-based removal to avoid stale index issues
        var fileRef = file;
        removeBtn.onclick = function (e) {
            e.stopPropagation();
            if (removeBtn._deleted) return; // Guard against double-click
            removeBtn._deleted = true;
            var currentIdx = installPhotoPending.indexOf(fileRef);
            if (currentIdx !== -1) {
                installPhotoPending.splice(currentIdx, 1);
            }
            renderInstallPhotoPreview();
        };
        wrapper.appendChild(removeBtn);
        container.appendChild(wrapper);
    });
}

// Repair photos
let repairPhotoPending = [];
const btnRepairPhoto = document.getElementById('btn-repair-photo');
const repairPhotoInput = document.getElementById('repair-photo-input');
if (btnRepairPhoto && repairPhotoInput) {
    btnRepairPhoto.addEventListener('click', function () { repairPhotoInput.click(); });
    repairPhotoInput.addEventListener('change', function (e) {
        const files = Array.from(e.target.files);
        repairPhotoPending.push(...files);
        renderRepairPhotoPreview();
        e.target.value = '';
    });
}

function renderRepairPhotoPreview() {
    const container = document.getElementById('repair-photo-preview');
    const countEl = document.getElementById('repair-photo-count');
    if (!container) return;
    container.innerHTML = '';
    if (countEl) countEl.textContent = repairPhotoPending.length > 0 ? repairPhotoPending.length + ' ไฟล์' : 'ไม่ได้เลือกไฟล์';
    repairPhotoPending.forEach(function (file, idx) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative; width:80px; height:80px; border-radius:6px; overflow:hidden; border:1px solid rgba(0,0,0,0.1); background:#000;';

        const isVideo = (file.type && file.type.startsWith('video/')) || (file.name && file.name.endsWith('.mp4'));

        if (isVideo) {
            const video = document.createElement('video');
            video.style.cssText = 'width:100%; height:100%; object-fit:cover;';
            if (file instanceof File) { video.src = URL.createObjectURL(file); } else if (file.url) { video.src = file.url; }
            wrapper.appendChild(video);
            const playIcon = document.createElement('div');
            playIcon.innerHTML = '<i class="fa-solid fa-play"></i>';
            playIcon.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#fff; font-size:1.2rem; pointer-events:none;';
            wrapper.appendChild(playIcon);
        } else {
            const img = document.createElement('img');
            img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
            if (file instanceof File) { img.src = URL.createObjectURL(file); } else if (file.url) { img.src = file.url; }
            wrapper.appendChild(img);
        }

        const removeBtn = document.createElement('div');
        removeBtn.innerHTML = '&times;';
        removeBtn.style.cssText = 'position:absolute; top:2px; right:2px; width:18px; height:18px; background:rgba(239,68,68,0.9); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; cursor:pointer; z-index:2;';
        var fileRef = file;
        removeBtn.onclick = function (e) {
            e.stopPropagation();
            var currentIdx = repairPhotoPending.indexOf(fileRef);
            if (currentIdx !== -1) {
                repairPhotoPending.splice(currentIdx, 1);
            }
            renderRepairPhotoPreview();
        };
        wrapper.appendChild(removeBtn);
        container.appendChild(wrapper);
    });
}
window.repairPhotoPending = repairPhotoPending;
window.renderRepairPhotoPreview = renderRepairPhotoPreview;

window.installPhotoPending = installPhotoPending;
window.renderInstallPhotoPreview = renderInstallPhotoPreview;

// Site Attachment Input Listener
const siteAttachmentInput = document.getElementById("site-attachment-input");
const btnSiteAttachment = document.getElementById("btn-site-attachment");

if (btnSiteAttachment && siteAttachmentInput) {
    btnSiteAttachment.addEventListener("click", () =>
        siteAttachmentInput.click(),
    );
    siteAttachmentInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const MAX_SIZE = 25 * 1024 * 1024; // 25MB
            Array.from(e.target.files).forEach((file) => {
                if (file.size > MAX_SIZE) {
                    showDialog(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (สูงสุด 25MB)`, {
                        title: "ขนาดไฟล์เกินกำหนด",
                    });
                    return;
                }
                pendingSiteUploads.push(file);
            });
            refreshSiteAttachmentPreviews();
            e.target.value = ""; // Reset
        }
    });
}

let rdpbRegionMapping = {};

async function getRdpbRegionCode(provinceName) {
    if (Object.keys(rdpbRegionMapping).length === 0) {
        try {
            const res = await fetch("25640531_sc002.json");
            const data = await res.json();

            // The JSON has a root object with the array inside 'ProvinceandRegionComprehensive'
            const provincesArray = data.ProvinceandRegionComprehensive || [];

            provincesArray.forEach((item) => {
                if (item.ProvinceNameThai && item.Region_RDPB) {
                    let pName = item.ProvinceNameThai.replace(/^จังหวัด\s*/, "").trim();
                    rdpbRegionMapping[pName] = item.Region_RDPB;
                }
            });
        } catch (e) {
            console.error("Failed to load region mapping", e);
        }
    }

    // Remove "จ." or "จังหวัด" if present
    let cleanProvince = (provinceName || "")
        .replace(/^(จังหวัด|จ\.)\s*/, "")
        .trim();
    if (cleanProvince === "กทม" || cleanProvince === "กทม.")
        cleanProvince = "กรุงเทพมหานคร";

    const regionName = rdpbRegionMapping[cleanProvince] || "";

    switch (regionName) {
        case "ภาคเหนือ":
            return "N";
        case "ภาคตะวันออกเฉียงเหนือ":
            return "NE";
        case "ภาคกลาง":
            return "C";
        case "ภาคใต้":
            return "S";
        case "ภาคตะวันออก":
            return "E";
        case "ภาคตะวันตก":
            return "W";
        default:
            return "C"; // Default fallback
    }
}


async function handleSiteSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-submit-site");
    const originalText = btn.textContent;
    btn.textContent = "กำลังบันทึก...";
    btn.disabled = true;

    try {
        const formData = new FormData(e.target);

        // --- STRICT PHONE VALIDATION (Site) ---
        const sitePhoneInput = document.getElementById("site-contact-phone");
        if (sitePhoneInput && sitePhoneInput.value) {
            if (!validateThaiPhone(sitePhoneInput, window.itiInstances.site)) {
                await showDialog(
                    "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0 เท่านั้น",
                    { title: "รูปแบบไม่ถูกต้อง" },
                );
                return; // Stop
            }
        }
        // -------------------------------------

        // --- MA VALIDATION ---
        const maCycleRaw = formData.get("maintenanceCycle");
        const firstMaDateRaw = formData.get("firstMaDate");
        const insStartRaw = formData.get("insuranceStartDate");
        const insEndRaw = formData.get("insuranceEndDate");

        if (maCycleRaw) {
            const maCycleNum = Number(maCycleRaw);
            if (!Number.isInteger(maCycleNum) || maCycleNum <= 0) {
                await showDialog("รอบ MA ต้องเป็นจำนวนเต็มบวกเท่านั้น", {
                    title: "ข้อมูลไม่ถูกต้อง",
                });
                return;
            }
        }

        if (firstMaDateRaw && insStartRaw && insEndRaw) {
            const firstMaTime = new Date(firstMaDateRaw).getTime();
            const insStartTime = new Date(insStartRaw).getTime();
            const insEndTime = new Date(insEndRaw).getTime();

            // Allow entire day inclusion by zeroing time optionally, but straightforward comparison works if they are YYYY-MM-DD
            if (firstMaTime < insStartTime || firstMaTime > insEndTime) {
                await showDialog(
                    "วันที่เข้าซ่อมบำรุงครั้งแรกต้องอยู่ภายในช่วงระยะเวลาประกัน",
                    { title: "ข้อมูลไม่ถูกต้อง" },
                );
                return;
            }
        } else if (firstMaDateRaw && (!insStartRaw || !insEndRaw)) {
            // If MA is specified but insurance is not fully specified, you might optionally want to block it or allow it.
            // We'll allow it unless the rule is strict that insurance MUST exist if firstMaDate exists.
        }
        // -------------------------------------

        const name = formData.get("hospital") || formData.get("installLocation") || "ไม่ระบุชื่อ";
        const installLocation = formData.get("installLocation");
        const moo = formData.get("moo");
        const province = addressInputs.province?.value || "";
        const amphoe = addressInputs.amphoe?.value || "";
        const tambon = addressInputs.tambon?.value || "";
        const zipcode = addressInputs.zipcode?.value || "";

        // Combine Address
        const fullAddress = `${installLocation ? installLocation + " " : ""}${moo ? "หมู่ " + moo + " " : ""}${tambon ? "ต." + tambon + " " : ""}${amphoe ? "อ." + amphoe + " " : ""}${province ? "จ." + province + " " : ""}${zipcode}`;

        const siteData = {
            name: name,
            description: formData.get("description"),
            fullAddress: fullAddress,

            // Device Info
            deviceType: formData.get("deviceType") || "",
            brand: formData.get("brand") || "",
            model: formData.get("model") || "",
            serialNumber: formData.get("serialNumber") || "",
            hospital: formData.get("hospital") || "",

            // Location
            installLocation: installLocation,
            moo: moo,
            subdistrict: tambon,
            district: amphoe,
            province: province,
            zipcode: zipcode,

            picName: formData.get("picName") || "",
            contactName: formData.get("contactName"),
            contactPhone: window.itiInstances.site
                ? window.itiInstances.site.getNumber()
                : formData.get("contactPhone"),

            insuranceStartDate: sanitizeDate(formData.get("insuranceStartDate")),
            insuranceEndDate: sanitizeDate(formData.get("insuranceEndDate")),
            warrantyNumber: formData.get("warrantyNumber") || "",

            maintenanceCycle: formData.get("maintenanceCycle")
                ? Number(formData.get("maintenanceCycle"))
                : null,
            installationDate: sanitizeDate(formData.get("installationDate")),
            firstMaDate: sanitizeDate(formData.get("firstMaDate")),

            locationUrl: formData.get("locationUrl") || "",
        };

        const siteId = formData.get("siteId");

        // --- Attachment Logic ---
        const attachments = [];

        // 1. Existing Attachments
        const existingJSON = formData.get("existingAttachmentsJSON");
        if (existingJSON) {
            try {
                const existing = JSON.parse(existingJSON);
                if (Array.isArray(existing)) attachments.push(...existing);
            } catch (e) {
                console.error("Error parsing existing site attachments", e);
            }
        }

        // 2. New Uploads
        if (
            typeof pendingSiteUploads !== "undefined" &&
            pendingSiteUploads.length > 0
        ) {
            const uploadPromises = pendingSiteUploads.map((file, index) => {
                return new Promise((resolve, reject) => {
                    const storageRef = ref(storage, `sites/${Date.now()}_${file.name}`);
                    const uploadTask = uploadBytesResumable(storageRef, file);

                    // Find Progress Element
                    const progressEl = document.getElementById(
                        `site-upload-progress-${index}`,
                    );

                    // Find the card element to add uploading state
                    const cardEl = progressEl?.closest('.pending-item');

                    if (progressEl) {
                        progressEl.style.display = "block";
                        progressEl.textContent = "0%";
                    }

                    if (cardEl) {
                        cardEl.style.opacity = "0.7";
                        cardEl.style.pointerEvents = "none";
                    }

                    uploadTask.on(
                        "state_changed",
                        (snapshot) => {
                            const progress =
                                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            if (progressEl)
                                progressEl.textContent = Math.round(progress) + "%";
                        },
                        (error) => {
                            console.error("Site upload failed:", error);
                            showToast(`อัปโหลดไฟล์ ${file.name} ไม่สำเร็จ`, "warning");
                            if (progressEl) progressEl.style.display = "none";
                            if (cardEl) {
                                cardEl.style.opacity = "1";
                                cardEl.style.pointerEvents = "auto";
                            }
                            reject(error);
                        },
                        async () => {
                            try {
                                const url = await getDownloadURL(uploadTask.snapshot.ref);
                                if (progressEl) progressEl.style.display = "none";
                                if (cardEl) {
                                    cardEl.style.opacity = "1";
                                    cardEl.style.pointerEvents = "auto";
                                }
                                resolve({
                                    name: file.name,
                                    url: url,
                                    type: file.type,
                                    size: file.size,
                                    path: uploadTask.snapshot.ref.fullPath,
                                });
                            } catch (err) {
                                reject(err);
                            }
                        },
                    );
                });
            });

            try {
                const newAttachments = await Promise.all(uploadPromises);
                attachments.push(...newAttachments);
            } catch (err) {
                throw new Error("การอัปโหลดไฟล์บางรายการไม่สำเร็จ");
            }
        }

        siteData.attachments = attachments;

        if (siteId) {
            await FirestoreService.updateSite(siteId, siteData);

            // Process Deletions
            if (
                typeof pendingSiteDeletions !== "undefined" &&
                pendingSiteDeletions.length > 0
            ) {
                for (const path of pendingSiteDeletions) {
                    try {
                        const fileRef = ref(storage, path);
                        await deleteObject(fileRef);
                    } catch (delErr) {
                        console.warn("Failed to delete site file:", path);
                    }
                }
            }

            showToast("อัปเดตข้อมูลเครื่องสำเร็จ", "success");
        } else {
            // --- Auto-generate Site Code ---
            const regionPrefix = await getRdpbRegionCode(siteData.province || "");
            const sitesWithPrefix = state.sites.filter(
                (s) => s.siteCode && s.siteCode.startsWith(regionPrefix),
            );
            let maxNumber = 0;
            for (const s of sitesWithPrefix) {
                const numPart = s.siteCode.substring(regionPrefix.length);
                const num = parseInt(numPart, 10);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
            const nextNumber = maxNumber + 1;
            siteData.siteCode = `${regionPrefix}${String(nextNumber).padStart(3, "0")}`;

            const newSiteId = await FirestoreService.addSite(siteData);
            showToast("เพิ่มเครื่องใหม่สำเร็จ", "success");

            // Auto-create initial MA log if applicable
            if (siteData.maintenanceCycle && siteData.firstMaDate) {
                const initialLogData = {
                    siteId: newSiteId,
                    date: siteData.firstMaDate,
                    category: "บำรุงรักษาตามรอบ",
                    status: "Open",
                    lineItems: [],
                    details: "-",
                    objective: `รอบซ่อมบำรุงครั้งแรก (${siteData.maintenanceCycle} วัน)`,
                    cost: 0,
                    attachments: [],
                    recordedBy: "System",
                    timestamp: new Date().toISOString(),
                    comments: [{
                        text: `ซ่อมบำรุงตามรอบ (ครั้งที่ 1)`,
                        author: "System",
                        authorId: "system",
                        photoURL: "",
                        timestamp: new Date().toISOString(),
                        attachments: []
                    }]
                };
                try {
                    await FirestoreService.addLog(initialLogData);
                } catch (addErr) {
                    console.error("Failed to add initial MA log:", addErr);
                }
            }
        }

        await refreshData();

        toggleModal("addSite", false);
        resetSiteForm();
        renderSites();
    } catch (error) {
        console.error("Save Site Error:", error);
        await showDialog("เกิดข้อผิดพลาด: " + error.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function editSite(id) {
    const site = state.sites.find((s) => s.id === id);
    if (!site) return;

    resetSiteForm();

    const form = document.getElementById("form-add-site");
    document.getElementById("site-id-hidden").value = site.id;

    // Helper to set value safely
    const setVal = (name, val) => {
        const input = form.querySelector(`[name="${name}"]`);
        if (input) input.value = val || "";
    };

    setVal("siteName", site.name);
    setVal("deviceType", site.deviceType);
    setVal("brand", site.brand);
    setVal("model", site.model);
    setVal("serialNumber", site.serialNumber);
    setVal("hospital", site.hospital);
    // Sync hospital text input
    const hospitalTextInput = document.getElementById("input-hospital-text");
    if (hospitalTextInput) hospitalTextInput.value = site.hospital || "";
    if (form.querySelector('textarea[name="description"]'))
        form.querySelector('textarea[name="description"]').value =
            site.description || "";

    setVal("contactName", site.contactName);
    setVal("picName", site.picName);
    setVal("contactPhone", site.contactPhone);
    if (window.itiInstances.site)
        window.itiInstances.site.setNumber(site.contactPhone || "");
    setVal("installLocation", site.installLocation || site.villageName);
    setVal("locationUrl", site.locationUrl);

    // Flatpickr inputs
    setVal("insuranceStartDate", site.insuranceStartDate);
    setVal("insuranceEndDate", site.insuranceEndDate);
    setVal("warrantyNumber", site.warrantyNumber);
    setVal("maintenanceCycle", site.maintenanceCycle);

    let installDate = site.installationDate;
    let installLogCaseId = null;
    let installLogId = null;
    if (!installDate && state.logs) {
        const installLog = state.logs.find(l => l.siteId === site.id && l.category === "ติดตั้ง");
        if (installLog && installLog.date) {
            installDate = sanitizeDate(installLog.date).split('T')[0];
            installLogCaseId = installLog.caseId;
            installLogId = installLog.id;
        }
    }
    setVal("installationDate", installDate);
    const formLinkEl = document.getElementById("install-case-link-form");
    if (formLinkEl) {
        if (installLogCaseId && installLogId) {
            formLinkEl.innerHTML = `<a href="javascript:void(0)" onclick="viewLogDetails('${installLogId}')" style="color: var(--primary-color); text-decoration: underline; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-link"></i> ${installLogCaseId}</a>`;
        } else {
            formLinkEl.innerHTML = "";
        }
    }

    setVal("firstMaDate", site.firstMaDate);

    const titleEl = document.getElementById("modal-site-title");
    if (titleEl) titleEl.textContent = "แก้ไขข้อมูลเครื่อง";

    const btnEl = document.getElementById("btn-submit-site");
    if (btnEl) btnEl.textContent = "อัปเดตข้อมูล";

    // Address Restoration
    try {
        if (site.province) {
            if (addressInputs.province) addressInputs.province.value = site.province;
            // No populate needed, but we need to enable downstream
            handleProvinceSelect(site.province); // Sets disabled statuses

            if (site.district && addressInputs.amphoe) {
                addressInputs.amphoe.value = site.district;
                addressInputs.amphoe.disabled = false;

                if (site.subdistrict && addressInputs.tambon) {
                    addressInputs.tambon.value = site.subdistrict;
                    addressInputs.tambon.disabled = false;
                }

                if (site.zipcode && addressInputs.zipcode) {
                    addressInputs.zipcode.value = site.zipcode;
                }

                if (site.moo && addressInputs.moo) {
                    addressInputs.moo.value = site.moo;
                }
            }
        }
    } catch (e) {
        console.error("Address population failed", e);
    }

    // --- Attachments Logic for Edit ---
    let currentAttachments = [];
    if (site.attachments && Array.isArray(site.attachments)) {
        currentAttachments = site.attachments;
    }

    // Store in hidden input
    const hiddenExisting = form.querySelector(
        'input[name="existingAttachmentsJSON"]',
    );
    if (hiddenExisting) hiddenExisting.value = JSON.stringify(currentAttachments);

    // Initial Preview Render
    // Use unified refresher
    refreshSiteAttachmentPreviews();

    // Clear pending uploads/deletions on edit start
    if (typeof pendingSiteUploads !== "undefined") pendingSiteUploads = [];
    if (typeof pendingSiteDeletions !== "undefined") pendingSiteDeletions = [];

    refreshSiteAttachmentPreviews();

    toggleModal("addSite", true);

    // Initialize Map with Existing Coordinates
    initSiteMap();
    if (site.locationUrl) {
        const coords = parseLocationUrl(site.locationUrl);
        if (
            coords &&
            siteMap &&
            siteMarker &&
            typeof window.google !== "undefined"
        ) {
            const newPos = new window.google.maps.LatLng(coords.lat, coords.lng);
            siteMap.setCenter(newPos);
            siteMap.setZoom(15);
            siteMarker.position = newPos;
        }
    }
}

// --- Customer Signature Pad ---
let customerSignaturePad = null;

function initCustomerSignaturePad() {
    const canvas = document.getElementById("customer-signature-canvas");
    if (!canvas || customerSignaturePad) return;
    customerSignaturePad = new SignaturePad(canvas, {
        minWidth: 0.5,
        maxWidth: 2.5,
        penColor: "#111111",
    });
    function resizeCustomerCanvas() {
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        customerSignaturePad.clear();
    }
    resizeCustomerCanvas();
    // Re-init on modal open
    const observer = new MutationObserver(() => {
        const modal = document.getElementById("modal-log-maintenance");
        if (modal && !modal.classList.contains("hidden")) {
            setTimeout(resizeCustomerCanvas, 100);
        }
    });
    const modal = document.getElementById("modal-log-maintenance");
    if (modal) observer.observe(modal, { attributes: true, attributeFilter: ["class"] });

    // Wire up e-signature toggle
    const toggle = document.getElementById("use-esignature-toggle");
    const sigSection = document.getElementById("customer-signature-section");
    const signedDocSection = document.getElementById("signed-doc-upload-section");
    if (toggle) {
        const applyToggle = async () => {
            const useSystem = toggle.checked;
            if (useSystem) {
                const hasProfileSig = await currentUserHasProfileSignature();
                if (!hasProfileSig) {
                    toggle.checked = false;
                    if (signedDocSection) signedDocSection.style.display = "";
                    if (sigSection) sigSection.style.display = 'none';
                    showToast('บัญชีของคุณยังไม่ได้บันทึกลายเซ็นในข้อมูลส่วนตัว กรุณาเพิ่มลายเซ็นก่อนใช้งานลายเซ็นระบบ', 'warning');
                    return;
                }
            }
            if (sigSection) sigSection.style.display = 'none';
            if (signedDocSection) signedDocSection.style.display = useSystem ? 'none' : "";
        };
        toggle.addEventListener("change", () => applyToggle().catch(console.error));
        applyToggle().catch(console.error);
    }

    // Wire up signed doc file input
    const signedDocInput = document.getElementById("signed-doc-input");
    const btnAttachSignedDoc = document.getElementById("btn-attach-signed-doc");
    if (btnAttachSignedDoc && signedDocInput) {
        btnAttachSignedDoc.addEventListener("click", () => signedDocInput.click());
        signedDocInput.addEventListener("change", () => {
            const newFiles = Array.from(signedDocInput.files);
            newFiles.forEach(f => {
                if (!pendingSignedDocs.find(p => p.name === f.name && p.size === f.size)) {
                    pendingSignedDocs.push(f);
                }
            });
            signedDocInput.value = "";
            renderSignedDocPreview();
        });
    }
}

function clearCustomerSignature() {
    if (customerSignaturePad) customerSignaturePad.clear();
    const hidden = document.getElementById("customer-signature-data");
    if (hidden) hidden.value = "";
}

function getCustomerSignatureDataUrl() {
    if (!customerSignaturePad || customerSignaturePad.isEmpty()) return "";
    const canvas = document.getElementById("customer-signature-canvas");
    if (!canvas) return "";
    // Ensure source canvas has non-zero dimensions. If not, try to resize from bounding rect.
    if (!canvas.width || !canvas.height) {
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const w = Math.round(rect.width * ratio) || 0;
        const h = Math.round(rect.height * ratio) || 0;
        if (w > 0 && h > 0) {
            try {
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.scale(ratio, ratio);
            } catch (err) {
                console.warn('Failed to resize customer signature canvas:', err);
            }
        } else {
            return ""; // cannot render signature
        }
    }
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = canvas.width;
    tmpCanvas.height = canvas.height;
    const ctx = tmpCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);
    try {
        ctx.drawImage(canvas, 0, 0);
    } catch (err) {
        console.warn('Failed to draw customer signature canvas to tmp canvas:', err);
        return "";
    }
    return tmpCanvas.toDataURL("image/jpeg", 0.8);
}

window.clearCustomerSignature = clearCustomerSignature;

// --- Signed Document Attachments ---

function renderSignedDocPreview() {
    const preview = document.getElementById("signed-doc-preview");
    const countEl = document.getElementById("signed-doc-count");
    const existingInput = document.getElementById("existing-signed-docs-json");

    // Combine existing (already uploaded) + pending (new files)
    const existing = (() => {
        try { return JSON.parse(existingInput?.value || "[]"); } catch { return []; }
    })();
    const total = existing.length + pendingSignedDocs.length;

    if (countEl) countEl.textContent = total > 0 ? `${total} ไฟล์` : "ไม่ได้เลือกไฟล์";
    if (!preview) return;

    if (total === 0) {
        preview.style.display = "none";
        preview.innerHTML = "";
        return;
    }

    preview.style.display = "flex";
    preview.innerHTML = "";

    const makeItem = (name, url, isPending, index) => {
        const isPdf = name.toLowerCase().endsWith(".pdf");
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
        const item = document.createElement("div");
        item.style.cssText = "position:relative; display:flex; flex-direction:column; align-items:center; gap:4px; width:80px;";

        if (isImage && url) {
            const img = document.createElement("img");
            img.src = url;
            img.style.cssText = "width:72px; height:72px; object-fit:cover; border-radius:6px; border:1px solid rgba(0,0,0,0.1);";
            item.appendChild(img);
        } else {
            const icon = document.createElement("div");
            icon.style.cssText = "width:72px; height:72px; display:flex; align-items:center; justify-content:center; border-radius:6px; border:1px solid rgba(0,0,0,0.1); background:#f9fafb;";
            icon.innerHTML = isPdf
                ? '<i class="fa-solid fa-file-pdf" style="font-size:2rem; color:#ef4444;"></i>'
                : '<i class="fa-solid fa-file" style="font-size:2rem; color:#64748b;"></i>';
            item.appendChild(icon);
        }

        const label = document.createElement("span");
        label.style.cssText = "font-size:0.68rem; color:#555; text-align:center; word-break:break-all; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
        label.title = name;
        label.textContent = name;
        item.appendChild(label);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.style.cssText = "position:absolute; top:-6px; right:-6px; width:18px; height:18px; border-radius:50%; background:#ef4444; color:#fff; border:none; cursor:pointer; font-size:10px; display:flex; align-items:center; justify-content:center; padding:0;";
        removeBtn.innerHTML = "×";
        removeBtn.onclick = () => {
            if (isPending) {
                pendingSignedDocs.splice(index, 1);
            } else {
                const updated = existing.filter((_, i) => i !== index);
                if (existingInput) existingInput.value = JSON.stringify(updated);
            }
            renderSignedDocPreview();
        };
        item.appendChild(removeBtn);
        preview.appendChild(item);
    };

    existing.forEach((f, i) => makeItem(f.name, f.url, false, i));
    pendingSignedDocs.forEach((f, i) => {
        const url = f.type.startsWith("image/") ? URL.createObjectURL(f) : null;
        makeItem(f.name, url, true, i);
    });
}

window.renderSignedDocPreview = renderSignedDocPreview;

function buildInspectionSummary(logData) {
    const lines = [];
    if (logData.cycleCount) lines.push(`จำนวนรอบ: ${logData.cycleCount}`);
    // Electrical
    const hasE = logData.voltageL1 || logData.voltageL2 || logData.voltageL3 || logData.currentL1 || logData.currentL2 || logData.currentL3;
    if (hasE) {
        lines.push(`⚡ Electrical — V: R${logData.voltageL1 || '-'} S${logData.voltageL2 || '-'} T${logData.voltageL3 || '-'} | A: R${logData.currentL1 || '-'} S${logData.currentL2 || '-'} T${logData.currentL3 || '-'}`);
    }
    // Physical
    const pf = (v) => !v ? '' : v === 'pass' ? '✅' : '❌';
    if (logData.avgWorkTemp) lines.push(`อุณหภูมิทำงาน: ${logData.avgWorkTemp}°C ${pf(logData.avgWorkTempCheck)}`);
    if (logData.avgAreaTemp) lines.push(`อุณหภูมิพื้นที่: ${logData.avgAreaTemp}°C ${pf(logData.avgAreaTempCheck)}`);
    if (logData.leakPressure || logData.leakCheck) lines.push(`การรั่วไหล: ${logData.leakPressure || '-'} PSI ${pf(logData.leakCheck)}`);
    if (logData.complyType5) lines.push(`Comply Type 5: ${pf(logData.complyType5)}`);
    if (logData.ciPcdType5) lines.push(`CI PCD Type 5: ${pf(logData.ciPcdType5)}`);
    // Inspection checklist
    const inspLabels = { check: 'Check', service: 'Service', replace: 'Replace' };
    const inspItems = [
        ['insp_exteriorCleaning', 'ความสะอาดภายนอก'], ['insp_interiorCleaning', 'ความสะอาดภายใน'],
        ['insp_doorSystem', 'ระบบประตู'], ['insp_footSwitch', 'Foot Switch'], ['insp_sensor', 'Sensor'],
        ['insp_tempPoints', 'อุณหภูมิจุดที่ 1-4'], ['insp_workingPressure', 'ความดัน'], ['insp_rfGenerator', 'RF Generator'],
        ['insp_chemicalAmount', 'น้ำยาที่ฉีด'], ['insp_airChargingValue', 'Air Charging'], ['insp_filter', 'Filter'],
        ['insp_decomposer', 'Decomposer'], ['insp_vacuumPumpOil', 'น้ำมันปั๊มสุญญากาศ'], ['insp_connectors', 'ข้อต่อ'],
        ['insp_drainTank', 'ถังเดรนน้ำ'], ['insp_gasDoor', 'แก๊สหน้าประตู'], ['insp_gas1m', 'แก๊สห่าง 1ม.'], ['insp_gas2m', 'แก๊สห่าง 2ม.'],
    ];
    const inspResults = inspItems.filter(([k]) => logData[k]).map(([k, label]) => `${label}: ${inspLabels[logData[k]] || logData[k]}`);
    if (inspResults.length > 0) lines.push(`📋 Inspection — ${inspResults.join(' | ')}`);
    return lines.length > 0 ? `🔍 ข้อมูลตรวจสอบ\n${lines.join('\n')}` : '';
}

async function handleLogMaintenance(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = "กำลังบันทึก...";
    btn.disabled = true;

    // Show progress bar
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressText = document.getElementById('upload-progress-text');

    const showProgress = (percent, text = '') => {
        if (progressContainer) progressContainer.style.display = 'block';
        if (progressBar) progressBar.style.width = percent + '%';
        if (progressText) progressText.textContent = text || `${Math.round(percent)}%`;
    };

    const hideProgress = () => {
        if (progressContainer) progressContainer.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
    };

    try {
        showProgress(0, 'กำลังเตรียมข้อมูล...');

        const formData = new FormData(e.target);

        const logId = formData.get("logId");

        // Prevent creating new PM case if an active one exists
        const formCategory = formData.get("category");
        const formSiteId = formData.get("siteId");
        if (!logId && formCategory === "บำรุงรักษาตามรอบ" && formSiteId) {
            const hasActivePM = state.logs.some(l =>
                l.siteId === formSiteId &&
                l.category === "บำรุงรักษาตามรอบ" &&
                l.status !== "Case Closed" &&
                l.status !== "Cancel"
            );

            if (hasActivePM) {
                btn.textContent = originalText;
                btn.disabled = false;
                hideProgress();
                await showDialog('ไม่สามารถเปิดเคสบำรุงรักษาตามรอบได้ เนื่องจากมีเคสที่ยังไม่ถูกปิด (ต้องมีสถานะเป็น ปิดเคส หรือ ยกเลิก เท่านั้น)', {
                    title: 'ไม่สามารถสร้างเคสได้',
                    icon: 'warning',
                });
                return;
            }
        }

        const checkStatus = formData.get("status") || (logId ? (state.logs.find(l => l.id === logId)?.status || "Open") : "Open");
        const useESignature = document.getElementById("use-esignature-toggle")?.checked || false;

        if (useESignature) {
            const hasProfileSig = await currentUserHasProfileSignature();
            if (!hasProfileSig) {
                btn.textContent = originalText;
                btn.disabled = false;
                hideProgress();
                await showDialog("บัญชีของคุณยังไม่ได้บันทึกลายเซ็นในข้อมูลส่วนตัว กรุณาเพิ่มลายเซ็นก่อนใช้งานลายเซ็นระบบ", {
                    title: "ลายเซ็นระบบไม่พร้อมใช้งาน",
                });
                return;
            }
        }

        if (checkStatus === 'Case Closed') {
            const existingLog = logId ? state.logs.find(l => l.id === logId) : null;
            const hasPassedDone = existingLog && (
                existingLog.status === 'Done' ||
                existingLog.status === 'Completed' ||
                existingLog.status === 'Case Closed' ||
                (existingLog.statusHistory && (existingLog.statusHistory.Done || existingLog.statusHistory.Completed || existingLog.statusHistory['Case Closed']))
            );
            if (!hasPassedDone) {
                btn.textContent = originalText;
                btn.disabled = false;
                hideProgress();
                await showDialog('ไม่สามารถเปลี่ยนสถานะเป็น "ปิดเคส" ได้ เนื่องจากปิดได้แค่สถานะ "เสร็จสิ้น" เท่านั้น"', {
                    title: 'สถานะไม่ถูกต้อง',
                    icon: 'warning',
                });
                return;
            }
        }

        if (checkStatus === 'Cancel') {
            const existingLog = logId ? state.logs.find(l => l.id === logId) : null;
            if (!existingLog || existingLog.status !== 'Cancel') {
                const reason = await showCancelReasonDialog();
                if (reason === null) {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    hideProgress();
                    return;
                }
                window._pendingCancelReason = reason;
            }
        }

        if (checkStatus === 'Done') {
            const missing = getIncompleteDoneFields(formData);
            if (missing.length > 0) {
                btn.textContent = originalText;
                btn.disabled = false;
                hideProgress();
                await showDialog('ไม่สามารถเปลี่ยนสถานะเป็น "เสร็จสิ้น" ได้ เนื่องจากข้อมูลยังไม่ครบถ้วน', {
                    title: 'ข้อมูลไม่ครบถ้วน',
                    icon: 'warning',
                });
                highlightIncompleteFields(e.target, getIncompleteDoneFieldKeys(formData));
                return;
            }
        }

        if (checkStatus === 'Done' && !useESignature) {
            const existingSignedJSON = formData.get("existingSignedDocsJSON");
            let existingSignedCount = 0;
            if (existingSignedJSON) {
                try {
                    const parsed = JSON.parse(existingSignedJSON);
                    if (Array.isArray(parsed)) existingSignedCount = parsed.length;
                } catch (e) {
                    console.error("Error parsing existing signed docs", e);
                }
            }
            const totalSignedDocs = existingSignedCount + (pendingSignedDocs ? pendingSignedDocs.length : 0);
            if (totalSignedDocs === 0) {
                btn.textContent = originalText;
                btn.disabled = false;
                hideProgress();
                await showDialog("กรุณาอัปโหลดสำเนาเอกสารที่เซ็นแล้ว (Signed Document Copy) ก่อนเปลี่ยนสถานะเป็นเสร็จสิ้น", {
                    title: "จำเป็นต้องมีเอกสาร",
                });
                return;
            }
        }
        console.log('[handleLogMaintenance] logId from form:', logId, 'Type:', typeof logId, 'Falsy?', !logId);
        const user = auth.currentUser;
        const paramUser = user
            ? user.displayName || user.email || "Unknown"
            : "Unknown";
        const recorderId = user ? user.uid : null;

        showProgress(10, 'กำลังประมวลผลไฟล์...');

        // 1. Prepare Attachments Array
        const attachments = [];
        const attachmentsBefore = [];
        const attachmentsAfter = [];

        // 2. Handle Existing Files (Preserve them)
        const existingJSON = formData.get("existingAttachmentsJSON");
        if (existingJSON) {
            try {
                const existing = JSON.parse(existingJSON);
                if (Array.isArray(existing)) attachments.push(...existing);
            } catch (e) {
                console.error("Error parsing existing attachments", e);
            }
        }
        const existingBeforeJSON = formData.get("existingAttachmentsBeforeJSON");
        if (existingBeforeJSON) {
            try {
                const existing = JSON.parse(existingBeforeJSON);
                if (Array.isArray(existing)) attachmentsBefore.push(...existing);
            } catch (e) {
                console.error("Error parsing existing before", e);
            }
        }
        const existingAfterJSON = formData.get("existingAttachmentsAfterJSON");
        if (existingAfterJSON) {
            try {
                const existing = JSON.parse(existingAfterJSON);
                if (Array.isArray(existing)) attachmentsAfter.push(...existing);
            } catch (e) {
                console.error("Error parsing existing after", e);
            }
        }

        // Legacy Fallback (if no JSON but has legacy fields)
        if (
            attachments.length === 0 &&
            attachmentsBefore.length === 0 &&
            attachmentsAfter.length === 0
        ) {
            const legacyUrl = formData.get("existingAttachmentUrl");
            const legacyName = formData.get("existingAttachmentName");
            if (legacyUrl) {
                attachments.push({
                    name: legacyName || "Attachment",
                    url: legacyUrl,
                    type: "legacy",
                    path: null,
                });
            }
        }

        showProgress(20, 'กำลังอัปโหลดไฟล์...');

        // 3. Handle New Files (From Pending Array)
        const processUploads = async (
            uploadsArray,
            targetAttachmentsList,
            progressPrefix,
        ) => {
            if (!uploadsArray || uploadsArray.length === 0) return;

            const totalFiles = uploadsArray.length;
            let completedFiles = 0;

            const uploadPromises = uploadsArray.map((file, index) => {
                return new Promise((resolve, reject) => {
                    const storageRef = ref(storage, `logs/${Date.now()}_${file.name}`);
                    const uploadTask = uploadBytesResumable(storageRef, file);

                    const progressEl = document.getElementById(
                        `${progressPrefix}${index}`,
                    );
                    if (progressEl) progressEl.style.display = "block";

                    uploadTask.on(
                        "state_changed",
                        (snapshot) => {
                            const progress =
                                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

                            // Update individual file progress
                            if (progressEl)
                                progressEl.textContent = Math.round(progress) + "%";

                            // Update global progress (20-70% range for uploads)
                            const baseProgress = 20;
                            const uploadRange = 50;
                            const fileProgress = (completedFiles + (progress / 100)) / totalFiles;
                            const globalProgress = baseProgress + (uploadRange * fileProgress);
                            showProgress(globalProgress, `กำลังอัปโหลด ${file.name}...`);
                        },
                        (error) => {
                            showToast(`อัปโหลดไฟล์ ${file.name} ไม่สำเร็จ`, "warning");
                            reject(error);
                        },
                        async () => {
                            try {
                                const url = await getDownloadURL(uploadTask.snapshot.ref);
                                completedFiles++;
                                resolve({
                                    name: file.name,
                                    url: url,
                                    type: file.type,
                                    size: file.size,
                                    path: uploadTask.snapshot.ref.fullPath,
                                });
                            } catch (err) {
                                reject(err);
                            }
                        },
                    );
                });
            });

            try {
                const newAttachments = await Promise.all(uploadPromises);
                targetAttachmentsList.push(...newAttachments);
            } catch (err) {
                throw new Error("การอัปโหลดไฟล์บางรายการไม่สำเร็จ");
            }
        };

        if (
            typeof pendingUploadsBefore !== "undefined" &&
            pendingUploadsBefore.length > 0
        ) {
            await processUploads(
                pendingUploadsBefore,
                attachmentsBefore,
                "upload-before-progress-",
            );
        }
        if (
            typeof pendingUploadsAfter !== "undefined" &&
            pendingUploadsAfter.length > 0
        ) {
            await processUploads(
                pendingUploadsAfter,
                attachmentsAfter,
                "upload-after-progress-",
            );
        }

        // Upload signed document copies
        const signedDocAttachments = (() => {
            try { return JSON.parse(formData.get("existingSignedDocsJSON") || "[]"); } catch { return []; }
        })();
        if (typeof pendingSignedDocs !== "undefined" && pendingSignedDocs.length > 0) {
            await processUploads(pendingSignedDocs, signedDocAttachments, "upload-signed-doc-progress-");
        }

        showProgress(70, 'กำลังบันทึกข้อมูล...');

        const logData = {
            siteId: formData.get("siteId"),
            date: sanitizeDate(formData.get("date")),
            timeStart: formData.get("timeStart") || "",
            timeEnd: formData.get("timeEnd") || "",
            category: formData.get("category") || "อื่นๆ",
            status: formData.get("status") || (logId ? (state.logs.find(l => l.id === logId)?.status || "Open") : "Open"),
            responderId: formData.get("responderId") || "",
            lineItems: [],
            details: formData.get("objective") || "",
            objective: formData.get("objective"),
            cost: 0,
            attachments: attachments,
            attachmentsBefore: attachmentsBefore,
            attachmentsAfter: attachmentsAfter,
            // Electrical
            voltageL1: formData.get("voltageL1") || "",
            voltageL2: formData.get("voltageL2") || "",
            voltageL3: formData.get("voltageL3") || "",
            currentL1: formData.get("currentL1") || "",
            currentL2: formData.get("currentL2") || "",
            currentL3: formData.get("currentL3") || "",
            // Physical Inspection
            avgWorkTemp: formData.get("avgWorkTemp") || "",
            avgAreaTemp: formData.get("avgAreaTemp") || "",
            avgWorkTempCheck: formData.get("avgWorkTempCheck") || "",
            avgAreaTempCheck: formData.get("avgAreaTempCheck") || "",
            leakPressure: formData.get("leakPressure") || "",
            leakCheck: formData.get("leakCheck") || "",
            // Performance
            complyType5: formData.get("complyType5") || "",
            ciPcdType5: formData.get("ciPcdType5") || "",
            // Cycle Count
            cycleCount: formData.get("cycleCount") || "",
            // Gas Detection
            gasDoor1: formData.get("gasDoor1") || "",
            gasDoor2: formData.get("gasDoor2") || "",
            gasDoor3: formData.get("gasDoor3") || "",
            gas1m1: formData.get("gas1m1") || "",
            gas1m2: formData.get("gas1m2") || "",
            gas1m3: formData.get("gas1m3") || "",
            gas2m1: formData.get("gas2m1") || "",
            gas2m2: formData.get("gas2m2") || "",
            gas2m3: formData.get("gas2m3") || "",
            // Reporter Information
            reporterName: formData.get("reporterName") || "",
            reporterPhone: formData.get("reporterPhone") || "",
            reporterPosition: formData.get("reporterPosition") || "",
            // Customer Information
            customerName: formData.get("customerName") || "",
            customerPhone: formData.get("customerPhone") || "",
            customerPosition: formData.get("customerPosition") || "",
            customerSignature: getCustomerSignatureDataUrl() || formData.get("customerSignatureData") || "",
            useESignature: document.getElementById("use-esignature-toggle")?.checked || false,
            signedDocAttachments: signedDocAttachments,
            // Install/Uninstall fields
            useRamp: formData.get("useRamp") || "",
            rampWidth: formData.get("rampWidth") || "",
            useElevator: formData.get("useElevator") || "",
            elevatorCapacity: formData.get("elevatorCapacity") || "",
            elevatorDoorWidth: formData.get("elevatorDoorWidth") || "",
            elevatorDoorHeight: formData.get("elevatorDoorHeight") || "",
            walkwayWidth: formData.get("walkwayWidth") || "",
            walkwayHeight: formData.get("walkwayHeight") || "",
            doorCount: formData.get("doorCount") ? Number(formData.get("doorCount")) : 0,
            doorSizes: (() => {
                const count = Number(formData.get("doorCount")) || 0;
                const doors = [];
                for (let i = 1; i <= count; i++) {
                    doors.push({ width: formData.get("doorWidth_" + i) || "", height: formData.get("doorHeight_" + i) || "" });
                }
                return doors;
            })(),
            needWiring: formData.get("needWiring") || "",
            needPowerPlug: formData.get("needPowerPlug") || "",
            wireDistance: formData.get("wireDistance") || "",
            needDrillWall: formData.get("needDrillWall") || "",
            wireThroughCeiling: formData.get("wireThroughCeiling") || "",
            hospitalTechName: formData.get("hospitalTechName") || "",
            hospitalTechPhone: formData.get("hospitalTechPhone") || "",
            installType: formData.get("installType") || "",
            // Repair checklist
            repairChecklist: (() => { try { return JSON.parse(formData.get("repairChecklistJSON") || "[]"); } catch (e) { return []; } })(),
            machineStatusAfter: formData.get("machineStatusAfter") || "",
            machineStatusAfterNote: formData.get("machineStatusAfterNote") || "",
            returnProductNote: formData.get("returnProductNote") || "",
            returnProducts: (() => { try { return JSON.parse(formData.get("returnProductJSON") || "[]"); } catch (e) { return []; } })(),
            // Pre-delivery checklist
            precheck_electrical: formData.get("precheck_electrical") || "",
            precheck_electrical_note: formData.get("precheck_electrical_note") || "",
            precheck_wiring: formData.get("precheck_wiring") || "",
            precheck_wiring_note: formData.get("precheck_wiring_note") || "",
            precheck_grounding: formData.get("precheck_grounding") || "",
            precheck_grounding_note: formData.get("precheck_grounding_note") || "",
            precheck_doorMotor: formData.get("precheck_doorMotor") || "",
            precheck_doorMotor_note: formData.get("precheck_doorMotor_note") || "",
            precheck_connectors: formData.get("precheck_connectors") || "",
            precheck_connectors_note: formData.get("precheck_connectors_note") || "",
            precheck_vacuumPump: formData.get("precheck_vacuumPump") || "",
            precheck_vacuumPump_note: formData.get("precheck_vacuumPump_note") || "",
            precheck_leakTest: formData.get("precheck_leakTest") || "",
            precheck_leakTest_note: formData.get("precheck_leakTest_note") || "",
            precheck_chemical: formData.get("precheck_chemical") || "",
            precheck_chemical_note: formData.get("precheck_chemical_note") || "",
            precheck_sensors: formData.get("precheck_sensors") || "",
            precheck_sensors_note: formData.get("precheck_sensors_note") || "",
            precheck_sterilize: formData.get("precheck_sterilize") || "",
            precheck_sterilize_note: formData.get("precheck_sterilize_note") || "",
            precheck_gasResidual: formData.get("precheck_gasResidual") || "",
            precheck_gasResidual_note: formData.get("precheck_gasResidual_note") || "",
            precheck_interior: formData.get("precheck_interior") || "",
            precheck_interior_note: formData.get("precheck_interior_note") || "",
            precheck_exterior: formData.get("precheck_exterior") || "",
            precheck_exterior_note: formData.get("precheck_exterior_note") || "",
            precheckDate: formData.get("precheckDate") || "",
            installDate: formData.get("installDate") || "",
            actionPlan: formData.get("actionPlan") || "",
            // Inspection Checklist
            insp_exteriorCleaning: formData.get("insp_exteriorCleaning") || "",
            insp_interiorCleaning: formData.get("insp_interiorCleaning") || "",
            insp_doorSystem: formData.get("insp_doorSystem") || "",
            insp_footSwitch: formData.get("insp_footSwitch") || "",
            insp_sensor: formData.get("insp_sensor") || "",
            insp_tempPoints: formData.get("insp_tempPoints") || "",
            insp_workingPressure: formData.get("insp_workingPressure") || "",
            insp_rfGenerator: formData.get("insp_rfGenerator") || "",
            insp_chemicalAmount: formData.get("insp_chemicalAmount") || "",
            insp_airChargingValue: formData.get("insp_airChargingValue") || "",
            insp_filter: formData.get("insp_filter") || "",
            insp_decomposer: formData.get("insp_decomposer") || "",
            insp_vacuumPumpOil: formData.get("insp_vacuumPumpOil") || "",
            insp_connectors: formData.get("insp_connectors") || "",
            insp_drainTank: formData.get("insp_drainTank") || "",
            insp_gasDoor: formData.get("insp_gasDoor") || "",
            insp_gas1m: formData.get("insp_gas1m") || "",
            insp_gas2m: formData.get("insp_gas2m") || "",
            insp_chemicalLine: formData.get("insp_chemicalLine") || "",
            insp_phaseRelay: formData.get("insp_phaseRelay") || "",
            insp_systemRelay: formData.get("insp_systemRelay") || "",
        };

        // Add case ID for new logs (use pre-generated ID from form)
        if (!logId) {
            const form = document.getElementById("form-log-maintenance");
            logData.caseId = form.dataset.generatedCaseId || FirestoreService.generateCaseId();
            console.log('[handleLogMaintenance] Using case ID:', logData.caseId);
        }

        if (logData.cost < 0) {
            btn.textContent = originalText;
            btn.disabled = false;
            await showDialog("ค่าใช้จ่ายไม่สามารถติดลบได้", {
                title: "ข้อมูลไม่ถูกต้อง",
            });
            return;
        }

        // Remove legacy fields
        // logData.attachmentUrl = null;
        // logData.attachmentName = null;

        let isNewlyCompleted = false;
        let isNewlyCancelled = false;
        let existingLog = null; // Declare at function scope

        if (logId) {
            // Check if status newly transitioned to Case Closed
            existingLog = state.logs.find((l) => l.id === logId);
            console.log('[handleLogMaintenance] Found existing log:', existingLog ? 'YES' : 'NO', existingLog?.id);

            if (
                existingLog &&
                existingLog.status !== "Case Closed" &&
                logData.status === "Case Closed"
            ) {
                isNewlyCompleted = true;
            }

            // Check if status newly transitioned to Cancel
            if (
                existingLog &&
                existingLog.status !== "Cancel" &&
                logData.status === "Cancel"
            ) {
                isNewlyCancelled = true;
            }

            // Update status history if status changed
            if (existingLog && existingLog.status !== logData.status) {
                if (!existingLog.statusHistory) {
                    existingLog.statusHistory = {};
                }
                existingLog.statusHistory[logData.status] = new Date().toISOString();
                logData.statusHistory = existingLog.statusHistory;
            } else if (existingLog && existingLog.statusHistory) {
                // Keep existing status history
                logData.statusHistory = existingLog.statusHistory;
            }

            logData.updatedBy = paramUser;

            // Detect and log changes
            const changes = [];
            const fieldLabels = {
                siteId: 'สถานที่',
                date: 'วันที่',
                category: 'หมวดหมู่',
                objective: 'คำอธิบายงาน',
                status: 'สถานะ',
                responderId: 'เจ้าหน้าที่ช่างบริการ',
                cost: 'ค่าใช้จ่าย'
            };

            const statusLabels = {
                'Open': 'เปิดงาน',
                'On Process': 'กำลังดำเนินการ',
                'Done': 'เสร็จสิ้น',
                'Case Closed': 'ปิดเคส',
                'Cancel': 'ยกเลิก'
            };
            if (existingLog) {
                console.log('[Change Detection] existingLog found:', {
                    id: existingLog.id,
                    siteId: existingLog.siteId,
                    date: existingLog.date,
                    category: existingLog.category,
                    objective: existingLog.objective,
                    status: existingLog.status,
                    cost: existingLog.cost,
                    lineItems: existingLog.lineItems
                });
                console.log('[Change Detection] logData (new):', {
                    siteId: logData.siteId,
                    date: logData.date,
                    category: logData.category,
                    objective: logData.objective,
                    status: logData.status,
                    cost: logData.cost,
                    lineItems: logData.lineItems
                });

                // Check site change
                if (existingLog.siteId !== logData.siteId) {
                    const oldSite = state.sites.find(s => s.id === existingLog.siteId);
                    const newSite = state.sites.find(s => s.id === logData.siteId);
                    const changeMsg = `${fieldLabels.siteId}: ${oldSite?.name || '-'} → ${newSite?.name || '-'}`;
                    console.log('[Change Detection] Site changed:', changeMsg);
                    changes.push(changeMsg);
                }

                // Check date change
                if (existingLog.date !== logData.date) {
                    // Format dates in Thai format for better readability
                    const formatDate = (dateStr) => {
                        if (!dateStr) return '-';
                        const d = new Date(dateStr);
                        return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
                    };
                    changes.push(`${fieldLabels.date}: ${formatDate(existingLog.date)} → ${formatDate(logData.date)}`);
                }

                // Check category change
                if (existingLog.category !== logData.category) {
                    changes.push(`${fieldLabels.category}: ${existingLog.category} → ${logData.category}`);
                }

                // Check objective change
                if (existingLog.objective !== logData.objective) {
                    const oldObj = existingLog.objective || '-';
                    const newObj = logData.objective || '-';
                    // Show abbreviated version if too long
                    const oldDisplay = oldObj.length > 50 ? oldObj.substring(0, 47) + '...' : oldObj;
                    const newDisplay = newObj.length > 50 ? newObj.substring(0, 47) + '...' : newObj;
                    changes.push(`${fieldLabels.objective}: ${oldDisplay} → ${newDisplay}`);
                }

                // Check status change
                if (existingLog.status !== logData.status) {
                    const oldStatus = statusLabels[existingLog.status] || existingLog.status;
                    const newStatus = statusLabels[logData.status] || logData.status;
                    changes.push(`${fieldLabels.status}: ${oldStatus} → ${newStatus}`);
                    if (logData.status === 'Cancel' && window._pendingCancelReason) {
                        changes.push(`เหตุผลที่ยกเลิก: ${window._pendingCancelReason}`);
                    }
                }

                // Check responder change
                if ((existingLog.responderId || '') !== (logData.responderId || '')) {
                    const oldResponder = existingLog.responderId && state.users && state.users[existingLog.responderId]
                        ? state.users[existingLog.responderId].displayName || state.users[existingLog.responderId].email || '-'
                        : '-';
                    const newResponder = logData.responderId && state.users && state.users[logData.responderId]
                        ? state.users[logData.responderId].displayName || state.users[logData.responderId].email || '-'
                        : '-';
                    changes.push(`${fieldLabels.responderId}: ${oldResponder} → ${newResponder}`);
                }

                // Check cost/line items change
                const oldCost = existingLog.lineItems && existingLog.lineItems.length > 0
                    ? existingLog.lineItems.reduce((s, li) => s + (li.cost || 0), 0)
                    : existingLog.cost || 0;
                const newCost = logData.lineItems && logData.lineItems.length > 0
                    ? logData.lineItems.reduce((s, li) => s + (li.cost || 0), 0)
                    : logData.cost || 0;

                if (oldCost !== newCost) {
                    const fmt = (v) => new Intl.NumberFormat(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    }).format(v || 0);
                    changes.push(`${fieldLabels.cost}: ${fmt(oldCost)} บาท → ${fmt(newCost)} บาท`);
                }

                // Check line items changes (only if actual content changed)
                const oldItems = existingLog.lineItems || [];
                const newItems = logData.lineItems || [];
                const normalizeItems = (items) => items.map(i => ({ item: (i.item || '').trim(), cost: i.cost || 0 })).filter(i => i.item || i.cost);
                const oldNorm = normalizeItems(oldItems);
                const newNorm = normalizeItems(newItems);
                if (JSON.stringify(oldNorm) !== JSON.stringify(newNorm)) {
                    if (oldNorm.length !== newNorm.length) {
                        changes.push(`จำนวนรายการ: ${oldNorm.length} รายการ → ${newNorm.length} รายการ`);
                    } else {
                        changes.push(`รายการค่าใช้จ่าย: แก้ไขรายการ`);
                    }
                }

                // Track extra UI fields
                const extraFields = [
                    'actionPlan', 'walkwayWidth', 'walkwayHeight', 'doorCount', 'useRamp', 'rampWidth',
                    'useElevator', 'elevatorCapacity', 'elevatorDoorWidth', 'elevatorDoorHeight',
                    'installDate', 'returnProductNote', 'precheckDate', 'reporterName', 'reporterPhone', 'reporterPosition', 'customerName', 'customerPhone',
                    'customerPosition', 'timeStart', 'timeEnd', 'installType', 'machineStatusAfter',
                    'machineStatusAfterNote', 'needWiring', 'needPowerPlug', 'wireDistance',
                    'needDrillWall', 'wireThroughCeiling', 'hospitalTechName', 'hospitalTechPhone'
                ];
                const extraLabels = {
                    actionPlan: 'แนวทางการดำเนินงาน', walkwayWidth: 'ความกว้างช่องทางเดิน', walkwayHeight: 'ความสูงช่องทางเดิน',
                    doorCount: 'จำนวนประตูที่ต้องผ่าน', useRamp: 'ต้องใช้ทางลาด', rampWidth: 'ความกว้างทางลาด',
                    useElevator: 'ต้องใช้ลิฟต์', elevatorCapacity: 'น้ำหนักลิฟต์ที่รับได้', elevatorDoorWidth: 'ความกว้างประตูลิฟต์',
                    elevatorDoorHeight: 'ความสูงประตูลิฟต์', installDate: 'วันเวลาติดตั้ง/รื้อถอน', returnProductNote: 'หมายเหตุการรับสินค้ากลับ',
                    precheckDate: 'วันที่ตรวจสอบรายละเอียดก่อนส่งมอบ', reporterName: 'ชื่อผู้แจ้ง', reporterPhone: 'เบอร์โทรผู้แจ้ง', reporterPosition: 'ตำแหน่งผู้แจ้ง', customerName: 'ชื่อลูกค้า', customerPhone: 'เบอร์โทรลูกค้า', customerPosition: 'ตำแหน่งลูกค้า',
                    timeStart: 'เวลาเริ่มปฏิบัติงาน', timeEnd: 'เวลาเสร็จสิ้นภารกิจ', installType: 'ประเภทการติดตั้ง/รื้อถอน',
                    machineStatusAfter: 'สถานะเครื่องหลังซ่อม', machineStatusAfterNote: 'หมายเหตุสถานะเครื่อง',
                    needWiring: 'ต้องเดินสายไฟ', needPowerPlug: 'ต้องเดิน Power Plug', wireDistance: 'ระยะจากตู้ไฟไปยังเครื่อง',
                    needDrillWall: 'เจาะกำแพง', wireThroughCeiling: 'สายไฟเดินลอดฝ้า', hospitalTechName: 'ชื่อช่างโรงพยาบาล', hospitalTechPhone: 'เบอร์ช่างโรงพยาบาล'
                };

                const formatValue = (v) => {
                    if (v === 'yes') return 'ใช่';
                    if (v === 'no') return 'ไม่ใช่';
                    if (v === 'pass') return 'ผ่าน';
                    if (v === 'fail') return 'ไม่ผ่าน';
                    if (v === 'noneed') return 'ไม่จำเป็น';
                    if (v === 'pending') return 'รอตรวจ';
                    if (v === 'ready') return 'พร้อมใช้งาน';
                    if (v === 'not_ready') return 'ไม่พร้อมใช้งาน';
                    return v || '-';
                };

                extraFields.forEach(f => {
                    const oldV = existingLog[f] || '';
                    const newV = logData[f] || '';
                    if (String(oldV) !== String(newV)) {
                        const oldDisplay = formatValue(oldV);
                        const newDisplay = formatValue(newV);
                        const truncatedOld = String(oldDisplay).length > 50 ? String(oldDisplay).substring(0, 47) + '...' : oldDisplay;
                        const truncatedNew = String(newDisplay).length > 50 ? String(newDisplay).substring(0, 47) + '...' : newDisplay;
                        changes.push(`${extraLabels[f]}: ${truncatedOld} → ${truncatedNew}`);
                    }
                });

                // Missing complex fields
                if (JSON.stringify(existingLog.repairChecklist || []) !== JSON.stringify(logData.repairChecklist || [])) {
                    changes.push(`รายการที่ซ่อม: มีการเปลี่ยนแปลง`);
                }
                if (JSON.stringify(existingLog.returnProducts || []) !== JSON.stringify(logData.returnProducts || [])) {
                    changes.push(`รายการสินค้ารับกลับ: มีการเปลี่ยนแปลง`);
                }
                if (JSON.stringify(existingLog.doorSizes || []) !== JSON.stringify(logData.doorSizes || [])) {
                    changes.push(`ขนาดประตู: มีการเปลี่ยนแปลง`);
                }

                // Precheck fields
                const precheckFields = ['precheck_electrical', 'precheck_wiring', 'precheck_grounding', 'precheck_doorMotor', 'precheck_connectors', 'precheck_vacuumPump', 'precheck_leakTest', 'precheck_chemical', 'precheck_sensors', 'precheck_sterilize', 'precheck_gasResidual', 'precheck_interior', 'precheck_exterior'];
                const precheckLabels = {
                    'precheck_electrical': 'ระบบไฟฟ้าภายในเครื่อง', 'precheck_wiring': 'ระบบการเดินสายไฟ', 'precheck_grounding': 'ระบบสายดิน',
                    'precheck_doorMotor': 'ระบบประตู, มอเตอร์', 'precheck_connectors': 'ระบบข้อต่อ', 'precheck_vacuumPump': 'ระบบปั้มสุญญากาศ',
                    'precheck_leakTest': 'การตรวจการรั่วไหล', 'precheck_chemical': 'การตรวจปริมาณน้ำยาที่ฉีด', 'precheck_sensors': 'ระบบ Sensor ต่างๆ',
                    'precheck_sterilize': 'การตรวจ Sterilize ด้วย CI, CI PCD', 'precheck_gasResidual': 'การตรวจปริมาณแก๊สตกค้าง',
                    'precheck_interior': 'การตรวจความเรียบร้อยภายในเครื่อง', 'precheck_exterior': 'การตรวจความเรียบร้อยภายนอกเครื่อง'
                };
                precheckFields.forEach(f => {
                    if ((existingLog[f] || '') !== (logData[f] || '')) {
                        changes.push(`ตรวจสอบ ${precheckLabels[f]}: ${existingLog[f] || '-'} → ${logData[f] || '-'}`);
                    }
                    if ((existingLog[f + '_note'] || '') !== (logData[f + '_note'] || '')) {
                        changes.push(`หมายเหตุ ${precheckLabels[f]}: ${existingLog[f + '_note'] || '-'} → ${logData[f + '_note'] || '-'}`);
                    }
                });

                // Check electrical fields
                const elecFields = ['voltageL1', 'voltageL2', 'voltageL3', 'currentL1', 'currentL2', 'currentL3'];
                const elecLabels = { voltageL1: 'แรงดัน R', voltageL2: 'แรงดัน S', voltageL3: 'แรงดัน T', currentL1: 'กระแส R', currentL2: 'กระแส S', currentL3: 'กระแส T' };
                elecFields.forEach(f => {
                    if ((existingLog[f] || '') !== (logData[f] || '')) changes.push(`${elecLabels[f]}: ${existingLog[f] || '-'} → ${logData[f] || '-'}`);
                });

                // Check physical inspection
                const physFields = ['avgWorkTemp', 'avgAreaTemp', 'leakPressure', 'avgWorkTempCheck', 'avgAreaTempCheck', 'leakCheck'];
                const physLabels = { avgWorkTemp: 'อุณหภูมิทำงาน', avgAreaTemp: 'อุณหภูมิพื้นที่', leakPressure: 'ความดันรั่วไหล', avgWorkTempCheck: 'ผลอุณหภูมิทำงาน', avgAreaTempCheck: 'ผลอุณหภูมิพื้นที่', leakCheck: 'ผลการรั่วไหล' };
                physFields.forEach(f => {
                    if ((existingLog[f] || '') !== (logData[f] || '')) changes.push(`${physLabels[f]}: ${existingLog[f] || '-'} → ${logData[f] || '-'}`);
                });

                // Check performance
                if ((existingLog.complyType5 || '') !== (logData.complyType5 || '')) changes.push(`Comply Type 5: ${existingLog.complyType5 || '-'} → ${logData.complyType5 || '-'}`);
                if ((existingLog.ciPcdType5 || '') !== (logData.ciPcdType5 || '')) changes.push(`CI PCD Type 5: ${existingLog.ciPcdType5 || '-'} → ${logData.ciPcdType5 || '-'}`);

                // Check cycle count
                if ((existingLog.cycleCount || '') !== (logData.cycleCount || '')) changes.push(`จำนวนรอบ: ${existingLog.cycleCount || '-'} → ${logData.cycleCount || '-'}`);

                // Check inspection checklist
                const inspKeys = ['insp_exteriorCleaning', 'insp_interiorCleaning', 'insp_doorSystem', 'insp_footSwitch', 'insp_sensor', 'insp_tempPoints', 'insp_workingPressure', 'insp_rfGenerator', 'insp_chemicalAmount', 'insp_airChargingValue', 'insp_filter', 'insp_decomposer', 'insp_vacuumPumpOil', 'insp_connectors', 'insp_drainTank', 'insp_gasDoor', 'insp_gas1m', 'insp_gas2m'];
                const inspLabelMap = { check: 'Check', service: 'Service', replace: 'Replace' };
                inspKeys.forEach(k => {
                    if ((existingLog[k] || '') !== (logData[k] || '')) {
                        const label = k.replace('insp_', '').replace(/([A-Z])/g, ' $1').trim();
                        changes.push(`${label}: ${inspLabelMap[existingLog[k]] || existingLog[k] || '-'} → ${inspLabelMap[logData[k]] || logData[k] || '-'}`);
                    }
                });

                // Check photo changes
                if (JSON.stringify(existingLog.installPhotos || []) !== JSON.stringify(installPhotoPending)) {
                    changes.push(`รูปถ่ายการดำเนินงาน: มีการเปลี่ยนแปลง`);
                }
                if (JSON.stringify(existingLog.preInstallPhotos || []) !== JSON.stringify(preInstallPhotoPending)) {
                    changes.push(`รูปถ่ายก่อนดำเนินงาน: มีการเปลี่ยนแปลง`);
                }
            }

            await FirestoreService.updateLog(logId, logData);

            // Upload/update install photos
            // Always update if editing an existing log that had photos, or if there are pending photos
            const hadInstallPhotos = existingLog && existingLog.installPhotos && existingLog.installPhotos.length > 0;
            const hadPreInstallPhotos = existingLog && existingLog.preInstallPhotos && existingLog.preInstallPhotos.length > 0;
            const hadRepairPhotos = existingLog && existingLog.repairPhotos && existingLog.repairPhotos.length > 0;
            const hadDescriptionAttachments = existingLog && existingLog.descriptionAttachments && existingLog.descriptionAttachments.length > 0;

            const hasInstallChanges = installPhotoPending.length > 0 || hadInstallPhotos;
            const hasPreInstallChanges = preInstallPhotoPending.length > 0 || hadPreInstallPhotos;
            const hasRepairChanges = repairPhotoPending.length > 0 || hadRepairPhotos;
            const hasDescriptionChanges = descriptionAttachments.length > 0 || hadDescriptionAttachments;

            if (hasInstallChanges || hasPreInstallChanges || hasRepairChanges || hasDescriptionChanges) {
                try {
                    var photoUpdate = {};
                    if (hasInstallChanges) {
                        photoUpdate.installPhotos = await uploadPhotoArray(installPhotoPending, logId, 'install');
                        installPhotoPending = []; window.installPhotoPending = installPhotoPending;
                    }
                    if (hasPreInstallChanges) {
                        photoUpdate.preInstallPhotos = await uploadPhotoArray(preInstallPhotoPending, logId, 'preinstall');
                        preInstallPhotoPending = []; window.preInstallPhotoPending = preInstallPhotoPending;
                    }
                    if (hasRepairChanges) {
                        photoUpdate.repairPhotos = await uploadPhotoArray(repairPhotoPending, logId, 'repair');
                        repairPhotoPending = []; window.repairPhotoPending = repairPhotoPending;
                    }
                    if (hasDescriptionChanges) {
                        photoUpdate.descriptionAttachments = await uploadPhotoArray(descriptionAttachments, logId, 'description');
                        descriptionAttachments = []; window.descriptionAttachments = descriptionAttachments;
                    }
                    await FirestoreService.updateLog(logId, photoUpdate);
                } catch (photoErr) { console.error('Photo upload failed:', photoErr); }
            }

            console.log('[Change Detection] Changes detected:', changes.length, changes);

            // Add change log comment if there are changes
            if (changes.length > 0 && existingLog) {
                console.log('[Change Log] Adding system comment with changes');
                const changeLogComment = {
                    text: changes.map(c => `• ${c}`).join('\n'),
                    author: paramUser,
                    authorId: user.uid,
                    photoURL: user.photoURL || '',
                    timestamp: new Date().toISOString(),
                    attachments: [],
                    isSystemLog: true
                };

                console.log('[Change Log] Change log comment:', changeLogComment);

                const existingComments = existingLog.comments || [];
                const updatedCommentsWithLog = [...existingComments, changeLogComment];
                console.log('[Change Log] Updating comments array, old length:', existingComments.length, 'new length:', updatedCommentsWithLog.length);

                try {
                    await FirestoreService.updateLog(logId, { comments: updatedCommentsWithLog });
                    console.log('[Change Log] Successfully updated comments in Firestore');
                    console.log('[Change Log] Comment text:', changeLogComment.text);

                    // Update existingLog.comments so the next section uses the updated array
                    existingLog.comments = updatedCommentsWithLog;

                    // Also update state.logs to reflect the change immediately
                    const logInState = state.logs.find(l => l.id === logId);
                    if (logInState) {
                        logInState.comments = updatedCommentsWithLog;
                        console.log('[Change Log] Updated state.logs with new comments');
                    }

                    // Show a toast to confirm the change log was added
                    showToast(`บันทึกการเปลี่ยนแปลง ${changes.length} รายการ`, "info");
                } catch (error) {
                    console.error('[Change Log] Error updating comments:', error);
                }
            } else {
                console.log('[Change Log] No changes detected or no existing log, skipping change log comment. Changes:', changes.length, 'existingLog:', !!existingLog);
            }

            // Update first comment (description) if editing
            const descriptionText = document.getElementById('log-description')?.value.trim();

            if (existingLog) {
                const existingComments = existingLog.comments || [];
                let updatedComments = [...existingComments];

                // Prepare new/updated first comment
                if (descriptionText || descriptionAttachments.length > 0) {
                    const commentData = {
                        text: descriptionText || "",
                        author: paramUser,
                        authorId: user.uid,
                        photoURL: user.photoURL || '',
                        timestamp: existingComments[0]?.timestamp || new Date().toISOString(), // Keep original timestamp if exists
                        attachments: []
                    };

                    // Handle attachments
                    const newAttachments = descriptionAttachments.filter(att => !att.isExisting);
                    const existingAttachments = descriptionAttachments.filter(att => att.isExisting);

                    // Upload new attachments
                    if (newAttachments.length > 0) {
                        const uploadPromises = newAttachments.map(async (file) => {
                            const path = `comments/${logId}/${Date.now()}_${file.name}`;
                            const url = await FirestoreService.uploadFile(file, path);
                            return {
                                name: file.name,
                                url: url,
                                type: file.type,
                                size: file.size
                            };
                        });
                        const uploadedAttachments = await Promise.all(uploadPromises);
                        commentData.attachments = [...existingAttachments, ...uploadedAttachments];
                    } else {
                        commentData.attachments = existingAttachments;
                    }

                    // Update or create first comment
                    if (updatedComments.length > 0) {
                        updatedComments[0] = commentData;
                    } else {
                        updatedComments = [commentData];
                    }

                    await FirestoreService.updateLog(logId, { comments: updatedComments });

                    // Clear description attachments
                    descriptionAttachments = [];
                    updateDescriptionAttachmentPreview();
                } else if (updatedComments.length > 0 && updatedComments[0]) {
                    // If description is empty, remove first comment
                    updatedComments.shift();
                    await FirestoreService.updateLog(logId, { comments: updatedComments });
                }
            }

            // Execute Deletions Only After Successful Update
            if (
                typeof pendingDeletions !== "undefined" &&
                pendingDeletions.length > 0
            ) {
                console.log("Processing pending file deletions...", pendingDeletions);
                for (const path of pendingDeletions) {
                    try {
                        const fileRef = ref(storage, path);
                        await deleteObject(fileRef);
                        console.log("Deleted file:", path);
                    } catch (delErr) {
                        console.warn("Failed to delete file from storage:", path, delErr);
                        // Non-blocking
                    }
                }
            }

            // Check if category changed from Maintenance to something else
            if (existingLog &&
                (isMaCategory(existingLog.category)) &&
                !isMaCategory(logData.category) &&
                logData.category !== "อื่นๆ") {

                console.log('[Category Change] Maintenance case changed to non-maintenance category');

                // Check if this site has a maintenance cycle and no active maintenance case
                const site = state.sites.find((s) => s.id === logData.siteId);
                if (site && site.maintenanceCycle && site.maintenanceCycle > 0) {
                    const siteLogs = await FirestoreService.fetchLogsForSite(site.id);
                    const hasActiveMaintenance = siteLogs.some((l) =>
                        l.id !== logId && // Exclude current log
                        (isMaCategory(l.category)) &&
                        l.status !== "Cancel" &&
                        l.status !== "Done" &&
                        l.status !== "Completed" &&
                        l.status !== "Case Closed"
                    );

                    if (!hasActiveMaintenance) {
                        console.log('[Category Change] No active maintenance case, creating new one');

                        // Find all maintenance logs for this site (excluding the current one being changed)
                        const siteMaLogs = siteLogs.filter(
                            (l) => l.id !== logId && // Exclude current log being changed
                                (isMaCategory(l.category) || l.objective?.includes("รอบซ่อมบำรุง"))
                        ).sort((a, b) => new Date(b.date) - new Date(a.date));

                        // The cycle number should be based on remaining MA cases only
                        const nextCycleNum = siteMaLogs.length + 1;

                        const latestClosedCase = siteMaLogs.find(l =>
                            l.status === "Case Closed" ||
                            l.status === "Done" ||
                            l.status === "Cancel"
                        );

                        // Use the current log's date as base if it was the latest, otherwise use latest closed case
                        const baseDate = latestClosedCase ? new Date(latestClosedCase.date) : new Date(existingLog.date);

                        if (!isNaN(baseDate.getTime())) {
                            baseDate.setDate(baseDate.getDate() + site.maintenanceCycle);
                            const nextDateStr = baseDate.toISOString().split("T")[0];

                            // Check if next maintenance date is beyond insurance end date
                            if (site.insuranceEndDate) {
                                const insuranceEndDate = new Date(site.insuranceEndDate);
                                if (baseDate > insuranceEndDate) {
                                    console.log('[Category Change] Skipped - next maintenance date is beyond insurance end date');
                                    return;
                                }
                            }

                            const nextLogData = {
                                siteId: site.id,
                                date: nextDateStr,
                                category: "บำรุงรักษาตามรอบ",
                                status: "Open",
                                lineItems: [],
                                details: "-",
                                objective: `รอบซ่อมบำรุงตามกำหนด (${site.maintenanceCycle} วัน)`,
                                cost: 0,
                                attachments: [],
                                recordedBy: "System",
                                timestamp: new Date().toISOString(),
                                comments: [{
                                    text: `ซ่อมบำรุงตามรอบ (ครั้งที่ ${nextCycleNum})`,
                                    author: "System",
                                    authorId: "system",
                                    photoURL: "",
                                    timestamp: new Date().toISOString(),
                                    attachments: []
                                }]
                            };

                            try {
                                await FirestoreService.addLog(nextLogData);
                                console.log('[Category Change] Created new maintenance case');
                                showToast("สร้างเคสซ่อมบำรุงใหม่อัตโนมัติแล้ว", "info");
                            } catch (err) {
                                console.error("Failed to create maintenance case:", err);
                            }
                        }
                    } else {
                        console.log('[Category Change] Active maintenance case exists, skipping');
                    }
                }
            }

            showToast("อัปเดตบันทึกสำเร็จ", "success");
        } else {
            console.log('[handleLogMaintenance] Creating new log with data:', logData);
            if (logData.status === "Case Closed") {
                isNewlyCompleted = true;
            }
            if (logData.status === "Cancel") {
                isNewlyCancelled = true;
            }

            // Initialize status history for new log
            logData.statusHistory = {
                [logData.status]: new Date().toISOString()
            };

            logData.recordedBy = paramUser;
            logData.recorderId = recorderId;
            logData.timestamp = new Date().toISOString();
            const newLogId = await FirestoreService.addLog(logData);
            console.log('[handleLogMaintenance] New log created with ID:', newLogId, 'Case ID:', logData.caseId);

            // Add initial comment from description if provided
            const descriptionText = document.getElementById('log-description')?.value.trim();
            if (descriptionText || descriptionAttachments.length > 0) {
                try {
                    const commentData = {
                        text: descriptionText || "",
                        author: paramUser,
                        authorId: user.uid,
                        photoURL: user.photoURL || '',
                        timestamp: new Date().toISOString(),
                        attachments: []
                    };

                    const newAttachments = descriptionAttachments.filter(att => !att.isExisting);
                    if (newAttachments.length > 0) {
                        const uploadPromises = newAttachments.map(async (file) => {
                            const path = `comments/${newLogId}/${Date.now()}_${file.name}`;
                            const url = await FirestoreService.uploadFile(file, path);
                            return { name: file.name, url: url, type: file.type, size: file.size };
                        });
                        commentData.attachments = await Promise.all(uploadPromises);
                    }

                    const comments = [commentData];
                    const inspSummary = buildInspectionSummary(logData);
                    if (inspSummary) {
                        comments.push({ text: inspSummary, author: "System", authorId: "system", photoURL: "", timestamp: new Date().toISOString(), attachments: [], isSystemLog: true });
                    }
                    await FirestoreService.updateLog(newLogId, { comments });
                    descriptionAttachments = [];
                    updateDescriptionAttachmentPreview();
                } catch (commentErr) {
                    console.error("Failed to add initial comment:", commentErr);
                }
            } else {
                const inspSummary = buildInspectionSummary(logData);
                if (inspSummary) {
                    try { await FirestoreService.updateLog(newLogId, { comments: [{ text: inspSummary, author: "System", authorId: "system", photoURL: "", timestamp: new Date().toISOString(), attachments: [], isSystemLog: true }] }); } catch (e) { }
                }
            }

            showToast("บันทึกการบำรุงรักษาสำเร็จ", "success");

            // Upload install photos if any
            if (installPhotoPending.length > 0 || preInstallPhotoPending.length > 0) {
                try {
                    var photoUpdate = {};
                    if (installPhotoPending.length > 0) {
                        photoUpdate.installPhotos = await uploadPhotoArray(installPhotoPending, newLogId, 'install');
                        installPhotoPending = []; window.installPhotoPending = installPhotoPending;
                    }
                    if (preInstallPhotoPending.length > 0) {
                        photoUpdate.preInstallPhotos = await uploadPhotoArray(preInstallPhotoPending, newLogId, 'preinstall');
                        preInstallPhotoPending = []; window.preInstallPhotoPending = preInstallPhotoPending;
                    }
                    await FirestoreService.updateLog(newLogId, photoUpdate);
                } catch (photoErr) { console.error('Photo upload failed:', photoErr); }
            }
        }



        showProgress(90, 'กำลังรีเฟรชข้อมูล...');

        await refreshData();

        // Auto-create next maintenance case if this one was just closed/cancelled
        // BUG FIX: run AFTER refreshData() so state.logs has the updated status
        if ((isNewlyCompleted || isNewlyCancelled) && logData.siteId) {
            try {
                const created = await checkAndAutoCreateMaintenanceCase(logData.siteId);
                if (created) await refreshData(); // reload to show new case
            } catch (autoMaErr) {
                console.warn('[AutoMA] Check after save failed:', autoMaErr);
            }
        }

        // Refresh Calendar if active
        if (calendarState.view === "calendar") {
            await fetchAndRenderCalendar();
        }

        showProgress(100, 'เสร็จสิ้น!');

        // Hide progress after a short delay
        setTimeout(() => hideProgress(), 500);

        switchView("engineer-view");
        toggleModal("logMaintenance", false);

        // Safe Reset
        resetLogForm();
    } catch (error) {
        console.error("Error logging maintenance:", error);
        hideProgress();
        showToast("เกิดข้อผิดพลาด: " + error.message, "error", 5000);
        await showDialog("เกิดข้อผิดพลาด: " + error.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
        window._pendingCancelReason = null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO MAINTENANCE CASE CREATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether a new maintenance case should be auto-created for a given site,
 * and creates one if all conditions are met:
 *  1. Site has maintenanceCycle > 0
 *  2. Today is within the insurance period (insuranceStartDate – insuranceEndDate)
 *  3. No open (non-closed, non-cancelled) MA case already exists
 *  4. Next due date (last closed MA date + cycle) is still within insurance period
 *
 * If no closed MA case exists, the base date is firstMaDate → installationDate → today.
 *
 * @param {string} siteId
 * @returns {Promise<boolean>} true if a new case was created
 */
async function checkAndAutoCreateMaintenanceCase(siteId) {
    try {
        const site = state.sites.find(s => s.id === siteId);
        if (!site) { console.log('[AutoMA] site not found:', siteId); return false; }
        if (!site.maintenanceCycle || site.maintenanceCycle <= 0) {
            console.log(`[AutoMA] ${site.name}: no maintenanceCycle, skipping`);
            return false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Must be within insurance period
        if (site.insuranceStartDate) {
            const insStart = new Date(site.insuranceStartDate);
            insStart.setHours(0, 0, 0, 0);
            if (today < insStart) {
                console.log(`[AutoMA] ${site.name}: before insurance start (${site.insuranceStartDate}), skipping`);
                return false;
            }
        }
        if (site.insuranceEndDate) {
            const insEnd = new Date(site.insuranceEndDate);
            insEnd.setHours(23, 59, 59, 999);
            if (today > insEnd) {
                console.log(`[AutoMA] ${site.name}: insurance expired (${site.insuranceEndDate}), skipping`);
                return false;
            }
        }

        // ── Always fetch FRESH data from Firestore to avoid stale state.logs ──
        const freshLogs = await FirestoreService.fetchLogsForSite(siteId);
        console.log(`[AutoMA] ${site.name}: fetched ${freshLogs.length} fresh logs`);

        // Sort: newest date first, then newest timestamp first
        const sortDesc = (a, b) => {
            const d = new Date(b.date) - new Date(a.date);
            return d !== 0 ? d : new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        };

        // Gather only scheduled MA-category logs
        const maLogs = freshLogs
            .filter(l => l.category === 'บำรุงรักษาตามรอบ' || l.category === 'ตามสัญญาจ้าง' || l.category === 'ตามใบสั่งซื้อ')
            .sort(sortDesc);

        console.log(`[AutoMA] ${site.name}: maLogs count = ${maLogs.length}`, maLogs.map(l => ({ id: l.id, caseId: l.caseId, date: l.date, status: l.status })));

        // ── KEY GUARD ──────────────────────────────────────────────────────────
        // Check if there is ANY active MA-category case that is not closed yet.
        // Other categories (ซ่อม, ติดตั้ง, รื้อถอน) do NOT block MA creation.
        const hasActiveMa = maLogs.some(l =>
            l.status !== 'Case Closed' &&
            l.status !== 'Cancel'
        );
        if (hasActiveMa) {
            console.log(`[AutoMA] ${site.name}: there is an active MA case open, skipping`);
            return false;
        }
        // ──────────────────────────────────────────────────────────────────────

        // Find last closed MA case (for base-date calculation)
        const lastClosedMA = maLogs.find(l =>
            l.status === 'Case Closed' ||
            l.status === 'Done' ||
            l.status === 'Completed'
        );

        let baseDate;
        let useImmediateDate = false;

        if (lastClosedMA) {
            // Count forward from the last closed MA case
            baseDate = new Date(lastClosedMA.date);
            console.log(`[AutoMA] ${site.name}: baseDate from lastClosedMA = ${lastClosedMA.date}`);
        } else {
            // No closed MA case → create immediately from anchor date (no cycle offset)
            useImmediateDate = true;
            // Fallback: firstMaDate → oldest MA log date → installationDate → today
            const oldestMaDate = maLogs.length > 0
                ? [...maLogs].sort((a, b) => new Date(a.date) - new Date(b.date))[0]?.date
                : null;
            const anchor = site.firstMaDate || oldestMaDate || site.installationDate;
            baseDate = anchor ? new Date(anchor) : new Date(today);
            console.log(`[AutoMA] ${site.name}: useImmediateDate=true, anchor = ${anchor || 'today'}`);
        }

        if (isNaN(baseDate.getTime())) {
            console.warn(`[AutoMA] ${site.name}: invalid base date, skipping`);
            return false;
        }

        baseDate.setHours(0, 0, 0, 0);

        const nextDate = new Date(baseDate);
        if (!useImmediateDate) {
            nextDate.setDate(nextDate.getDate() + site.maintenanceCycle);
        }

        const nextDateStr = nextDate.toISOString().split('T')[0];
        console.log(`[AutoMA] ${site.name}: nextDate = ${nextDateStr}, cycle = ${site.maintenanceCycle} days`);

        // Guard: must not exceed insurance end
        if (site.insuranceEndDate) {
            const insEnd = new Date(site.insuranceEndDate);
            insEnd.setHours(23, 59, 59, 999);
            if (nextDate > insEnd) {
                console.log(`[AutoMA] ${site.name}: nextDate (${nextDateStr}) exceeds insurance end (${site.insuranceEndDate}), skipping`);
                return false;
            }
        }

        // Guard: prevent exact-date duplicates
        const duplicate = maLogs.some(l => l.date && l.date.startsWith(nextDateStr));
        if (duplicate) {
            console.log(`[AutoMA] ${site.name}: case already exists for ${nextDateStr}, skipping`);
            return false;
        }

        const cycleNum = maLogs.length + 1;

        const newLogData = {
            siteId: site.id,
            date: nextDateStr,
            category: 'บำรุงรักษาตามรอบ',
            status: 'Open',
            lineItems: [],
            details: '-',
            objective: `รอบซ่อมบำรุงตามกำหนด (${site.maintenanceCycle} วัน)`,
            cost: 0,
            attachments: [],
            recordedBy: 'System',
            timestamp: new Date().toISOString(),
            comments: [{
                text: `ระบบสร้างเคสซ่อมบำรุงอัตโนมัติ ครั้งที่ ${cycleNum} (รอบ ${site.maintenanceCycle} วัน)\nวันที่กำหนด: ${nextDateStr}`,
                author: 'System',
                authorId: 'system',
                photoURL: '',
                timestamp: new Date().toISOString(),
                attachments: [],
                isSystemLog: true
            }]
        };

        await FirestoreService.addLog(newLogData);
        const siteName = site.siteCode ? `${site.siteCode} - ${site.name}` : site.name;
        console.log(`[AutoMA] ✅ Created case for "${siteName}" on ${nextDateStr} (cycle #${cycleNum})`);
        showToast(`📋 สร้างเคสซ่อมบำรุงอัตโนมัติ: ${site.name} (${nextDateStr})`, 'info', 5000);
        return true;
    } catch (err) {
        console.error('[AutoMA] Error creating maintenance case:', err);
        return false;
    }
}


/** Mutex to prevent re-entrant batch checks */
let _autoMaCheckRunning = false;

/**
 * Batch-checks all sites with a maintenance cycle and creates cases as needed.
 * Calls refreshData() once at the end if any cases were created.
 * Safe to call on every app load — internally guarded against duplicates.
 */
async function runAutoMaintenanceCheckForAllSites() {
    if (_autoMaCheckRunning) return;
    _autoMaCheckRunning = true;
    try {
        const sitesWithCycle = state.sites.filter(s => s.maintenanceCycle && s.maintenanceCycle > 0);
        if (sitesWithCycle.length === 0) return;

        console.log(`[AutoMA] Batch checking ${sitesWithCycle.length} site(s)...`);
        let created = 0;
        for (const site of sitesWithCycle) {
            const ok = await checkAndAutoCreateMaintenanceCase(site.id);
            if (ok) created++;
        }
        if (created > 0) {
            console.log(`[AutoMA] Batch: created ${created} new case(s). Refreshing data...`);
            await refreshData();
        } else {
            console.log('[AutoMA] Batch: no new cases needed.');
        }
    } catch (err) {
        console.error('[AutoMA] Batch check error:', err);
    } finally {
        _autoMaCheckRunning = false;
    }
}

window.checkAndAutoCreateMaintenanceCase = checkAndAutoCreateMaintenanceCase;
window.runAutoMaintenanceCheckForAllSites = runAutoMaintenanceCheckForAllSites;


let pendingUploadsBefore = [];
let pendingUploadsAfter = [];
let pendingDeletions = []; // Store paths of files to delete on save
let pendingSignedDocs = [];

// ... (renderPendingPreviews helper remains similar, just referencing context)

// Helper to render previews (Updated context if needed, but primarily state management here)
// --- Unified Attachment Renderer ---
function renderAttachments(
    container,
    attachments,
    onDelete,
    isEditMode = false,
    progressPrefix = "upload-progress-",
) {
    if (!container) return;
    container.innerHTML = "";

    if (attachments.length === 0) {
        return;
    }

    // Create horizontal flex container for all attachments
    attachments.forEach((att, index) => {
        // Normalize type check
        const isImage =
            (att.type && att.type.startsWith("image/")) ||
            (att.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.name));

        // Create card container (fixed width for horizontal scroll)
        const card = document.createElement("div");
        card.className = att._source === "existing" ? "existing-item" : "pending-item";
        card.style.cssText =
            "position: relative; display: flex; flex-direction: column; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); transition: transform 0.2s; flex-shrink: 0; width: 100px;";
        card.onmouseover = () => (card.style.transform = "scale(1.02)");
        card.onmouseout = () => (card.style.transform = "scale(1)");

        // Thumbnail/Icon container (square)
        const thumbContainer = document.createElement("div");
        thumbContainer.style.cssText =
            "position: relative; width: 100px; height: 70px; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; overflow: hidden;";

        const thumbContent = document.createElement("div");
        thumbContent.style.cssText =
            "position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;";

        if (isImage) {
            // Handle both URL and local File object
            let url = att.url;
            if (!url && att.originalFile && att.originalFile instanceof File) {
                url = URL.createObjectURL(att.originalFile);
            }

            if (url) {
                const wrapper = createLoaderImage(
                    url,
                    "width: 100%; height: 100%; object-fit: cover;",
                );
                wrapper.style.cursor = "pointer";
                wrapper.onclick = () => window.openImageViewer(url);
                thumbContent.appendChild(wrapper);
            }
        } else {
            // Show file icon for non-images
            const icon = document.createElement("i");
            const isPdf =
                att.type === "application/pdf" ||
                (att.name && /\.pdf$/i.test(att.name));
            const isExcel =
                att.type === "application/vnd.ms-excel" ||
                att.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                (att.name && /\.(xls|xlsx)$/i.test(att.name));
            const isWord =
                att.type === "application/msword" ||
                att.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                (att.name && /\.(doc|docx)$/i.test(att.name));

            if (isPdf) {
                icon.className = "fa-solid fa-file-pdf";
                icon.style.color = "#ef4444";
            } else if (isExcel) {
                icon.className = "fa-solid fa-file-excel";
                icon.style.color = "#10b981";
            } else if (isWord) {
                icon.className = "fa-solid fa-file-word";
                icon.style.color = "#3b82f6";
            } else {
                icon.className = "fa-solid fa-file";
                icon.style.color = "#94a3b8";
            }
            icon.style.fontSize = "2rem";

            // Click to open (if url exists)
            if (att.url) {
                thumbContent.style.cursor = "pointer";
                thumbContent.onclick = () => window.open(att.url, "_blank");
            }

            thumbContent.appendChild(icon);
        }

        thumbContainer.appendChild(thumbContent);

        // Remove Button
        const removeBtn = document.createElement("div");
        removeBtn.innerHTML = "&times;";
        removeBtn.style.cssText =
            "position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; background: rgba(239, 68, 68, 0.9); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; z-index: 50; box-shadow: 0 2px 4px rgba(0,0,0,0.3);";
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            if (removeBtn._deleted) return; // Guard against double-click
            removeBtn._deleted = true;
            onDelete(att);
        };
        thumbContainer.appendChild(removeBtn);

        // Progress Overlay (Only for pending items)
        if (att._source === "pending" && typeof att.pendingIndex !== "undefined") {
            const progressOverlay = document.createElement("div");
            progressOverlay.id = `${progressPrefix}${att.pendingIndex}`;
            progressOverlay.style.cssText =
                "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; background: rgba(0,0,0,0.9); padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: bold; pointer-events: none; display: none; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.5);";
            progressOverlay.textContent = "0%";
            thumbContainer.appendChild(progressOverlay);
        }

        card.appendChild(thumbContainer);

        // Info section (name and size)
        const infoContainer = document.createElement("div");
        infoContainer.style.cssText =
            "padding: 6px; display: flex; flex-direction: column; gap: 2px; background: rgba(255,255,255,0.03); flex: 1;";

        const nameSpan = document.createElement("div");
        nameSpan.textContent = att.name;
        nameSpan.title = att.name;
        nameSpan.style.cssText =
            "font-size: 0.7rem; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;";

        const sizeSpan = document.createElement("div");
        // Calculate size
        let sizeText = "";
        if (att.originalFile && att.originalFile.size) {
            const bytes = att.originalFile.size;
            if (bytes < 1024) {
                sizeText = bytes + " B";
            } else if (bytes < 1024 * 1024) {
                sizeText = (bytes / 1024).toFixed(1) + " KB";
            } else {
                sizeText = (bytes / (1024 * 1024)).toFixed(1) + " MB";
            }
        } else if (att.size) {
            const bytes = att.size;
            if (bytes < 1024) {
                sizeText = bytes + " B";
            } else if (bytes < 1024 * 1024) {
                sizeText = (bytes / 1024).toFixed(1) + " KB";
            } else {
                sizeText = (bytes / (1024 * 1024)).toFixed(1) + " MB";
            }
        }
        sizeSpan.textContent = sizeText;
        sizeSpan.style.cssText =
            "font-size: 0.65rem; color: var(--text-muted);";

        infoContainer.appendChild(nameSpan);
        if (sizeText) {
            infoContainer.appendChild(sizeSpan);
        }

        card.appendChild(infoContainer);
        container.appendChild(card);
    });
}

// Wrapper to combine Existing + Pending for rendering
function refreshAttachmentBeforePreviews() {
    const container = document.getElementById(
        "attachment-before-preview-container",
    );
    const countSpan = document.getElementById("log-attachment-before-count");
    const form = document.getElementById("form-log-maintenance");

    // Parse Existing
    let existing = [];
    try {
        const jsonEl = form ? form.querySelector(
            'input[name="existingAttachmentsBeforeJSON"]',
        ) : null;
        const json = jsonEl ? jsonEl.value : '';
        if (json) existing = JSON.parse(json);
    } catch (e) {
        console.error(e);
    }

    const allAttachments = [
        ...existing.map((i) => ({ ...i, _source: "existing" })),
        ...pendingUploadsBefore.map((file, idx) => ({
            originalFile: file, // Keep reference for createObjectURL
            name: file.name,
            type: file.type,
            _source: "pending",
            pendingIndex: idx, // Store original index for progress mapping
        })),
    ];

    renderAttachments(
        container,
        allAttachments,
        (item) => {
            if (item._source === "existing") {
                const existingIdx = existing.findIndex(
                    (e) => e.url === item.url && e.name === item.name,
                );
                if (existingIdx !== -1) {
                    const att = existing[existingIdx];
                    if (typeof pendingDeletions !== "undefined" && att.path) {
                        pendingDeletions.push(att.path);
                    }
                    existing.splice(existingIdx, 1);
                    form.querySelector(
                        'input[name="existingAttachmentsBeforeJSON"]',
                    ).value = JSON.stringify(existing);
                }
            } else {
                if (typeof item.pendingIndex !== "undefined") {
                    const pIndex = pendingUploadsBefore.indexOf(item.originalFile);
                    if (pIndex !== -1) {
                        pendingUploadsBefore.splice(pIndex, 1);
                    }
                }
            }
            refreshAttachmentBeforePreviews(); // Re-render
        },
        false,
        "upload-before-progress-",
    );

    const total = existing.length + pendingUploadsBefore.length;
    if (countSpan)
        countSpan.textContent =
            total > 0 ? `เลือก ${total} ไฟล์` : "ไม่ได้เลือกไฟล์";
}

function refreshAttachmentAfterPreviews() {
    const container = document.getElementById(
        "attachment-after-preview-container",
    );
    const countSpan = document.getElementById("log-attachment-after-count");
    const form = document.getElementById("form-log-maintenance");

    // Parse Existing
    let existing = [];
    try {
        const jsonEl = form ? form.querySelector(
            'input[name="existingAttachmentsAfterJSON"]',
        ) : null;
        const json = jsonEl ? jsonEl.value : '';
        if (json) existing = JSON.parse(json);
    } catch (e) {
        console.error(e);
    }

    const allAttachments = [
        ...existing.map((i) => ({ ...i, _source: "existing" })),
        ...pendingUploadsAfter.map((file, idx) => ({
            originalFile: file,
            name: file.name,
            type: file.type,
            _source: "pending",
            pendingIndex: idx,
        })),
    ];

    renderAttachments(
        container,
        allAttachments,
        (item) => {
            if (item._source === "existing") {
                const existingIdx = existing.findIndex(
                    (e) => e.url === item.url && e.name === item.name,
                );
                if (existingIdx !== -1) {
                    const att = existing[existingIdx];
                    if (typeof pendingDeletions !== "undefined" && att.path) {
                        pendingDeletions.push(att.path);
                    }
                    existing.splice(existingIdx, 1);
                    form.querySelector(
                        'input[name="existingAttachmentsAfterJSON"]',
                    ).value = JSON.stringify(existing);
                }
            } else {
                if (typeof item.pendingIndex !== "undefined") {
                    const pIndex = pendingUploadsAfter.indexOf(item.originalFile);
                    if (pIndex !== -1) {
                        pendingUploadsAfter.splice(pIndex, 1);
                    }
                }
            }
            refreshAttachmentAfterPreviews(); // Re-render
        },
        false,
        "upload-after-progress-",
    );

    const total = existing.length + pendingUploadsAfter.length;
    if (countSpan)
        countSpan.textContent =
            total > 0 ? `เลือก ${total} ไฟล์` : "ไม่ได้เลือกไฟล์";
}

function refreshSiteAttachmentPreviews() {
    const container = document.getElementById(
        "site-attachment-preview-container",
    );
    const countSpan = document.getElementById("site-attachment-count");
    const form = document.getElementById("form-add-site");

    // Parse Existing
    let existing = [];
    try {
        const json = form.querySelector(
            'input[name="existingAttachmentsJSON"]',
        ).value;
        if (json) existing = JSON.parse(json);
    } catch (e) {
        console.error(e);
    }

    const allAttachments = [
        ...existing.map((i) => ({ ...i, _source: "existing" })),
        ...pendingSiteUploads.map((file, idx) => ({
            originalFile: file,
            name: file.name,
            type: file.type,
            _source: "pending",
            pendingIndex: idx,
        })),
    ];

    renderAttachments(
        container,
        allAttachments,
        (item) => {
            if (item._source === "existing") {
                const existingIdx = existing.findIndex(
                    (e) => e.url === item.url && e.name === item.name,
                );
                if (existingIdx !== -1) {
                    const att = existing[existingIdx];
                    if (typeof pendingSiteDeletions !== "undefined" && att.path) {
                        pendingSiteDeletions.push(att.path);
                    }
                    existing.splice(existingIdx, 1);
                    form.querySelector('input[name="existingAttachmentsJSON"]').value =
                        JSON.stringify(existing);
                }
            } else {
                if (typeof item.pendingIndex !== "undefined") {
                    const pIndex = pendingSiteUploads.indexOf(item.originalFile);
                    if (pIndex !== -1) {
                        pendingSiteUploads.splice(pIndex, 1);
                    }
                }
            }
            refreshSiteAttachmentPreviews();
        },
        false,
        "site-upload-progress-",
    ); // Use SITE prefix

    const total = existing.length + pendingSiteUploads.length;
    if (countSpan)
        countSpan.textContent =
            total > 0 ? `เลือก ${total} ไฟล์` : "ไม่ได้เลือกไฟล์";
}

// Helper to render previews (Legacy - redirected)
function renderPendingPreviews() {
    refreshAttachmentPreviews();
}

// Add File Input Listeners
const logAttachmentBeforeInput = document.getElementById(
    "log-attachment-before-input",
);
if (logAttachmentBeforeInput) {
    logAttachmentBeforeInput.addEventListener("change", function (e) {
        if (this.files && this.files.length > 0) {
            const MAX_SIZE = 25 * 1024 * 1024; // 25MB
            Array.from(this.files).forEach((file) => {
                if (file.size > MAX_SIZE) {
                    showDialog(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (สูงสุด 25MB)`, {
                        title: "ขนาดไฟล์เกิน",
                    });
                    return;
                }
                pendingUploadsBefore.push(file);
            });
            refreshAttachmentBeforePreviews();
            this.value = "";
        }
    });
}

const logAttachmentAfterInput = document.getElementById(
    "log-attachment-after-input",
);
if (logAttachmentAfterInput) {
    logAttachmentAfterInput.addEventListener("change", function (e) {
        if (this.files && this.files.length > 0) {
            const MAX_SIZE = 25 * 1024 * 1024; // 25MB
            Array.from(this.files).forEach((file) => {
                if (file.size > MAX_SIZE) {
                    showDialog(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (สูงสุด 25MB)`, {
                        title: "ขนาดไฟล์เกิน",
                    });
                    return;
                }
                pendingUploadsAfter.push(file);
            });
            refreshAttachmentAfterPreviews();
            this.value = "";
        }
    });
}

function deleteSite(id) {
    state.currentDeleteId = id;
    toggleModal("deleteConfirm", true);
} // End of deleteSite replacement context to match surrounding code

async function confirmDelete() {
    if (!state.currentDeleteId && !state.currentDeleteLogId) return;

    const btn = document.getElementById("btn-confirm-delete");
    const originalText = btn.textContent;
    btn.textContent = "กำลังลบ...";
    btn.disabled = true;

    try {
        if (state.currentDeleteLogId) {
            await FirestoreService.deleteLog(state.currentDeleteLogId);
            showToast("ลบบันทึกสำเร็จ", "success");
            state.currentDeleteLogId = null;
        } else if (state.currentDeleteId) {
            const id = state.currentDeleteId;
            await FirestoreService.deleteSite(id);
            await FirestoreService.deleteLogsBySiteId(id);
            showToast("ลบสถานที่สำเร็จ", "success");
            state.currentDeleteId = null;
        }

        await refreshData();

        toggleModal("deleteConfirm", false);
    } catch (error) {
        console.error("Delete failed:", error);
        showToast("ลบข้อมูลไม่สำเร็จ: " + error.message, "error", 5000);
        await showDialog("ลบข้อมูลไม่สำเร็จ: " + error.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function generateMockLogs() {
    if (!state.sites || state.sites.length === 0) {
        console.warn("No sites found. Please generate sites first.");
        return;
    }

    const objectives = [
        "ตรวจเช็คสภาพเครื่องสูบน้ำ (PM 1)",
        "เปลี่ยนถ่ายน้ำมันเครื่อง (PM 3)",
        "ซ่อมท่อส่งน้ำรั่วไหล (Emergency)",
        "ล้างทำความสะอาดบ่อพักน้ำ (Cleaning)",
        "ตรวจวัดคุณภาพน้ำ (QC)",
        "เปลี่ยนลูกปืนมอเตอร์ (Part Replacement)",
        "ตรวจสอบระบบไฟฟ้าตู้คอนโทรล (Electrical Check)",
        "ซ่อมแซมวาล์วกันกลับ (Valve Repair)",
    ];

    let count = 0;
    const totalSites = state.sites.length;
    console.log(`Starting log generation for ${totalSites} sites...`);

    for (const site of state.sites) {
        // Generate 3-8 logs per site
        const numLogs = Math.floor(Math.random() * 6) + 3;

        for (let i = 0; i < numLogs; i++) {
            // Random date within last 365 days
            const daysAgo = Math.floor(Math.random() * 365);
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            const dateStr = date.toISOString().split("T")[0];

            const objective =
                objectives[Math.floor(Math.random() * objectives.length)];
            const cost = (Math.floor(Math.random() * 49) + 1) * 1000; // 1000 - 50000

            const logData = {
                siteId: site.id,
                date: dateStr,
                objective: objective,
                cost: cost,
                timestamp: new Date().toISOString(),
            };

            await FirestoreService.addLog(logData);
            count++;
        }
        console.log(`Generated logs for ${site.name}`);
    }

    console.log(`Successfully generated ${count} logs.`);
    await refreshData();
    await showDialog(
        `สร้างข้อมูลประวัติซ่อมบำรุงเรียบร้อยแล้วจำนวน ${count} รายการ`,
    );
}

async function loadAddressData() {
    try {
        const response = await fetch(
            "https://cdn.jsdelivr.net/gh/kongvut/thai-province-data@master/api/latest/province_with_district_and_sub_district.json",
        );
        const rawData = await response.json();

        const flatData = [];

        rawData.forEach((prov) => {
            const provinceName = prov.name_th;
            if (prov.districts) {
                prov.districts.forEach((dist) => {
                    const amphoeName = dist.name_th;
                    if (dist.sub_districts) {
                        dist.sub_districts.forEach((sub) => {
                            flatData.push({
                                province: provinceName,
                                amphoe: amphoeName,
                                district: sub.name_th,
                                zipcode: sub.zip_code ? String(sub.zip_code) : "",
                            });
                        });
                    }
                });
            }
        });

        state.addressData = flatData;

        state.uniqueProvinces = [
            ...new Set(state.addressData.map((item) => item.province)),
        ].sort();
        initAddressAutocompletes(); // Init new logic
    } catch (error) {
        console.error("Failed to load address data from API:", error);

        // Minor Fallback to old behavior if network blocked
        try {
            console.warn("Falling back to local thai_address.json");
            if (typeof THAI_ADDRESS_DATA !== "undefined") {
                state.addressData = THAI_ADDRESS_DATA;
            } else {
                const response = await fetch("thai_address.json");
                state.addressData = await response.json();
            }
            state.uniqueProvinces = [
                ...new Set(state.addressData.map((item) => item.province)),
            ].sort();
            initAddressAutocompletes();
        } catch (fallbackError) {
            console.error("Total failure to load address data:", fallbackError);
            await showDialog("ไม่สามารถโหลดข้อมูลที่อยู่ได้ กรุณารีเฟรชหน้าจอ");
        }
    }
}




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



function setupEventListeners() {
    // Initialize Cycle Count Modal for Annual Plan
    initCycleCountModal();
    initPlanDateModal();

    // Brand Logo Redirect (Desktop & Mobile)
    const brandIcons = document.querySelectorAll(
        ".brand",
    );
    brandIcons.forEach((el) => {
        el.style.cursor = "pointer";
        el.addEventListener("click", () => {
            console.log("Logo clicked, switching to admin view");
            switchView("admin-view");
        });
    });



    document.querySelectorAll(".nav-btn").forEach((btn) => {
        btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    document.getElementById("btn-add-site").addEventListener("click", () => {
        console.log("Add Site Button Clicked");
        resetSiteForm();

        // Reset Custom Name Checkbox
        const customNameCheck = document.getElementById("check-custom-name");
        const siteNameInput = document.getElementById("input-site-name");
        if (customNameCheck && siteNameInput) {
            customNameCheck.checked = false;
            siteNameInput.setAttribute("readonly", true);
            siteNameInput.value = ""; // Clear for new
        }

        toggleModal("addSite", true);
    });

    const btnAddSiteFab = document.getElementById("btn-add-site-fab");
    if (btnAddSiteFab) {
        btnAddSiteFab.addEventListener("click", () => {
            console.log("Add Site FAB Clicked");
            resetSiteForm();
            const customNameCheck = document.getElementById("check-custom-name");
            const siteNameInput = document.getElementById("input-site-name");
            if (customNameCheck && siteNameInput) {
                customNameCheck.checked = false;
                siteNameInput.setAttribute("readonly", true);
                siteNameInput.value = "";
            }
            toggleModal("addSite", true);
        });
    }

    // Calendar Toggles
    document
        .getElementById("btn-view-list")
        .addEventListener("click", () => switchLogView("list"));
    document
        .getElementById("btn-view-calendar")
        .addEventListener("click", () => switchLogView("calendar"));

    document
        .getElementById("cal-prev-month")
        .addEventListener("click", () => changeCalendarMonth(-1));
    document
        .getElementById("cal-next-month")
        .addEventListener("click", () => changeCalendarMonth(1));

    document
        .getElementById("btn-log-maintenance")
        .addEventListener("click", () => {
            resetLogForm();
            // updateSiteSelects(); // Removed
            toggleModal("logMaintenance", true);
            initMaFormCommentAttachments(); // Reinitialize comment attachments
        });

    // New Mobile FAB Listener
    const btnLogFab = document.getElementById("btn-log-maintenance-fab");
    if (btnLogFab) {
        btnLogFab.addEventListener("click", () => {
            resetLogForm();
            toggleModal("logMaintenance", true);
            initMaFormCommentAttachments(); // Reinitialize comment attachments
        });
    }

    document.querySelectorAll(".close-modal, .close-modal-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const modal = e.target.closest(".modal-overlay");
            if (!modal) return;

            // Add confirmation for specific forms
            if (modal.id === "modal-add-site" || modal.id === "modal-log-maintenance") {
                const confirmed = await showDialog("คุณต้องการปิดหน้านี้ใช่หรือไม่? ข้อมูลที่คุณกรอกไว้จะหายไป", {
                    title: "ยืนยันการปิด",
                    type: "confirm"
                });
                if (!confirmed) return;
            }

            modal.classList.add("hidden");
            modal.style.display = "none";

            // Reset log form if closing the maintenance log modal
            if (modal.id === "modal-log-maintenance") {
                resetLogForm();
            }
        });
    });

    // Close modal when clicking outside (on the overlay)
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
        overlay.addEventListener("click", async (e) => {
            // DO NOT allow clicking outside to close mandatory modals
            if (
                overlay.id === "modal-force-password" ||
                overlay.id === "modal-referral-gate" ||
                overlay.id === "modal-device-qr"
            )
                return;

            if (e.target === overlay) {
                // Add confirmation for specific forms
                if (overlay.id === "modal-add-site" || overlay.id === "modal-log-maintenance") {
                    const confirmed = await showDialog("คุณต้องการปิดหน้านี้ใช่หรือไม่? ข้อมูลที่คุณกรอกไว้จะหายไป", {
                        title: "ยืนยันการปิด",
                        type: "confirm"
                    });
                    if (!confirmed) return;
                }

                overlay.classList.add("hidden");
                overlay.style.display = "none";

                // Reset log form if closing the maintenance log modal
                if (overlay.id === "modal-log-maintenance") {
                    resetLogForm();
                }
            }
        });
    });

    const formAddSite = document.getElementById("form-add-site");
    if (formAddSite) formAddSite.addEventListener("submit", handleSiteSubmit);

    document
        .getElementById("btn-confirm-delete")
        .addEventListener("click", confirmDelete);

    // Site Search Listeners (Desktop & Mobile Sync)
    const siteSearchInput = document.getElementById("site-search-input");
    const siteSearchInputMobile = document.getElementById(
        "site-search-input-mobile",
    );

    if (siteSearchInput) {
        siteSearchInput.addEventListener("input", (e) => {
            if (siteSearchInputMobile) siteSearchInputMobile.value = e.target.value;
            renderSites();
        });
    }

    if (siteSearchInputMobile) {
        siteSearchInputMobile.addEventListener("input", (e) => {
            if (siteSearchInput) siteSearchInput.value = e.target.value;
            renderSites();
        });
    }

    // Filter listeners
    if (selects.filterInput) {
        selects.filterInput.addEventListener("input", (e) => {
            // Just trigger re-render when search input changes
            renderCurrentView();
        });
    }

    if (selects.filterCategory)
        selects.filterCategory.addEventListener("change", renderCurrentView);

    // Case Dashboard Card Click Listeners
    const caseDashboard = document.getElementById("case-type-dashboard");
    if (caseDashboard) {
        caseDashboard.querySelectorAll(".interactive-card, .custom-chart-legend .legend-item").forEach(card => {
            card.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cat = card.getAttribute("data-category");
                if (selects.filterCategory) {
                    selects.filterCategory.value = cat;
                    selects.filterCategory.dispatchEvent(new Event("change"));
                }
            });
        });
    }


    // Status Filter
    const statusFilter = document.getElementById("filter-status");
    if (statusFilter)
        statusFilter.addEventListener("change", renderCurrentView);

    if (selects.filterStart)
        selects.filterStart.addEventListener("change", renderCurrentView);
    if (selects.filterEnd)
        selects.filterEnd.addEventListener("change", renderCurrentView);

    const clearBtn = document.getElementById("btn-clear-filters");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            resetFilters();
            renderCurrentView();
        });
    }

    // Mobile Filter Toggle (Delegation for robustness)
    document.addEventListener("click", (e) => {
        const btn = e.target.closest("#btn-toggle-filters");
        if (btn) {
            // FIX: Scope by parent to avoid finding the wrong filters-bar (e.g. from hidden sites view)
            const filtersBar = btn.parentElement.querySelector(".filters-bar");
            if (filtersBar) {
                filtersBar.classList.toggle("show");
                console.log(
                    "Mobile filter toggled:",
                    filtersBar.classList.contains("show"),
                );
            }
        }

        // Site Manager Filter Toggle
        const siteFilterBtn = e.target.closest("#btn-toggle-site-filters");
        if (siteFilterBtn) {
            // Find the mobile-only filters-bar (next sibling after toggle button)
            const filtersBar = siteFilterBtn.nextElementSibling;
            if (filtersBar && filtersBar.classList.contains("filters-bar")) {
                filtersBar.classList.toggle("hidden");
                console.log(
                    "Site Manager mobile filter toggled:",
                    !filtersBar.classList.contains("hidden"),
                );
            }
        }
    });

    // Get Current Location for Site
    const btnGetLocation = document.getElementById("btn-get-location");
    const inputLocationUrl = document.getElementById("input-location-url");
    if (btnGetLocation && inputLocationUrl) {
        btnGetLocation.addEventListener("click", () => {
            if (navigator.geolocation) {
                const originalText = btnGetLocation.innerHTML;
                btnGetLocation.innerHTML =
                    '<i class="fa-solid fa-spinner fa-spin"></i> กำลังดึงข้อมูล...';
                btnGetLocation.disabled = true;

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        updateLocationUrlInput(lat, lon);
                        showToast("ดึงตำแหน่งปัจจุบันสำเร็จ", "success");

                        // Restore button immediately so it's never left stuck
                        btnGetLocation.innerHTML = originalText;
                        btnGetLocation.disabled = false;

                        // Move map if open (safe — runs after button is restored)
                        try {
                            initSiteMap();
                            if (
                                siteMap &&
                                siteMarker &&
                                typeof google !== "undefined" &&
                                google.maps
                            ) {
                                const newPos = new google.maps.LatLng(lat, lon);
                                siteMap.setCenter(newPos);
                                siteMap.setZoom(15);
                                siteMarker.position = newPos;
                            }
                        } catch (mapErr) {
                            console.warn("Map update failed (non-critical):", mapErr);
                        }
                    },
                    (error) => {
                        console.error("Error getting location:", error);
                        // Provide more specific error messages
                        let errMsg =
                            "ไม่สามารถดึงตำแหน่งได้ กรุณาอนุญาตการเข้าถึงตำแหน่งและเปิด GPS";
                        if (error.code === 1)
                            errMsg =
                                "ระบบปฏิเสธการเข้าถึงตำแหน่ง กรุณาตั้งค่าอนุญาต Location ในเบราว์เซอร์";
                        if (error.code === 2) errMsg = "ไม่พบสัญญาณ GPS / ตำแหน่งปัจจุบัน";
                        if (error.code === 3) errMsg = "หมดเวลาเชื่อมต่อในการดึงตำแหน่ง";

                        showToast(errMsg, "error");

                        btnGetLocation.innerHTML = originalText;
                        btnGetLocation.disabled = false;
                    },
                    { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 },
                );
            } else {
                showToast("เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่ง", "error");
            }
        });
    }
}

if (addressInputs.zipcode) {
    addressInputs.zipcode.addEventListener("input", (e) => {
        // Re-implement basic zipcode lookup if needed, or simplified
        // For now, let's just leave it manual or simple
    });
}

// Export Excel Listener
const btnExport = document.getElementById("btn-export-excel");
if (btnExport) {
    btnExport.addEventListener("click", exportLogsToExcel);
}

// Currency Formatting Events

const logForm = document.getElementById("form-log-maintenance");
if (logForm) {
    logForm.addEventListener("submit", handleLogMaintenance);

    // Currency Formatting via Delegation
    logForm.addEventListener("focusin", (e) => {
        if (e.target.name === "cost") {
            const val = parseCurrency(e.target.value);
            e.target.value = val === 0 ? "" : val;
            e.target.select();
        }
    });

    logForm.addEventListener("input", (e) => {
        if (e.target.name === "cost") {
            // Remove any non-numeric and non-dot characters
            // Also ensure only one dot exists
            let value = e.target.value.replace(/[^0-9.]/g, "");
            const parts = value.split(".");
            if (parts.length > 2) {
                value = parts[0] + "." + parts.slice(1).join("");
            }
            if (value !== e.target.value) {
                e.target.value = value;
            }
        }
    });

    logForm.addEventListener("focusout", (e) => {
        if (e.target.name === "cost") {
            const val = parseFloat(e.target.value); // Use float parsing for raw input
            // Check if user entered valid number
            if (!isNaN(val) && e.target.value !== "") {
                // Ensure positive before formatting (visual check only, submit handles strict)
                const reportVal = val < 0 ? Math.abs(val) : val;
                // If user typed negative, strictly we should warn, but here just format
                // But wait, submit handler rejects negative.
                // Let's just format what they typed.
                e.target.value = formatCurrency(val);
            } else {
                e.target.value = "";
            }
        }
    });
}

// Global scope method for inline onclick
window.editSite = editSite;
window.deleteSite = deleteSite;
window.viewSiteHistory = viewSiteHistory;
window.editLog = editLog;
window.viewSiteDetails = viewSiteDetails;
window.viewSiteLogs = viewSiteLogs;
window.toggleModal = toggleModal;
window.viewSiteLogs = viewSiteLogs;
window.viewLogDetails = viewLogDetails;
window.toggleModal = toggleModal;
window.generateMockLogs = generateMockLogs;
window.deleteLog = deleteLog;
window.openLogModalForDate = openLogModalForDate;
window.handleClearAllData = async function () {
    if (
        !confirm("ARE YOU SURE YOU WANT TO DELETE ALL DATA? THIS CANNOT BE UNDONE.")
    )
        return;
    try {
        await FirestoreService.deleteAllLogs();
        await refreshData();
        await showDialog("All data cleared successfully.");
    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    }
};


function resetLogForm() {
    const form = document.getElementById("form-log-maintenance");
    form.reset();
    document.getElementById("log-id-hidden").value = "";

    // Generate and display new case ID in title
    const newCaseId = FirestoreService.generateCaseId();
    const caseIdEl = document.getElementById('ma-form-case-id');
    const titleEl = document.getElementById('ma-form-title');

    if (caseIdEl) {
        caseIdEl.textContent = newCaseId;
    }
    if (titleEl) {
        titleEl.textContent = 'บันทึกการเข้าซ่อมบำรุง';
    }

    // Store the generated case ID for later use
    form.dataset.generatedCaseId = newCaseId;

    // Show comment section (hidden during edit)
    const commentSection = form.querySelector('.form-group:has(#ma-form-comment-input)');
    if (commentSection) commentSection.style.display = 'block';

    // Clear MA form comment
    const commentInput = document.getElementById('ma-form-comment-input');
    if (commentInput) commentInput.value = "";
    maFormCommentAttachments = [];
    updateMaFormAttachmentPreview();

    // Clear description attachments
    descriptionAttachments = [];
    window.descriptionAttachments = descriptionAttachments;
    updateDescriptionAttachmentPreview();

    // Clear pending uploads & deletions
    if (typeof pendingUploadsBefore !== "undefined") pendingUploadsBefore = [];
    if (typeof pendingUploadsAfter !== "undefined") pendingUploadsAfter = [];
    if (typeof pendingDeletions !== "undefined") pendingDeletions = [];
    repairPhotoPending = [];
    window.repairPhotoPending = repairPhotoPending;
    if (typeof renderRepairPhotoPreview === 'function') renderRepairPhotoPreview();

    // Clear reporter fields
    const resetField = (name) => { const field = form.querySelector(`[name="${name}"]`); if (field) field.value = ""; };
    resetField("reporterName");
    resetField("reporterPhone");
    resetField("reporterPosition");

    // Clear customer fields
    clearCustomerSignature();

    // Clear signed doc uploads
    pendingSignedDocs = [];
    const existingSignedDocsInput = document.getElementById("existing-signed-docs-json");
    if (existingSignedDocsInput) existingSignedDocsInput.value = "[]";
    renderSignedDocPreview();

    // Reset e-signature toggle to unchecked, show signature section
    const eSignToggle = document.getElementById("use-esignature-toggle");
    const sigSec = document.getElementById("customer-signature-section");
    const signedDocSec = document.getElementById("signed-doc-upload-section");
    if (eSignToggle) eSignToggle.checked = false;
    if (sigSec) sigSec.style.display = "none";
    if (signedDocSec) signedDocSec.style.display = "";

    // Restore site selection field for new cases
    const siteFieldWrapper = document.querySelector('#form-log-maintenance .autocomplete-wrapper:has(#log-site-input)');
    if (siteFieldWrapper) siteFieldWrapper.style.display = '';

    // Reset header to default new-case state
    const caseIdElReset = document.getElementById('ma-form-case-id');
    if (caseIdElReset) caseIdElReset.textContent = '';

    const containerBefore = document.getElementById(
        "attachment-before-preview-container",
    );
    if (containerBefore) containerBefore.innerHTML = "";
    const containerAfter = document.getElementById(
        "attachment-after-preview-container",
    );
    if (containerAfter) containerAfter.innerHTML = "";

    const countBefore = document.getElementById("log-attachment-before-count");
    if (countBefore) countBefore.textContent = "ไม่ได้เลือกไฟล์";
    const countAfter = document.getElementById("log-attachment-after-count");
    if (countAfter) countAfter.textContent = "ไม่ได้เลือกไฟล์";

    const hiddenExisting = form.querySelector(
        'input[name="existingAttachmentsJSON"]',
    );
    if (hiddenExisting) hiddenExisting.value = "";

    // Reset date inputs if needed, though form.reset() should handle basics
    const dateInput = form.querySelector('input[name="date"]');
    if (dateInput) {
        // Set today's date+time as default for datetime-local
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const hours = String(today.getHours()).padStart(2, '0');
        const mins = String(today.getMinutes()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}T${hours}:${mins}`;
    }

    // Reset line items — clear and add one blank row
    const lineContainer = document.getElementById("line-items-container");
    if (lineContainer) {
        lineContainer.innerHTML = "";
        addLineItemRow();
    }

    // Reset Items & Cost section to collapsed
    const formCostContent = document.getElementById("form-cost-section-content");
    const formCostIcon = document.getElementById("form-cost-collapse-icon");
    if (formCostContent) formCostContent.style.display = "none";
    if (formCostIcon) formCostIcon.style.transform = "";
    recalcLineItemTotal();
    populateResponderDropdown();

    // Reset additional edit state variables and dynamic layouts
    returnProductData = [];
    window.returnProductData = returnProductData;
    if (typeof renderReturnProductList === 'function') renderReturnProductList();

    installPhotoPending = [];
    window.installPhotoPending = installPhotoPending;
    if (typeof renderInstallPhotoPreview === 'function') renderInstallPhotoPreview();

    preInstallPhotoPending = [];
    window.preInstallPhotoPending = preInstallPhotoPending;
    if (typeof renderPreInstallPhotoPreview === 'function') renderPreInstallPhotoPreview();

    repairChecklistData = [];
    window.repairChecklistData = repairChecklistData;
    if (typeof renderRepairChecklist === 'function') renderRepairChecklist();

    const rampField = document.getElementById('ramp-width-field');
    if (rampField) rampField.style.display = 'none';

    const elevField = document.getElementById('elevator-detail-fields');
    if (elevField) elevField.style.display = 'none';

    const doorCountInput = document.getElementById('install-door-count');
    const doorCountDisplay = document.getElementById('install-door-count-display');
    if (doorCountInput) doorCountInput.value = 1;
    if (doorCountDisplay) doorCountDisplay.textContent = 1;
    if (typeof renderDoorSizeFields === 'function') renderDoorSizeFields(1);

    if (typeof toggleMaRoundSections === 'function') {
        toggleMaRoundSections('บำรุงรักษาตามรอบ');
    }
}

function openLogModalForDate(dateStr) {
    resetLogForm();
    const form = document.getElementById("form-log-maintenance");
    const dateInput = form.querySelector('input[name="date"]');
    if (dateInput) {
        dateInput.value = dateStr;
    }
    toggleModal("logMaintenance", true);
}

function populateResponderDropdown(selectedId = "") {
    const select = document.getElementById("log-responder-select");
    if (!select || !state.users) return;
    select.innerHTML = '<option value="">-- เลือกเจ้าหน้าที่ช่างบริการ --</option>';
    Object.entries(state.users).forEach(([uid, u]) => {
        // Skip anonymous users
        if (!u.email && !u.displayName) return;
        const name = u.displayName || u.email || uid;
        select.innerHTML += `<option value="${uid}" ${uid === selectedId ? 'selected' : ''}>${name}</option>`;
    });
}

// Check if user has permission to edit/delete a case
async function checkEditPermission(logId, status, isDelete = false) {
    const log = state.logs.find((l) => l.id === logId);
    if (!log) return;

    // Check delete permission (only admin and manager are allowed to delete cases)
    if (isDelete) {
        const user = auth.currentUser;
        if (!user) {
            showToast('กรุณาเข้าสู่ระบบก่อน', 'error');
            return;
        }

        try {
            const userDoc = await FirestoreService.getUser(user.uid);
            const isAdminOrManager = userDoc?.role === 'admin' || userDoc?.role === 'manager';

            if (!isAdminOrManager) {
                showToast('เฉพาะผู้จัดการและผู้ดูแลระบบเท่านั้นที่สามารถลบเคสได้', 'error');
                return;
            }
        } catch (error) {
            console.error('Error checking user role for deletion:', error);
            showToast('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์', 'error');
            return;
        }
    }

    // If case is closed, check if user is admin or manager
    if (status === 'Case Closed') {
        const user = auth.currentUser;
        if (!user) {
            showToast('กรุณาเข้าสู่ระบบก่อน', 'error');
            return;
        }

        try {
            const userDoc = await FirestoreService.getUser(user.uid);
            const isAdminOrManager = userDoc?.role === 'admin' || userDoc?.role === 'manager';

            if (!isAdminOrManager) {
                const statusLabel = 'ปิดเคส';
                showToast(`เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถแก้ไขเคสสถานะ "${statusLabel}" ได้`, 'error');
                return;
            }
        } catch (error) {
            console.error('Error checking user role:', error);
            showToast('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์', 'error');
            return;
        }
    }

    // User has permission, proceed with edit or delete
    if (isDelete) {
        deleteLog(logId);
    } else {
        editLog(logId);
    }
}

// Make function globally accessible
window.checkEditPermission = checkEditPermission;

function editLog(logId) {
    const log = state.logs.find((l) => l.id === logId);
    if (!log) return;

    // updateSiteSelects(); // Removed
    const form = document.getElementById("form-log-maintenance");
    document.getElementById("log-id-hidden").value = log.id;

    // Reset Items & Cost section to collapsed
    const formCostContent = document.getElementById("form-cost-section-content");
    const formCostIcon = document.getElementById("form-cost-collapse-icon");
    if (formCostContent) formCostContent.style.display = "none";
    if (formCostIcon) formCostIcon.style.transform = "";

    // Update title with case ID and device name in header
    const caseIdEl = document.getElementById('ma-form-case-id');
    const titleEl = document.getElementById('ma-form-title');

    if (caseIdEl && log.caseId) {
        const site = state.sites.find((s) => s.id === log.siteId);
        const siteName = site ? site.name : '';
        caseIdEl.innerHTML = `${log.caseId}${siteName ? ` <span style="color: var(--text-muted); font-weight: 500;">• ${siteName}</span>` : ''}`;
    }
    if (titleEl) {
        titleEl.textContent = 'แก้ไขบันทึก';
    }

    // Check if previous case was cancelled - if so, generate new case ID
    console.log('[editLog] Log status:', log.status, 'Case ID:', log.caseId);
    if (log.status === 'Cancel') {
        // Generate new case ID for cancelled cases (will be auto-generated on save)
        // Clear the log ID to treat this as a new record
        document.getElementById("log-id-hidden").value = "";
        console.log('[editLog] Cleared log-id-hidden field');

        // Show comment section for new case
        const commentSection = form.querySelector('.form-group:has(#ma-form-comment-input)');
        if (commentSection) commentSection.style.display = 'block';
    } else {
        // Hide comment section when editing (comments should be added from detail view)
        const commentSection = form.querySelector('.form-group:has(#ma-form-comment-input)');
        if (commentSection) commentSection.style.display = 'none';
    }

    if (selects.logSiteHidden) selects.logSiteHidden.value = log.siteId;
    const site = state.sites.find((s) => s.id === log.siteId);
    if (selects.logSiteInput) selects.logSiteInput.value = site ? site.name : "";

    // Hide site selection field when editing — device is shown in the header
    const siteFieldWrapper = document.querySelector('#form-log-maintenance .autocomplete-wrapper:has(#log-site-input)');
    if (siteFieldWrapper) siteFieldWrapper.style.display = 'none';
    const dateInput = form.querySelector('input[name="date"]');
    if (dateInput) {
        // datetime-local expects YYYY-MM-DDTHH:MM, old records may have just YYYY-MM-DD
        dateInput.value = log.date && log.date.length === 10 ? log.date + 'T00:00' : log.date;
    }
    // Set time fields manually (setField not yet available)
    const timeStartEl = form.querySelector('input[name="timeStart"]');
    if (timeStartEl) timeStartEl.value = log.timeStart || '';
    const timeEndEl = form.querySelector('input[name="timeEnd"]');
    if (timeEndEl) timeEndEl.value = log.timeEnd || '';
    const objectiveEl = form.querySelector('textarea[name="objective"]');
    if (objectiveEl) objectiveEl.value = log.objective || "";

    // Populate description from first comment if exists
    const descriptionTextarea = document.getElementById('log-description');
    if (descriptionTextarea && log.comments && log.comments.length > 0) {
        const firstComment = log.comments[0];
        descriptionTextarea.value = firstComment.text || log.objective || log.details || "";
    } else if (descriptionTextarea) {
        descriptionTextarea.value = log.objective || log.details || "";
        descriptionAttachments = [];
        updateDescriptionAttachmentPreview();
    }

    // Populate new fields
    const categorySelect = form.querySelector('select[name="category"]');
    if (categorySelect) categorySelect.value = log.category || "บำรุงรักษาตามรอบ";

    // Toggle MA round sections visibility based on category
    toggleMaRoundSections(categorySelect ? categorySelect.value : 'บำรุงรักษาตามรอบ');

    const statusSelect = form.querySelector('select[name="status"]');
    if (statusSelect) statusSelect.value = log.status || "Open";

    // Line items: restore from lineItems array, or fall back to legacy details+cost
    const lineContainer = document.getElementById("line-items-container");
    if (lineContainer) {
        lineContainer.innerHTML = "";
        if (log.lineItems && log.lineItems.length > 0) {
            log.lineItems.forEach((li) =>
                addLineItemRow(li.item || "", li.cost || 0),
            );
        } else {
            // Legacy fallback: single row
            addLineItemRow(log.details || "", log.cost || 0);
        }
        recalcLineItemTotal();
    }

    const detailsInput = form.querySelector('input[name="details"]');
    if (detailsInput) detailsInput.value = log.details || "";

    const costInput = form.querySelector('input[name="cost"]');
    if (costInput) costInput.value = formatCurrency(log.cost);
    // form.querySelector('textarea[name="notes"]').value = log.notes || ''; // Removed

    // Attachments (Process Before, After, and Legacy)
    const beforeAtts = log.attachmentsBefore || [];
    const afterAtts = log.attachmentsAfter || [];

    // Populate electrical fields
    const setField = (name, val) => { const el = form.querySelector(`[name="${name}"]`); if (el) el.value = val || ""; };
    setField("voltageL1", log.voltageL1);
    setField("voltageL2", log.voltageL2);
    setField("voltageL3", log.voltageL3);
    setField("currentL1", log.currentL1);
    setField("currentL2", log.currentL2);
    setField("currentL3", log.currentL3);
    setField("avgWorkTemp", log.avgWorkTemp);
    setField("avgAreaTemp", log.avgAreaTemp);
    setField("leakPressure", log.leakPressure);
    setField("gasDoor1", log.gasDoor1);
    setField("gasDoor2", log.gasDoor2);
    setField("gasDoor3", log.gasDoor3);
    setField("gas1m1", log.gas1m1);
    setField("gas1m2", log.gas1m2);
    setField("gas1m3", log.gas1m3);
    setField("gas2m1", log.gas2m1);
    setField("gas2m2", log.gas2m2);
    setField("gas2m3", log.gas2m3);
    // Radio buttons
    const checkRadios = (name, val) => { form.querySelectorAll(`input[name="${name}"]`).forEach(r => r.checked = r.value === (val || "")); };
    checkRadios("avgWorkTempCheck", log.avgWorkTempCheck);
    checkRadios("avgAreaTempCheck", log.avgAreaTempCheck);
    checkRadios("leakCheck", log.leakCheck);
    checkRadios("complyType5", log.complyType5);
    checkRadios("ciPcdType5", log.ciPcdType5);

    // Cycle Count
    setField("cycleCount", log.cycleCount);

    // Inspection Checklist radios
    const inspKeys = [
        "insp_exteriorCleaning", "insp_interiorCleaning", "insp_doorSystem",
        "insp_footSwitch", "insp_sensor", "insp_tempPoints",
        "insp_workingPressure", "insp_rfGenerator", "insp_chemicalAmount",
        "insp_airChargingValue", "insp_filter", "insp_decomposer",
        "insp_vacuumPumpOil", "insp_connectors", "insp_drainTank",
        "insp_gasDoor", "insp_gas1m", "insp_gas2m",
        "insp_chemicalLine", "insp_phaseRelay", "insp_systemRelay",
    ];
    inspKeys.forEach(key => checkRadios(key, log[key]));

    // Reporter fields
    setField("reporterName", log.reporterName || (log.customerName && !log.customerSignature ? log.customerName : ""));
    setField("reporterPhone", log.reporterPhone || (log.customerPhone && !log.customerSignature ? log.customerPhone : ""));
    setField("reporterPosition", log.reporterPosition || (log.customerPosition && !log.customerSignature ? log.customerPosition : ""));

    // Customer fields
    // When editing, restore completed-customer values if they were previously saved,
    // otherwise leave empty so the field must be entered for the first time.
    if (log.customerName || log.customerPhone || log.customerPosition || log.customerSignature) {
        setField("customerName", log.customerName);
        setField("customerPhone", log.customerPhone);
        setField("customerPosition", log.customerPosition);
    } else {
        setField("customerName", "");
        setField("customerPhone", "");
        setField("customerPosition", "");
    }

    // E-signature toggle
    const eSignToggle = document.getElementById("use-esignature-toggle");
    const sigSection = document.getElementById("customer-signature-section");
    const signedDocSection = document.getElementById("signed-doc-upload-section");
    if (eSignToggle) {
        eSignToggle.checked = !!log.useESignature;
        if (sigSection) sigSection.style.display = "none";
        if (signedDocSection) signedDocSection.style.display = log.useESignature ? "none" : "";
    }

    // Restore signed document attachments
    pendingSignedDocs = [];
    const existingSignedDocsInput = document.getElementById("existing-signed-docs-json");
    if (existingSignedDocsInput) {
        existingSignedDocsInput.value = JSON.stringify(log.signedDocAttachments || []);
    }
    renderSignedDocPreview();

    // Install/Uninstall fields
    if (log.useRamp) {
        const rampRadio = form.querySelector(`input[name="useRamp"][value="${log.useRamp}"]`);
        if (rampRadio) rampRadio.checked = true;
        if (log.useRamp === 'yes') {
            const rampField = document.getElementById('ramp-width-field');
            if (rampField) rampField.style.display = 'flex';
        }
    }
    setField("rampWidth", log.rampWidth);
    if (log.useElevator) {
        const elevRadio = form.querySelector(`input[name="useElevator"][value="${log.useElevator}"]`);
        if (elevRadio) elevRadio.checked = true;
        if (log.useElevator === 'yes') {
            const elevField = document.getElementById('elevator-detail-fields');
            if (elevField) elevField.style.display = 'flex';
        }
    }
    setField("elevatorCapacity", log.elevatorCapacity);
    setField("elevatorDoorWidth", log.elevatorDoorWidth);
    setField("elevatorDoorHeight", log.elevatorDoorHeight);
    setField("walkwayWidth", log.walkwayWidth);
    setField("walkwayHeight", log.walkwayHeight);
    const currentDoorCount = log.doorCount !== undefined ? log.doorCount : 1;
    setField("doorCount", currentDoorCount);
    const doorDisplay = document.getElementById('install-door-count-display');
    if (doorDisplay) doorDisplay.textContent = currentDoorCount;
    if (currentDoorCount > 0) {
        renderDoorSizeFields(currentDoorCount);
        if (log.doorSizes && log.doorSizes.length > 0) {
            log.doorSizes.forEach(function (door, i) {
                setField("doorWidth_" + (i + 1), door.width);
                setField("doorHeight_" + (i + 1), door.height);
            });
        }
    }
    // Electrical install fields
    if (log.needWiring) { const r = form.querySelector('input[name="needWiring"][value="' + log.needWiring + '"]'); if (r) r.checked = true; }
    if (log.needPowerPlug) { const r = form.querySelector('input[name="needPowerPlug"][value="' + log.needPowerPlug + '"]'); if (r) r.checked = true; }
    setField("wireDistance", log.wireDistance);
    if (log.needDrillWall) { const r = form.querySelector('input[name="needDrillWall"][value="' + log.needDrillWall + '"]'); if (r) r.checked = true; }
    if (log.wireThroughCeiling) { const r = form.querySelector('input[name="wireThroughCeiling"][value="' + log.wireThroughCeiling + '"]'); if (r) r.checked = true; }
    setField("hospitalTechName", log.hospitalTechName);
    setField("hospitalTechPhone", log.hospitalTechPhone);
    // Install type pill (hidden — auto-set from category/installType)
    const installTypeVal = log.installType || log.category;
    if (installTypeVal) {
        const r = form.querySelector('input[name="installType"][value="' + installTypeVal + '"]');
        if (r) r.checked = true;
        // Update badge
        const badge = document.getElementById('install-type-badge');
        if (badge) {
            badge.textContent = installTypeVal;
            badge.style.background = installTypeVal === 'ติดตั้ง' ? '#22c55e' : '#f59e0b';
            badge.style.display = 'inline-block';
        }
    }
    // Pre-delivery checklist
    ['precheck_electrical', 'precheck_wiring', 'precheck_grounding', 'precheck_doorMotor', 'precheck_connectors', 'precheck_vacuumPump', 'precheck_leakTest', 'precheck_chemical', 'precheck_sensors', 'precheck_sterilize', 'precheck_gasResidual', 'precheck_interior', 'precheck_exterior'].forEach(function (key) {
        if (log[key]) { const r = form.querySelector('input[name="' + key + '"][value="' + log[key] + '"]'); if (r) r.checked = true; }
        if (log[key + '_note']) { const n = form.querySelector('input[name="' + key + '_note"]'); if (n) n.value = log[key + '_note']; }
    });
    // Precheck date
    const precheckDateEl = form.querySelector('input[name="precheckDate"]');
    if (precheckDateEl && log.precheckDate) precheckDateEl.value = log.precheckDate;

    // Install date
    const installDateEl = form.querySelector('input[name="installDate"]');
    if (installDateEl && log.installDate) installDateEl.value = log.installDate;
    const actionPlanEl = form.querySelector('textarea[name="actionPlan"]');
    if (actionPlanEl) actionPlanEl.value = log.actionPlan || '';
    // Repair checklist
    repairChecklistData = (log.repairChecklist || []).slice();
    window.repairChecklistData = repairChecklistData;
    renderRepairChecklist();
    // Machine status after repair
    if (log.machineStatusAfter) {
        const ms = form.querySelector('input[name="machineStatusAfter"][value="' + log.machineStatusAfter + '"]');
        if (ms) ms.checked = true;
    }
    const msNote = form.querySelector('textarea[name="machineStatusAfterNote"]');
    if (msNote) msNote.value = log.machineStatusAfterNote || '';
    // Return product
    const rpNote = form.querySelector('textarea[name="returnProductNote"]');
    if (rpNote) rpNote.value = log.returnProductNote || '';
    returnProductData = (log.returnProducts || []).slice();
    window.returnProductData = returnProductData;
    renderReturnProductList();
    // Load existing install photos
    installPhotoPending = (log.installPhotos || []).slice();
    window.installPhotoPending = installPhotoPending;
    renderInstallPhotoPreview();
    preInstallPhotoPending = (log.preInstallPhotos || []).slice();
    window.preInstallPhotoPending = preInstallPhotoPending;
    renderPreInstallPhotoPreview();
    repairPhotoPending = (log.repairPhotos || []).slice();
    window.repairPhotoPending = repairPhotoPending;
    renderRepairPhotoPreview();
    const descriptionAttachmentSources = [
        ...(log.descriptionAttachments || []),
        ...((log.comments && log.comments[0] && log.comments[0].attachments) || []),
    ];
    if (log.category === 'ซ่อม') {
        descriptionAttachmentSources.push(...(log.attachments || []));
    }
    const seenDescriptionAttachments = new Set();
    descriptionAttachments = descriptionAttachmentSources
        .map((att) => ({
            ...att,
            isExisting: true,
        }))
        .filter((att) => {
            const key = att.url || `${att.name || ''}|${att.type || ''}|${att.size || ''}`;
            if (seenDescriptionAttachments.has(key)) return false;
            seenDescriptionAttachments.add(key);
            return !!key;
        });
    window.descriptionAttachments = descriptionAttachments;
    updateDescriptionAttachmentPreview();

    // Load existing customer signature
    const custSigHidden = document.getElementById("customer-signature-data");
    if (custSigHidden) custSigHidden.value = log.customerSignature || "";
    if (log.customerSignature && customerSignaturePad) {
        setTimeout(() => {
            try {
                var canvas = document.getElementById("customer-signature-canvas");
                if (!canvas) return;
                var ctx = canvas.getContext("2d");
                var img = new Image();
                img.onload = function () {
                    var cw = canvas.width;
                    var ch = canvas.height;
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, cw, ch);
                    var scale = Math.min(cw / img.width, ch / img.height) * 0.9;
                    var x = (cw - img.width * scale) / 2;
                    var y = (ch - img.height * scale) / 2;
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                    customerSignaturePad._isEmpty = false;
                };
                img.src = log.customerSignature;
            } catch (e) { }
        }, 300);
    }

    let legacyAttachments = log.attachments || [];
    if (log.attachmentUrl && legacyAttachments.length === 0) {
        // Legacy Migration on the fly
        legacyAttachments = [
            {
                name: log.attachmentName || "Attachment",
                url: log.attachmentUrl,
                type: "legacy",
            },
        ];
    }

    // Append legacy attachments to Before attachments
    const finalBeforeAtts = [...beforeAtts, ...legacyAttachments];

    // Store in hidden inputs
    const existingBeforeJSONInput = form.querySelector(
        'input[name="existingAttachmentsBeforeJSON"]',
    );
    if (existingBeforeJSONInput)
        existingBeforeJSONInput.value = JSON.stringify(finalBeforeAtts);

    const existingAfterJSONInput = form.querySelector(
        'input[name="existingAttachmentsAfterJSON"]',
    );
    if (existingAfterJSONInput)
        existingAfterJSONInput.value = JSON.stringify(afterAtts);

    const oldHidden = form.querySelector('input[name="existingAttachmentsJSON"]');
    if (oldHidden) oldHidden.value = "";

    // Clear pending uploads/deletions on edit start
    if (typeof pendingUploadsBefore !== "undefined") pendingUploadsBefore = [];
    if (typeof pendingUploadsAfter !== "undefined") pendingUploadsAfter = [];
    if (typeof pendingDeletions !== "undefined") pendingDeletions = [];

    // Render Previews of Existing by calling the updated routines
    if (typeof refreshAttachmentBeforePreviews === "function")
        refreshAttachmentBeforePreviews();
    if (typeof refreshAttachmentAfterPreviews === "function")
        refreshAttachmentAfterPreviews();

    // Close detail modal before opening edit modal
    toggleModal("logDetails", false);
    toggleModal("logMaintenance", true);
    populateResponderDropdown(log.responderId || "");
}

function getFieldValue(data, key) {
    if (!data) return null;
    if (data instanceof FormData) return data.get(key);
    return data[key];
}

function isFilled(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
}

function parseRepairChecklist(data) {
    if (!data) return [];
    if (data instanceof FormData) {
        try {
            return JSON.parse(data.get('repairChecklistJSON') || '[]');
        } catch (e) {
            return [];
        }
    }
    return Array.isArray(data.repairChecklist) ? data.repairChecklist : [];
}

async function currentUserHasProfileSignature() {
    const user = auth.currentUser;
    if (!user) return false;
    const userDoc = await FirestoreService.getUser(user.uid);
    return !!(userDoc && userDoc.signature);
}

async function requireAdminManagerProfileSignature(newStatus) {
    const user = auth.currentUser;
    if (!user) return true;
    const userDoc = await FirestoreService.getUser(user.uid);
    const isAdminOrManager = userDoc?.role === 'admin' || userDoc?.role === 'manager';
    if (!isAdminOrManager) return true;

    if (newStatus === 'Cancel' || newStatus === 'Case Closed') {
        if (!userDoc.signature) {
            await showDialog("บัญชีของคุณยังไม่ได้บันทึกลายเซ็นในข้อมูลส่วนตัว กรุณาเพิ่มลายเซ็นก่อนปิดหรือยกเลิกเคส", {
                title: "ลายเซ็นไม่พร้อมใช้งาน",
            });
            return false;
        }
    }
    return true;
}

function getCategorySpecificDoneFields(data) {
    const missing = [];
    const category = String(getFieldValue(data, 'category') || '').trim();

    if (category === 'บำรุงรักษาตามรอบ') {
        const requiredFields = [
            'cycleCount',
            'avgWorkTemp', 'avgWorkTempCheck',
            'avgAreaTemp', 'avgAreaTempCheck',
            'leakPressure', 'leakCheck',
            'complyType5', 'ciPcdType5',
            'gasDoor1', 'gasDoor2', 'gasDoor3',
            'gas1m1', 'gas1m2', 'gas1m3',
            'gas2m1', 'gas2m2', 'gas2m3',
            'insp_exteriorCleaning', 'insp_interiorCleaning', 'insp_doorSystem', 'insp_footSwitch',
            'insp_sensor', 'insp_tempPoints', 'insp_workingPressure', 'insp_rfGenerator',
            'insp_chemicalAmount', 'insp_airChargingValue', 'insp_filter', 'insp_decomposer',
            'insp_vacuumPumpOil', 'insp_connectors', 'insp_drainTank',
            'insp_chemicalLine', 'insp_phaseRelay', 'insp_systemRelay'
        ];
        requiredFields.forEach((key) => {
            if (!isFilled(getFieldValue(data, key))) {
                const labelMap = {
                    cycleCount: 'จำนวนรอบขณะเช็ค',
                    voltageL1: 'แรงดัน R', voltageL2: 'แรงดัน S', voltageL3: 'แรงดัน T',
                    currentL1: 'กระแส R', currentL2: 'กระแส S', currentL3: 'กระแส T',
                    avgWorkTemp: 'อุณหภูมิทำงาน', avgWorkTempCheck: 'ผลอุณหภูมิทำงาน',
                    avgAreaTemp: 'อุณหภูมิพื้นที่', avgAreaTempCheck: 'ผลอุณหภูมิพื้นที่',
                    leakPressure: 'ความดันรั่วไหล', leakCheck: 'ผลการรั่วไหล',
                    complyType5: 'Comply Type 5', ciPcdType5: 'CI PCD Type 5',
                    gasDoor1: 'แก๊สหน้าประตู ครั้งที่ 1', gasDoor2: 'แก๊สหน้าประตู ครั้งที่ 2', gasDoor3: 'แก๊สหน้าประตู ครั้งที่ 3',
                    gas1m1: 'แก๊สห่าง 1ม. ครั้งที่ 1', gas1m2: 'แก๊สห่าง 1ม. ครั้งที่ 2', gas1m3: 'แก๊สห่าง 1ม. ครั้งที่ 3',
                    gas2m1: 'แก๊สห่าง 2ม. ครั้งที่ 1', gas2m2: 'แก๊สห่าง 2ม. ครั้งที่ 2', gas2m3: 'แก๊สห่าง 2ม. ครั้งที่ 3',
                    insp_exteriorCleaning: 'ความสะอาดภายนอก', insp_interiorCleaning: 'ความสะอาดภายใน',
                    insp_doorSystem: 'ระบบประตู', insp_footSwitch: 'Foot Switch', insp_sensor: 'Sensor',
                    insp_tempPoints: 'อุณหภูมิจุดที่ 1-4', insp_workingPressure: 'ความดัน',
                    insp_rfGenerator: 'RF Generator', insp_chemicalAmount: 'ปริมาณน้ำยาที่ฉีด',
                    insp_airChargingValue: 'Air Charging Valve', insp_filter: 'Filter', insp_decomposer: 'Decomposer',
                    insp_vacuumPumpOil: 'น้ำมันปั๊มสุญญากาศ', insp_connectors: 'ข้อต่อ', insp_drainTank: 'ถังเดรนน้ำ',
                    insp_chemicalLine: 'สายส่งน้ำยา', insp_phaseRelay: 'รีเลย์ควบคุมลำดับเฟส', insp_systemRelay: 'รีเลย์ควบคุมระบบ'
                };
                missing.push(labelMap[key] || key);
            }
        });

        const flash1 = isFilled(getFieldValue(data, 'voltageL1')) && isFilled(getFieldValue(data, 'currentL1'));
        const flash2 = isFilled(getFieldValue(data, 'voltageL2')) && isFilled(getFieldValue(data, 'currentL2'));
        const flash3 = isFilled(getFieldValue(data, 'voltageL3')) && isFilled(getFieldValue(data, 'currentL3'));
        if (!flash1 && !flash2 && !flash3) {
            missing.push('ข้อมูลไฟฟ้า (อย่างน้อย 1 ชุด V/A)');
        }
    } else if (category === 'ติดตั้ง' || category === 'รื้อถอน') {
        const hospitalTechName = String(getFieldValue(data, 'hospitalTechName') || '').trim();
        const hospitalTechPhone = String(getFieldValue(data, 'hospitalTechPhone') || '').trim();
        const isHospitalTechCase = !!(hospitalTechName || hospitalTechPhone);

        if (!isHospitalTechCase) {
            if (!isFilled(getFieldValue(data, 'installDate'))) {
                missing.push('วันเวลาดำเนินการติดตั้ง/รื้อถอน');
            }
            if (!isFilled(getFieldValue(data, 'installType'))) {
                missing.push('ประเภทการติดตั้ง/รื้อถอน');
            }

            // Site layout / details validation
            if (!isFilled(getFieldValue(data, 'useRamp'))) {
                missing.push('ข้อมูลมีทางลาดหรือไม่');
            } else if (getFieldValue(data, 'useRamp') === 'yes') {
                if (!isFilled(getFieldValue(data, 'rampWidth'))) missing.push('ความกว้างทางลาด');
            }

            if (!isFilled(getFieldValue(data, 'useElevator'))) {
                missing.push('ข้อมูลมีลิฟต์หรือไม่');
            } else if (getFieldValue(data, 'useElevator') === 'yes') {
                if (!isFilled(getFieldValue(data, 'elevatorCapacity'))) missing.push('น้ำหนักรับได้ของลิฟต์');
                if (!isFilled(getFieldValue(data, 'elevatorDoorWidth'))) missing.push('ความกว้างประตูลิฟต์');
                if (!isFilled(getFieldValue(data, 'elevatorDoorHeight'))) missing.push('ความสูงประตูลิฟต์');
            }

            if (!isFilled(getFieldValue(data, 'walkwayWidth'))) missing.push('ความกว้างช่องทางเดิน (ที่แคบที่สุด)');
            if (!isFilled(getFieldValue(data, 'walkwayHeight'))) missing.push('ความสูงช่องทางเดิน (ที่แคบที่สุด)');

            const doorCountVal = parseInt(getFieldValue(data, 'doorCount')) || 0;
            for (let i = 1; i <= doorCountVal; i++) {
                if (!isFilled(getFieldValue(data, `doorWidth_${i}`))) missing.push(`ความกว้างประตูที่ ${i}`);
                if (!isFilled(getFieldValue(data, `doorHeight_${i}`))) missing.push(`ความสูงประตูที่ ${i}`);
            }

            if (!isFilled(getFieldValue(data, 'needWiring'))) missing.push('ข้อมูลต้องเดินสายไฟหรือไม่');
            if (!isFilled(getFieldValue(data, 'needPowerPlug'))) missing.push('ข้อมูลต้องเดิน Power Plug หรือไม่');
            if (!isFilled(getFieldValue(data, 'wireDistance'))) missing.push('ระยะทางจากตู้ไฟไปยังเครื่อง');
            if (!isFilled(getFieldValue(data, 'needDrillWall'))) missing.push('ข้อมูลเจาะกำแพงหรือไม่');
            if (!isFilled(getFieldValue(data, 'wireThroughCeiling'))) missing.push('ข้อมูลสายไฟเดินลอดฝ้าหรือไม่');
        }

        if (category === 'ติดตั้ง' && !isHospitalTechCase) {
            if (!isFilled(getFieldValue(data, 'precheckDate'))) {
                missing.push('วันที่ตรวจสอบรายละเอียดก่อนส่งมอบ');
            }

            const precheckFields = [
                'precheck_electrical', 'precheck_wiring', 'precheck_grounding', 'precheck_doorMotor',
                'precheck_connectors', 'precheck_vacuumPump', 'precheck_leakTest', 'precheck_chemical',
                'precheck_sensors', 'precheck_sterilize', 'precheck_gasResidual', 'precheck_interior',
                'precheck_exterior'
            ];
            const failedPrechecks = precheckFields.filter((key) => getFieldValue(data, key) !== 'pass');
            if (failedPrechecks.length > 0) {
                missing.push('ตรวจสอบรายละเอียดก่อนส่งมอบทั้งหมดต้องเลือก "ผ่าน"');
            }
        }

        if (category === 'ติดตั้ง' || category === 'รื้อถอน') {
            let installPhotos = [];
            let preInstallPhotos = [];

            if (data instanceof FormData) {
                if (typeof installPhotoPending !== 'undefined' && Array.isArray(installPhotoPending)) {
                    installPhotos = installPhotoPending;
                }
                if (typeof preInstallPhotoPending !== 'undefined' && Array.isArray(preInstallPhotoPending)) {
                    preInstallPhotos = preInstallPhotoPending;
                }
            } else {
                installPhotos = Array.isArray(data.installPhotos) ? data.installPhotos : [];
                preInstallPhotos = Array.isArray(data.preInstallPhotos) ? data.preInstallPhotos : [];
            }

            if (preInstallPhotos.length === 0) {
                missing.push('รูปก่อนติดตั้ง');
            }
            if (installPhotos.length === 0) {
                missing.push('รูปหลังติดตั้ง');
            }
        }
    } else if (category === 'ซ่อม') {
        const checklist = parseRepairChecklist(data).filter((item) => item && (isFilled(item.label) || isFilled(item.status) || isFilled(item.note)));
        if (checklist.length === 0) {
            missing.push('รายการที่ซ่อม');
        }

        const hasFailedItem = checklist.some((item) => String(item.status || '').trim().toLowerCase() === 'fail');
        const machineStatusAfter = String(getFieldValue(data, 'machineStatusAfter') || '').trim();
        if (hasFailedItem && machineStatusAfter !== 'ready') {
            missing.push('สภาพเครื่องหลังดำเนินการต้องเป็น "พร้อมใช้งาน" เมื่อมีรายการซ่อมไม่ผ่าน');
        }

        let repairPhotos = [];
        if (data instanceof FormData) {
            if (typeof repairPhotoPending !== 'undefined' && Array.isArray(repairPhotoPending)) {
                repairPhotos = repairPhotoPending;
            }
        } else {
            repairPhotos = Array.isArray(data.repairPhotos) ? data.repairPhotos : [];
        }

        if (repairPhotos.length === 0) {
            missing.push('รูปหลังซ่อม');
        }
    }

    return missing;
}

function getIncompleteDoneFields(log) {
    if (!log) return ['ข้อมูลเคสไม่ถูกต้อง'];

    const requiredFields = [
        { key: 'siteId', label: 'อุปกรณ์ (Device)' },
        { key: 'date', label: 'วันที่-เวลา' },
        { key: 'category', label: 'หมวดหมู่' },
        { key: 'responderId', label: 'เจ้าหน้าที่ช่างบริการ' },
        { key: 'objective', label: 'คำอธิบายงาน' },
    ];

    const missing = requiredFields
        .filter(({ key }) => !isFilled(getFieldValue(log, key)))
        .map(({ label }) => label);

    if (!isFilled(getFieldValue(log, 'customerName'))) {
        missing.push('ชื่อลูกค้าผู้จบงาน');
    }
    if (!isFilled(getFieldValue(log, 'customerPhone'))) {
        missing.push('เบอร์โทรลูกค้าผู้จบงาน');
    }

    missing.push(...getCategorySpecificDoneFields(log));
    return missing;
}

function getIncompleteDoneFieldKeys(data) {
    if (!data) return [];

    const missingKeys = [];
    const requiredFields = [
        { key: 'siteId' },
        { key: 'date' },
        { key: 'category' },
        { key: 'responderId' },
        { key: 'objective' },
    ];

    requiredFields.forEach(({ key }) => {
        if (!isFilled(getFieldValue(data, key))) {
            missingKeys.push(key);
        }
    });

    if (!isFilled(getFieldValue(data, 'customerName'))) {
        missingKeys.push('customerName');
    }
    if (!isFilled(getFieldValue(data, 'customerPhone'))) {
        missingKeys.push('customerPhone');
    }

    const category = String(getFieldValue(data, 'category') || '').trim();
    if (category === 'บำรุงรักษาตามรอบ') {
        const maRequired = [
            'cycleCount',
            'avgWorkTemp', 'avgWorkTempCheck',
            'avgAreaTemp', 'avgAreaTempCheck',
            'leakPressure', 'leakCheck',
            'complyType5', 'ciPcdType5',
            'gasDoor1', 'gasDoor2', 'gasDoor3',
            'gas1m1', 'gas1m2', 'gas1m3',
            'gas2m1', 'gas2m2', 'gas2m3',
            'insp_exteriorCleaning', 'insp_interiorCleaning', 'insp_doorSystem', 'insp_footSwitch',
            'insp_sensor', 'insp_tempPoints', 'insp_workingPressure', 'insp_rfGenerator',
            'insp_chemicalAmount', 'insp_airChargingValue', 'insp_filter', 'insp_decomposer',
            'insp_vacuumPumpOil', 'insp_connectors', 'insp_drainTank',
            'insp_chemicalLine', 'insp_phaseRelay', 'insp_systemRelay'
        ];
        maRequired.forEach((key) => {
            if (!isFilled(getFieldValue(data, key))) {
                missingKeys.push(key);
            }
        });

        const flash1 = isFilled(getFieldValue(data, 'voltageL1')) && isFilled(getFieldValue(data, 'currentL1'));
        const flash2 = isFilled(getFieldValue(data, 'voltageL2')) && isFilled(getFieldValue(data, 'currentL2'));
        const flash3 = isFilled(getFieldValue(data, 'voltageL3')) && isFilled(getFieldValue(data, 'currentL3'));
        if (!flash1 && !flash2 && !flash3) {
            missingKeys.push('voltageL1', 'voltageL2', 'voltageL3', 'currentL1', 'currentL2', 'currentL3');
        }
    } else if (category === 'ติดตั้ง' || category === 'รื้อถอน') {
        const hospitalTechName = String(getFieldValue(data, 'hospitalTechName') || '').trim();
        const hospitalTechPhone = String(getFieldValue(data, 'hospitalTechPhone') || '').trim();
        const isHospitalTechCase = !!(hospitalTechName || hospitalTechPhone);

        if (!isHospitalTechCase) {
            if (!isFilled(getFieldValue(data, 'installDate'))) {
                missingKeys.push('installDate');
            }
            if (!isFilled(getFieldValue(data, 'installType'))) {
                missingKeys.push('installType');
            }
        }

        if (category === 'ติดตั้ง' && !isHospitalTechCase) {
            if (!isFilled(getFieldValue(data, 'precheckDate'))) {
                missingKeys.push('precheckDate');
            }
            const precheckFields = [
                'precheck_electrical', 'precheck_wiring', 'precheck_grounding', 'precheck_doorMotor',
                'precheck_connectors', 'precheck_vacuumPump', 'precheck_leakTest', 'precheck_chemical',
                'precheck_sensors', 'precheck_sterilize', 'precheck_gasResidual', 'precheck_interior',
                'precheck_exterior'
            ];
            precheckFields.forEach((key) => {
                if (!isFilled(getFieldValue(data, key))) {
                    missingKeys.push(key);
                }
            });
        }

        let installPhotos = [];
        let preInstallPhotos = [];
        if (data instanceof FormData) {
            if (typeof installPhotoPending !== 'undefined' && Array.isArray(installPhotoPending)) {
                installPhotos = installPhotoPending;
            }
            if (typeof preInstallPhotoPending !== 'undefined' && Array.isArray(preInstallPhotoPending)) {
                preInstallPhotos = preInstallPhotoPending;
            }
        } else {
            installPhotos = Array.isArray(data.installPhotos) ? data.installPhotos : [];
            preInstallPhotos = Array.isArray(data.preInstallPhotos) ? data.preInstallPhotos : [];
        }
        if (preInstallPhotos.length === 0) {
            missingKeys.push('preInstallPhotos');
        }
        if (installPhotos.length === 0) {
            missingKeys.push('installPhotos');
        }
    }

    if (category === 'ซ่อม' || category === 'ซ่อมบำรุง') {
        const checklist = parseRepairChecklist(data).filter((item) => item && (isFilled(item.label) || isFilled(item.status) || isFilled(item.note)));
        if (checklist.length === 0) {
            missingKeys.push('repair-checklist-rows');
        }

        const hasFailedItem = checklist.some((item) => String(item.status || '').trim().toLowerCase() === 'fail');
        const machineStatusAfter = String(getFieldValue(data, 'machineStatusAfter') || '').trim();
        if (hasFailedItem && machineStatusAfter !== 'ready') {
            missingKeys.push('machineStatusAfter');
        }

        let repairPhotos = [];
        if (data instanceof FormData) {
            if (typeof repairPhotoPending !== 'undefined' && Array.isArray(repairPhotoPending)) {
                repairPhotos = repairPhotoPending;
            }
        } else {
            repairPhotos = Array.isArray(data.repairPhotos) ? data.repairPhotos : [];
        }
        if (repairPhotos.length === 0) {
            missingKeys.push('repairPhotos');
        }
    }

    const useESignature = data instanceof FormData
        ? (data.get('useESignature') === 'on' || data.get('useESignature') === 'true' || document.getElementById("use-esignature-toggle")?.checked || false)
        : (data.useESignature || false);

    if (!useESignature) {
        let signedDocs = [];
        if (data instanceof FormData) {
            const existingJSON = data.get("existingSignedDocsJSON");
            if (existingJSON) {
                try {
                    signedDocs = JSON.parse(existingJSON);
                } catch (e) { }
            }
            if (typeof pendingSignedDocs !== 'undefined' && Array.isArray(pendingSignedDocs)) {
                signedDocs = signedDocs.concat(pendingSignedDocs);
            }
        } else {
            signedDocs = data.signedDocAttachments || [];
        }
        if (signedDocs.length === 0) {
            missingKeys.push('signed-doc-upload-section');
        }
    }

    return missingKeys;
}

function highlightIncompleteFields(form, missingKeys) {
    if (!form) return;

    // Clear previous highlights
    const elements = form.querySelectorAll('input, select, textarea, .autocomplete-wrapper, .check-pill-group, #pre-install-photo-preview, #install-photo-preview, #repair-photo-preview, #signed-doc-preview, #btn-pre-install-photo, #btn-install-photo, #btn-repair-photo, #btn-attach-signed-doc');
    elements.forEach(el => {
        el.classList.remove('is-invalid');
    });

    // Highlight missing fields
    missingKeys.forEach(key => {
        if (key === 'siteId') {
            const wrapper = form.querySelector('.autocomplete-wrapper:has(#log-site-input)') || document.getElementById('log-site-input');
            if (wrapper) {
                wrapper.classList.add('is-invalid');

                const removeHighlight = () => {
                    wrapper.classList.remove('is-invalid');
                    const inputEl = document.getElementById('log-site-input');
                    if (inputEl) {
                        inputEl.removeEventListener('input', removeHighlight);
                        inputEl.removeEventListener('change', removeHighlight);
                    }
                };
                const inputEl = document.getElementById('log-site-input');
                if (inputEl) {
                    inputEl.addEventListener('input', removeHighlight);
                    inputEl.addEventListener('change', removeHighlight);
                }
            }
            return;
        }

        // Custom Highlight: Pre-install Photos
        if (key === 'preInstallPhotos') {
            const preview = document.getElementById('pre-install-photo-preview');
            const btn = document.getElementById('btn-pre-install-photo');
            if (preview) preview.classList.add('is-invalid');
            if (btn) btn.classList.add('is-invalid');

            const removeHighlight = () => {
                if (preview) preview.classList.remove('is-invalid');
                if (btn) btn.classList.remove('is-invalid');
                const fileInput = document.getElementById('pre-install-photo-input');
                if (fileInput) fileInput.removeEventListener('change', removeHighlight);
            };
            const fileInput = document.getElementById('pre-install-photo-input');
            if (fileInput) fileInput.addEventListener('change', removeHighlight);
            return;
        }

        // Custom Highlight: Install Photos
        if (key === 'installPhotos') {
            const preview = document.getElementById('install-photo-preview');
            const btn = document.getElementById('btn-install-photo');
            if (preview) preview.classList.add('is-invalid');
            if (btn) btn.classList.add('is-invalid');

            const removeHighlight = () => {
                if (preview) preview.classList.remove('is-invalid');
                if (btn) btn.classList.remove('is-invalid');
                const fileInput = document.getElementById('install-photo-input');
                if (fileInput) fileInput.removeEventListener('change', removeHighlight);
            };
            const fileInput = document.getElementById('install-photo-input');
            if (fileInput) fileInput.addEventListener('change', removeHighlight);
            return;
        }

        // Custom Highlight: Repair Photos
        if (key === 'repairPhotos') {
            const preview = document.getElementById('repair-photo-preview');
            const btn = document.getElementById('btn-repair-photo');
            if (preview) preview.classList.add('is-invalid');
            if (btn) btn.classList.add('is-invalid');

            const removeHighlight = () => {
                if (preview) preview.classList.remove('is-invalid');
                if (btn) btn.classList.remove('is-invalid');
                const fileInput = document.getElementById('repair-photo-input');
                if (fileInput) fileInput.removeEventListener('change', removeHighlight);
            };
            const fileInput = document.getElementById('repair-photo-input');
            if (fileInput) fileInput.addEventListener('change', removeHighlight);
            return;
        }

        // Custom Highlight: Signed Document Copy Upload
        if (key === 'signed-doc-upload-section') {
            const preview = document.getElementById('signed-doc-preview');
            const btn = document.getElementById('btn-attach-signed-doc');
            if (preview) preview.classList.add('is-invalid');
            if (btn) btn.classList.add('is-invalid');

            const removeHighlight = () => {
                if (preview) preview.classList.remove('is-invalid');
                if (btn) btn.classList.remove('is-invalid');
                const fileInput = document.getElementById('signed-doc-input');
                if (fileInput) fileInput.removeEventListener('change', removeHighlight);
            };
            const fileInput = document.getElementById('signed-doc-input');
            if (fileInput) fileInput.addEventListener('change', removeHighlight);
            return;
        }

        // Custom Highlight: Repair Checklist dynamic rows
        if (key === 'repair-checklist-rows') {
            const container = document.getElementById('repair-checklist-rows');
            const btn = document.getElementById('btn-add-repair-row');
            if (container) container.classList.add('is-invalid');
            if (btn) btn.classList.add('is-invalid');

            const removeHighlight = () => {
                if (container) container.classList.remove('is-invalid');
                if (btn) btn.classList.remove('is-invalid');
                if (btn) btn.removeEventListener('click', removeHighlight);
            };
            if (btn) btn.addEventListener('click', removeHighlight);
            return;
        }

        // Default Highlights (inputs, check-pill-groups, etc.)
        const el = form.querySelector(`[name="${key}"]`) || document.getElementById(key);
        if (el) {
            const checkPillGroup = el.closest('.check-pill-group');
            const targetEl = checkPillGroup || el;

            targetEl.classList.add('is-invalid');

            // Remove highlight on input
            const removeHighlight = () => {
                targetEl.classList.remove('is-invalid');
                if (checkPillGroup) {
                    checkPillGroup.querySelectorAll('input').forEach(input => {
                        input.removeEventListener('input', removeHighlight);
                        input.removeEventListener('change', removeHighlight);
                    });
                } else {
                    el.removeEventListener('input', removeHighlight);
                    el.removeEventListener('change', removeHighlight);
                }
            };

            if (checkPillGroup) {
                checkPillGroup.querySelectorAll('input').forEach(input => {
                    input.addEventListener('input', removeHighlight);
                    input.addEventListener('change', removeHighlight);
                });
            } else {
                el.addEventListener('input', removeHighlight);
                el.addEventListener('change', removeHighlight);
            }
        }
    });

    // Scroll the first invalid element into view and focus it
    if (missingKeys.length > 0) {
        let firstKey = missingKeys[0];
        let firstEl;

        if (firstKey === 'siteId') {
            firstEl = document.getElementById('log-site-input') || form.querySelector('.autocomplete-wrapper');
        } else if (firstKey === 'preInstallPhotos') {
            firstEl = document.getElementById('btn-pre-install-photo') || document.getElementById('pre-install-photo-preview');
        } else if (firstKey === 'installPhotos') {
            firstEl = document.getElementById('btn-install-photo') || document.getElementById('install-photo-preview');
        } else if (firstKey === 'repairPhotos') {
            firstEl = document.getElementById('btn-repair-photo') || document.getElementById('repair-photo-preview');
        } else if (firstKey === 'signed-doc-upload-section') {
            firstEl = document.getElementById('btn-attach-signed-doc') || document.getElementById('signed-doc-preview');
        } else if (firstKey === 'repair-checklist-rows') {
            firstEl = document.getElementById('btn-add-repair-row') || document.getElementById('repair-checklist-rows');
        } else {
            firstEl = form.querySelector(`[name="${firstKey}"]`) || document.getElementById(firstKey);
        }

        if (firstEl) {
            const checkPillGroup = firstEl.closest?.('.check-pill-group');
            const scrollEl = checkPillGroup || firstEl;
            setTimeout(() => {
                scrollEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstEl.focus?.();
            }, 200);
        }
    }
}

function canMarkDone(log) {
    const missing = getIncompleteDoneFields(log);
    return missing.length === 0;
}

async function quickUpdateStatus(logId, newStatus) {
    if (!newStatus) return;
    if (newStatus === 'Done') {
        var log = state.logs.find(function (l) { return l.id === logId; });
        const missing = getIncompleteDoneFields(log);
        if (missing.length > 0) {
            await showDialog(
                'ไม่สามารถเปลี่ยนสถานะเป็น "เสร็จสิ้น" ได้ เนื่องจากข้อมูลยังไม่ครบถ้วน',
                { title: 'ข้อมูลไม่ครบถ้วน', icon: 'warning' }
            );
            editLog(logId);
            setTimeout(() => {
                const form = document.getElementById("form-log-maintenance");
                if (form) {
                    highlightIncompleteFields(form, getIncompleteDoneFieldKeys(log));
                }
            }, 300);
            return;
        }

        if (log && (!log.customerName || !log.customerPhone || !log.customerSignature)) {
            openSignatureModal(logId, newStatus);
            return;
        }
    }

    let cancelReason = null;
    if (newStatus === 'Cancel') {
        cancelReason = await showCancelReasonDialog();
        if (cancelReason === null) return;
    }

    if (newStatus === 'Cancel' || newStatus === 'Case Closed') {
        if (!await requireAdminManagerProfileSignature(newStatus)) return;
    }

    await executeStatusUpdate(logId, newStatus, null, '', '', '', cancelReason);
}

window.quickUpdateStatus = quickUpdateStatus;

function deleteLog(logId) {
    state.currentDeleteLogId = logId;
    state.currentDeleteId = null; // Ensure we don't delete a site

    // Update modal text context
    const modalBody = document.querySelector(
        "#modal-delete-confirm .modal-body p",
    );
    if (modalBody) {
        modalBody.innerHTML =
            "คุณแน่ใจหรือไม่ที่จะลบรายการซ่อมบำรุงนี้?<br>การกระทำนี้ไม่สามารถย้อนกลับได้";
    }
    const deleteBtn = document.getElementById("btn-confirm-delete");
    if (deleteBtn) deleteBtn.textContent = "ลบรายการ";

    toggleModal("deleteConfirm", true);
}

function viewSiteHistory(siteId) {
    if (selects.filterHidden) {
        selects.filterHidden.value = siteId;
        const site = state.sites.find((s) => s.id === siteId);
        if (selects.filterInput) selects.filterInput.value = site ? site.name : "";

        renderLogs();
        switchView("engineer-view");
        // Optional: Scroll to top of logs
        document.getElementById("logs-feed").scrollIntoView({ behavior: "smooth" });
    }
}

// --- Rendering ---
function renderAll() {
    renderSites();
    renderCurrentView();
    // updateSiteSelects(); // Removed
    initSiteAutocompletes();
    setupSiteNameAutoGeneration();
    updateSiteFieldDataLists();
}

function renderCurrentView() {
    // Robust check: rely on DOM visibility to prevent state mismatch
    const calendarView = document.getElementById("logs-calendar-view");
    if (calendarView && !calendarView.classList.contains("hidden")) {
        renderCalendar();
    } else {
        renderLogs();
    }
    // Re-render plan if active
    const planView = document.getElementById("plan-view");
    if (planView && planView.classList.contains("active")) {
        if (typeof renderMaintenancePlan === 'function') renderMaintenancePlan();
    }
    updateCaseDashboard();
}

// --- Calendar Logic ---
function resetFilters() {
    // 1. Reset Site Search Filter
    const siteInput = document.getElementById("site-filter-input");
    if (siteInput) siteInput.value = "";
    const filterHidden = document.getElementById("site-filter");
    if (filterHidden) filterHidden.value = "all";

    // Also clear log-search-input
    const logSearch = document.getElementById("log-search-input");
    if (logSearch) logSearch.value = "";

    // [NEW] Reset Category Filter
    const categorySelect = document.getElementById("filter-category");
    if (categorySelect) categorySelect.value = "all";

    // Reset Status Filter
    const statusSelect = document.getElementById("filter-status");
    if (statusSelect) statusSelect.value = "all";

    // 2. Reset Date Filter
    const startInput = document.getElementById("filter-start-date");
    const endInput = document.getElementById("filter-end-date");
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";

    // 3. Reset Calendar State to Current Month
    calendarState.currentDate = new Date();
}

function switchLogView(view) {
    localStorage.setItem("activeLogView", view);
    resetFilters(); // Auto-reset filters on view switch
    calendarState.view = view;

    // UI Toggles
    document
        .getElementById("btn-view-list")
        .classList.toggle("active", view === "list");
    document
        .getElementById("btn-view-calendar")
        .classList.toggle("active", view === "calendar");

    document
        .getElementById("logs-feed")
        .classList.toggle("hidden", view !== "list");

    // Toggle Date Controls
    const dateRangeGroup = document.getElementById("date-range-group");
    const calControls = document.getElementById("calendar-date-controls");

    if (dateRangeGroup)
        dateRangeGroup.classList.toggle("hidden", view === "calendar");
    if (calControls) calControls.classList.toggle("hidden", view !== "calendar");

    document
        .getElementById("logs-calendar-view")
        .classList.toggle("hidden", view !== "calendar");

    const caseTypeDashboard = document.getElementById("case-type-dashboard");
    if (caseTypeDashboard) caseTypeDashboard.classList.toggle("hidden", view === "calendar");

    if (view === "calendar") {
        fetchAndRenderCalendar();
    } else {
        renderLogs();
    }
}

async function fetchAndRenderCalendar() {
    const year = calendarState.currentDate.getFullYear();
    const month = calendarState.currentDate.getMonth();
    const monthKey = `${year}-${month}`;

    // Optimization: If we already have logs for this month loaded, just render
    // Commented out to force refresh on view switch for data consistency
    // if (state.currentCalendarMonth === monthKey && state.calendarLogs.length > 0) {
    //     renderCalendar();
    //     return;
    // }

    // Show Loading in Grid
    const grid = document.getElementById("calendar-grid");
    if (grid) {
        grid.innerHTML =
            '<div style="grid-column: span 7; text-align: center; padding: 2rem; color: var(--text-muted);">กำลังโหลดข้อมูล...</div>';
    }

    state.isCalendarLoading = true;
    try {
        const logs = await FirestoreService.fetchLogsByMonth(year, month);
        state.calendarLogs = logs;
        state.currentCalendarMonth = monthKey;
        renderCalendar();
    } catch (err) {
        console.error("Error fetching calendar logs:", err);
        if (grid)
            grid.innerHTML =
                '<div style="grid-column: span 7; text-align: center; color: var(--danger-color);">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    } finally {
        state.isCalendarLoading = false;
    }
}

function changeCalendarMonth(delta) {
    calendarState.currentDate.setMonth(
        calendarState.currentDate.getMonth() + delta,
    );
    fetchAndRenderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const monthLabel = document.getElementById("cal-current-month");
    const date = calendarState.currentDate;
    const year = date.getFullYear();
    const month = date.getMonth();

    // Sync Dropdowns (in case navigation was used via Prev/Next buttons)
    const yearSelect = document.getElementById("filter-cal-year");
    const monthSelect = document.getElementById("filter-cal-month");
    if (yearSelect) yearSelect.value = year;
    if (monthSelect) monthSelect.value = month;

    // Format month and year according to system locale
    monthLabel.textContent = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long'
    });

    // --- Calculate Total Cost for Current View ---
    const costDisplay = document.getElementById("total-cost-display");
    if (costDisplay) {
        // Filter logic uses separate calendar logs
        const currentMonthLogs = state.calendarLogs.filter((l) => {
            if (!l.date) return false;
            const d = new Date(l.date);
            if (d.getFullYear() !== year || d.getMonth() !== month) return false;

            // Apply Active Filters (Site, Price, Search)
            // 1. Site
            const filterId = selects.filterHidden
                ? selects.filterHidden.value
                : "all";
            if (filterId !== "all" && l.siteId !== filterId) return false;

            // [NEW] Category Filter
            const categorySelect = document.getElementById("filter-category");
            const categoryValue = categorySelect ? categorySelect.value : "all";
            if (categoryValue !== "all" && l.category !== categoryValue) return false;

            // 2. Price
            const minPrice = document.getElementById("filter-min-price")
                ? parseCurrency(document.getElementById("filter-min-price").value)
                : 0;
            const maxPrice = document.getElementById("filter-max-price")
                ? parseCurrency(document.getElementById("filter-max-price").value)
                : Infinity;
            const cost = parseFloat(l.cost) || 0;
            if (cost < minPrice) return false;

            const maxInput = document.getElementById("filter-max-price")
                ? document.getElementById("filter-max-price").value
                : "";
            if (maxInput !== "" && cost > maxPrice) return false;

            // 3. Search (keyword)
            const query = document.getElementById("log-search-input")
                ? document.getElementById("log-search-input").value.toLowerCase().trim()
                : "";
            if (query) {
                const site = state.sites.find((s) => s.id === l.siteId);
                const siteName = site ? site.name.toLowerCase() : "";
                const objective = l.objective.toLowerCase();
                const notes = l.notes ? l.notes.toLowerCase() : "";
                if (
                    !siteName.includes(query) &&
                    !objective.includes(query) &&
                    !notes.includes(query)
                )
                    return false;
            }

            return true;
        });

        const total = currentMonthLogs.reduce(
            (sum, log) => sum + (parseFloat(log.cost) || 0),
            0,
        );
        costDisplay.textContent = formatCurrency(total);
    }

    grid.innerHTML = "";

    // Weekday Headers
    const weekdays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
    weekdays.forEach((day) => {
        const el = document.createElement("div");
        el.className = "cal-weekday";
        el.textContent = day;
        grid.appendChild(el);
    });

    // Days logic
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty cells for previous month padding
    for (let i = 0; i < firstDayOfMonth; i++) {
        const el = document.createElement("div");
        el.className = "cal-day empty";
        grid.appendChild(el);
    }

    // Actual days
    const today = new Date();
    const isCurrentMonth =
        today.getFullYear() === year && today.getMonth() === month;

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement("div");
        cell.className = "cal-day";

        if (isCurrentMonth && day === today.getDate()) {
            cell.classList.add("today");
        }

        // Format check: YYYY-MM-DD
        const monthStr = (month + 1).toString().padStart(2, "0");
        const dayStr = day.toString().padStart(2, "0");
        const dateStr = `${year}-${monthStr}-${dayStr}`;

        cell.innerHTML = `
            <span class="day-number">${day}</span>
            <button class="btn-calendar-add" title="เพิ่มรายการซ่อมบำรุง" onclick="event.stopPropagation(); openLogModalForDate('${dateStr}')">
                <i class="fa-solid fa-plus"></i>
            </button>
        `;

        const logsForDay = state.calendarLogs.filter((l) => {
            if (!l.date) return false;

            // Site Filter
            const filterId = selects.filterHidden
                ? selects.filterHidden.value
                : "all";
            if (filterId !== "all" && l.siteId !== filterId) return false;

            // [NEW] Category Filter
            const categorySelect = document.getElementById("filter-category");
            const categoryValue = categorySelect ? categorySelect.value : "all";
            if (categoryValue !== "all" && l.category !== categoryValue) return false;

            // Handle both "YYYY-MM-DD" and ISO strings
            const logDate = l.date.split("T")[0];
            return logDate === dateStr;
        });

        // Render indicators
        if (logsForDay.length > 0) {
            logsForDay.forEach((log) => {
                const badge = document.createElement("div");
                badge.className = "cal-event-badge";
                const site = state.sites.find((s) => s.id === log.siteId);
                const siteName = site ? site.name : "Job";

                // Apply dynamic color
                const siteColor = getSiteColor(siteName);

                // Status Color with background
                const statusColors = {
                    Open: { color: "#ca8a04", bg: "rgba(234,179,8,0.2)" },
                    "On Process": { color: "#f97316", bg: "rgba(249,115,22,0.2)" },
                    Cancel: { color: "#ef4444", bg: "rgba(239,68,68,0.2)" },
                    Done: { color: "#a855f7", bg: "rgba(168,85,247,0.2)" },
                    "Case Closed": { color: "#22c55e", bg: "rgba(34,197,94,0.2)" },
                    Completed: { color: "#a855f7", bg: "rgba(168,85,247,0.2)" },
                };
                const statusStyle = statusColors[log.status] || {
                    color: "var(--text-muted)",
                    bg: "var(--card-bg)"
                };

                // Category Icon
                let catIcon =
                    '<i class="fa-solid fa-wrench" style="color: var(--text-muted); font-size: 0.6rem;"></i>';
                if (isMaCategory(log.category))
                    catIcon =
                        '<i class="fa-solid fa-screwdriver-wrench" style="color: #111111; font-size: 0.6rem;"></i>';
                else if (log.category === "ตามใบสั่งซื้อ")
                    catIcon =
                        '<i class="fa-solid fa-triangle-exclamation" style="color: #f97316; font-size: 0.6rem;"></i>';
                else if (log.category === "Cleaning")
                    catIcon =
                        '<i class="fa-solid fa-broom" style="color: var(--text-muted); font-size: 0.6rem;"></i>';
                else if (log.category === "Installation")
                    catIcon =
                        '<i class="fa-solid fa-plus-square" style="color: var(--text-muted); font-size: 0.6rem;"></i>';
                else if (log.category === "Repair")
                    catIcon =
                        '<i class="fa-solid fa-hammer" style="color: var(--text-muted); font-size: 0.6rem;"></i>';

                const statusLabelsCalendar = {
                    Open: 'เปิดงาน', 'On Process': 'ดำเนินการ',
                    Done: 'เสร็จสิ้น', 'Case Closed': 'ปิดเคส', Cancel: 'ยกเลิก', Completed: 'เสร็จสิ้น'
                };
                const statusLabel = statusLabelsCalendar[log.status] || log.status || '-';

                badge.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-bottom:3px;">
                        <span style="font-size:0.7rem; font-weight:600; color:var(--text-color);">${site.siteCode || "-"}</span>
                        <span style="font-size:0.65rem; font-weight:600; color:${statusStyle.color}; background:${statusStyle.color}20; padding:1px 5px; border-radius:4px;">${statusLabel}</span>
                    </div>
                    <span style="white-space:normal; word-break:break-word; line-height:1.3; font-size:0.8rem; color:var(--text-color); margin-bottom:4px;">${siteName}</span>
                    <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                        <span style="font-size:0.65rem; color:#64748b; background:#f8fafc; padding:2px 6px; border-radius:4px; border:1px solid #e2e8f0; font-weight:500;">
                            ${catIcon} ${log.category || 'อื่นๆ'}
                        </span>
                    </div>
                `;

                badge.style.backgroundColor = `${siteColor}15`;
                badge.style.border = `1px solid ${siteColor}40`;
                badge.style.borderLeft = `4px solid ${siteColor}`;
                badge.style.setProperty('--site-color', siteColor);
                badge.style.padding = "6px 8px";
                badge.style.display = "flex";
                badge.style.flexDirection = "column";
                badge.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                badge.style.borderRadius = "6px";
                badge.style.marginBottom = "4px";
                badge.style.transition = "transform 0.2s, box-shadow 0.2s";
                badge.onmouseenter = () => {
                    badge.style.transform = "translateY(-1px)";
                    badge.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                };
                badge.onmouseleave = () => {
                    badge.style.transform = "none";
                    badge.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                };

                cell.appendChild(badge);
            });
        }

        // Interaction: Select cell (Mobile) & Show Details
        cell.onclick = (e) => {
            // 1. Toggle Selected State (for Mobile Quick Add visibility)
            document
                .querySelectorAll(".cal-day")
                .forEach((c) => c.classList.remove("selected"));
            cell.classList.add("selected");

            // 2. Show Details if logs exist
            if (logsForDay.length > 0) {
                showDayDetails(dateStr, logsForDay);
            }
        };

        grid.appendChild(cell);
    }
}

function showDayDetails(dateStr, logs) {
    const detailsPanel = document.getElementById("calendar-details-panel");
    const selectedDateSpan = document.getElementById("cal-selected-date");
    const logsList = document.getElementById("cal-selected-logs");

    if (!detailsPanel) return;

    // Store selected date for refresh
    calendarState.selectedDate = dateStr;

    detailsPanel.classList.remove("hidden");

    const [y, m, d] = dateStr.split("-");
    selectedDateSpan.textContent = `${d}/${m}/${parseInt(y) + 543}`;

    logsList.innerHTML = "";

    // Use the same table structure as renderLogs
    const dateOptions = { year: "numeric", month: "2-digit", day: "2-digit" };

    const tableContainer = document.createElement("div");
    tableContainer.className = "table-container";

    const table = document.createElement("table");
    table.className = "data-table";

    // Header (Same as renderLogs)
    table.innerHTML = `
        <thead>
            <tr>
                <th style="width: 5%;">ที่</th>
                <th style="width: 1%; white-space: nowrap;">รหัสเคส</th>
                <th style="width: 1%; white-space: nowrap;">วันที่</th>
                <th style="width: 30%;">สถานที่</th>
                <th style="width: 12%;">หมวดหมู่</th>
                <th style="width: 10%;">สถานะ</th>

                <th style="width: 12%;">แก้ไขล่าสุด</th>
                <th style="width: 8%;"></th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;

    const tbody = table.querySelector("tbody");

    logs.forEach((log, index) => {
        const site = state.sites.find((s) => s.id === log.siteId) || {
            name: "ไม่พบข้อมูลสถานที่",
        };

        // Resolve dynamic user name
        const recorderName = log.updatedBy ||
            (state.users && log.recorderId && state.users[log.recorderId]
                ? state.users[log.recorderId].displayName ||
                state.users[log.recorderId].email ||
                log.recordedBy
                : log.recordedBy || "-");

        const thaiDate = formatDateDDMMYYYY(log.date);
        const logTime = log.date && log.date.includes('T') && log.date.split('T')[1].substring(0, 5) !== '00:00' ? log.date.split('T')[1].substring(0, 5) : '';

        const tr = document.createElement("tr");
        const siteColor = getSiteColor(site.name);
        // Force priority to ensure it overrides mobile CSS
        tr.style.setProperty("border-left", `4px solid ${siteColor}`, "important");
        tr.style.cursor = "pointer";
        tr.onclick = (e) => {
            if (e.target.closest("button") || e.target.closest("a")) return;
            viewLogDetails(log.id);
        };

        const rowNumber = index + 1;

        // Get icon for category with colors
        let catIcon = '';
        let catBadge = '';
        let catColor = '#64748b';
        let catBg = 'rgba(100,116,139,0.12)';

        if (isMaCategory(log.category)) {
            catColor = '#0369a1';
            catBg = '#e0f2fe';
        } else if (log.category === "ติดตั้ง") {
            catColor = '#15803d';
            catBg = '#dcfce7';
        } else if (log.category === "รื้อถอน") {
            catColor = '#b45309';
            catBg = '#fef3c7';
        } else if (log.category === "ซ่อม") {
            catColor = '#dc2626';
            catBg = '#fee2e2';
        } else if (log.category === "ตามสัญญาจ้าง") {
            catColor = '#7c3aed';
            catBg = '#ede9fe';
        } else if (log.category === "ตามใบสั่งซื้อ") {
            catColor = '#0891b2';
            catBg = '#cffafe';
        }

        catBadge = `<span style="background:${catBg}; color:${catColor}; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:600; white-space:nowrap; ">${log.category || "-"}</span>`;
        const catBadgeMobile = `<span style="background:${catBg}; color:${catColor}; padding:0.2rem 0.6rem; border-radius:6px; font-size:0.75rem; font-weight:700; white-space:nowrap;">${log.category || "-"}</span>`;

        // Render Status Badge
        const statusColors = {
            Open: { bg: "rgba(234,179,8,0.15)", color: "#ca8a04", label: "เปิดงาน" },
            "On Process": {
                bg: "rgba(249,115,22,0.15)",
                color: "#f97316",
                label: "กำลังดำเนินการ",
            },
            Cancel: {
                bg: "rgba(239,68,68,0.15)",
                color: "#ef4444",
                label: "ยกเลิก",
            },
            Done: { bg: "rgba(168,85,247,0.15)", color: "#a855f7", label: "เสร็จสิ้น" },
            "Case Closed": { bg: "rgba(34,197,94,0.15)", color: "#22c55e", label: "ปิดเคส" },
            Completed: {
                bg: "rgba(168,85,247,0.15)",
                color: "#a855f7",
                label: "เสร็จสิ้น",
            },
        };
        const s = statusColors[log.status] || {
            bg: "rgba(100,116,139,0.15)",
            color: "var(--text-muted)",
            label: log.status || "เปิดงาน",
        };
        const statusBadge = `<span style="background:${s.bg}; color:${s.color}; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:600; white-space: nowrap;">${s.label}</span>`;

        // Mobile status badge
        const statusLabelClean = {
            Open: 'เปิดงาน', 'On Process': 'ดำเนินการ',
            Done: 'เสร็จสิ้น', 'Case Closed': 'ปิดเคส', Cancel: 'ยกเลิก', Completed: 'เสร็จสิ้น'
        };
        const mobileStatusBadge = `<span style="background:${s.color}; color:#fff; padding:0.3rem 0.75rem; border-radius:8px; font-size:0.8rem; font-weight:700; white-space:nowrap;">${statusLabelClean[log.status] || log.status || '-'}</span>`;

        // Initial detail
        let calInitialDetail = '';
        if (log.comments && log.comments.length > 0 && log.comments[0].text) {
            const text = log.comments[0].text;
            calInitialDetail = text.length > 60 ? text.substring(0, 60) + '...' : text;
        } else {
            calInitialDetail = log.objective || '-';
        }

        // Responder
        const calResponder = log.responderId && state.users && state.users[log.responderId]
            ? (state.users[log.responderId].displayName || state.users[log.responderId].email) : '-';

        tr.innerHTML = `
            <td class="cell-index desktop-only">${rowNumber}</td>
            <td class="cell-case-id" data-label="รหัสเคส"><span class="value" style="font-family: 'Courier New', monospace; font-weight: 600; color: var(--primary-color);">${log.caseId ? log.caseId.replace('CASE-', '') : "-"}</span></td>
            <td class="cell-date" data-label="วันที่"><span class="value">${thaiDate}</span>${logTime ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${logTime}</div>` : ''}</td>
            <td class="cell-site" data-label="สถานที่" style="font-weight: 500;">
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <span class="value">${site.siteCode ? site.siteCode + ' - ' : ''}${site.name}</span>
                    <button class="site-filter-btn desktop-only" onclick="viewSiteLogs('${site.id}')" title="กรองเฉพาะสถานที่นี้" style="display:inline-flex; align-items:center; justify-content:center; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#0369a1; border-radius:6px; padding:2px 6px; font-size:0.7rem; cursor:pointer; gap:3px; white-space:nowrap; transition:background 0.15s;"><i class="fa-solid fa-filter" style="font-size:0.65rem;"></i></button>
                </div>
            </td>
            <td class="cell-category" data-label="หมวดหมู่"><span class="value">${catBadge}</span></td>
            <td class="cell-status" data-label="สถานะ">${statusBadge}</td>
            <td class="cell-user" data-label="แก้ไขล่าสุด"><span class="value">${recorderName}</span></td>
            <td class="cell-mobile-card mobile-only" data-label="">
                <div class="mc-top">
                    <span style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;"><span class="mc-caseid">${log.caseId ? log.caseId.replace('CASE-', '') : '-'}</span> <span class="mc-siteid">${site.siteCode || '-'}</span></span>
                </div>
                <div class="mc-site" style="display:flex; align-items:center; gap:6px;">
                    <span>${site.name}</span>
                    <button onclick="event.stopPropagation(); viewSiteLogs('${site.id}')" title="กรองเฉพาะสถานที่นี้" style="display:inline-flex; align-items:center; justify-content:center; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#0369a1; border-radius:6px; padding:2px 7px; font-size:0.7rem; cursor:pointer; flex-shrink:0;"><i class="fa-solid fa-filter" style="font-size:0.65rem;"></i></button>
                </div>
                <div class="mc-detail">
                    <div><span class="mc-label">วันที่:</span> ${thaiDate}${logTime ? ' ' + logTime : ''}</div>
                    <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><span class="mc-label">รายละเอียด:</span> ${calInitialDetail}</div>
                    <div><span class="mc-label">ช่าง:</span> ${calResponder}</div>
                </div>
                <div class="mc-footer">
                    <span style="display:flex; gap:6px; align-items:center;"><span class="mc-status-big">${mobileStatusBadge}</span><span class="mc-catbadge" style="color:${catColor}; background:${catBg};">${log.category || '-'}</span></span>
                    <span class="mc-footer-actions">
                        <button class="mc-btn" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}')" title="แก้ไข">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        ${currentUserRole === 'admin' || currentUserRole === 'manager' ? `
                        <button class="mc-btn" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}', true)" title="ลบ">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                        ` : ''}
                    </span>
                </div>
            </td>
            <td class="cell-actions" data-label="">
                <div class="actions-wrapper">
                    <button class="btn-icon action-edit" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}')" title="แก้ไข">
                        <i class="fa-solid fa-pen" style="font-size: 0.9rem;"></i>
                    </button>
                    ${currentUserRole === 'admin' || currentUserRole === 'manager' ? `
                    <button class="btn-icon action-delete" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}', true)" title="ลบ">
                        <i class="fa-solid fa-trash" style="font-size: 0.9rem;"></i>
                    </button>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tableContainer.appendChild(table);
    logsList.appendChild(tableContainer);

    // Scroll to details
    detailsPanel.scrollIntoView({ behavior: "smooth" });
}

var cachedApiAgencies = null;
var agenciesLoadedOnce = false;

async function getApiAgencies() {
    if (cachedApiAgencies) {
        return cachedApiAgencies;
    }

    try {
        console.log("Loading organizations from lao.csv...");
        const response = await fetch("lao.csv");
        const csvText = await response.text();

        // Parse CSV
        const lines = csvText.split("\n");
        const agencies = [];

        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Parse CSV line (handle quoted fields)
            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (!matches || matches.length < 5) continue;

            const [order, code, name, amphur, province] = matches.map((m) =>
                m.replace(/^"|"$/g, ""),
            );

            // Extract org type and clean name
            let orgType = "";
            let cleanName = name;

            if (name.startsWith("องค์การบริหารส่วนจังหวัด")) {
                orgType = "อบจ.";
                cleanName = name.replace("องค์การบริหารส่วนจังหวัด", "").trim();
            } else if (name.startsWith("เทศบาลนคร")) {
                orgType = "เทศบาลนคร";
                cleanName = name.replace("เทศบาลนคร", "").trim();
            } else if (name.startsWith("เทศบาลเมือง")) {
                orgType = "เทศบาลเมือง";
                cleanName = name.replace("เทศบาลเมือง", "").trim();
            } else if (name.startsWith("เทศบาลตำบล")) {
                orgType = "เทศบาลตำบล";
                cleanName = name.replace("เทศบาลตำบล", "").trim();
            } else if (name.startsWith("องค์การบริหารส่วนตำบล")) {
                orgType = "อบต.";
                cleanName = name.replace("องค์การบริหารส่วนตำบล", "").trim();
            }

            agencies.push({
                ORG_CODE: code,
                ORG_NAME: cleanName,
                ORG_TYPE: orgType,
                AMPHUR_NAME: amphur,
                PROVINCE_NAME: province,
            });
        }

        cachedApiAgencies = agencies;
        console.log(
            `✓ Loaded ${cachedApiAgencies.length} organizations from lao.csv`,
        );

        // Show unique org types
        const orgTypes = [
            ...new Set(agencies.map((a) => a.ORG_TYPE).filter((t) => t)),
        ];
        console.log(`📋 Organization types:`, orgTypes);

        return cachedApiAgencies;
    } catch (e) {
        console.error("Failed to load lao.csv:", e);
        cachedApiAgencies = [];
        return cachedApiAgencies;
    }
}

// --- Agency Autocomplete State ---
let agencyOptions = []; // current list of {display, value} for autocomplete

function renderAgencyDropdown(query) {
    const dropdown = document.getElementById("dropdown-agency");
    const hiddenInput = document.getElementById("input-agency");
    const textInput = document.getElementById("input-agency-text");
    const wrapper = textInput?.closest('.autocomplete-wrapper');
    if (!dropdown) return;

    const q = (query || "").toLowerCase().trim();
    const filtered = q
        ? agencyOptions.filter(
            (a) =>
                a.display.toLowerCase().includes(q) ||
                (a.location || "").toLowerCase().includes(q),
        )
        : agencyOptions;

    if (filtered.length === 0) {
        dropdown.innerHTML =
            '<div class="autocomplete-item" style="color:var(--text-muted); cursor:default;">ไม่พบหน่วยงาน</div>';
    } else {
        dropdown.innerHTML = filtered
            .slice(0, 60)
            .map(
                (a) =>
                    `<div class="autocomplete-item" data-value="${a.value.replace(/"/g, "&quot;")}">${a.display}${a.location ? `<small style="color:var(--text-muted);display:block;font-size:0.8em">${a.location}</small>` : ""}</div>`,
            )
            .join("");
    }

    dropdown.querySelectorAll(".autocomplete-item").forEach((item) => {
        item.addEventListener("mousedown", (e) => {
            e.preventDefault();
            const val = item.dataset.value;
            if (textInput)
                textInput.value = item.querySelector("small")
                    ? item.childNodes[0].textContent
                    : item.textContent;
            if (hiddenInput) hiddenInput.value = val;
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
        });
    });

    dropdown.classList.remove("hidden");
    if (wrapper) wrapper.classList.add("active");
}

function initAgencyAutocomplete() {
    const textInput = document.getElementById("input-agency-text");
    const dropdown = document.getElementById("dropdown-agency");
    const wrapper = textInput?.closest('.autocomplete-wrapper');
    if (!textInput || !dropdown) return;

    textInput.addEventListener("input", () =>
        renderAgencyDropdown(textInput.value),
    );
    textInput.addEventListener("focus", () => {
        if (agencyOptions.length > 0) renderAgencyDropdown(textInput.value);
    });
    textInput.addEventListener("blur", () => {
        setTimeout(() => {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
        }, 150);
    });
}

// ─── Line Item Helpers ───────────────────────────────────────────────────────

function addLineItemRow(item = "", cost = "") {
    const container = document.getElementById("line-items-container");
    if (!container) return;

    const rowIndex = container.children.length;
    const inputId = `line-item-desc-${rowIndex}`;
    const costId = `line-item-cost-${rowIndex}`;
    const dropdownId = `dropdown-line-item-${rowIndex}`;

    // Add header row if this is the first item
    if (rowIndex === 0 || !container.querySelector(".line-items-header")) {
        const headerRow = document.createElement("div");
        headerRow.className = "line-items-header";
        headerRow.innerHTML = `
            <div class="line-item-header-label">
                <i class="fa-solid fa-box"></i>
                <span>รายการ</span>
            </div>
            <div class="line-item-header-label line-item-header-cost">
                <i class="fa-solid fa-baht-sign"></i>
                <span>ราคา (บาท)</span>
            </div>
        `;
        container.insertBefore(headerRow, container.firstChild);
    }

    const row = document.createElement("div");
    row.className = "line-item-row";
    row.innerHTML = `
        <div class="line-item-field line-item-field-desc">
            <div class="autocomplete-wrapper line-item-input-wrapper">
                <input 
                    type="text" 
                    id="${inputId}" 
                    class="line-item-desc" 
                    placeholder="ระบุรายการ..." 
                    value="${item.replace(/"/g, "&quot;")}"
                    aria-label="รายการ">
                <button type="button" class="btn-remove-line-item-inline" title="ลบรายการ" aria-label="ลบรายการ">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div id="${dropdownId}" class="autocomplete-dropdown hidden"></div>
            </div>
        </div>
        <div class="line-item-field line-item-field-cost">
            <input 
                type="text" 
                id="${costId}"
                class="line-item-cost" 
                placeholder="0.00" 
                value="${cost ? formatCurrency(cost) : ""}" 
                inputmode="decimal"
                aria-label="ราคา">
        </div>`;

    // Setup autocomplete for this row
    setTimeout(() => {
        setupAutocomplete(
            inputId,
            dropdownId,
            () => {
                // Get unique items from lineItems across all logs
                const items = new Set();
                state.logs.forEach(log => {
                    if (log.lineItems && log.lineItems.length > 0) {
                        log.lineItems.forEach(li => {
                            if (li.item && li.item.trim() !== "" && !li.item.includes("ซ่อมบำรุงตามรอบ") && !li.item.includes("Maintenance Cycle")) {
                                items.add(li.item.trim());
                            }
                        });
                    }
                });
                return [...items].sort();
            },
            null, // No onSelect callback needed
            "ค้นหา...",
            false // Not strict - allow custom entries
        );
    }, 0);

    // Cost formatting
    const costInput = row.querySelector(".line-item-cost");
    costInput.addEventListener("focusin", () => {
        const v = parseCurrency(costInput.value);
        costInput.value = v > 0 ? String(v) : "";
    });
    costInput.addEventListener("focusout", () => {
        const v = parseCurrency(costInput.value);
        costInput.value = v > 0 ? formatCurrency(v) : "";
        recalcLineItemTotal();
    });
    costInput.addEventListener("input", recalcLineItemTotal);

    // Remove row
    const removeBtn = row.querySelector(".btn-remove-line-item-inline");
    removeBtn.addEventListener("click", () => {
        row.classList.add("removing");
        setTimeout(() => {
            row.remove();
            // Remove header if no more items
            const remainingRows = container.querySelectorAll(".line-item-row");
            if (remainingRows.length === 0) {
                const header = container.querySelector(".line-items-header");
                if (header) header.remove();
            }
            recalcLineItemTotal();
        }, 200);
    });

    container.appendChild(row);

    // Animate in
    requestAnimationFrame(() => {
        row.classList.add("line-item-row-visible");
    });

    recalcLineItemTotal();
}

function recalcLineItemTotal() {
    const container = document.getElementById("line-items-container");
    if (!container) return;

    const costs = [...document.querySelectorAll(".line-item-cost")].map(
        (el) => parseCurrency(el.value) || 0,
    );
    const total = costs.reduce((a, b) => a + b, 0);

    // Get or create the footer row
    let footerRow = document.getElementById("line-items-footer");
    const placeholder = document.getElementById("line-items-footer-placeholder");

    if (!footerRow && placeholder) {
        footerRow = document.createElement("div");
        footerRow.id = "line-items-footer";
        footerRow.className = "line-items-footer-row";
        footerRow.innerHTML = `
            <div class="line-items-footer-btn">
                <button type="button" id="btn-add-line-item" style="width: 100%; height: 100%; padding: 0.65rem 0.75rem; border-radius: 6px; background: #ffffff; border: 1.5px solid #111111; color: #111111; font-weight: 600; transition: all 0.2s; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer;" onmouseover="this.style.background='#111111';this.style.color='#ffffff';" onmouseout="this.style.background='#ffffff';this.style.color='#111111';">
                    <i class="fa-solid fa-plus"></i>
                    <span>เพิ่มรายการ</span>
                </button>
            </div>
            <div class="line-items-footer-total">
                <div class="line-items-total-row" style="margin-top: 0; height: 100%;">
                    <span class="line-items-total-label">ยอดรวม</span>
                    <span id="line-items-total">0.00 บาท</span>
                </div>
            </div>
        `;

        // Insert into placeholder
        placeholder.appendChild(footerRow);

        // Re-attach event listener to the new button
        const addBtn = footerRow.querySelector("#btn-add-line-item");
        if (addBtn) {
            addBtn.addEventListener("click", () => addLineItemRow());
        }
    }

    // Update total
    if (footerRow) {
        const totalEl = footerRow.querySelector("#line-items-total");
        if (totalEl) {
            totalEl.textContent = formatCurrency(total);
        }

        // Always show footer to keep add button visible
        footerRow.style.display = "flex";
    }
}

function getLineItems() {
    const rows = document.querySelectorAll(
        "#line-items-container .line-item-row",
    );
    return [...rows]
        .map((row) => ({
            item: row.querySelector(".line-item-desc").value.trim(),
            cost: parseCurrency(row.querySelector(".line-item-cost").value) || 0,
        }))
        .filter((r) => r.item || r.cost > 0);
}

// Wire up the Add button (called once after DOM ready)
(function setupLineItems() {
    // Initial call to create footer with button
    recalcLineItemTotal();
})();

// ─────────────────────────────────────────────────────────────────────────────

async function setupAgencySelect() {
    const textInput = document.getElementById("input-agency-text");
    if (textInput) textInput.placeholder = "กรุณาเลือกจังหวัดและอำเภอก่อน";
    agencyOptions = [];
    initAgencyAutocomplete();
}

async function loadAllAgencies() {
    const textInput = document.getElementById("input-agency-text");
    if (!textInput) return;

    if (!cachedApiAgencies) {
        textInput.placeholder = "กำลังโหลดข้อมูล...";
        await getApiAgencies();
    }

    if (!cachedApiAgencies || cachedApiAgencies.length === 0) {
        textInput.placeholder = "ไม่สามารถโหลดข้อมูลหน่วยงานได้";
        return;
    }

    const all = [];

    cachedApiAgencies.forEach((item) => {
        if (item.ORG_NAME) {
            const displayName = `${item.ORG_TYPE || ""}${item.ORG_NAME}`.trim();
            const location =
                `อ.${item.AMPHUR_NAME || ""} จ.${item.PROVINCE_NAME || ""}`.trim();
            all.push({ display: displayName, value: displayName, location });
        }
    });

    all.sort((a, b) => a.display.localeCompare(b.display, "th"));
    agencyOptions = all;
    textInput.placeholder = "ค้นหาหน่วยงาน...";
}

async function filterAgenciesByLocation(provinceName, districtName) {
    const textInput = document.getElementById("input-agency-text");
    const hiddenInput = document.getElementById("input-agency");
    if (!textInput) return;

    if (!provinceName || !districtName) {
        agencyOptions = [];
        textInput.placeholder = "กรุณาเลือกจังหวัดและอำเภอก่อน";
        textInput.value = "";
        if (hiddenInput) hiddenInput.value = "";
        return;
    }

    if (!cachedApiAgencies) {
        textInput.placeholder = "กำลังโหลดข้อมูล...";
        await getApiAgencies();
    }

    if (!cachedApiAgencies || cachedApiAgencies.length === 0) {
        textInput.placeholder = "ไม่สามารถโหลดข้อมูลหน่วยงานได้";
        return;
    }

    const normalize = (name, prefix) =>
        name.replace(new RegExp(`^${prefix}`), "").trim();
    const selProvince = normalize(provinceName, "จ\\.");
    const selDistrict = normalize(districtName, "อ\\.")
        .replace(/^อำเภอ/, "")
        .trim();

    const filtered = [];

    cachedApiAgencies.forEach((item) => {
        if (item.ORG_NAME && item.PROVINCE_NAME) {
            const itemProvince = normalize(item.PROVINCE_NAME, "จ\\.");
            const itemDistrict = item.AMPHUR_NAME
                ? normalize(item.AMPHUR_NAME, "อ\\.")
                    .replace(/^อำเภอ/, "")
                    .trim()
                : "";

            if (itemProvince === selProvince && itemDistrict === selDistrict) {
                const displayName = `${item.ORG_TYPE || ""}${item.ORG_NAME}`.trim();
                filtered.push({
                    display: displayName,
                    value: displayName,
                    location: "",
                });
            }
        }
    });

    filtered.sort((a, b) => a.display.localeCompare(b.display, "th"));
    agencyOptions = filtered;

    // Preserve current value if still valid
    const currentVal = hiddenInput ? hiddenInput.value : "";
    if (currentVal && !filtered.find((a) => a.value === currentVal)) {
        textInput.value = "";
        if (hiddenInput) hiddenInput.value = "";
    }

    textInput.placeholder =
        filtered.length > 0 ? "ค้นหาหน่วยงาน..." : "ไม่พบหน่วยงานในพื้นที่นี้";
}

function setupSiteManagerFilters() {
    // Site Manager Filters - Desktop and Mobile
    const siteFilters = [
        "filter-site-province",
        "filter-site-agency",
        "filter-site-contract",
        "filter-site-province-mobile",
        "filter-site-agency-mobile",
        "filter-site-contract-mobile",
        "site-search-input",
        "site-search-mobile",
    ];

    siteFilters.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", (e) => {
                // Sync search inputs
                if (id === "site-search-input") {
                    const mobile = document.getElementById("site-search-mobile");
                    if (mobile) mobile.value = e.target.value;
                } else if (id === "site-search-mobile") {
                    const desktop = document.getElementById("site-search-input");
                    if (desktop) desktop.value = e.target.value;
                }
                renderSites();
            });

            // Sync dropdowns between desktop and mobile
            if (id === "filter-site-province") {
                el.addEventListener("change", (e) => {
                    const mobile = document.getElementById("filter-site-province-mobile");
                    if (mobile) mobile.value = e.target.value;
                    renderSites();
                });
            } else if (id === "filter-site-province-mobile") {
                el.addEventListener("change", (e) => {
                    const desktop = document.getElementById("filter-site-province");
                    if (desktop) desktop.value = e.target.value;
                    renderSites();
                });
            } else if (id === "filter-site-agency") {
                el.addEventListener("change", (e) => {
                    const mobile = document.getElementById("filter-site-agency-mobile");
                    if (mobile) mobile.value = e.target.value;
                    renderSites();
                });
            } else if (id === "filter-site-agency-mobile") {
                el.addEventListener("change", (e) => {
                    const desktop = document.getElementById("filter-site-agency");
                    if (desktop) desktop.value = e.target.value;
                    renderSites();
                });
            } else if (id === "filter-site-contract") {
                el.addEventListener("change", (e) => {
                    const mobile = document.getElementById("filter-site-contract-mobile");
                    if (mobile) mobile.value = e.target.value;
                    renderSites();
                });
            } else if (id === "filter-site-contract-mobile") {
                el.addEventListener("change", (e) => {
                    const desktop = document.getElementById("filter-site-contract");
                    if (desktop) desktop.value = e.target.value;
                    renderSites();
                });
            }
        }
    });

    // Clear button for desktop filters
    document
        .getElementById("btn-clear-site-filters")
        ?.addEventListener("click", () => {
            const searchInput = document.getElementById("site-search-input");
            const searchInputMobile = document.getElementById("site-search-input-mobile");
            if (searchInput) searchInput.value = "";
            if (searchInputMobile) searchInputMobile.value = "";

            const provinceDesktop = document.getElementById("filter-site-province");
            const provinceMobile = document.getElementById("filter-site-province-mobile");
            const agencyDesktop = document.getElementById("filter-site-agency");
            const agencyMobile = document.getElementById("filter-site-agency-mobile");
            const contractDesktop = document.getElementById("filter-site-contract");
            const contractMobile = document.getElementById("filter-site-contract-mobile");

            if (provinceDesktop) provinceDesktop.value = "all";
            if (provinceMobile) provinceMobile.value = "all";
            if (agencyDesktop) agencyDesktop.value = "all";
            if (agencyMobile) agencyMobile.value = "all";
            if (contractDesktop) contractDesktop.value = "all";
            if (contractMobile) contractMobile.value = "all";

            renderSites();
        });

    // Clear button for mobile filters
    document
        .getElementById("btn-clear-site-filters-mobile")
        ?.addEventListener("click", () => {
            const searchInput = document.getElementById("site-search-input");
            const searchInputMobile = document.getElementById("site-search-input-mobile");
            if (searchInput) searchInput.value = "";
            if (searchInputMobile) searchInputMobile.value = "";

            const provinceDesktop = document.getElementById("filter-site-province");
            const provinceMobile = document.getElementById("filter-site-province-mobile");
            const agencyDesktop = document.getElementById("filter-site-agency");
            const agencyMobile = document.getElementById("filter-site-agency-mobile");
            const contractDesktop = document.getElementById("filter-site-contract");
            const contractMobile = document.getElementById("filter-site-contract-mobile");

            if (provinceDesktop) provinceDesktop.value = "all";
            if (provinceMobile) provinceMobile.value = "all";
            if (agencyDesktop) agencyDesktop.value = "all";
            if (agencyMobile) agencyMobile.value = "all";
            if (contractDesktop) contractDesktop.value = "all";
            if (contractMobile) contractMobile.value = "all";

            renderSites();
        });

    // Export buttons
    document
        .getElementById("btn-export-sites")
        ?.addEventListener("click", exportSitesToExcel);
    document
        .getElementById("btn-export-sites-mobile")
        ?.addEventListener("click", exportSitesToExcel);
}

function populateSiteFilters() {
    const sites = state.sites;
    const provinceSelect = document.getElementById("filter-site-province");
    const provinceSelectMobile = document.getElementById("filter-site-province-mobile");

    if (!provinceSelect) return;

    const provinces = [
        ...new Set(sites.map((s) => s.province).filter(Boolean)),
    ].sort();

    const currentProvince = provinceSelect.value;

    provinceSelect.innerHTML = '<option value="all">ทั้งหมด</option>';
    if (provinceSelectMobile)
        provinceSelectMobile.innerHTML = '<option value="all">ทั้งหมด</option>';

    provinces.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p;
        provinceSelect.appendChild(opt);

        if (provinceSelectMobile) {
            const optMobile = document.createElement("option");
            optMobile.value = p;
            optMobile.textContent = p;
            provinceSelectMobile.appendChild(optMobile);
        }
    });

    if (provinces.includes(currentProvince)) {
        provinceSelect.value = currentProvince;
        if (provinceSelectMobile) provinceSelectMobile.value = currentProvince;
    }

    // Contract type filter
    const contractSelect = document.getElementById("filter-site-contract");
    const contractSelectMobile = document.getElementById("filter-site-contract-mobile");

    if (contractSelect) {
        const contracts = [...new Set(sites.map(s => s.deviceType).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));
        const currentContract = contractSelect.value;

        contractSelect.innerHTML = '<option value="all">ทั้งหมด</option>';
        if (contractSelectMobile) contractSelectMobile.innerHTML = '<option value="all">ทั้งหมด</option>';

        contracts.forEach(c => {
            contractSelect.appendChild(Object.assign(document.createElement("option"), { value: c, textContent: c }));
            if (contractSelectMobile) contractSelectMobile.appendChild(Object.assign(document.createElement("option"), { value: c, textContent: c }));
        });

        if (contracts.includes(currentContract)) {
            contractSelect.value = currentContract;
            if (contractSelectMobile) contractSelectMobile.value = currentContract;
        }
    }
}

// D3.js Thailand Map for Device Locations
let thailandGeoJSON = null; // Cache for the map GeoJSON

const provinceTranslationMap = {
    "Amnat Charoen": "อำนาจเจริญ",
    "Ang Thong": "อ่างทอง",
    "Bangkok": "กรุงเทพมหานคร",
    "Bueng Kan": "บึงกาฬ",
    "Buri Ram": "บุรีรัมย์",
    "Chachoengsao": "ฉะเชิงเทรา",
    "Chai Nat": "ชัยนาท",
    "Chaiyaphum": "ชัยภูมิ",
    "Chanthaburi": "จันทบุรี",
    "Chiang Mai": "เชียงใหม่",
    "Chiang Rai": "เชียงราย",
    "Chon Buri": "ชลบุรี",
    "Chumphon": "ชุมพร",
    "Kalasin": "กาฬสินธุ์",
    "Kamphaeng Phet": "กำแพงเพชร",
    "Kanchanaburi": "กาญจนบุรี",
    "Khon Kaen": "ขอนแก่น",
    "Krabi": "กระบี่",
    "Lampang": "ลำปาง",
    "Lamphun": "ลำพูน",
    "Loei": "เลย",
    "Lop Buri": "ลพบุรี",
    "Mae Hong Son": "แม่ฮ่องสอน",
    "Maha Sarakham": "มหาสารคาม",
    "Mukdahan": "มุกดาหาร",
    "Nakhon Nayok": "นครนายก",
    "Nakhon Pathom": "นครปฐม",
    "Nakhon Phanom": "นครพนม",
    "Nakhon Ratchasima": "นครราชสีมา",
    "Nakhon Sawan": "นครสวรรค์",
    "Nakhon Si Thammarat": "นครศรีธรรมราช",
    "Nan": "น่าน",
    "Narathiwat": "นราธิวาส",
    "Nong Bua Lam Phu": "หนองบัวลำภู",
    "Nong Khai": "หนองคาย",
    "Nonthaburi": "นนทบุรี",
    "Pathum Thani": "ปทุมธานี",
    "Pattani": "ปัตตานี",
    "Phangnga": "พังงา",
    "Phatthalung": "พัทลุง",
    "Phayao": "พะเยา",
    "Phetchabun": "เพชรบูรณ์",
    "Phetchaburi": "เพชรบุรี",
    "Phichit": "พิจิตร",
    "Phitsanulok": "พิษณุโลก",
    "Phra Nakhon Si Ayutthaya": "พระนครศรีอยุธยา",
    "Phrae": "แพร่",
    "Phuket": "ภูเก็ต",
    "Prachin Buri": "ปราจีนบุรี",
    "Prachuap Khiri Khan": "ประจวบคีรีขันธ์",
    "Ranong": "ระนอง",
    "Ratchaburi": "ราชบุรี",
    "Rayong": "ระยอง",
    "Roi Et": "ร้อยเอ็ด",
    "Sa Kaeo": "สระแก้ว",
    "Sakon Nakhon": "สกลนคร",
    "Samut Prakan": "สมุทรปราการ",
    "Samut Sakhon": "สมุทรสาคร",
    "Samut Songkhram": "สมุทรสงคราม",
    "Saraburi": "สระบุรี",
    "Satun": "สตูล",
    "Si Sa Ket": "ศรีสะเกษ",
    "Sing Buri": "สิงห์บุรี",
    "Songkhla": "สงขลา",
    "Sukhothai": "สุโขทัย",
    "Suphan Buri": "สุพรรณบุรี",
    "Surat Thani": "สุราษฎร์ธานี",
    "Surin": "สุรินทร์",
    "Tak": "ตาก",
    "Trang": "ตรัง",
    "Trat": "ตราด",
    "Ubon Ratchathani": "อุบลราชธานี",
    "Udon Thani": "อุดรธานี",
    "Uthai Thani": "อุทัยธานี",
    "Uttaradit": "อุตรดิตถ์",
    "Yala": "ยะลา",
    "Yasothon": "ยโสธร"
};

function cleanProvinceName(name) {
    if (!name) return "";
    return name.toString().replace(/^(จังหวัด|จ\.)\s*/, "").trim();
}

async function renderDeviceMap(sitesToRender) {
    const container = document.getElementById("device-map");
    if (!container) return;

    if (typeof d3 === "undefined") {
        console.error("D3.js is not loaded yet.");
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">กำลังโหลดแผนที่ (D3.js ไม่พร้อมใช้งาน)...</div>`;
        return;
    }

    // Create Tooltip if it doesn't exist
    let tooltip = document.getElementById("map-tooltip-element");
    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "map-tooltip-element";
        tooltip.className = "map-tooltip";
        document.body.appendChild(tooltip);
    }

    // Create Province Hover Tooltip
    let provTooltip = document.getElementById("map-prov-tooltip-element");
    if (!provTooltip) {
        provTooltip = document.createElement("div");
        provTooltip.id = "map-prov-tooltip-element";
        provTooltip.style.position = "absolute";
        provTooltip.style.background = "rgba(15, 23, 42, 0.85)";
        provTooltip.style.color = "white";
        provTooltip.style.padding = "4px 10px";
        provTooltip.style.borderRadius = "6px";
        provTooltip.style.fontSize = "0.75rem";
        provTooltip.style.fontWeight = "500";
        provTooltip.style.pointerEvents = "none";
        provTooltip.style.opacity = 0;
        provTooltip.style.transition = "opacity 0.2s, transform 0.2s";
        provTooltip.style.transform = "scale(0.95)";
        provTooltip.style.zIndex = "1000";
        provTooltip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        document.body.appendChild(provTooltip);
    }

    try {
        if (!thailandGeoJSON) {
            container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="margin-right:8px;"></i>กำลังโหลดข้อมูลแผนที่ประเทศไทย...</div>`;
            const geojsonUrl = "thailand-provinces.geojson";
            thailandGeoJSON = await d3.json(geojsonUrl);
        }

        container.innerHTML = ""; // Clear loader

        const width = container.clientWidth || 500;
        const height = container.clientHeight || 500;

        const svg = d3.create("svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("width", "100%")
            .attr("height", "100%");

        // Setup Map Projection (Mercator) auto-fitted to Thailand GeoJSON
        const projection = d3.geoMercator()
            .fitSize([width - 40, height - 40], thailandGeoJSON);

        const pathGenerator = d3.geoPath().projection(projection);

        // Group element for zoom & panning
        const g = svg.append("g");

        // 1. Calculate site colors based on Scheduled PM/Repair this month
        const siteColorMap = {};
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        if (state.logs) {
            state.logs.forEach(log => {
                if (log.date) {
                    const logDate = new Date(log.date);
                    if (!isNaN(logDate.getTime()) && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
                        if (log.category === "ซ่อม") {
                            siteColorMap[log.siteId] = "#dc2626"; // Red (takes priority)
                        } else if (log.category === "บำรุงรักษาตามรอบ" && siteColorMap[log.siteId] !== "#dc2626") {
                            siteColorMap[log.siteId] = "#0369a1"; // Blue
                        }
                    }
                }
            });
        }

        // Map provinces
        g.selectAll("path")
            .data(thailandGeoJSON.features)
            .enter()
            .append("path")
            .attr("class", "map-province")
            .attr("d", pathGenerator)
            .style("fill", null)
            .on("mouseover", function (event, d) {
                const enName = d.properties.name;
                const thName = provinceTranslationMap[enName] || enName;
                d3.select(provTooltip)
                    .text(thName)
                    .style("opacity", 1)
                    .style("transform", "scale(1)");
            })
            .on("mousemove", function (event) {
                d3.select(provTooltip)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");
            })
            .on("mouseout", function () {
                d3.select(provTooltip)
                    .style("opacity", 0)
                    .style("transform", "scale(0.95)");
            });

        // Compute province centroid map for quick access
        const provinceCentroids = {};
        thailandGeoJSON.features.forEach(feature => {
            const enName = feature.properties.name;
            const thName = provinceTranslationMap[enName];
            if (thName) {
                const pixelCentroid = pathGenerator.centroid(feature);
                provinceCentroids[cleanProvinceName(thName)] = projection.invert(pixelCentroid);
            }
        });

        // Draw Device Dots
        const dotsData = [];
        const locationJitter = {}; // Track duplicate coordinates to apply jitter

        sitesToRender.forEach(site => {
            let lat = null;
            let lng = null;

            // 1. Try parsed coordinates
            if (site.locationUrl) {
                const parsed = parseLocationUrl(site.locationUrl);
                if (parsed) {
                    lat = parsed.lat;
                    lng = parsed.lng;
                }
            }

            // 2. Fallback to province centroid
            if (lat === null || lng === null) {
                const cleanProvince = cleanProvinceName(site.province);
                const centroid = provinceCentroids[cleanProvince];
                if (centroid) {
                    lng = centroid[0];
                    lat = centroid[1];
                }
            }

            if (lat !== null && lng !== null) {
                // Apply jitter to avoid overlaps for locations that are very close (~2km radius)
                let clusterFound = null;
                for (let key in locationJitter) {
                    const cluster = locationJitter[key];
                    // Calculate rough distance in degrees. 0.02 degrees is roughly 2.2 km.
                    const dist = Math.sqrt(Math.pow(lat - cluster.lat, 2) + Math.pow(lng - cluster.lng, 2));
                    if (dist < 0.02) {
                        clusterFound = cluster;
                        break;
                    }
                }

                if (!clusterFound) {
                    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
                    const projected = projection([lng, lat]);
                    clusterFound = {
                        lat: lat,
                        lng: lng,
                        count: 0,
                        sites: [], // Store all sites in this cluster
                        centerX: projected ? projected[0] : 0,
                        centerY: projected ? projected[1] : 0
                    };
                    locationJitter[coordKey] = clusterFound;
                }

                clusterFound.sites.push(site);
                const offsetCount = clusterFound.count++;

                // Add spiral/circular jitter based on repeat count
                let offsetX = 0;
                let offsetY = 0;
                if (offsetCount > 0) {
                    const angle = (offsetCount * 0.8) * Math.PI; // Spiral angle
                    // Increased jitter spread slightly to accommodate mobile zooming
                    const radius = 8 + (offsetCount * 2.5);
                    offsetX = Math.cos(angle) * radius;
                    offsetY = Math.sin(angle) * radius;
                }

                if (clusterFound.centerX || clusterFound.centerY) {
                    dotsData.push({
                        site: site,
                        cluster: clusterFound,
                        cx: clusterFound.centerX + offsetX,
                        cy: clusterFound.centerY + offsetY,
                        pinColor: siteColorMap[site.id] || null
                    });
                }
            }
        });

        // Helper functions for radius to keep pins tap-able on mobile when zoomed
        const getDotRadius = (k) => {
            const isMobile = window.innerWidth <= 768;
            return isMobile ? 6 / Math.sqrt(k) : 6 / k;
        };
        const getHoverRadius = (k) => {
            const isMobile = window.innerWidth <= 768;
            return isMobile ? 9 / Math.sqrt(k) : 9 / k;
        };

        // Pulse Rings for pins meeting conditions
        g.selectAll("circle.map-pulse-ring")
            .data(dotsData.filter(d => d.pinColor))
            .enter()
            .append("circle")
            .attr("class", "map-pulse-ring")
            .attr("cx", d => d.cx)
            .attr("cy", d => d.cy)
            .attr("r", getDotRadius(1))
            .attr("vector-effect", "non-scaling-stroke")
            .style("fill", "none")
            .style("stroke", d => d.pinColor);

        // Plot dots
        const dots = g.selectAll("circle.map-device-dot")
            .data(dotsData)
            .enter()
            .append("circle")
            .attr("class", "map-device-dot")
            .attr("cx", d => d.cx)
            .attr("cy", d => d.cy)
            .attr("r", getDotRadius(1))
            .attr("vector-effect", "non-scaling-stroke")
            .style("fill", d => d.pinColor || "")
            .on("mouseover", function (event, d) {
                const currentK = d3.zoomTransform(svg.node()).k;
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", getHoverRadius(currentK))
                    .style("fill", "#10b981")
                    .style("filter", "drop-shadow(0 0 10px rgba(16, 185, 129, 0.8))");

                const cleanProvince = cleanProvinceName(d.site.province) || "-";
                const cleanDistrict = d.site.district || "-";
                const cleanSubdistrict = d.site.subdistrict || "-";
                const detailLoc = [cleanSubdistrict, cleanDistrict, cleanProvince].filter(item => item && item !== "-").join(", ");

                const tooltipHtml = `
                    <div class="map-tooltip-header">${d.site.name}</div>
                    <div class="map-tooltip-body">
                        <div class="map-tooltip-item"><strong>รหัสเครื่อง:</strong> ${d.site.siteCode || "-"}</div>
                        <div class="map-tooltip-item"><strong>อุปกรณ์:</strong> ${d.site.deviceType || "-"}</div>
                        <div class="map-tooltip-item"><strong>รุ่น/ยี่ห้อ:</strong> ${[d.site.brand, d.site.model].filter(Boolean).join(" ") || "-"}</div>
                        <div class="map-tooltip-item"><strong>สถานที่:</strong> ${detailLoc}</div>
                        <div class="map-tooltip-item" style="color:var(--primary-color); font-weight:600; margin-top:4px; font-size:0.75rem;"><i class="fa-solid fa-circle-info"></i> แตะเพื่อดูรายละเอียดเครื่อง</div>
                    </div>
                `;

                d3.select(tooltip)
                    .html(tooltipHtml)
                    .style("opacity", 1)
                    .style("transform", "scale(1)");
            })
            .on("mousemove", function (event) {
                d3.select(tooltip)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 15) + "px");
            })
            .on("mouseout", function (event, d) {
                const currentK = d3.zoomTransform(svg.node()).k;
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", getDotRadius(currentK))
                    .style("fill", d => d.pinColor || "")
                    .style("filter", "");

                d3.select(tooltip)
                    .style("opacity", 0)
                    .style("transform", "scale(0.95)");
            })
            .on("click", function (event, d) {
                d3.select(tooltip).style("opacity", 0);

                // Find all visually overlapping sites based on current zoom
                const currentK = d3.zoomTransform(svg.node()).k;
                const threshold = getDotRadius(currentK) * 2.5;

                const overlappingSites = [];
                dotsData.forEach(other => {
                    const dist = Math.sqrt(Math.pow(d.cx - other.cx, 2) + Math.pow(d.cy - other.cy, 2));
                    if (dist <= threshold) {
                        overlappingSites.push(other.site);
                    }
                });

                if (overlappingSites.length > 1) {
                    // Create overlay and popup styled to match site system
                    const overlay = document.createElement("div");
                    overlay.className = "modal-overlay modal-layer-top";

                    const popup = document.createElement("div");
                    popup.className = "modal glass-panel";
                    popup.style.maxWidth = "450px";
                    popup.style.width = "90%";
                    popup.style.maxHeight = "80vh";
                    popup.style.display = "flex";
                    popup.style.flexDirection = "column";
                    popup.style.padding = "2rem";

                    // Helpers for badges in the popup to match site style
                    const getCategoryBadge = (cat) => {
                        let catColor = '#64748b';
                        let catBg = 'rgba(100,116,139,0.12)';
                        if (typeof isMaCategory === "function" && isMaCategory(cat)) {
                            catColor = '#0369a1';
                            catBg = '#e0f2fe';
                        } else if (cat === "ติดตั้ง") {
                            catColor = '#15803d';
                            catBg = '#dcfce7';
                        } else if (cat === "รื้อถอน") {
                            catColor = '#b45309';
                            catBg = '#fef3c7';
                        } else if (cat === "ซ่อม") {
                            catColor = '#dc2626';
                            catBg = '#fee2e2';
                        } else if (cat === "ตามสัญญาจ้าง") {
                            catColor = '#7c3aed';
                            catBg = '#ede9fe';
                        } else if (cat === "ตามใบสั่งซื้อ") {
                            catColor = '#0891b2';
                            catBg = '#cffafe';
                        }
                        return `<span style="background:${catBg}; color:${catColor}; padding:2.5px 8px; border-radius:12px; font-size:0.72rem; font-weight:600; white-space:nowrap;">${cat}</span>`;
                    };

                    const getStatusBadge = (status) => {
                        const statusColors = {
                            Open: { bg: "rgba(234,179,8,0.15)", color: "#ca8a04", label: "เปิดงาน" },
                            "On Process": { bg: "rgba(249,115,22,0.15)", color: "#f97316", label: "กำลังดำเนินการ" },
                            Cancel: { bg: "rgba(239,68,68,0.15)", color: "#ef4444", label: "ยกเลิก" },
                            Done: { bg: "rgba(168,85,247,0.15)", color: "#a855f7", label: "เสร็จสิ้น" },
                            "Case Closed": { bg: "rgba(34,197,94,0.15)", color: "#22c55e", label: "ปิดเคส" },
                            Completed: { bg: "rgba(168,85,247,0.15)", color: "#a855f7", label: "เสร็จสิ้น" }
                        };
                        const s = statusColors[status] || {
                            bg: "rgba(100,116,139,0.15)",
                            color: "var(--text-muted)",
                            label: status || "เปิดงาน"
                        };
                        return `<span style="background:${s.bg}; color:${s.color}; padding:2.5px 8px; border-radius:12px; font-size:0.72rem; font-weight:600; white-space:nowrap;">${s.label}</span>`;
                    };

                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();

                    let casesHtml = "";
                    let devicesHtml = "";

                    overlappingSites.forEach(s => {
                        const siteLogs = (state.logs || []).filter(log => {
                            if (log.siteId === s.id && log.date) {
                                const logDate = new Date(log.date);
                                return !isNaN(logDate.getTime()) && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear && (log.category === "ซ่อม" || log.category === "บำรุงรักษาตามรอบ");
                            }
                            return false;
                        });

                        if (siteLogs.length > 0) {
                            siteLogs.forEach(log => {
                                const isRepair = log.category === "ซ่อม";
                                const borderColor = isRepair ? "#dc2626" : "#0369a1";

                                casesHtml += `
                                    <div class="cluster-item" data-id="${s.id}" data-log-id="${log.id}" style="display: flex; flex-direction: column; padding: 1rem; border: 1.5px solid var(--border-color); border-left: 4px solid ${borderColor} !important; border-radius: var(--radius-md); cursor: pointer; background: var(--surface-bg); transition: all 0.2s ease; position: relative; box-shadow: var(--shadow-sm); margin-bottom: 2px;">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
                                            <div style="font-weight: 600; color: var(--text-color); font-size: 0.92rem; line-height: 1.3; padding-right: 4px;">${s.name}</div>
                                            <div style="flex-shrink: 0;">${getCategoryBadge(log.category)}</div>
                                        </div>
                                        <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.25rem;">
                                            <div><i class="fa-solid fa-hashtag" style="width: 14px; text-align: center;"></i> รหัสเคส: ${log.caseId ? log.caseId.replace('CASE-', '') : '-'}</div>
                                            <div><i class="fa-solid fa-microchip" style="width: 14px; text-align: center;"></i> ชนิด: ${s.deviceType || '-'}</div>
                                            <div style="margin-top: 0.4rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: var(--bg-color); padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid var(--border-color);">
                                                <span style="font-weight: 500; font-size: 0.75rem; color: var(--text-color);"><i class="fa-regular fa-calendar" style="color: var(--text-muted); margin-right: 4px;"></i>วันที่: ${new Date(log.date).toLocaleDateString('th-TH')}</span>
                                                ${log.status ? getStatusBadge(log.status) : ''}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            });
                        } else {
                            devicesHtml += `
                                <div class="cluster-item" data-id="${s.id}" style="display: flex; flex-direction: column; padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; background: var(--surface-bg); transition: all 0.2s ease; box-shadow: var(--shadow-sm); margin-bottom: 2px;">
                                    <div style="font-weight: 600; color: var(--text-color); font-size: 0.92rem; line-height: 1.3; margin-bottom: 0.5rem;">${s.name}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.25rem;">
                                        <div><i class="fa-solid fa-hashtag" style="width: 14px; text-align: center;"></i> รหัสเครื่อง: ${s.siteCode || '-'}</div>
                                        <div><i class="fa-solid fa-microchip" style="width: 14px; text-align: center;"></i> ชนิด: ${s.deviceType || '-'}</div>
                                    </div>
                                </div>
                            `;
                        }
                    });

                    let html = `
                    <div class="modal-header" style="margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h3 style="color: var(--primary-color); margin: 0; font-size: 1.15rem; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                                <i class="fa-solid fa-map-location-dot" style="color: var(--primary-color);"></i> อุปกรณ์ในบริเวณนี้
                            </h3>
                            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.25rem 0 0 0; font-weight: 400;">
                                พบอุปกรณ์ทั้งหมด ${overlappingSites.length} เครื่องใกล้เคียงกัน
                            </p>
                        </div>
                        <button class="close-modal" id="close-cluster-popup" style="padding: 0; line-height: 1; font-size: 1.5rem; margin-top: -4px;">&times;</button>
                    </div>
                    <div class="modal-body" style="overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 4px; flex: 1;">`;

                    if (casesHtml) {
                        html += `
                        <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                            <i class="fa-solid fa-wrench" style="color: #dc2626; font-size: 0.75rem;"></i> งานซ่อมบำรุงในเดือนนี้
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 6px;">
                            ${casesHtml}
                        </div>`;
                    }

                    if (devicesHtml) {
                        html += `
                        <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px; margin-bottom: 2px; ${casesHtml ? 'margin-top: 10px;' : ''}">
                            <i class="fa-solid fa-desktop" style="color: var(--primary-color); font-size: 0.75rem;"></i> รายการเครื่องทั้งหมด
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${devicesHtml}
                        </div>`;
                    }

                    html += `</div>`;

                    popup.innerHTML = html;
                    overlay.appendChild(popup);
                    document.body.appendChild(overlay);

                    document.getElementById("close-cluster-popup").onclick = () => document.body.removeChild(overlay);
                    overlay.onclick = (e) => {
                        if (e.target === overlay) document.body.removeChild(overlay);
                    };

                    const items = popup.querySelectorAll('.cluster-item');
                    items.forEach(item => {
                        item.onclick = function () {
                            document.body.removeChild(overlay);
                            const logId = this.getAttribute('data-log-id');
                            if (logId && typeof viewLogDetails === "function") {
                                viewLogDetails(logId);
                            } else if (typeof viewSiteDetails === "function") {
                                viewSiteDetails(this.getAttribute('data-id'));
                            }
                        };
                        item.onmouseover = function () {
                            this.style.transform = "translateY(-2px)";
                            this.style.boxShadow = "var(--shadow-md)";
                            this.style.borderColor = "var(--primary-color)";
                        };
                        item.onmouseout = function () {
                            this.style.transform = "none";
                            this.style.boxShadow = "var(--shadow-sm)";
                            this.style.borderColor = "var(--border-color)";
                        };
                    });
                } else {
                    let logOpened = false;
                    if (d.pinColor && state.logs) {
                        const currentMonth = new Date().getMonth();
                        const currentYear = new Date().getFullYear();

                        const targetLog = state.logs.find(log => {
                            if (log.siteId === d.site.id && log.date) {
                                const logDate = new Date(log.date);
                                if (!isNaN(logDate.getTime()) && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
                                    if (d.pinColor === "#dc2626" && log.category === "ซ่อม") return true;
                                    if (d.pinColor === "#0369a1" && log.category === "บำรุงรักษาตามรอบ") return true;
                                }
                            }
                            return false;
                        });

                        if (targetLog && typeof viewLogDetails === "function") {
                            viewLogDetails(targetLog.id);
                            logOpened = true;
                        }
                    }

                    if (!logOpened && typeof viewSiteDetails === "function") {
                        viewSiteDetails(d.site.id);
                    }
                }
            });

        // Add D3 Zoom support
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
                const k = event.transform.k;

                // Keep dots the same visual size on screen when zooming (or scale slightly on mobile)
                g.selectAll("circle.map-device-dot")
                    .attr("r", getDotRadius(k));
                g.selectAll("circle.map-pulse-ring")
                    .attr("r", getDotRadius(k));

                // Keep province borders thin
                g.selectAll("path.map-province")
                    .style("stroke-width", (1 / k) + "px");
            });

        svg.call(zoom);

        // Auto-fit zoom to filtered device pins
        if (dotsData.length > 0) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            dotsData.forEach(d => {
                if (d.cx < minX) minX = d.cx;
                if (d.cx > maxX) maxX = d.cx;
                if (d.cy < minY) minY = d.cy;
                if (d.cy > maxY) maxY = d.cy;
            });

            if (minX !== Infinity) {
                const dx = maxX - minX;
                const dy = maxY - minY;
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;

                // Adjust zoom level dynamically based on data bounds spread
                let scale;
                if (dx < 12 && dy < 12) {
                    scale = 3.5; // Single city or close group zoom-in
                } else {
                    scale = Math.max(1, Math.min(5, 0.8 / Math.max(dx / width, dy / height)));
                }

                // If showing all sites, reset zoom to scale 1
                const isAllSites = sitesToRender.length === state.sites.length;
                const targetScale = isAllSites ? 1 : scale;
                const targetTranslate = isAllSites
                    ? [0, 0]
                    : [width / 2 - targetScale * centerX, height / 2 - targetScale * centerY];

                const initialTransform = d3.zoomIdentity
                    .translate(targetTranslate[0], targetTranslate[1])
                    .scale(targetScale);

                svg.call(zoom.transform, initialTransform);
            }
        }

        container.appendChild(svg.node());

        // Create Reset Zoom Button overlay
        const resetBtn = document.createElement("button");
        resetBtn.id = "btn-reset-map-zoom";
        resetBtn.className = "btn-secondary";
        resetBtn.innerHTML = '<i class="fa-solid fa-compress"></i> <span>ล้างซูม</span>';
        resetBtn.style.position = "absolute";
        resetBtn.style.top = "10px";
        resetBtn.style.right = "10px";
        resetBtn.style.zIndex = "10";
        resetBtn.style.padding = "6px 12px";
        resetBtn.style.borderRadius = "8px";
        resetBtn.style.fontSize = "0.75rem";
        resetBtn.style.fontWeight = "600";
        resetBtn.style.display = "flex";
        resetBtn.style.alignItems = "center";
        resetBtn.style.gap = "4px";
        resetBtn.style.background = "var(--card-bg)";
        resetBtn.style.border = "1px solid var(--glass-border)";
        resetBtn.style.color = "var(--text-color)";
        resetBtn.style.cursor = "pointer";
        resetBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        resetBtn.style.transition = "all 0.2s ease";

        resetBtn.addEventListener("mouseover", () => {
            resetBtn.style.background = "rgba(0, 0, 0, 0.04)";
        });
        resetBtn.addEventListener("mouseout", () => {
            resetBtn.style.background = "var(--card-bg)";
        });

        resetBtn.addEventListener("click", () => {
            svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        });

        container.appendChild(resetBtn);

    } catch (error) {
        console.error("Error rendering D3 Thailand map:", error);
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);"><i class="fa-solid fa-circle-exclamation" style="color:var(--danger-color); margin-right:8px;"></i>เกิดข้อผิดพลาดในการโหลดแผนที่: ${error.message}</div>`;
    }
}

window.renderDeviceMap = renderDeviceMap;

function renderSites() {
    if (!grids.sites) return;
    grids.sites.innerHTML = "";

    // Update Header Count
    const headerCount = document.getElementById("header-sites-count");
    if (headerCount) {
        headerCount.textContent = `(${state.sites.length})`;
    }

    const searchInput = document.getElementById("site-search-input");
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const provinceFilter =
        document.getElementById("filter-site-province")?.value || "all";
    const contractFilter =
        document.getElementById("filter-site-contract")?.value || "all";

    let sitesToRender = state.sites.filter((site) => {
        const nameMatch = (site.name || "").toLowerCase().includes(searchTerm);
        const provinceMatch = (site.province || "")
            .toLowerCase()
            .includes(searchTerm);
        const hospitalMatch = (site.hospital || "")
            .toLowerCase()
            .includes(searchTerm);

        const otherFields = [
            site.siteCode,
            site.serialNumber,
            site.district,
            site.subdistrict,
            site.zipcode,
            site.installLocation || site.villageName,
            site.deviceType,
            site.brand,
            site.model,
        ].join(" ");
        const addressMatch = otherFields.toLowerCase().includes(searchTerm);

        const isSearchMatch =
            nameMatch || provinceMatch || hospitalMatch || addressMatch;
        const isProvinceMatch =
            provinceFilter === "all" || site.province === provinceFilter;
        const isContractMatch =
            contractFilter === "all" || site.deviceType === contractFilter;

        return isSearchMatch && isProvinceMatch && isContractMatch;
    });

    // Render D3 map dynamically
    renderDeviceMap(sitesToRender);

    // Update Dashboard Stats dynamically
    const totalDevicesEl = document.getElementById("dash-total-devices");
    const totalProvincesEl = document.getElementById("dash-total-provinces");
    const totalClientsEl = document.getElementById("dash-total-clients");

    if (totalDevicesEl) {
        totalDevicesEl.textContent = sitesToRender.length;
    }

    const provinces = new Set();
    const clients = new Set();

    const nowVal = new Date();
    nowVal.setHours(0, 0, 0, 0);

    sitesToRender.forEach((site) => {
        // 1. Provinces
        if (site.province) {
            provinces.add(site.province.trim());
        }

        // 2. Clients
        const clientName = (site.hospital || site.name || "").trim();
        if (clientName) {
            clients.add(clientName);
        }


    });

    if (totalProvincesEl) {
        totalProvincesEl.textContent = provinces.size;
    }

    if (totalClientsEl) {
        totalClientsEl.textContent = clients.size;
    }

    const pmThisMonthEl = document.getElementById("dash-pm-this-month");
    const repairThisMonthEl = document.getElementById("dash-repair-this-month");

    if (pmThisMonthEl || repairThisMonthEl) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        let pmCount = 0;
        let repairCount = 0;

        const siteIds = new Set(sitesToRender.map(s => s.id));

        if (state && state.logs) {
            state.logs.forEach(log => {
                if (siteIds.has(log.siteId) && log.date) {
                    const logDate = new Date(log.date);
                    if (!isNaN(logDate.getTime()) && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
                        if (log.category === "บำรุงรักษาตามรอบ") {
                            // Only count if case is not closed or cancelled
                            if (log.status !== "Case Closed" && log.status !== "Cancel") {
                                pmCount++;
                            }
                        } else if (log.category === "ซ่อม") {
                            repairCount++;
                        }
                    }
                }
            });
        }

        if (pmThisMonthEl) {
            pmThisMonthEl.textContent = pmCount;
            const pmDescEl = document.querySelector("#device-dashboard .dashboard-card:nth-child(3) .dashboard-card-content > span:nth-child(3)");
            if (pmDescEl) {
                pmDescEl.textContent = "จำนวนเครื่องที่ถึงรอบ PM ในเดือนปัจจุบันและยังไม่ปิดเคส";
            }
        }
        if (repairThisMonthEl) {
            repairThisMonthEl.textContent = repairCount;
            const repairDescEl = document.querySelector("#device-dashboard .dashboard-card:nth-child(4) .dashboard-card-content > span:nth-child(3)");
            if (repairDescEl) {
                repairDescEl.textContent = "จำนวนเคสแจ้งซ่อมประจำเดือนปัจจุบัน";
            }
        }
    }



    // Sort logic (optional, keep if exists)
    // ...

    if (sitesToRender.length === 0) {
        grids.sites.innerHTML = `
            <div class="empty-state">
                <p>ไม่พบข้อมูลสถานที่${searchInput && searchInput.value ? "ที่ตรงกับคำค้นหา" : "ในระบบ"}</p>
            </div>`;
        return;
    }

    sitesToRender.forEach((site) => {
        const card = document.createElement("div");
        card.className = "site-card";
        card.style.cursor = "pointer";

        card.onclick = (e) => {
            // Prevent triggering when clicking buttons or links
            if (e.target.closest("button") || e.target.closest("a")) return;
            viewSiteDetails(site.id);
        };

        // Calculate Log Count
        const logCount = state.logs.filter((l) => l.siteId === site.id).length;

        card.innerHTML = `
            <div class="card-header" style="margin-bottom: 0.5rem; display: flex; align-items: flex-start; justify-content: space-between;">
                <div style="display: flex; flex-direction: column;">
                    ${site.siteCode ? `<span style="font-size: 0.8rem; color: var(--primary-color); font-weight: 600; letter-spacing: 0.5px; margin-bottom: 2px;">${site.siteCode}</span>` : ""}
                    <span class="site-name" style="font-size: 1.1rem;">${site.name}</span>
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 0.25rem; flex-grow: 1;">
                <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                ${site.deviceType
                ? `<span style="background: rgba(56, 189, 248, 0.1); color: var(--primary-color); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; border: 1px solid rgba(56, 189, 248, 0.2);">
                            <i class="fa-solid fa-tag" style="font-size: 0.7rem; margin-right: 4px;"></i>${site.deviceType}
                        </span>`
                : ""
            }
                ${site.attachments && site.attachments.length > 0 ? `<span style="font-size:0.75rem; background:rgba(56, 189, 248, 0.1); color:var(--primary-color); padding:2px 8px; border-radius:4px; border:1px solid rgba(56, 189, 248, 0.2);"><i class="fa-solid fa-paperclip" style="font-size:0.7rem; margin-right:4px;"></i>มีไฟล์แนบ</span>` : ""}
                </div>
                ${site.brand || site.model
                ? `<div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">
                        <i class="fa-solid fa-industry" style="margin-right: 4px; font-size: 0.8rem;"></i>
                        ${[site.brand, site.model].filter(Boolean).join(" · ")}
                    </div>`
                : ""
            }
                ${site.serialNumber
                ? `<div style="color: var(--text-muted); font-size: 0.85rem;">
                        <i class="fa-solid fa-barcode" style="margin-right: 4px; font-size: 0.8rem;"></i>${site.serialNumber}
                    </div>`
                : ""
            }
                ${(site.installLocation || site.villageName) || site.province
                ? `<div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">
                        <i class="fa-solid fa-location-dot" style="margin-right: 4px; font-size: 0.8rem;"></i>
                        ${[site.installLocation || site.villageName, site.district, site.province].filter(Boolean).join(", ")}
                    </div>`
                : ""
            }
            
            ${(() => {
                if (site.maintenanceCycle && site.firstMaDate) {
                    const firstMa = new Date(site.firstMaDate);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    let nextMa = new Date(firstMa);

                    // Base calculation on the latest log if available, otherwise advance firstMaDate
                    const siteLogs = state.logs.filter(
                        (l) => l.siteId === site.id && isMaCategory(l.category),
                    );
                    if (siteLogs.length > 0) {
                        siteLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
                        nextMa = new Date(siteLogs[0].date);
                        nextMa.setDate(nextMa.getDate() + site.maintenanceCycle);
                    } else {
                        while (nextMa < now) {
                            nextMa.setDate(nextMa.getDate() + site.maintenanceCycle);
                        }
                    }

                    const yy = nextMa.getFullYear();
                    const mo = String(nextMa.getMonth() + 1).padStart(2, '0');
                    const da = String(nextMa.getDate()).padStart(2, '0');
                    const formattedDate = formatThaiDate(`${yy}-${mo}-${da}`, { year: 'numeric', month: 'short', day: 'numeric' });

                    return `
                    <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-clock-rotate-left" style="color: var(--text-muted); font-size: 0.8rem;"></i>
                        <span><span style="color: var(--primary-color); font-weight: 500;">${site.maintenanceCycle} วัน</span> (${formattedDate})</span>
                    </div>`;
                }
                return "";
            })()}
            ${site.insuranceStartDate && site.insuranceEndDate
                ? (() => {
                    const duration = calculateDuration(
                        site.insuranceStartDate,
                        site.insuranceEndDate,
                    );
                    const start = formatThaiDate(site.insuranceStartDate);
                    const end = formatThaiDate(site.insuranceEndDate);
                    return `
                <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-shield-halved" style="color: var(--text-muted); font-size: 0.8rem;"></i>
                    <span>${start} - ${end} <span style="color: var(--primary-color); font-size: 0.8rem; margin-left: 2px;">(${duration || "-"})</span></span>
                </div>`;
                })()
                : ""
            }
            </div>

             <div class="card-actions" style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem;">
                 <div style="display: flex; align-items: center; gap: 0.75rem;">
                     <button class="card-btn-action card-btn-labeled-sm card-btn-log" onclick="event.stopPropagation(); viewSiteLogs('${site.id}')" title="ประวัติการซ่อมบำรุง">
                         <i class="fa-solid fa-clipboard-list"></i>
                         <span>${logCount} รายการ</span>
                     </button>
                     <button class="card-btn-action card-btn-qr" onclick="event.stopPropagation(); showDeviceQR('${site.id}')" title="QR Code แจ้งปัญหา">
                         <i class="fa-solid fa-qrcode"></i>
                     </button>

                </div>
                 <div style="display: flex; gap: 0.5rem;">
                     ${site.locationUrl
                ? `
                     <a href="${site.locationUrl}" target="_blank" title="เปิด Google Maps"
                        class="card-btn-action card-btn-maps">
                         <i class="fa-solid fa-map-location-dot"></i>
                     </a>`
                : ""
            }
                     ${site.contactPhone
                ? `
                     <a href="tel:${site.contactPhone}" title="โทร ${site.contactPhone}"
                        class="card-btn-action card-btn-call">
                         <i class="fa-solid fa-phone"></i>
                     </a>`
                : ""
            }
                     <button onclick="editSite('${site.id}')" title="แก้ไข"
                        class="card-btn-action card-btn-edit">
                        <i class="fa-solid fa-pen"></i>
                     </button>
                     <button onclick="deleteSite('${site.id}')" title="ลบ"
                        class="card-btn-action card-btn-delete">
                        <i class="fa-solid fa-trash"></i>
                     </button>
                 </div>
            </div>
        `;
        grids.sites.appendChild(card);
    });
}

function setupCustomNameLogic() {
    const checkCustom = document.getElementById("check-custom-name");
    const inputName = document.getElementById("input-site-name");
    const inputVillage = document.querySelector('input[name="installLocation"]');
    const inputMoo = document.getElementById("input-moo");
    const inputSubdistrict = document.getElementById("input-tambon");
    const inputDistrict = document.getElementById("input-amphoe");
    const inputProvince = document.getElementById("input-province");

    if (!checkCustom || !inputName) return;

    // Toggle Readonly state
    checkCustom.addEventListener("change", () => {
        if (checkCustom.checked) {
            inputName.removeAttribute("readonly");
            inputName.focus();
        } else {
            inputName.setAttribute("readonly", true);
            generateSiteName(); // Regenerate immediately on uncheck
        }
    });

    // Generator Function
    const generateSiteName = () => {
        if (checkCustom.checked) return; // Don't overwrite if custom

        const village = inputVillage ? inputVillage.value.trim() : "";
        const moo = inputMoo ? inputMoo.value.trim() : "";
        const subdistrict = inputSubdistrict ? inputSubdistrict.value.trim() : "";
        const district = inputDistrict ? inputDistrict.value.trim() : "";
        const province = inputProvince ? inputProvince.value.trim() : "";

        let nameParts = [];

        if (village) nameParts.push(village); // Site name usually starts with village
        if (moo) nameParts.push(`หมู่ที่ ${moo}`);
        if (subdistrict) nameParts.push(`ตำบล${subdistrict}`);
        if (district) nameParts.push(`อำเภอ${district}`);
        if (province) nameParts.push(`จังหวัด${province}`);

        if (nameParts.length > 0) {
            inputName.value = nameParts.join(" ");
        } else {
            inputName.value = "";
        }
    };

    // Attach listeners to address fields
    const addressFields = [
        inputVillage,
        inputMoo,
        inputSubdistrict,
        inputDistrict,
        inputProvince,
    ];
    addressFields.forEach((field) => {
        if (field) {
            field.addEventListener("input", generateSiteName);
            field.addEventListener("change", generateSiteName);
        }
    });
}

function viewSiteDetails(id) {
    const site = state.sites.find((s) => s.id === id);
    if (!site) return;

    // Populate Modal
    const siteNameEl = document.getElementById("detail-site-name");
    if (site.siteCode) {
        siteNameEl.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.5px;">${site.siteCode}</span>${site.name}`;
    } else {
        siteNameEl.textContent = site.name;
    }

    document.getElementById("detail-agency").textContent =
        site.deviceType || "-";
    document.getElementById("detail-pic-name").textContent =
        [site.brand, site.model].filter(Boolean).join(" / ") || "-";

    // Serial number in phone field
    const phoneEl = document.getElementById("detail-phone");
    phoneEl.textContent = site.serialNumber || "-";

    // Address construction — installation section
    const addrEl = document.getElementById("detail-address");
    if (addrEl) {
        const addrFields = [
            { label: "โรงพยาบาล", value: site.hospital },
            { label: "สถานที่ติดตั้ง", value: site.installLocation || site.villageName },
            { label: "ตำบล/แขวง", value: site.subdistrict },
            { label: "อำเภอ/เขต", value: site.district },
            { label: "จังหวัด", value: site.province },
        ].filter((f) => f.value);

        addrEl.style.display = "block";
        addrEl.style.fontSize = "0.85rem";
        addrEl.style.lineHeight = "1.7";
        if (addrFields.length > 0) {
            addrEl.innerHTML = addrFields
                .map(
                    (f) =>
                        `<div><span style="color:var(--text-muted);">${f.label}:</span> <span style="font-weight:500;">${f.value}</span></div>`,
                )
                .join("");
        } else {
            addrEl.innerHTML =
                '<span style="color:var(--text-muted); font-style:italic;">-</span>';
        }
    }

    // Contact information section
    const contactEl = document.getElementById("detail-contact-info");
    if (contactEl) {
        const contactFields = [
            { label: "ผู้ดูแล (PIC)", value: site.picName },
            { label: "เบอร์โทร", value: site.contactPhone },
        ].filter((f) => f.value);

        contactEl.style.fontSize = "0.85rem";
        contactEl.style.lineHeight = "1.7";
        if (contactFields.length > 0) {
            contactEl.innerHTML = contactFields
                .map(
                    (f) =>
                        `<div><span style="color:var(--text-muted);">${f.label}:</span> <span style="font-weight:500;">${f.value}</span></div>`,
                )
                .join("");
        } else {
            contactEl.innerHTML =
                '<span style="color:var(--text-muted); font-style:italic;">-</span>';
        }
    }

    // Map URL — handled in action bar

    // Maintenance Cycle
    const mcEl = document.getElementById("detail-maintenance-cycle");
    const fmaEl = document.getElementById("detail-first-ma");
    if (mcEl)
        mcEl.textContent = site.maintenanceCycle
            ? `${site.maintenanceCycle} วัน`
            : "-";
    if (fmaEl) {
        // Find all MA logs for this site, sorted by date ascending (oldest first)
        const siteMaLogs = (state.logs || [])
            .filter(l =>
                l.siteId === site.id &&
                (l.category === 'บำรุงรักษาตามรอบ' || l.category === 'ตามสัญญาจ้าง' || l.category === 'ตามใบสั่งซื้อ')
            )
            .sort((a, b) => {
                const dateDiff = new Date(a.date) - new Date(b.date);
                if (dateDiff !== 0) return dateDiff;
                return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
            });

        const firstMaLog = siteMaLogs[0];

        console.debug('[FirstMA] siteMaLogs (sorted oldest first) for site', site.id, siteMaLogs.map(l => ({
            id: l.id, caseId: l.caseId, date: l.date, status: l.status,
            objective: l.objective, cycleCount: l.cycleCount
        })));
        console.debug('[FirstMA] resolved firstMaLog:', firstMaLog ? { id: firstMaLog.id, caseId: firstMaLog.caseId, status: firstMaLog.status } : null);




        if (firstMaLog) {
            // Prefer the Case Closed timestamp, fall back to log date
            let firstMaDateStr = null;
            if (firstMaLog.statusHistory && firstMaLog.statusHistory['Case Closed']) {
                const closedTs = new Date(firstMaLog.statusHistory['Case Closed']);
                const yyyy = closedTs.getFullYear();
                const mm = String(closedTs.getMonth() + 1).padStart(2, '0');
                const dd = String(closedTs.getDate()).padStart(2, '0');
                firstMaDateStr = `${yyyy}-${mm}-${dd}`;
            } else if (firstMaLog.date) {
                firstMaDateStr = sanitizeDate(firstMaLog.date).split('T')[0];
            }

            if (firstMaDateStr) {
                let dateText = formatThaiDate(firstMaDateStr, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                });
                // Append status badge
                const isClosed = firstMaLog.status === 'Case Closed';
                const statusColor = isClosed ? 'var(--success-color, #22c55e)' : 'var(--warning-color, #f59e0b)';
                const statusLabel = isClosed ? 'ปิดเคสแล้ว' : (firstMaLog.status || 'Open');
                dateText += ` <span style="font-size:0.78rem; color:${statusColor}; font-weight:600;">(${statusLabel})</span>`;
                if (firstMaLog.caseId && firstMaLog.id) {
                    dateText += ` <a href="javascript:void(0)" onclick="viewLogDetails('${firstMaLog.id}')" style="color: var(--primary-color); text-decoration: underline; margin-left: 6px; font-size: 0.85em;"><i class="fa-solid fa-link"></i> ${firstMaLog.caseId}</a>`;
                }
                fmaEl.innerHTML = dateText;
            } else {
                fmaEl.textContent = '-';
            }
        } else if (site.firstMaDate) {
            // Fallback: show from site field if no log found
            fmaEl.textContent = formatThaiDate(site.firstMaDate, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } else {
            fmaEl.textContent = '-';
        }
    }


    const installDateEl = document.getElementById("detail-installation-date");
    if (installDateEl) {
        let installDate = site.installationDate;
        let installLogCaseId = null;
        let installLogId = null;
        if (!installDate && state.logs) {
            const installLog = state.logs.find(l => l.siteId === site.id && l.category === "ติดตั้ง");
            if (installLog && installLog.date) {
                installDate = sanitizeDate(installLog.date).split('T')[0];
                installLogCaseId = installLog.caseId;
                installLogId = installLog.id;
            }
        }
        if (installDate) {
            let dateText = formatThaiDate(installDate, {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
            if (installLogCaseId && installLogId) {
                dateText += ` <a href="javascript:void(0)" onclick="viewLogDetails('${installLogId}')" style="color: var(--primary-color); text-decoration: underline; margin-left: 8px; font-size: 0.85em;"><i class="fa-solid fa-link"></i> ${installLogCaseId}</a>`;
                installDateEl.innerHTML = dateText;
            } else {
                installDateEl.textContent = dateText;
            }
        } else {
            installDateEl.textContent = "-";
        }
    }

    // Next MA Date
    const nextMaEl = document.getElementById("detail-next-ma");
    if (nextMaEl) {
        // Find if there is an active MA case (category MA, status is not Case Closed/Done/Cancel)
        const activeMaLog = (state.logs || []).find(l =>
            l.siteId === site.id &&
            (l.category === 'บำรุงรักษาตามรอบ' || l.category === 'ตามสัญญาจ้าง' || l.category === 'ตามใบสั่งซื้อ') &&
            l.status !== 'Case Closed' && l.status !== 'Done' && l.status !== 'Cancel'
        );

        let nextMaDateStr = null;
        let activeLogId = null;
        let activeCaseId = null;

        if (activeMaLog) {
            nextMaDateStr = sanitizeDate(activeMaLog.date).split('T')[0];
            activeLogId = activeMaLog.id;
            activeCaseId = activeMaLog.caseId;
        } else {
            // Fallback: calculate next MA date dynamically
            let firstMaAnchor = site.firstMaDate || null;
            if (!firstMaAnchor) {
                const firstMaLogForNext = (state.logs || [])
                    .filter(l =>
                        l.siteId === site.id &&
                        (l.category === 'บำรุงรักษาตามรอบ' || l.category === 'ตามสัญญาจ้าง' || l.category === 'ตามใบสั่งซื้อ')
                    )
                    .sort((a, b) => {
                        const dateDiff = new Date(a.date) - new Date(b.date);
                        if (dateDiff !== 0) return dateDiff;
                        return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
                    })[0];
                if (firstMaLogForNext && firstMaLogForNext.date) {
                    firstMaAnchor = sanitizeDate(firstMaLogForNext.date).split('T')[0];
                }
            }

            if (site.maintenanceCycle && firstMaAnchor) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                let nextMa = new Date(firstMaAnchor);

                const siteLogs = state.logs.filter(
                    (l) => l.siteId === site.id && isMaCategory(l.category),
                );
                if (siteLogs.length > 0) {
                    siteLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
                    nextMa = new Date(siteLogs[0].date);
                    nextMa.setDate(nextMa.getDate() + site.maintenanceCycle);
                } else {
                    while (nextMa < now) {
                        nextMa.setDate(nextMa.getDate() + site.maintenanceCycle);
                    }
                }
                const yyyy = nextMa.getFullYear();
                const mm = String(nextMa.getMonth() + 1).padStart(2, '0');
                const dd = String(nextMa.getDate()).padStart(2, '0');
                nextMaDateStr = `${yyyy}-${mm}-${dd}`;
            }
        }

        if (nextMaDateStr) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const targetDate = new Date(nextMaDateStr);
            targetDate.setHours(0, 0, 0, 0);

            const formattedDate = formatThaiDate(nextMaDateStr, { year: 'numeric', month: 'long', day: 'numeric' });
            const daysDiff = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
            const daysLabel =
                daysDiff < 0
                    ? `เลยกำหนด ${Math.abs(daysDiff)} วัน`
                    : daysDiff === 0
                        ? `ครบกำหนดวันนี้`
                        : `อีก ${daysDiff} วัน`;

            let htmlContent = formattedDate;
            if (daysDiff < 0) {
                htmlContent += ` <span style="color: var(--danger-color, #ef4444); font-size: 0.8rem; font-weight: 600;">(${daysLabel})</span>`;
            } else {
                htmlContent += ` <span style="color: var(--text-muted); font-size: 0.8rem;">(${daysLabel})</span>`;
            }

            if (activeLogId && activeCaseId) {
                htmlContent += ` <a href="javascript:void(0)" onclick="viewLogDetails('${activeLogId}')" style="color: var(--primary-color); text-decoration: underline; margin-left: 6px; font-size: 0.85em;"><i class="fa-solid fa-link"></i> ${activeCaseId}</a>`;
            }

            nextMaEl.style.color = "";
            nextMaEl.innerHTML = htmlContent;
        } else {
            nextMaEl.textContent = "-";
            nextMaEl.style.color = "";
        }
    }



    // Insurance
    const insuranceEl = document.getElementById("detail-insurance");
    if (site.insuranceStartDate && site.insuranceEndDate) {
        const start = formatThaiDate(site.insuranceStartDate, {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        const end = formatThaiDate(site.insuranceEndDate, {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        insuranceEl.textContent = `${start} - ${end}`;
    } else {
        insuranceEl.textContent = "ไม่มีข้อมูลการรับประกัน";
        insuranceEl.style.color = "var(--text-muted)";
    }

    // Description
    document.getElementById("detail-description").textContent =
        site.description || "ไม่มีรายละเอียดเพิ่มเติม";

    // Inject Action Buttons
    const actionsContainer = document.getElementById("detail-modal-actions");
    if (actionsContainer) {
        actionsContainer.innerHTML = `
            <div class="glass-action-bar">
                <div class="action-group">
                    ${site.locationUrl ? `
                        <a href="${site.locationUrl}" target="_blank" class="glass-btn glass-btn-secondary">
                            <i class="fa-solid fa-map-location-dot"></i>
                            <span>เส้นทาง</span>
                        </a>
                    ` : ""}
                    ${site.contactPhone ? `
                        <a href="tel:${site.contactPhone}" class="glass-btn glass-btn-secondary">
                            <i class="fa-solid fa-phone"></i>
                            <span>โทร</span>
                        </a>
                    ` : ""}
                    <button class="glass-btn glass-btn-secondary" onclick="viewSiteLogs('${site.id}');">
                        <i class="fa-solid fa-clipboard-list"></i>
                        <span>ดูเคส</span>
                    </button>
                    <button class="glass-btn glass-btn-secondary" onclick="showDeviceQR('${site.id}');">
                        <i class="fa-solid fa-qrcode"></i>
                        <span>QR Code</span>
                    </button>
                </div>
                
                <div class="action-divider"></div>
                
                <div class="action-group">
                    <button class="glass-btn glass-btn-secondary" onclick="exportInsuranceCardPDF('${site.id}');">
                        <i class="fa-solid fa-shield-halved"></i>
                        <span>ใบประกัน</span>
                    </button>
                    <button class="glass-btn glass-btn-secondary" onclick="exportCaseHistoryPDF('${site.id}');">
                        <i class="fa-solid fa-file-lines"></i>
                        <span>ประวัติเคส</span>
                    </button>
                </div>
                
                <div class="action-divider"></div>
                
                <div class="action-group">
                    <button class="glass-btn glass-btn-primary" onclick="editSite('${site.id}'); toggleModal('siteDetails', false);">
                        <i class="fa-solid fa-pen"></i>
                        <span>แก้ไข</span>
                    </button>
                    <button class="glass-btn glass-btn-danger" onclick="deleteSite('${site.id}'); toggleModal('siteDetails', false);">
                        <i class="fa-solid fa-trash"></i>
                        <span>ลบ</span>
                    </button>
                    <button type="button" class="glass-btn glass-btn-secondary glass-btn-close" onclick="toggleModal('siteDetails', false)" title="ปิด">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // --- Render Site Attachments in Details ---
    const attachmentRow = document.getElementById("detail-site-attachment-row");
    const attachmentList = document.getElementById("detail-site-attachment-list");
    const noAttachmentsMsg = document.getElementById(
        "detail-site-no-attachments",
    );

    // Standardize
    let currentAttachments = [];
    if (site.attachments && Array.isArray(site.attachments)) {
        currentAttachments = site.attachments;
    }

    if (currentAttachments.length > 0 && attachmentList) {
        if (attachmentRow) attachmentRow.style.display = "flex";
        if (noAttachmentsMsg) noAttachmentsMsg.style.display = "none";

        attachmentList.innerHTML = "";

        // Render
        const images = currentAttachments.filter(
            (att) =>
                (att.type && att.type.startsWith("image/")) ||
                (att.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.name)),
        );
        const documents = currentAttachments.filter((att) => !images.includes(att));

        // 1. Grid for Images
        if (images.length > 0) {
            const grid = document.createElement("div");
            grid.style.cssText =
                "display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; width: 100%; margin-bottom: 5px;";
            images.forEach((att) => {
                const a = document.createElement("div");
                a.onclick = () => window.openImageViewer(att.url);
                a.style.cssText =
                    "cursor: pointer; display: block; overflow: hidden; border-radius: 6px; border: 1px solid #334155; aspect-ratio: 1/1; position: relative;";

                const wrapper = createLoaderImage(
                    att.url,
                    "width: 100%; height: 100%; object-fit: cover;",
                );
                const img = wrapper.querySelector("img");
                img.style.transition = "opacity 0.3s ease-in, transform 0.2s";
                a.onmouseover = () => (img.style.transform = "scale(1.05)");
                a.onmouseout = () => (img.style.transform = "scale(1)");

                a.appendChild(wrapper);
                grid.appendChild(a);
            });
            attachmentList.appendChild(grid);
        }

        // 2. List for Docs
        if (documents.length > 0) {
            documents.forEach((att) => {
                const link = document.createElement("a");
                link.href = att.url;
                link.target = "_blank";
                link.style.cssText =
                    "color: var(--text-color); text-decoration: none; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 6px; border: 1px solid var(--glass-border); transition: background 0.2s; width: 100%;";

                // Icon
                let iconHtml =
                    '<i class="fa-solid fa-file" style="color: #64748b; font-size: 1.1rem;"></i>';
                if (
                    att.type === "application/pdf" ||
                    (att.name && /\.pdf$/i.test(att.name))
                ) {
                    iconHtml =
                        '<i class="fa-solid fa-file-pdf" style="color: #ef4444; font-size: 1.1rem;"></i>';
                }

                link.innerHTML = `
                    ${iconHtml}
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${att.name}</span>
                `;
                attachmentList.appendChild(link);
            });
        }
    } else {
        if (attachmentRow) attachmentRow.style.display = "none";
        if (noAttachmentsMsg) noAttachmentsMsg.style.display = "block";
    }

    // Setup View MA Records button
    const btnViewMaRecords = document.getElementById("btn-view-ma-records");
    if (btnViewMaRecords) {
        // Remove old listeners by cloning
        const newBtn = btnViewMaRecords.cloneNode(true);
        btnViewMaRecords.parentNode.replaceChild(newBtn, btnViewMaRecords);

        newBtn.addEventListener("click", () => {
            // Close site details modal
            toggleModal("siteDetails", false);

            // Switch to engineer view (logs view)
            switchView("engineer-view");

            // Set the site name in the search filter
            const siteFilterInput = document.getElementById("site-filter-input");
            if (siteFilterInput) {
                siteFilterInput.value = site.name;
                // Trigger input event to apply filter
                siteFilterInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Scroll to top of logs
            setTimeout(() => {
                const logsView = document.getElementById("engineer-view");
                if (logsView) {
                    logsView.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }, 100);
        });
    }

    toggleModal("siteDetails", true);
}

// ─── Comment Helpers ─────────────────────────────────────────────────────────

let commentAttachments = [];

function renderLogComments(logId, comments) {
    const list = document.getElementById("log-comments-list");
    const gotoInitialBtn = document.getElementById("btn-goto-initial-comment");
    const gotoLatestBtn = document.getElementById("btn-goto-latest-comment");
    if (!list) return;

    if (!Array.isArray(comments) || comments.length === 0) {
        list.innerHTML = `<div class="empty-comments">
            <i class="fa-regular fa-comments" style="font-size:2rem; color:var(--text-muted); opacity:0.5; margin-bottom:0.5rem;"></i>
            <p style="color:var(--text-muted); font-size:0.9rem; margin:0;">ยังไม่มีความคิดเห็น</p>
        </div>`;
        if (gotoInitialBtn) gotoInitialBtn.style.display = 'none';
        if (gotoLatestBtn) gotoLatestBtn.style.display = 'none';
        return;
    }

    // Show buttons if there are comments
    if (gotoInitialBtn) gotoInitialBtn.style.display = 'inline-flex';
    if (gotoLatestBtn) gotoLatestBtn.style.display = 'inline-flex';

    // Reverse comments to show newest first
    const reversedComments = [...comments].reverse();
    const originalLength = comments.length;

    list.innerHTML = reversedComments
        .map((c, index) => {
            const ts = c.timestamp
                ? new Date(c.timestamp).toLocaleString("th-TH", {
                    dateStyle: "short",
                    timeStyle: "short",
                })
                : "";

            // Check if this is the first comment (initial description) - it's now at the end
            const originalIndex = originalLength - 1 - index;
            const isInitialComment = originalIndex === 0;
            const isLatestComment = index === 0;

            // Get author info - ALWAYS prioritize state.users for latest profile data
            let authorName = c.author || "ไม่ระบุชื่อ";
            let authorPhoto = '';

            // Try to sync from state.users FIRST if authorId is available
            if (c.authorId && state.users && state.users[c.authorId]) {
                const userData = state.users[c.authorId];
                // Use latest data from users collection
                authorName = userData.displayName || userData.email || authorName;
                // ALWAYS use the latest photoURL from users collection
                authorPhoto = userData.photoURL || '';
                console.log(`[Comment Render] User ${c.authorId}: Using latest photo from state.users:`, authorPhoto);
            } else {
                // Fallback to comment's stored data only if user not found in state.users
                authorPhoto = c.photoURL || '';
                console.log(`[Comment Render] User not found in state.users, using stored photo:`, authorPhoto);
            }

            // Get first letter of author name for fallback avatar
            const authorInitial = authorName.charAt(0).toUpperCase();

            // Create avatar HTML - use photo if available, otherwise use initial
            let avatarHtml;
            if (authorPhoto && authorPhoto.trim() !== '') {
                avatarHtml = `<img src="${authorPhoto}" alt="${authorName}" onerror="this.outerHTML='${authorInitial}'">`;
            } else {
                avatarHtml = authorInitial;
            }

            let attachmentsHtml = '';
            if (c.attachments && c.attachments.length > 0) {
                // Separate images from other files
                const images = c.attachments.filter(att => att.type && att.type.startsWith('image/'));
                const files = c.attachments.filter(att => !att.type || !att.type.startsWith('image/'));

                attachmentsHtml = '<div style="margin-top: 0.75rem;">';

                // Render images in grid
                if (images.length > 0) {
                    attachmentsHtml += '<div class="comment-images-grid">';
                    images.forEach(att => {
                        const isDataUrl = att.url && att.url.startsWith('data:');
                        const clickHandler = isDataUrl
                            ? `openImageViewer(this.querySelector('img').src)`
                            : `openImageViewer('${att.url}')`;
                        attachmentsHtml += `<div onclick="${clickHandler}" class="comment-image-attachment" style="aspect-ratio: 1; cursor: pointer;">
                            <img src="${att.url}" alt="${att.name || 'Image'}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
                            <div class="image-overlay">
                                <i class="fa-solid fa-expand" style="color: white; font-size: 1.5rem;"></i>
                            </div>
                        </div>`;
                    });
                    attachmentsHtml += '</div>';
                }

                // Render other files in list
                if (files.length > 0) {
                    attachmentsHtml += '<div style="display: flex; flex-direction: column; gap: 8px;">';
                    files.forEach(att => {
                        const fileExt = att.name ? att.name.split('.').pop().toUpperCase() : 'FILE';
                        let iconClass = 'fa-file-alt';
                        let iconColor = '#64748b';

                        if (att.type === 'application/pdf' || fileExt === 'PDF') {
                            iconClass = 'fa-file-pdf';
                            iconColor = '#ef4444';
                        } else if (att.type && att.type.includes('word') || fileExt === 'DOC' || fileExt === 'DOCX') {
                            iconClass = 'fa-file-word';
                            iconColor = '#2563eb';
                        } else if (att.type && att.type.includes('excel') || fileExt === 'XLS' || fileExt === 'XLSX') {
                            iconClass = 'fa-file-excel';
                            iconColor = '#16a34a';
                        }

                        attachmentsHtml += `<a href="${att.url}" target="_blank" class="comment-file-attachment">
                            <div class="file-icon">
                                <i class="fa-solid ${iconClass}" style="color: ${iconColor};"></i>
                                <span class="file-ext">${fileExt}</span>
                            </div>
                            <div class="file-info">
                                <span class="file-name">${att.name || 'File'}</span>
                                <span class="file-size">${formatFileSize(att.size)}</span>
                            </div>
                            <i class="fa-solid fa-download"></i>
                        </a>`;
                    });
                    attachmentsHtml += '</div>';
                }

                attachmentsHtml += '</div>';
            }

            // Add badge for initial comment
            const initialBadge = isInitialComment ? `<span class="comment-badge-initial"><i class="fa-solid fa-file-lines"></i> รายละเอียดเริ่มต้น</span>` : '';

            // Add badge for system log
            const systemLogBadge = c.isSystemLog ? `<span class="comment-badge-system"><i class="fa-solid fa-robot"></i> ระบบ</span>` : '';

            // Determine ID for scrolling
            let commentId = '';
            if (isInitialComment) commentId = 'initial-comment';
            if (isLatestComment) commentId = 'latest-comment';

            // Determine comment item classes
            let commentClasses = 'comment-item';
            if (isInitialComment) commentClasses += ' comment-item-initial';
            if (c.isSystemLog) commentClasses += ' comment-item-system-log';

            return `<div class="${commentClasses}" ${commentId ? `id="${commentId}"` : ''}>
                <div class="comment-avatar">${avatarHtml}</div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${authorName}</span>
                        <span class="comment-time">${ts}</span>
                    </div>
                    ${initialBadge}
                    ${systemLogBadge}
                    ${c.text ? `<p class="comment-text">${c.text.replace(/\n/g, "<br>")}</p>` : ''}
                    ${attachmentsHtml}
                </div>
            </div>`;
        })
        .join("");
}

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function expandCommentsIfCollapsed() {
    const content = document.getElementById("comment-collapsible");
    if (content && content.style.display === "none") {
        content.style.display = "";
        const icon = document.getElementById("comment-collapse-icon");
        const text = document.getElementById("comment-toggle-text");
        if (icon) icon.style.transform = "";
        if (text) text.textContent = "ซ่อน";
    }
}

function scrollToInitialComment() {
    expandCommentsIfCollapsed();
    setTimeout(() => {
        const initialComment = document.getElementById('initial-comment');
        if (initialComment) {
            initialComment.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 50);
}

function scrollToLatestComment() {
    expandCommentsIfCollapsed();
    setTimeout(() => {
        const latestComment = document.getElementById('latest-comment');
        if (latestComment) {
            latestComment.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 50);
}

window.scrollToInitialComment = scrollToInitialComment;
window.scrollToLatestComment = scrollToLatestComment;
window.toggleCommentSection = toggleCommentSection;
window.toggleCostSection = toggleCostSection;
window.toggleFormCostSection = toggleFormCostSection;

function toggleCommentSection() {
    const content = document.getElementById("comment-collapsible");
    const icon = document.getElementById("comment-collapse-icon");
    if (!content) return;
    const isHidden = content.style.display === "none";
    content.style.display = isHidden ? "" : "none";
    if (icon) icon.style.transform = isHidden ? "" : "rotate(180deg)";
}

function toggleCostSection() {
    const content = document.getElementById("cost-section-content");
    const icon = document.getElementById("cost-collapse-icon");
    if (!content) return;
    const isHidden = content.style.display === "none";
    content.style.display = isHidden ? "" : "none";
    if (icon) icon.style.transform = isHidden ? "rotate(180deg)" : "";
}

function toggleFormCostSection() {
    const content = document.getElementById("form-cost-section-content");
    const icon = document.getElementById("form-cost-collapse-icon");
    if (!content) return;
    const isHidden = content.style.display === "none";
    content.style.display = isHidden ? "" : "none";
    if (icon) icon.style.transform = isHidden ? "rotate(180deg)" : "";
}

async function postLogComment(logId, inputEl) {
    const text = inputEl.value.trim();
    if (!text && commentAttachments.length === 0) return;

    const user = auth.currentUser;
    const author = user ? user.displayName || user.email || "Unknown" : "Unknown";

    const comment = {
        text: text || '',
        author,
        authorId: user ? user.uid : null,
        photoURL: user ? user.photoURL || '' : '',
        timestamp: new Date().toISOString(),
        attachments: []
    };

    // Upload attachments if any
    if (commentAttachments.length > 0) {
        try {
            // Show uploading state
            showUploadingState(true);

            const uploadPromises = commentAttachments.map(async (file, index) => {
                const path = `comments/${logId}/${Date.now()}_${file.name}`;
                const url = await FirestoreService.uploadFile(file, path, (progress) => {
                    updateUploadProgress(index, progress);
                });
                return {
                    name: file.name,
                    url: url,
                    type: file.type,
                    size: file.size
                };
            });
            comment.attachments = await Promise.all(uploadPromises);

            // Hide uploading state
            showUploadingState(false);
        } catch (err) {
            showUploadingState(false);
            showToast("ไม่สามารถอัปโหลดไฟล์แนบ: " + err.message, "error");
            return;
        }
    }

    // Find log in state and update
    const log = state.logs.find((l) => l.id === logId);
    const comments = [...(log?.comments || []), comment];

    try {
        await FirestoreService.updateLog(logId, { comments });
        if (log) log.comments = comments;

        // Refresh users data to ensure latest profile info is displayed
        const users = await FirestoreService.fetchUsers();
        state.users = users;

        renderLogComments(logId, comments);
        inputEl.value = "";
        commentAttachments = [];
        updateAttachmentPreview();
    } catch (err) {
        showToast("ไม่สามารถบันทึกความคิดเห็น: " + err.message, "error");
    }
}

function showUploadingState(show) {
    const preview = document.getElementById('comment-attachments-preview');
    if (!preview) return;

    if (show) {
        preview.classList.add('uploading');
        // Disable buttons
        const postBtn = document.getElementById('btn-post-comment');
        const attachBtn = document.getElementById('btn-attach-file');
        if (postBtn) postBtn.disabled = true;
        if (attachBtn) attachBtn.disabled = true;
    } else {
        preview.classList.remove('uploading');
        // Enable buttons
        const postBtn = document.getElementById('btn-post-comment');
        const attachBtn = document.getElementById('btn-attach-file');
        if (postBtn) postBtn.disabled = false;
        if (attachBtn) attachBtn.disabled = false;
    }
}

function updateUploadProgress(index, progress) {
    const progressEl = document.getElementById(`comment-upload-progress-${index}`);
    if (progressEl) {
        progressEl.style.display = 'block';
        progressEl.textContent = Math.round(progress) + '%';
    }
}

function updateAttachmentPreview() {
    const preview = document.getElementById('comment-attachments-preview');
    if (!preview) return;

    if (commentAttachments.length === 0) {
        preview.style.display = 'none';
        preview.innerHTML = '';
        preview.removeAttribute('data-count');
        return;
    }

    preview.setAttribute('data-count', commentAttachments.length);
    preview.style.display = 'flex';
    preview.innerHTML = '';

    commentAttachments.forEach((file, index) => {
        const isImage = file.type.startsWith('image/');

        // Create card container
        const card = document.createElement('div');
        card.className = 'pending-item';
        card.style.cssText = 'position: relative; display: flex; flex-direction: column; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); transition: transform 0.2s; flex-shrink: 0; width: 100px; height: 100px;';
        card.onmouseover = () => (card.style.transform = 'scale(1.02)');
        card.onmouseout = () => (card.style.transform = 'scale(1)');

        // Thumbnail/Icon container
        const thumbContainer = document.createElement('div');
        thumbContainer.style.cssText = 'position: relative; width: 100px; height: 60px; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;';

        const thumbContent = document.createElement('div');
        thumbContent.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;';

        if (isImage) {
            const url = URL.createObjectURL(file);
            const img = document.createElement('img');
            img.src = url;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            thumbContent.appendChild(img);
        } else {
            // Show file icon
            const icon = document.createElement('i');
            const fileExt = file.name.split('.').pop().toLowerCase();

            if (file.type.includes('pdf') || fileExt === 'pdf') {
                icon.className = 'fa-solid fa-file-pdf';
                icon.style.color = '#ef4444';
            } else if (file.type.includes('excel') || fileExt === 'xls' || fileExt === 'xlsx') {
                icon.className = 'fa-solid fa-file-excel';
                icon.style.color = '#10b981';
            } else if (file.type.includes('word') || fileExt === 'doc' || fileExt === 'docx') {
                icon.className = 'fa-solid fa-file-word';
                icon.style.color = '#3b82f6';
            } else {
                icon.className = 'fa-solid fa-file';
                icon.style.color = '#94a3b8';
            }
            icon.style.fontSize = '1.5rem';
            thumbContent.appendChild(icon);
        }

        thumbContainer.appendChild(thumbContent);

        // Remove Button
        const removeBtn = document.createElement('div');
        removeBtn.innerHTML = '&times;';
        removeBtn.style.cssText = 'position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; background: rgba(239, 68, 68, 0.9); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; z-index: 50; box-shadow: 0 2px 4px rgba(0,0,0,0.3);';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeAttachment(index);
        };
        thumbContainer.appendChild(removeBtn);

        // Progress Overlay
        const progressOverlay = document.createElement('div');
        progressOverlay.id = `comment-upload-progress-${index}`;
        progressOverlay.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; background: rgba(0,0,0,0.9); padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: bold; pointer-events: none; display: none; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.5);';
        progressOverlay.textContent = '0%';
        thumbContainer.appendChild(progressOverlay);

        card.appendChild(thumbContainer);

        // Info section
        const infoContainer = document.createElement('div');
        infoContainer.style.cssText = 'padding: 4px 6px; display: flex; flex-direction: column; gap: 2px; background: rgba(255,255,255,0.03); flex: 1; overflow: hidden;';

        const nameSpan = document.createElement('div');
        nameSpan.textContent = file.name;
        nameSpan.title = file.name;
        nameSpan.style.cssText = 'font-size: 0.65rem; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;';

        const sizeSpan = document.createElement('div');
        const bytes = file.size;
        let sizeText = '';
        if (bytes < 1024) {
            sizeText = bytes + ' B';
        } else if (bytes < 1024 * 1024) {
            sizeText = (bytes / 1024).toFixed(1) + ' KB';
        } else {
            sizeText = (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
        sizeSpan.textContent = sizeText;
        sizeSpan.style.cssText = 'font-size: 0.6rem; color: var(--text-muted);';

        infoContainer.appendChild(nameSpan);
        infoContainer.appendChild(sizeSpan);

        card.appendChild(infoContainer);
        preview.appendChild(card);
    });
}

function removeAttachment(index) {
    commentAttachments.splice(index, 1);
    updateAttachmentPreview();
}

// ─── MA Form Comment Helpers ─────────────────────────────────────────────────

let maFormCommentAttachments = [];

function updateMaFormAttachmentPreview() {
    const preview = document.getElementById('ma-form-attachments-preview');
    if (!preview) return;

    if (maFormCommentAttachments.length === 0) {
        preview.style.display = 'none';
        preview.innerHTML = '';
        return;
    }

    preview.style.display = 'block';
    preview.setAttribute('data-count', maFormCommentAttachments.length);

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';

    maFormCommentAttachments.forEach((file, index) => {
        const isImage = file.type.startsWith('image/');
        const fileExt = file.name.split('.').pop().toUpperCase();
        const sizeKB = (file.size / 1024).toFixed(1);
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const sizeText = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

        if (isImage) {
            // Show image preview with thumbnail (40x40px to match icon size)
            const previewUrl = URL.createObjectURL(file);
            html += `
                <div class="comment-file-attachment" style="position: relative; padding-right: 40px; cursor: default;">
                    <div class="file-icon" style="padding: 0; overflow: hidden; background: transparent;">
                        <img src="${previewUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;" alt="${file.name}">
                    </div>
                    <div class="file-info">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${sizeText}</span>
                    </div>
                    <button type="button" onclick="removeMaFormAttachment(${index})" 
                        style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: rgba(239,68,68,0.1); color: #ef4444; border: none; border-radius: 6px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" 
                        onmouseover="this.style.background='rgba(239,68,68,0.2)'" 
                        onmouseout="this.style.background='rgba(239,68,68,0.1)'"
                        title="ลบไฟล์">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;
        } else {
            // Show file icon for non-images
            let iconClass = 'fa-file-alt';
            let iconColor = '#64748b';

            if (file.type === 'application/pdf' || fileExt === 'PDF') {
                iconClass = 'fa-file-pdf';
                iconColor = '#ef4444';
            } else if (file.type.includes('word') || fileExt === 'DOC' || fileExt === 'DOCX') {
                iconClass = 'fa-file-word';
                iconColor = '#2563eb';
            } else if (file.type.includes('excel') || fileExt === 'XLS' || fileExt === 'XLSX') {
                iconClass = 'fa-file-excel';
                iconColor = '#16a34a';
            }

            html += `
                <div class="comment-file-attachment" style="position: relative; padding-right: 40px; cursor: default;">
                    <div class="file-icon">
                        <i class="fa-solid ${iconClass}" style="color: ${iconColor};"></i>
                        <span class="file-ext">${fileExt}</span>
                    </div>
                    <div class="file-info">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${sizeText}</span>
                    </div>
                    <button type="button" onclick="removeMaFormAttachment(${index})" 
                        style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: rgba(239,68,68,0.1); color: #ef4444; border: none; border-radius: 6px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" 
                        onmouseover="this.style.background='rgba(239,68,68,0.2)'" 
                        onmouseout="this.style.background='rgba(239,68,68,0.1)'"
                        title="ลบไฟล์">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;
        }
    });

    html += '</div>';
    preview.innerHTML = html;
}

function removeMaFormAttachment(index) {
    maFormCommentAttachments.splice(index, 1);
    updateMaFormAttachmentPreview();
}

window.removeMaFormAttachment = removeMaFormAttachment;

// Initialize MA Form Comment Attachments
function initMaFormCommentAttachments() {
    const attachBtn = document.getElementById("btn-ma-form-attach-file");
    const attachInput = document.getElementById("ma-form-attachment-input");

    if (attachBtn && attachInput) {
        attachBtn.onclick = () => attachInput.click();

        attachInput.onchange = (e) => {
            const files = Array.from(e.target.files);

            // Validate file sizes (25MB limit per file)
            const maxSize = 25 * 1024 * 1024; // 25MB
            const validFiles = [];
            const invalidFiles = [];

            files.forEach(file => {
                if (file.size > maxSize) {
                    invalidFiles.push(file.name);
                } else {
                    validFiles.push(file);
                }
            });

            if (invalidFiles.length > 0) {
                showToast(`ไฟล์เหล่านี้มีขนาดเกิน 25MB: ${invalidFiles.join(', ')}`, 'warning', 5000);
            }

            if (validFiles.length > 0) {
                maFormCommentAttachments.push(...validFiles);
                updateMaFormAttachmentPreview();
            }

            e.target.value = '';
        };
    }
}

// Call init when modal opens
document.addEventListener('DOMContentLoaded', () => {
    initMaFormCommentAttachments();
    initDescriptionAttachments();
    initCustomerSignaturePad();

    // Enforce numeric-only on electrical fields
    document.querySelectorAll('input[name^="voltageL"], input[name^="currentL"], input[name="leakPressure"]').forEach(input => {
        input.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
        });
    });

    // Enforce name-only inputs (Thai/Latin letters, spaces, dots, hyphens)
    document.querySelectorAll('input.name-only').forEach(input => {
        input.addEventListener('input', function () {
            this.value = this.value.replace(/[^\p{L}\p{M}\s\.\-]/gu, '');
        });
    });
    // Apply strict phone formatter to phone inputs (format: 0xx-xxx-xxxx)
    document.querySelectorAll('input.phone-ten').forEach(input => {
        try {
            setupStrictPhoneFormat(input);
        } catch (err) {
            // fallback: allow digits only and limit to 10
            input.addEventListener('input', function () {
                this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
            });
        }
    });
});

// ─── Description Attachment Helpers ──────────────────────────────────────────

let descriptionAttachments = [];

function updateDescriptionAttachmentPreview() {
    const preview = document.getElementById('description-attachments-preview');
    const countSpan = document.getElementById('description-attachment-count');
    if (!preview) return;

    if (descriptionAttachments.length === 0) {
        preview.style.display = 'none';
        preview.innerHTML = '';
        if (countSpan) {
            countSpan.textContent = 'ไม่ได้เลือกไฟล์';
        }
        return;
    }

    // Update count display
    if (countSpan) {
        countSpan.textContent = `เลือกแล้ว ${descriptionAttachments.length} ไฟล์`;
    }

    preview.setAttribute('data-count', descriptionAttachments.length);
    preview.style.display = 'flex';
    preview.innerHTML = '';

    descriptionAttachments.forEach((file, index) => {
        const isImage = (file.type && file.type.startsWith('image/')) || (file.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name));
        const isExisting = file.isExisting || file.url;

        // Create card container
        const card = document.createElement('div');
        card.className = isExisting ? 'existing-item' : 'pending-item';
        card.style.cssText = 'position: relative; display: flex; flex-direction: column; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); transition: transform 0.2s; flex-shrink: 0; width: 100px; height: 100px;';
        card.onmouseover = () => (card.style.transform = 'scale(1.02)');
        card.onmouseout = () => (card.style.transform = 'scale(1)');

        // Thumbnail/Icon container
        const thumbContainer = document.createElement('div');
        thumbContainer.style.cssText = 'position: relative; width: 100px; height: 60px; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;';

        const thumbContent = document.createElement('div');
        thumbContent.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;';

        if (isImage) {
            let url = '';
            if (isExisting) {
                url = file.url;
            } else {
                url = URL.createObjectURL(file);
            }
            const img = document.createElement('img');
            img.src = url;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            if (url && !isExisting) {
                img.onclick = () => window.openImageViewer(url);
                img.style.cursor = 'pointer';
            }
            thumbContent.appendChild(img);
        } else {
            // Show file icon
            const icon = document.createElement('i');
            const fileExt = file.name.split('.').pop().toLowerCase();

            if (file.type === 'application/pdf' || fileExt === 'pdf') {
                icon.className = 'fa-solid fa-file-pdf';
                icon.style.color = '#ef4444';
            } else if (file.type && (file.type.includes('excel') || fileExt === 'xls' || fileExt === 'xlsx')) {
                icon.className = 'fa-solid fa-file-excel';
                icon.style.color = '#10b981';
            } else if (file.type && (file.type.includes('word') || fileExt === 'doc' || fileExt === 'docx')) {
                icon.className = 'fa-solid fa-file-word';
                icon.style.color = '#3b82f6';
            } else {
                icon.className = 'fa-solid fa-file';
                icon.style.color = '#94a3b8';
            }
            icon.style.fontSize = '1.5rem';
            thumbContent.appendChild(icon);
        }

        thumbContainer.appendChild(thumbContent);

        // Remove Button
        const removeBtn = document.createElement('div');
        removeBtn.innerHTML = '&times;';
        removeBtn.style.cssText = 'position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; background: rgba(239, 68, 68, 0.9); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; z-index: 50; box-shadow: 0 2px 4px rgba(0,0,0,0.3);';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeDescriptionAttachment(index);
        };
        thumbContainer.appendChild(removeBtn);

        card.appendChild(thumbContainer);

        // Info section
        const infoContainer = document.createElement('div');
        infoContainer.style.cssText = 'padding: 4px 6px; display: flex; flex-direction: column; gap: 2px; background: rgba(255,255,255,0.03); flex: 1; overflow: hidden;';

        const nameSpan = document.createElement('div');
        nameSpan.textContent = file.name;
        nameSpan.title = file.name;
        nameSpan.style.cssText = 'font-size: 0.65rem; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;';

        const sizeSpan = document.createElement('div');
        const bytes = file.size || 0;
        let sizeText = '';
        if (bytes < 1024) {
            sizeText = bytes + ' B';
        } else if (bytes < 1024 * 1024) {
            sizeText = (bytes / 1024).toFixed(1) + ' KB';
        } else {
            sizeText = (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
        sizeSpan.textContent = sizeText;
        sizeSpan.style.cssText = 'font-size: 0.6rem; color: var(--text-muted);';

        infoContainer.appendChild(nameSpan);
        if (sizeText) {
            infoContainer.appendChild(sizeSpan);
        }

        card.appendChild(infoContainer);
        preview.appendChild(card);
    });
}

function removeDescriptionAttachment(index) {
    descriptionAttachments.splice(index, 1);
    updateDescriptionAttachmentPreview();
}

function initDescriptionAttachments() {
    const btn = document.getElementById('btn-attach-description');
    const input = document.getElementById('description-attachment-input');

    if (btn && input) {
        btn.onclick = () => input.click();

        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024); // 10MB limit
                if (validFiles.length < files.length) {
                    showToast('บางไฟล์มีขนาดเกิน 10MB และถูกข้าม', 'warning');
                }
                descriptionAttachments.push(...validFiles);
                updateDescriptionAttachmentPreview();
            }
            e.target.value = '';
        };
    }
}

window.removeDescriptionAttachment = removeDescriptionAttachment;

// ─────────────────────────────────────────────────────────────────────────────

function renderStatusTimeline(currentStatus, logId, statusHistory = {}) {
    const timeline = document.getElementById('status-timeline');
    if (!timeline) return;

    const statuses = [
        { value: 'Open', label: 'เปิดงาน', icon: 'fa-folder-open' },
        { value: 'On Process', label: 'ดำเนินการ', icon: 'fa-gear' },
        { value: 'Done', label: 'เสร็จสิ้น', icon: 'fa-circle-check' },
        { value: 'Case Closed', label: 'ปิดเคส', icon: 'fa-lock', adminOnly: true },
        { value: 'Cancel', label: 'ยกเลิก', icon: 'fa-circle-xmark' }
    ];

    const currentIndex = statuses.findIndex(s => s.value === currentStatus);
    const isCancelled = currentStatus === 'Cancel';

    timeline.innerHTML = statuses.map((status, index) => {
        let stepClass = 'status-step';

        if (isCancelled) {
            // If cancelled, show all steps as cancelled
            stepClass += ' cancelled';
            if (status.value === 'Cancel') {
                stepClass += ' active';
            }
        } else if (index < currentIndex) {
            stepClass += ' completed';
        } else if (index === currentIndex) {
            stepClass += ' active';
        }

        // Check if this status is admin-only
        const isAdminOnly = status.adminOnly || false;
        const clickHandler = isAdminOnly ? `checkAdminAndUpdateStatus('${logId}', '${status.value}')` : `updateLogStatus('${logId}', '${status.value}')`;

        // Format timestamp if exists, otherwise show waiting text
        let timestampHtml = '';
        if (statusHistory[status.value]) {
            const date = new Date(statusHistory[status.value]);
            const formattedTime = date.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            timestampHtml = `<div class="status-timestamp">${formattedTime}</div>`;
        } else {
            // Show waiting text for statuses that haven't been reached yet
            timestampHtml = `<div class="status-timestamp status-waiting">No update</div>`;
        }

        return `
            <div class="${stepClass}" onclick="${clickHandler}">
                ${index < statuses.length - 1 ? '<div class="status-line"></div>' : ''}
                <div class="status-dot">
                    <i class="fa-solid ${status.icon}"></i>
                </div>
                <div class="status-label">${status.label}${isAdminOnly ? ' <i class="fa-solid fa-lock" style="font-size: 0.6rem; opacity: 0.5;"></i>' : ''}</div>
                ${timestampHtml}
            </div>
        `;
    }).join('');
}

async function checkAdminAndUpdateStatus(logId, newStatus) {
    try {
        const user = auth.currentUser;
        if (!user) {
            showToast('กรุณาเข้าสู่ระบบ', 'error');
            return;
        }

        // Check if user is admin or manager
        const userDoc = await FirestoreService.getUser(user.uid);
        const isAdminOrManager = userDoc?.role === 'admin' || userDoc?.role === 'manager';

        if (!isAdminOrManager) {
            showToast('เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถปิดเคสได้', 'error');
            return;
        }

        // If admin or manager, proceed with status update
        await updateLogStatus(logId, newStatus);
    } catch (error) {
        console.error('Error checking admin/manager status:', error);
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}

// --- Signature Pad Logic ---
let signaturePad = null;
let pendingStatusChange = null;

function initSignatureCanvas() {
    if (signaturePad) return;
    const canvas = document.getElementById("signature-canvas");
    if (!canvas) return;
    signaturePad = new SignaturePad(canvas, {
        minWidth: 0.5,
        maxWidth: 2.5,
        penColor: "#000",
        backgroundColor: "rgba(0,0,0,0)"
    });
    // Handle canvas resize
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear();
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
}

function clearSignatureCanvas() {
    if (signaturePad) signaturePad.clear();
}



function openSignatureModal(logId, newStatus) {
    pendingStatusChange = { logId, newStatus };
    window._profileSignatureMode = false;
    const modal = document.getElementById("modal-signature");
    if (modal) {
        modal.classList.remove("hidden");
        modal.style.display = "flex";
    }
    // Show contact fields for status change, hide for profile
    const contactFields = document.getElementById("signature-contact-fields");
    if (contactFields) contactFields.style.display = "block";

    const nameInput = document.getElementById("signature-name");
    const telInput = document.getElementById("signature-tel");
    const posInput = document.getElementById("signature-position");

    // Prefill signature contact fields from the edit form or existing log values.
    const formCustomerName = document.querySelector('input[name="customerName"]')?.value.trim();
    const formCustomerPhone = document.querySelector('input[name="customerPhone"]')?.value.trim();
    const formCustomerPosition = document.querySelector('input[name="customerPosition"]')?.value.trim();
    const log = state.logs.find((l) => l.id === logId);
    const existingName = formCustomerName || log?.customerName || '';
    const existingPhone = formCustomerPhone || log?.customerPhone || '';
    const existingPosition = formCustomerPosition || log?.customerPosition || '';

    if (nameInput) nameInput.value = existingName;
    if (telInput) telInput.value = existingPhone;
    if (posInput) posInput.value = existingPosition;

    setTimeout(() => {
        if (!signaturePad) { initSignatureCanvas(); } else {
            const canvas = document.getElementById("signature-canvas");
            if (canvas) {
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * ratio;
                canvas.height = rect.height * ratio;
                canvas.getContext("2d").scale(ratio, ratio);
            }
            signaturePad.clear();
        }
    }, 50);
}

function closeSignatureModal() {
    const modal = document.getElementById("modal-signature");
    if (modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
    }
    pendingStatusChange = null;
    window._profileSignatureMode = false;
}

function getSignatureDataUrl() {
    if (!signaturePad) return null;
    // Create white background JPG, guard against zero-dimension canvas
    const canvas = document.getElementById("signature-canvas");
    if (!canvas) return null;
    if (!canvas.width || !canvas.height) {
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const w = Math.round(rect.width * ratio) || 0;
        const h = Math.round(rect.height * ratio) || 0;
        if (w > 0 && h > 0) {
            try {
                canvas.width = w;
                canvas.height = h;
                const cctx = canvas.getContext('2d');
                if (cctx) cctx.scale(ratio, ratio);
            } catch (err) {
                console.warn('Failed to resize signature canvas:', err);
            }
        } else {
            return null;
        }
    }
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    try {
        ctx.drawImage(canvas, 0, 0);
    } catch (err) {
        console.warn('Failed to draw signature canvas to tmp canvas:', err);
        return null;
    }
    return tempCanvas.toDataURL("image/jpeg", 0.8);
}

async function confirmSignature() {
    if (!signaturePad || signaturePad.isEmpty()) {
        showToast("กรุณาลงลายเซ็นก่อนยืนยัน", "error");
        return;
    }

    const signatureData = getSignatureDataUrl();
    const isProfileMode = !!window._profileSignatureMode;
    const pending = pendingStatusChange;

    // Validate contact fields for status change mode
    let signerName = '';
    let signerTel = '';
    let signerPosition = '';
    if (!isProfileMode) {
        signerName = (document.getElementById("signature-name")?.value || '').trim();
        signerTel = (document.getElementById("signature-tel")?.value || '').trim();
        signerPosition = (document.getElementById("signature-position")?.value || '').trim();
        if (!signerName || !signerTel) {
            showToast("กรุณากรอกชื่อและเบอร์โทรให้ครบ", "error");
            return;
        }
    }

    closeSignatureModal();

    if (isProfileMode) {
        await saveProfileSignature(signatureData);
        return;
    }

    if (!pending) return;
    await executeStatusUpdate(pending.logId, pending.newStatus, signatureData, signerName, signerTel, signerPosition);
}

window.openSignatureModal = openSignatureModal;
window.closeSignatureModal = closeSignatureModal;
window.clearSignatureCanvas = clearSignatureCanvas;
window.confirmSignature = confirmSignature;

async function updateLogStatus(logId, newStatus) {
    if (newStatus === 'Case Closed') {
        const log = state.logs.find(l => l.id === logId);
        if (log) {
            const hasPassedDone = log.status === 'Done' ||
                log.status === 'Completed' ||
                log.status === 'Case Closed' ||
                (log.statusHistory && (log.statusHistory.Done || log.statusHistory.Completed || log.statusHistory['Case Closed']));
            if (!hasPassedDone) {
                // Close details modal first so dialog appears cleanly
                const detailsModal = document.getElementById('modal-log-details');
                if (detailsModal) {
                    detailsModal.classList.add('hidden');
                    detailsModal.style.display = 'none';
                }
                await showDialog('ไม่สามารถเปลี่ยนสถานะเป็น "ปิดเคส" ได้ เนื่องจากเคสนี้ยังไม่ผ่านสถานะ "เสร็จสิ้น"', {
                    title: 'สถานะไม่ถูกต้อง',
                    icon: 'warning'
                });
                return;
            }
        }
    }

    if (newStatus === 'Done') {
        var log = state.logs.find(function (l) { return l.id === logId; });
        const missing = getIncompleteDoneFields(log);
        if (missing.length > 0) {
            // Close details modal first so dialog appears cleanly on top
            const detailsModal = document.getElementById('modal-log-details');
            if (detailsModal) {
                detailsModal.classList.add('hidden');
                detailsModal.style.display = 'none';
            }
            await showDialog(
                'ไม่สามารถเปลี่ยนสถานะเป็น "เสร็จสิ้น" ได้ เนื่องจากข้อมูลยังไม่ครบถ้วน',
                { title: 'ข้อมูลไม่ครบถ้วน', icon: 'warning' }
            );
            editLog(logId);
            setTimeout(() => {
                const form = document.getElementById("form-log-maintenance");
                if (form) {
                    highlightIncompleteFields(form, getIncompleteDoneFieldKeys(log));
                }
            }, 300);
            return;
        }

        if (log) {
            const useESignature = log.useESignature ?? false;
            if (useESignature) {
                if (!log.customerName || !log.customerPhone || !log.customerSignature) {
                    openSignatureModal(logId, newStatus);
                    return;
                }
            } else {
                const hasSignedDocs = log.signedDocAttachments && log.signedDocAttachments.length > 0;
                if (!hasSignedDocs) {
                    // Close details modal first so dialog appears cleanly
                    const detailsModal2 = document.getElementById('modal-log-details');
                    if (detailsModal2) {
                        detailsModal2.classList.add('hidden');
                        detailsModal2.style.display = 'none';
                    }
                    await showDialog(
                        'กรุณาอัปโหลดสำเนาเอกสารที่เซ็นแล้วก่อนเปลี่ยนสถานะเป็น "เสร็จสิ้น"',
                        { title: 'เอกสารไม่ครบถ้วน', icon: 'warning' }
                    );
                    editLog(logId);
                    return;
                }
            }
        }
    }

    let cancelReason = null;
    if (newStatus === 'Cancel') {
        const detailsModal = document.getElementById('modal-log-details');
        if (detailsModal) {
            detailsModal.classList.add('hidden');
            detailsModal.style.display = 'none';
        }
        cancelReason = await showCancelReasonDialog();
        if (cancelReason === null) {
            if (detailsModal) {
                detailsModal.classList.remove('hidden');
                detailsModal.style.display = '';
            }
            return;
        }
    }

    if (newStatus === 'Cancel' || newStatus === 'Case Closed') {
        if (!await requireAdminManagerProfileSignature(newStatus)) return;
    }

    await executeStatusUpdate(logId, newStatus, null, '', '', '', cancelReason);
}

async function executeStatusUpdate(logId, newStatus, signatureData, signerName = '', signerTel = '', signerPosition = '', cancelReason = null) {
    try {
        const log = state.logs.find(l => l.id === logId);
        if (!log) return;

        const oldStatus = log.status;

        // Initialize status history if it doesn't exist
        if (!log.statusHistory) {
            log.statusHistory = {};
        }

        // Define status order (excluding Cancel as it's a separate branch)
        const statusOrder = ['Open', 'On Process', 'Done', 'Case Closed'];
        const oldIndex = statusOrder.indexOf(oldStatus);
        const newIndex = statusOrder.indexOf(newStatus);

        const timestamp = new Date().toISOString();

        // If moving from Cancel to any other status, remove Cancel and forward timestamps
        if (oldStatus === 'Cancel' && newStatus !== 'Cancel') {
            delete log.statusHistory['Cancel'];
            // Remove timestamps for all statuses after the new status
            for (let i = newIndex + 1; i < statusOrder.length; i++) {
                delete log.statusHistory[statusOrder[i]];
            }
            // Set timestamp for the new status
            log.statusHistory[newStatus] = timestamp;
        }
        // If moving to Cancel, fill in all previous statuses that don't have timestamps
        else if (newStatus === 'Cancel') {
            // Fill in timestamps for all statuses before Cancel that don't have timestamps
            for (let i = 0; i < statusOrder.length; i++) {
                if (!log.statusHistory[statusOrder[i]]) {
                    log.statusHistory[statusOrder[i]] = timestamp;
                }
            }
            log.statusHistory['Cancel'] = timestamp;
        }
        // If moving forward and skipping statuses, fill in the gaps
        else if (newIndex > oldIndex && newIndex !== -1 && oldIndex !== -1) {
            // Fill in timestamps for all skipped statuses
            for (let i = oldIndex + 1; i <= newIndex; i++) {
                if (!log.statusHistory[statusOrder[i]]) {
                    log.statusHistory[statusOrder[i]] = timestamp;
                }
            }
        }
        // If moving backward, remove timestamps for all forward statuses
        else if (newIndex < oldIndex && newIndex !== -1 && oldIndex !== -1) {
            // Remove timestamps for statuses after the new status
            for (let i = newIndex + 1; i < statusOrder.length; i++) {
                delete log.statusHistory[statusOrder[i]];
            }
            // Also remove Cancel if moving backward
            delete log.statusHistory['Cancel'];
            // Set timestamp for the new status
            log.statusHistory[newStatus] = timestamp;
        }
        // Normal update (same status or first time)
        else {
            log.statusHistory[newStatus] = timestamp;
        }

        // Store signature with the status change
        if (signatureData) {
            if (!log.statusSignatures) log.statusSignatures = {};
            log.statusSignatures[newStatus] = {
                data: signatureData,
                timestamp: timestamp,
                signedBy: auth.currentUser?.displayName || auth.currentUser?.email || "Unknown",
                signerName: signerName,
                signerTel: signerTel,
                signerPosition: signerPosition
            };
        }

        // Update in Firestore with status history and signature
        const updateData = {
            status: newStatus,
            statusHistory: log.statusHistory
        };
        if (signatureData) {
            updateData.statusSignatures = log.statusSignatures;
            // Sync customer fields when Done signature is provided
            if (newStatus === 'Done') {
                updateData.customerSignature = signatureData;
                if (signerName) updateData.customerName = signerName;
                if (signerTel) updateData.customerPhone = signerTel;
                if (signerPosition) updateData.customerPosition = signerPosition;
                // Also update local state
                log.customerSignature = signatureData;
                if (signerName) log.customerName = signerName;
                if (signerTel) log.customerPhone = signerTel;
                if (signerPosition) log.customerPosition = signerPosition;
            }
        }
        await FirestoreService.updateLog(logId, updateData);

        log.status = newStatus;
        renderStatusTimeline(newStatus, logId, log.statusHistory);

        // Add change log comment for status change
        const statusLabels = {
            'Open': 'เปิดงาน',
            'On Process': 'กำลังดำเนินการ',
            'Done': 'เสร็จสิ้น',
            'Case Closed': 'ปิดเคส',
            'Cancel': 'ยกเลิก'
        };

        const user = auth.currentUser;
        if (user && oldStatus !== newStatus) {
            const oldStatusLabel = statusLabels[oldStatus] || oldStatus;
            const newStatusLabel = statusLabels[newStatus] || newStatus;

            let changeText = `• สถานะ: ${oldStatusLabel} → ${newStatusLabel}`;
            if (newStatus === 'Cancel' && cancelReason) {
                changeText += `\n• เหตุผลที่ยกเลิก: ${cancelReason}`;
            }

            const changeLogComment = {
                text: changeText,
                author: user.displayName || user.email || 'ผู้ใช้',
                authorId: user.uid,
                photoURL: user.photoURL || '',
                timestamp: new Date().toISOString(),
                attachments: signatureData ? [{ url: signatureData, name: 'ลายเซ็น.jpg', type: 'image/jpeg' }] : [],
                isSystemLog: true
            };

            const existingComments = log.comments || [];
            const updatedComments = [...existingComments, changeLogComment];

            try {
                await FirestoreService.updateLog(logId, { comments: updatedComments });
                log.comments = updatedComments;
                console.log('[Timeline Status Change] Added change log comment');
            } catch (error) {
                console.error('[Timeline Status Change] Error adding change log:', error);
            }
        }

        // Refresh calendar if in calendar view
        const calendarView = document.getElementById("logs-calendar-view");
        if (calendarView && !calendarView.classList.contains("hidden")) {
            await fetchAndRenderCalendar();

            // Also refresh the detail panel if a date is selected
            if (calendarState.selectedDate) {
                const logsForDay = state.logs.filter(l => l.date === calendarState.selectedDate);
                if (logsForDay.length > 0) {
                    showDayDetails(calendarState.selectedDate, logsForDay);
                }
            }
        } else {
            renderCurrentView();
        }

        showToast('อัปเดตสถานะสำเร็จ', 'success');

        // Auto-create next maintenance case when a MA case is closed or cancelled
        if (
            (newStatus === 'Case Closed' || newStatus === 'Done' || newStatus === 'Cancel') &&
            isMaCategory(log.category) &&
            log.siteId
        ) {
            // Small delay so Firestore has settled before we query state
            setTimeout(async () => {
                try {
                    await refreshData(); // Sync state first
                    const created = await checkAndAutoCreateMaintenanceCase(log.siteId);
                    if (created) await refreshData(); // Reload to show new case
                } catch (autoMaErr) {
                    console.warn('[AutoMA] Check after status update failed:', autoMaErr);
                }
            }, 800);
        }

    } catch (error) {
        console.error('Error updating status:', error);
        showToast('ไม่สามารถอัปเดตสถานะได้', 'error');
    }
}

window.checkAdminAndUpdateStatus = checkAdminAndUpdateStatus;
window.updateLogStatus = updateLogStatus;

// ─────────────────────────────────────────────────────────────────────────────

function viewLogDetails(id) {
    try {
        const log = state.logs.find((l) => l.id === id);
        if (!log) return;

        // Reset Cost section to collapsed by default
        const costContent = document.getElementById("cost-section-content");
        const costIcon = document.getElementById("cost-collapse-icon");
        if (costContent) costContent.style.display = "none";
        if (costIcon) costIcon.style.transform = "";

        // Refresh users data to ensure we have latest profile info for comments
        FirestoreService.fetchUsers().then((users) => {
            state.users = users;
            console.log('[viewLogDetails] Refreshed users data:', Object.keys(users).length, 'users');
            // Re-render comments with updated user data
            try {
                renderLogComments(log.id, log.comments || []);
            } catch (innerErr) {
                console.error("Failed to render comments after fetch:", innerErr);
            }
        }).catch(err => {
            console.warn("Failed to refresh users for comments:", err);
        });

        const site = state.sites.find((s) => s.id === log.siteId) || {
            name: "ไม่พบข้อมูลสถานที่",
        };

        // Resolve dynamic user name
        const recorderName = log.updatedBy ||
            (state.users && log.recorderId && state.users[log.recorderId]
                ? state.users[log.recorderId].displayName ||
                state.users[log.recorderId].email ||
                log.recordedBy
                : log.recordedBy || "-");

        const thaiDate = formatDateTimeDDMMYYYY(log.date);

        const timestampStr = log.timestamp
            ? new Date(log.timestamp).toLocaleString(undefined)
            : "-";

        // Populate Modal
        const caseIdEl = document.getElementById("detail-log-case-id");
        if (caseIdEl) {
            caseIdEl.textContent = log.caseId || "-";
        }

        // Header: case ID
        const headerCaseIdEl = document.getElementById("detail-log-header-case-id");
        if (headerCaseIdEl) {
            headerCaseIdEl.textContent = log.caseId || "";
        }

        // Date field (in job info grid)
        const dateFieldEl = document.getElementById("detail-log-date-field");
        if (dateFieldEl) {
            dateFieldEl.textContent = thaiDate;
        }

        const siteEl = document.getElementById("detail-log-site");
        if (siteEl) {
            siteEl.textContent = site.name;
        }

        // Device Banner in header (replaces old text title)
        const bannerContainer = document.getElementById("detail-log-banner-container");
        if (bannerContainer) {
            const actionsHTML = `
            <button onclick="exportCasePDF('${log.id}')" title="ส่งออก PDF"
                style="display:inline-flex; align-items:center; gap:6px; padding:0 14px; height:36px; background:#ffffff; color:#111111; border:1.5px solid #111111; border-radius:10px; font-size:0.82rem; font-weight:600; cursor:pointer; transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); white-space:nowrap; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);"
                onmouseover="this.style.background='#111111';this.style.color='#ffffff';this.style.transform='scale(1.03)';" 
                onmouseout="this.style.background='#ffffff';this.style.color='#111111';this.style.transform='none';">
                <i class="fa-solid fa-file-pdf"></i> PDF
            </button>
            <button id="detail-log-edit-btn" onclick="checkEditPermission('${log.id}', '${log.status}')" title="แก้ไข"
                style="display:inline-flex; align-items:center; gap:6px; padding:0 14px; height:36px; background:#ffffff; color:#111111; border:1.5px solid #111111; border-radius:10px; font-size:0.82rem; font-weight:600; cursor:pointer; transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); white-space:nowrap; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);"
                onmouseover="this.style.background='#111111';this.style.color='#ffffff';this.style.transform='scale(1.03)';" 
                onmouseout="this.style.background='#ffffff';this.style.color='#111111';this.style.transform='none';">
                <i class="fa-solid fa-pen-to-square"></i> แก้ไข
            </button>
        `;
            bannerContainer.innerHTML = createDeviceBannerHTML(site, log.caseId, actionsHTML);
            bannerContainer.style.cursor = 'default';
            bannerContainer.onclick = null;
        }

        // Responder
        const responderEl = document.getElementById("detail-log-responder");
        if (responderEl) {
            const rUser = log.responderId && state.users ? state.users[log.responderId] : null;
            responderEl.textContent = rUser ? (rUser.displayName || rUser.email || '-') : '-';
        }

        // Category
        const categoryEl = document.getElementById("detail-log-category");
        if (categoryEl) {
            categoryEl.textContent = log.category || "-";
        }

        // Device info from site
        const warrantyEl = document.getElementById("detail-log-warranty");
        if (warrantyEl) {
            if (site.insuranceStartDate && site.insuranceEndDate) {
                warrantyEl.textContent = `${site.insuranceStartDate} ~ ${site.insuranceEndDate}`;
            } else {
                warrantyEl.textContent = "-";
            }
        }
        const deviceTypeEl = document.getElementById("detail-log-device-type");
        if (deviceTypeEl) deviceTypeEl.textContent = site.deviceType || "-";

        const brandModelEl = document.getElementById("detail-log-brand-model");
        if (brandModelEl) brandModelEl.textContent = [site.brand, site.model].filter(Boolean).join(" / ") || "-";

        const serialEl = document.getElementById("detail-log-serial");
        if (serialEl) serialEl.textContent = site.serialNumber || "-";

        const installLocEl = document.getElementById("detail-log-install-loc");
        if (installLocEl) installLocEl.textContent = site.installLocation || site.villageName || "-";

        const provinceEl = document.getElementById("detail-log-province");
        if (provinceEl) provinceEl.textContent = site.province || "-";

        const maCycleEl = document.getElementById("detail-log-ma-cycle");
        if (maCycleEl) maCycleEl.textContent = site.maintenanceCycle ? `${site.maintenanceCycle} วัน` : "-";

        const cycleCountEl = document.getElementById("detail-log-cycle-count");
        if (cycleCountEl) cycleCountEl.textContent = log.cycleCount ? `${Number(log.cycleCount).toLocaleString()} รอบ` : "-";

        const dateFieldEl2 = document.getElementById("detail-log-date-field");
        if (dateFieldEl2) dateFieldEl2.textContent = thaiDate;

        const statusTextEl = document.getElementById("detail-log-status-text");
        if (statusTextEl) {
            const statusLabels = { 'Open': 'เปิด', 'On Process': 'ดำเนินการ', 'Done': 'เสร็จสิ้น', 'Case Closed': 'ปิดเคส', 'Cancel': 'ยกเลิก' };
            statusTextEl.textContent = statusLabels[log.status] || log.status || "-";
        }

        // Objective/Description
        const objectiveWrap = document.getElementById("detail-log-objective-wrap");
        const objectiveEl = document.getElementById("detail-log-objective");
        if (objectiveWrap && objectiveEl) {
            if (log.objective) {
                objectiveWrap.style.display = "block";
                objectiveEl.textContent = log.objective;
            } else {
                objectiveWrap.style.display = "none";
            }
        }

        // Render Attachments — split into all 4 sections
        const attachSection = document.getElementById("detail-attachments-section");
        const attachContent = document.getElementById("detail-attachments-content");

        const _isInstallLog = log.category === 'ติดตั้ง' || log.category === 'รื้อถอน';
        const attachmentsBefore = log.attachmentsBefore || [];
        const attachmentsAfter = log.attachmentsAfter || [];
        const descriptionAttachments = [
            ...(log.descriptionAttachments || []),
            ...(log.attachments || []),
        ];
        // For install/remove cases, installPhotos and preInstallPhotos are shown
        // in their own dedicated section — exclude them from the general section
        const repairPhotos = _isInstallLog
            ? []
            : [
                ...(log.repairPhotos || []),
                ...(log.installPhotos || []),
                ...(log.preInstallPhotos || []),
            ];
        const totalAttachments = descriptionAttachments.length + repairPhotos.length;

        if (attachSection && attachContent) {
            if (totalAttachments > 0) {
                attachSection.style.display = "block";

                const renderGroup = (label, icon, items) => {
                    if (!items.length) return '';
                    const thumbs = items.map(att => {
                        const url = att.url || att;
                        const isVideo = (att.type && att.type.startsWith('video/')) || (typeof url === 'string' && url.includes('.mp4'));
                        if (isVideo) {
                            return `<div style="width:110px; height:82px; border-radius:8px; overflow:hidden; border:1px solid rgba(0,0,0,0.1); cursor:pointer; background:#000; position:relative; flex-shrink:0;" onclick="window.openImageViewer('${url}', 'video')">
                            <video src="${url}" style="width:100%; height:100%; object-fit:cover;"></video>
                            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#fff; font-size:1.5rem;"><i class="fa-solid fa-play"></i></div>
                        </div>`;
                        }
                        return `<div style="width:110px; height:82px; border-radius:8px; overflow:hidden; border:1px solid rgba(0,0,0,0.1); cursor:pointer; flex-shrink:0;" onclick="window.openImageViewer('${url}')">
                        <img src="${url}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
                    </div>`;
                    }).join('');
                    return `<div style="margin-bottom:0.85rem;">
                    <div style="font-size:0.78rem; font-weight:600; color:#555; margin-bottom:0.4rem; display:flex; align-items:center; gap:0.35rem;">
                        <i class="${icon}" style="font-size:0.7rem; opacity:0.7;"></i>${label} <span style="font-weight:400; color:#9ca3af;">(${items.length})</span>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">${thumbs}</div>
                </div>`;
                };

                attachContent.innerHTML =
                    renderGroup('ไฟล์ประกอบคำอธิบายงาน', 'fa-solid fa-file-lines', descriptionAttachments) +
                    renderGroup('รูปหลังซ่อม', 'fa-solid fa-camera', repairPhotos);
            } else {
                attachSection.style.display = "none";
            }
        }


        // Render Status Timeline
        // Initialize status history if it doesn't exist (for old logs)
        if (!log.statusHistory && log.status) {
            log.statusHistory = {
                [log.status]: log.timestamp || new Date().toISOString()
            };
        }
        renderStatusTimeline(log.status, log.id, log.statusHistory || {});

        // Cost (total of lineItems, or legacy)
        const totalCost =
            Array.isArray(log.lineItems) && log.lineItems.length > 0
                ? log.lineItems.reduce((s, li) => s + (li.cost || 0), 0)
                : log.cost || 0;
        const costEl = document.getElementById("detail-log-cost");
        if (costEl) {
            costEl.textContent = new Intl.NumberFormat(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(totalCost) + " บาท";
        }

        // Details as line-items table
        const detailsEl = document.getElementById("detail-log-details");
        if (detailsEl) {
            if (Array.isArray(log.lineItems) && log.lineItems.length > 0) {
                const fmt = (v) =>
                    new Intl.NumberFormat(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    }).format(v || 0) + " บาท";
                const rows = log.lineItems
                    .map(
                        (li, i) => `
                <tr>
                    <td style="padding:0.35rem 0.5rem; color:var(--text-color);">${i + 1}. ${li.item || "-"}</td>
                    <td style="padding:0.35rem 0.5rem; text-align:right; white-space:nowrap; font-weight:500;">${fmt(li.cost)}</td>
                </tr>`,
                    )
                    .join("");
                detailsEl.innerHTML = `
                <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                    <thead>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                            <th style="padding:0.35rem 0.5rem; text-align:left; color:var(--text-muted); font-weight:500;">\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23</th>
                            <th style="padding:0.35rem 0.5rem; text-align:right; color:var(--text-muted); font-weight:500;">\u0e23\u0e32\u0e04\u0e32</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>`;
            } else {
                detailsEl.textContent = log.details || "-";
            }
        }

        // Comments
        renderLogComments(log.id, log.comments || []);

        // Electrical & Physical Inspection - only for บำรุงรักษาตามรอบ
        const inspSection = document.getElementById("detail-inspection-section");
        const inspContent = document.getElementById("detail-inspection-content");
        const isMaLog = isMaCategory(log.category);
        const isInstallLog = log.category === 'ติดตั้ง' || log.category === 'รื้อถอน';

        if (inspSection) inspSection.style.display = isMaLog ? "block" : "none";
        if (inspSection && inspContent && isMaLog) {
            const inspItems = [
                ['insp_exteriorCleaning', '1. ความสะอาดภายนอก'],
                ['insp_interiorCleaning', '2. ความสะอาดภายใน'],
                ['insp_doorSystem', '3. การทำงานระบบประตู'],
                ['insp_footSwitch', '4. การทำงาน Foot Switch'],
                ['insp_sensor', '5. ระบบ Sensor'],
                ['insp_tempPoints', '6. อุณหภูมิจุดที่ 1-4'],
                ['insp_workingPressure', '7. ความดันขณะทำงาน'],
                ['insp_rfGenerator', '8. RF Generator'],
                ['insp_chemicalAmount', '9. ปริมาณน้ำยาที่ฉีด'],
                ['insp_airChargingValue', '10. Air Charging Valve'],
                ['insp_filter', '11. Filter'],
                ['insp_decomposer', '12. Decomposor'],
                ['insp_vacuumPumpOil', '13. น้ำมันปั้มสุญากาศ'],
                ['insp_connectors', '14. ระบบข้อต่อต่างๆ'],
                ['insp_drainTank', '15. ถังเดรนน้ำ'],
                ['insp_chemicalLine', '16. สายส่งน้ำยา'],
                ['insp_phaseRelay', '17. รีเลย์ควบคุมลำดับเฟส'],
                ['insp_systemRelay', '18. รีเลย์ควบคุมระบบต่างๆ'],
            ];

            const row = (label, value) => `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.88rem; color:#333;">${label}</span><span style="font-size:0.88rem; font-weight:500; color:#111;">${value}</span></div>`;

            const pillBadge = (val, passLabel = 'ผ่าน', failLabel = 'ไม่ผ่าน') => {
                if (!val) return `<span style="color:#ccc;">-</span>`;
                const isPass = val === 'pass';
                const bg = isPass ? '#22c55e' : '#ef4444';
                const text = isPass ? passLabel : failLabel;
                return `<span class="detail-pill" style="background:${bg};">${text}</span>`;
            };

            const inspBadge = (val) => {
                if (!val) return `<span style="color:#ccc;">-</span>`;
                const config = { check: { full: 'Check', short: 'C', bg: '#22c55e' }, service: { full: 'Service', short: 'S', bg: '#f59e0b' }, replace: { full: 'Replace', short: 'R', bg: '#ef4444' } };
                const valStr = String(val);
                const c = config[valStr] || { full: valStr, short: valStr.charAt(0), bg: '#111' };
                return `<span class="detail-pill" style="background:${c.bg};"><span class="insp-full">${c.full}</span><span class="insp-short">${c.short}</span></span>`;
            };

            let html = '';

            // Electrical section header
            let flashCount = 0;
            if (String(log.voltageL1 || '').trim() !== '' && String(log.currentL1 || '').trim() !== '') flashCount++;
            if (String(log.voltageL2 || '').trim() !== '' && String(log.currentL2 || '').trim() !== '') flashCount++;
            if (String(log.voltageL3 || '').trim() !== '' && String(log.currentL3 || '').trim() !== '') flashCount++;
            const flashText = flashCount > 0 ? ` (${flashCount} Flash)` : '';
            html += `<div style="margin:0.75rem 0 0.25rem; font-weight:600; font-size:0.9rem; color:var(--text-muted); display:flex; align-items:center; gap:0.5rem;"><i class="fa-solid fa-bolt" style="color:#111111;"></i> ข้อมูลไฟฟ้า (Electrical)${flashText}</div>`;
            html += `<div style="border:1px solid rgba(0,0,0,0.08); border-radius:6px; overflow:hidden;">`;
            html += `<div style="padding:0.5rem 0.75rem; border-bottom:1px solid rgba(0,0,0,0.06);">`;
            html += `<div style="font-weight:500; font-size:0.88rem; margin-bottom:0.5rem;">แรงดันไฟฟ้า</div>`;
            html += `<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.5rem;">`;
            html += `<div style="background:#f8f9fa; padding:0.5rem; border-radius:6px; text-align:center;"><div style="font-size:0.75rem; color:#666; font-weight:600; margin-bottom:0.25rem;">R</div><div style="font-size:0.85rem; font-weight:500;">${log.voltageL1 || '___'} V</div><div style="font-size:0.65rem; color:#888; margin-top:0.25rem;">(Load/Unload)</div></div>`;
            html += `<div style="background:#f8f9fa; padding:0.5rem; border-radius:6px; text-align:center;"><div style="font-size:0.75rem; color:#666; font-weight:600; margin-bottom:0.25rem;">S</div><div style="font-size:0.85rem; font-weight:500;">${log.voltageL2 || '___'} V</div><div style="font-size:0.65rem; color:#888; margin-top:0.25rem;">(Load/Unload)</div></div>`;
            html += `<div style="background:#f8f9fa; padding:0.5rem; border-radius:6px; text-align:center;"><div style="font-size:0.75rem; color:#666; font-weight:600; margin-bottom:0.25rem;">T</div><div style="font-size:0.85rem; font-weight:500;">${log.voltageL3 || '___'} V</div><div style="font-size:0.65rem; color:#888; margin-top:0.25rem;">(Load/Unload)</div></div>`;
            html += `</div></div>`;
            html += `<div style="padding:0.5rem 0.75rem;">`;
            html += `<div style="font-weight:500; font-size:0.88rem; margin-bottom:0.5rem;">กระแส</div>`;
            html += `<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.5rem;">`;
            html += `<div style="background:#f8f9fa; padding:0.5rem; border-radius:6px; text-align:center;"><div style="font-size:0.75rem; color:#666; font-weight:600; margin-bottom:0.25rem;">R</div><div style="font-size:0.85rem; font-weight:500;">${log.currentL1 || '___'} A</div><div style="font-size:0.65rem; color:#888; margin-top:0.25rem;">(Load/Unload)</div></div>`;
            html += `<div style="background:#f8f9fa; padding:0.5rem; border-radius:6px; text-align:center;"><div style="font-size:0.75rem; color:#666; font-weight:600; margin-bottom:0.25rem;">S</div><div style="font-size:0.85rem; font-weight:500;">${log.currentL2 || '___'} A</div><div style="font-size:0.65rem; color:#888; margin-top:0.25rem;">(Load/Unload)</div></div>`;
            html += `<div style="background:#f8f9fa; padding:0.5rem; border-radius:6px; text-align:center;"><div style="font-size:0.75rem; color:#666; font-weight:600; margin-bottom:0.25rem;">T</div><div style="font-size:0.85rem; font-weight:500;">${log.currentL3 || '___'} A</div><div style="font-size:0.65rem; color:#888; margin-top:0.25rem;">(Load/Unload)</div></div>`;
            html += `</div></div>`;
            html += `</div>`;

            // Physical Inspection
            html += `<div style="margin:0.75rem 0 0.25rem; font-weight:600; font-size:0.9rem; color:var(--text-muted); display:flex; align-items:center; gap:0.5rem;"><i class="fa-solid fa-clipboard-check"></i> ตรวจสอบทางกายภาพ (Physical Inspection)</div>`;
            html += `<div style="display:flex; flex-direction:column;">`;
            html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.88rem; color:#333; flex:1;">อุณหภูมิเฉลี่ยในการทำงาน</span><span style="font-size:0.88rem; margin-right:0.75rem;">${log.avgWorkTemp ? log.avgWorkTemp + ' °C' : '-'}</span>${pillBadge(log.avgWorkTempCheck)}</div>`;
            html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.88rem; color:#333; flex:1;">อุณหภูมิเฉลี่ยพื้นที่</span><span style="font-size:0.88rem; margin-right:0.75rem;">${log.avgAreaTemp ? log.avgAreaTemp + ' °C' : '-'}</span>${pillBadge(log.avgAreaTempCheck)}</div>`;
            html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.88rem; color:#333; flex:1;">ตรวจสอบการรั่วไหล</span><span style="font-size:0.88rem; margin-right:0.75rem;">${log.leakPressure ? log.leakPressure + ' PSI' : '-'}</span>${pillBadge(log.leakCheck)}</div>`;
            html += `</div>`;

            // Performance
            html += `<div style="margin:0.75rem 0 0.25rem; font-weight:600; font-size:0.9rem; color:var(--text-muted); display:flex; align-items:center; gap:0.5rem;"><i class="fa-solid fa-gauge-high"></i> ประสิทธิภาพการทำงาน (Performance)</div>`;
            html += `<div style="display:flex; flex-direction:column;">`;
            html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.88rem; color:#333;">ตรวจสอบด้วย Comply Type 5</span>${pillBadge(log.complyType5)}</div>`;
            html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.88rem; color:#333;">ตรวจสอบการทะลุทะลวงด้วย CI PCD Type 5</span>${pillBadge(log.ciPcdType5)}</div>`;
            html += `</div>`;

            // Gas Detection
            const gasValue = (value) => (value !== null && value !== undefined && value !== '') ? value + ' PPM' : '-';
            const hasGasValues = [log.gasDoor1, log.gasDoor2, log.gasDoor3, log.gas1m1, log.gas1m2, log.gas1m3, log.gas2m1, log.gas2m2, log.gas2m3].some(v => v !== null && v !== undefined && v !== '');
            if (hasGasValues) {
                html += `<div style="margin:0.75rem 0 0.25rem; font-weight:600; font-size:0.9rem; color:var(--text-muted); display:flex; align-items:center; gap:0.5rem;"><i class="fa-solid fa-wind"></i> ตรวจสอบปริมาณแก๊ส (Gas Detection)</div>`;
                html += `<table style="width:100%; border-collapse:collapse; border:1px solid rgba(0,0,0,0.08); border-radius:8px; overflow:hidden; font-size:0.88rem; margin-bottom:0.75rem;">`;
                html += `<thead><tr style="background:rgba(0,0,0,0.02);"><th style="padding:0.5rem 0.75rem; text-align:left;">จุดตรวจ</th><th style="padding:0.5rem 0.75rem; text-align:center;">ครั้งที่ 1</th><th style="padding:0.5rem 0.75rem; text-align:center;">ครั้งที่ 2</th><th style="padding:0.5rem 0.75rem; text-align:center;">ครั้งที่ 3</th></tr></thead>`;
                html += `<tbody>`;
                html += `<tr style="border-top:1px solid rgba(0,0,0,0.06);"><td style="padding:0.5rem 0.75rem;">บริเวณหน้าประตู</td><td style="padding:0.5rem 0.75rem; text-align:center;">${gasValue(log.gasDoor1)}</td><td style="padding:0.5rem 0.75rem; text-align:center;">${gasValue(log.gasDoor2)}</td><td style="padding:0.5rem 0.75rem; text-align:center;">${gasValue(log.gasDoor3)}</td></tr>`;
                html += `<tr style="border-top:1px solid rgba(0,0,0,0.06);"><td style="padding:0.5rem 0.75rem;">ระยะห่าง 1 เมตร</td><td style="padding:0.5rem 0.75rem; text-align:center;">${gasValue(log.gas1m1)}</td><td style="padding:0.5rem 0.75rem; text-align:center;">${gasValue(log.gas1m2)}</td><td style="padding:0.5rem 0.75rem; text-align:center;">${gasValue(log.gas1m3)}</td></tr>`;
                html += `<tr style="border-top:1px solid rgba(0,0,0,0.06);"><td style="padding:0.5rem 0.75rem;">ระยะห่าง 2 เมตร</td><td style="padding:0.5rem 0.75rem; text-align:center;">${gasValue(log.gas2m1)}</td><td style="padding:0.5rem 0.75rem; text-align:center;">${gasValue(log.gas2m2)}</td><td style="padding:0.5rem 0.75rem; text-align:center;">${gasValue(log.gas2m3)}</td></tr>`;
                html += `</tbody></table>`;
            }

            // Inspection Checklist
            html += `<div style="margin:0.75rem 0 0.25rem; font-weight:600; font-size:0.9rem; color:var(--text-muted); display:flex; align-items:center; gap:0.5rem;"><i class="fa-solid fa-magnifying-glass-chart"></i> รายการตรวจสอบ (Inspection Checklist)</div>`;
            html += `<div class="insp-checklist-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:0 1.5rem;">`;
            inspItems.forEach(([key, label]) => {
                html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.88rem; color:#333; flex:1;">${label}</span><span style="flex-shrink:0;">${inspBadge(log[key])}</span></div>`;
            });
            html += `</div>`;

            inspContent.innerHTML = html;
        }

        // Install/Uninstall Section - only for ติดตั้ง/รื้อถอน
        const installSection = document.getElementById("detail-install-section");
        const installContent = document.getElementById("detail-install-content");
        if (installSection) installSection.style.display = isInstallLog ? "block" : "none";
        if (installSection && installContent && isInstallLog) {
            const yesNo = (val) => {
                if (!val) return '<span style="color:#ccc;">-</span>';
                const isYes = val === 'yes';
                return `<span class="detail-pill" style="background:${isYes ? '#22c55e' : '#ef4444'};">${isYes ? 'ใช่' : 'ไม่ใช่'}</span>`;
            };
            const gridRow = (label, pill, extra) => `<div style="display:grid; grid-template-columns:200px 80px 1fr; align-items:center; padding:0.4rem 0; border-bottom:1px solid rgba(0,0,0,0.05); gap:0.5rem;"><span style="font-size:0.88rem; color:#333;">${label}</span><span>${pill}</span><span style="font-size:0.85rem; color:#666;">${extra || ''}</span></div>`;
            const valRow = (label, value) => `<div style="display:grid; grid-template-columns:200px 1fr; align-items:center; padding:0.4rem 0; border-bottom:1px solid rgba(0,0,0,0.05); gap:0.5rem;"><span style="font-size:0.88rem; color:#333;">${label}</span><span style="font-size:0.88rem; font-weight:500; color:#111;">${value}</span></div>`;

            let iHtml = '';
            if (log.installType) iHtml += valRow('ประเภทงาน', `<span class="detail-pill" style="background:${log.installType === 'ติดตั้ง' ? '#22c55e' : '#f59e0b'};">${log.installType}</span>`);
            if (log.installDate) iHtml += valRow('วันเวลาดำเนินการ', formatDateTimeDDMMYYYY(log.installDate));
            iHtml += gridRow('มีทางลาดหรือไม่', yesNo(log.useRamp), log.useRamp === 'yes' && log.rampWidth ? 'กว้าง ' + log.rampWidth + ' ม.' : '');
            iHtml += gridRow('มีลิฟต์หรือไม่', yesNo(log.useElevator), log.useElevator === 'yes' ? [log.elevatorCapacity ? log.elevatorCapacity + ' kg' : '', log.elevatorDoorWidth && log.elevatorDoorHeight ? 'ประตู ' + log.elevatorDoorWidth + '×' + log.elevatorDoorHeight + ' ม.' : ''].filter(Boolean).join(' / ') : '');
            iHtml += valRow('ช่องทางเดิน (ที่แคบที่สุด)', `${log.walkwayWidth ? 'กว้าง ' + log.walkwayWidth + ' ม.' : '-'} / ${log.walkwayHeight ? 'สูง ' + log.walkwayHeight + ' ม.' : '-'}`);
            iHtml += valRow('จำนวนประตูที่ต้องผ่าน', log.doorCount ? log.doorCount + ' ประตู' : '-');
            if (Array.isArray(log.doorSizes) && log.doorSizes.length > 0) {
                log.doorSizes.forEach(function (door, i) {
                    iHtml += valRow('ขนาดประตูที่ ' + (i + 1), (door.width ? 'กว้าง ' + door.width + ' ม.' : '-') + ' / ' + (door.height ? 'สูง ' + door.height + ' ม.' : '-'));
                });
            }
            iHtml += gridRow('ต้องเดินสายไฟ', yesNo(log.needWiring), '');
            iHtml += gridRow('ต้องเดิน Power Plug', yesNo(log.needPowerPlug), '');
            iHtml += valRow('ระยะจากตู้ไฟไปยังเครื่อง', log.wireDistance ? log.wireDistance + ' ม.' : '-');
            iHtml += gridRow('เจาะกำแพง', yesNo(log.needDrillWall), '');
            iHtml += gridRow('สายไฟเดินลอดฝ้า', yesNo(log.wireThroughCeiling), '');
            iHtml += `<div style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid rgba(0,0,0,0.08);">`;
            iHtml += `<div style="font-weight:600; font-size:0.85rem; color:#888; margin-bottom:0.25rem;">กรณีใช้ช่างโรงพยาบาล</div>`;
            iHtml += valRow('ชื่อ-สกุล', log.hospitalTechName || '-');
            iHtml += valRow('เบอร์โทร', log.hospitalTechPhone || '-');
            iHtml += `</div>`;
            installContent.innerHTML = iHtml;
        }

        // Precheck Section - for ติดตั้ง/รื้อถอน
        const precheckSection = document.getElementById("detail-precheck-section");
        const precheckContent = document.getElementById("detail-precheck-content");
        if (precheckSection) precheckSection.style.display = isInstallLog ? "block" : "none";
        if (precheckSection && precheckContent && isInstallLog) {
            const precheckBadge = (val) => {
                if (val === 'noneed') return `<span class="detail-pill" style="background:#94a3b8;">ไม่จำเป็น</span>`;
                if (!val || val === 'pending') return `<span class="detail-pill" style="background:#f59e0b;">รอตรวจ</span>`;
                if (val === 'pass') return `<span class="detail-pill" style="background:#22c55e;">ผ่าน</span>`;
                return `<span class="detail-pill" style="background:#ef4444;">ไม่ผ่าน</span>`;
            };
            const precheckItems = [
                ['precheck_electrical', 'ระบบไฟฟ้าภายในเครื่อง'],
                ['precheck_wiring', 'ระบบการเดินสายไฟ'],
                ['precheck_grounding', 'ระบบสายดิน'],
                ['precheck_doorMotor', 'ระบบประตู, มอเตอร์'],
                ['precheck_connectors', 'ระบบข้อต่อ'],
                ['precheck_vacuumPump', 'ระบบปั้มสุญญากาศ'],
                ['precheck_leakTest', 'การตรวจการรั่วไหล'],
                ['precheck_chemical', 'การตรวจปริมาณน้ำยาที่ฉีด'],
                ['precheck_sensors', 'ระบบ Sensor ต่างๆ'],
                ['precheck_sterilize', 'การตรวจ Sterilize ด้วย CI, CI PCD'],
                ['precheck_gasResidual', 'การตรวจปริมาณแก๊สตกค้าง'],
                ['precheck_interior', 'การตรวจความเรียบร้อยภายในเครื่อง'],
                ['precheck_exterior', 'การตรวจความเรียบร้อยภายนอกเครื่อง']
            ];
            let pcHtml = '';
            if (log.precheckDate) {
                pcHtml += `<div style="margin-bottom:0.5rem; font-size:0.85rem; color:#666;"><i class="fa-regular fa-calendar"></i> วันที่ตรวจ: <strong>${formatDateTimeDDMMYYYY(log.precheckDate)}</strong></div>`;
            }
            if (log.category === 'รื้อถอน') {
                pcHtml += `<div style="padding:1rem; text-align:center; color:#666; font-size:0.9rem; border:1px solid rgba(0,0,0,0.08); border-radius:8px; background:rgba(0,0,0,0.02);">ไม่จำเป็น (No need) — กรณีรื้อถอน</div>`;
            } else {
                pcHtml += `<div style="display:flex; flex-direction:column;">`;
                precheckItems.forEach(([key, label], idx) => {
                    const val = log[key] || 'pending';
                    const note = log[key + '_note'] || '';
                    pcHtml += `<div style="display:grid; grid-template-columns:30px 1fr 90px 1fr; align-items:center; padding:0.4rem 0; border-bottom:1px solid rgba(0,0,0,0.05); gap:0.5rem;">`;
                    pcHtml += `<span style="font-size:0.82rem; color:#888; text-align:center;">${idx + 1}</span>`;
                    pcHtml += `<span style="font-size:0.85rem; color:#333;">${label}</span>`;
                    pcHtml += `<span>${precheckBadge(val)}</span>`;
                    pcHtml += `<span style="font-size:0.82rem; color:#888;">${note || '-'}</span>`;
                    pcHtml += `</div>`;
                });
                pcHtml += `</div>`;
            }
            precheckContent.innerHTML = pcHtml;
        }

        // Install Photos Section - for ติดตั้ง/รื้อถอน — split into pre/post sections
        const installPhotosSection = document.getElementById("detail-install-photos-section");
        const installPhotosContent = document.getElementById("detail-install-photos-content");
        const hasPrePhotos = log.preInstallPhotos && log.preInstallPhotos.length > 0;
        const hasPostPhotos = log.installPhotos && log.installPhotos.length > 0;
        if (installPhotosSection) installPhotosSection.style.display = (isInstallLog && (hasPrePhotos || hasPostPhotos)) ? "block" : "none";
        if (installPhotosSection && installPhotosContent && isInstallLog && (hasPrePhotos || hasPostPhotos)) {

            const renderInstallGroup = (label, icon, items) => {
                if (!items || !items.length) return '';
                const thumbs = items.map(p => {
                    const url = p.url || p;
                    return `<div style="width:110px; height:82px; border-radius:8px; overflow:hidden; border:1px solid rgba(0,0,0,0.1); cursor:pointer; flex-shrink:0;" onclick="window.openImageViewer('${url}')">
                    <img src="${url}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
                </div>`;
                }).join('');
                return `<div style="margin-bottom:0.85rem;">
                <div style="font-size:0.78rem; font-weight:600; color:#555; margin-bottom:0.4rem; display:flex; align-items:center; gap:0.35rem;">
                    <i class="${icon}" style="font-size:0.7rem; opacity:0.7;"></i>${label} <span style="font-weight:400; color:#9ca3af;">(${items.length})</span>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">${thumbs}</div>
            </div>`;
            };

            installPhotosContent.innerHTML =
                renderInstallGroup('รูปถ่ายก่อนติดตั้ง/รื้อถอน', 'fa-solid fa-camera-retro', log.preInstallPhotos || []) +
                renderInstallGroup('รูปถ่ายประกอบการติดตั้ง/รื้อถอน', 'fa-solid fa-camera', log.installPhotos || []);
        }

        // Action Plan Section
        const actionPlanSection = document.getElementById("detail-action-plan-section");
        const actionPlanContent = document.getElementById("detail-action-plan-content");
        if (actionPlanSection) actionPlanSection.style.display = log.actionPlan ? "block" : "none";
        if (actionPlanSection && actionPlanContent && log.actionPlan) {
            actionPlanContent.innerHTML = `<div style="padding:0.75rem; border:1px solid rgba(0,0,0,0.08); border-radius:8px; background:rgba(0,0,0,0.02); white-space:pre-wrap; font-size:0.88rem; color:#333; line-height:1.6;">${log.actionPlan}</div>`;
        }

        // Repair Section - for ซ่อม
        const isRepairLog = log.category === 'ซ่อม';
        const repairSection = document.getElementById("detail-repair-section");
        const repairContent = document.getElementById("detail-repair-content");
        if (repairSection) repairSection.style.display = isRepairLog ? "block" : "none";
        if (repairSection && repairContent && isRepairLog) {
            let rHtml = '';

            // Repair checklist
            if (Array.isArray(log.repairChecklist) && log.repairChecklist.length > 0) {
                rHtml += `<div style="font-weight:600; font-size:0.85rem; color:#888; margin-bottom:0.4rem;"><i class="fa-solid fa-list-check"></i> รายการที่ซ่อม</div>`;
                rHtml += `<div style="display:flex; flex-direction:column; margin-bottom:0.75rem;">`;
                log.repairChecklist.forEach((item, i) => {
                    const statusBadge = item.status === 'pass'
                        ? `<span class="detail-pill" style="background:#22c55e;">ผ่าน</span>`
                        : item.status === 'fail'
                            ? `<span class="detail-pill" style="background:#ef4444;">ไม่ผ่าน</span>`
                            : `<span style="color:#ccc;">-</span>`;
                    rHtml += `<div style="display:grid; grid-template-columns:30px 1fr 80px 1fr; align-items:center; padding:0.4rem 0; border-bottom:1px solid rgba(0,0,0,0.05); gap:0.5rem;">`;
                    rHtml += `<span style="font-size:0.82rem; color:#888; text-align:center;">${i + 1}</span>`;
                    rHtml += `<span style="font-size:0.85rem; color:#333;">${item.label || '-'}</span>`;
                    rHtml += `<span>${statusBadge}</span>`;
                    rHtml += `<span style="font-size:0.82rem; color:#888;">${item.note || '-'}</span>`;
                    rHtml += `</div>`;
                });
                rHtml += `</div>`;
            }

            // Machine status after repair
            if (log.machineStatusAfter) {
                const msReady = log.machineStatusAfter === 'ready';
                rHtml += `<div style="font-weight:600; font-size:0.85rem; color:#888; margin-bottom:0.4rem;"><i class="fa-solid fa-clipboard-check"></i> สภาพเครื่องหลังดำเนินการ</div>`;
                rHtml += `<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">`;
                rHtml += `<span class="detail-pill" style="background:${msReady ? '#22c55e' : '#ef4444'};">${msReady ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}</span>`;
                rHtml += `</div>`;
                if (log.machineStatusAfterNote) {
                    rHtml += `<div style="font-size:0.85rem; color:#666; margin-top:0.25rem;">หมายเหตุ: ${log.machineStatusAfterNote}</div>`;
                }
            }

            // Return product
            if (log.returnProductNote || (Array.isArray(log.returnProducts) && log.returnProducts.length > 0)) {
                rHtml += `<div style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid rgba(0,0,0,0.08);">`;
                rHtml += `<div style="font-weight:600; font-size:0.85rem; color:#888; margin-bottom:0.4rem;"><i class="fa-solid fa-box-archive"></i> กรณีรับสินค้ากลับ</div>`;
                if (log.returnProductNote) {
                    rHtml += `<div style="font-size:0.85rem; color:#333; margin-bottom:0.5rem; padding:0.5rem; border:1px solid rgba(0,0,0,0.06); border-radius:6px; background:rgba(0,0,0,0.02);">${log.returnProductNote}</div>`;
                }
                if (Array.isArray(log.returnProducts) && log.returnProducts.length > 0) {
                    rHtml += `<div style="font-size:0.82rem; font-weight:600; color:#555; margin-bottom:0.25rem;">รายการสินค้า:</div>`;
                    log.returnProducts.forEach((prod, i) => {
                        rHtml += `<div style="display:flex; align-items:center; gap:0.5rem; padding:0.3rem 0; border-bottom:1px solid rgba(0,0,0,0.04); font-size:0.85rem;">`;
                        rHtml += `<span style="color:#888;">${i + 1}.</span>`;
                        rHtml += `<span style="color:#333;">${prod.name || prod.label || '-'}</span>`;
                        if (prod.qty) rHtml += `<span style="color:#666;">x${prod.qty}</span>`;
                        if (prod.note) rHtml += `<span style="color:#888;">(${prod.note})</span>`;
                        rHtml += `</div>`;
                    });
                }
                rHtml += `</div>`;
            }

            repairContent.innerHTML = rHtml;
        }

        // Completed Customer Information Section
        const custSection = document.getElementById("detail-customer-section");
        const custContent = document.getElementById("detail-customer-content");
        if (custSection && custContent) {
            const reporterName = log.reporterName || log.recordedBy || (log.customerName && !log.customerSignature ? log.customerName : '');
            const reporterPhone = log.reporterPhone || (log.customerPhone && !log.customerSignature ? log.customerPhone : '');
            const reporterPosition = log.reporterPosition || '';
            const hasReporterInfo = reporterName || reporterPhone || reporterPosition;
            custSection.style.display = hasReporterInfo ? "block" : "none";
            let custHtml = '<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.5rem 1.5rem;">';
            const custRow = (label, value) => `<div style="display:flex; flex-direction:column; padding:0.4rem 0;"><span style="font-size:0.8rem; color:#888;">${label}</span><span style="font-size:0.9rem; font-weight:500; color:#111;">${value || '-'}</span></div>`;
            custHtml += custRow('ชื่อผู้แจ้ง', reporterName || '-');
            custHtml += custRow('เบอร์โทร', reporterPhone || '-');
            custHtml += custRow('ตำแหน่ง', reporterPosition || '-');
            custHtml += '</div>';
            custContent.innerHTML = custHtml;
        }

        const finishedSection = document.getElementById("detail-customer-completed-section");
        const finishedContent = document.getElementById("detail-customer-completed-content");
        if (finishedSection && finishedContent) {
            const custName = log.customerName || '';
            const custPhone = log.customerPhone || '';
            const custPos = log.customerPosition || '';
            const custSig = log.customerSignature || '';
            const hasFinishedInfo = custSig || log.status === 'Done' ||
                (log.statusSignatures && log.statusSignatures['Done']) ||
                (Array.isArray(log.signedDocAttachments) && log.signedDocAttachments.length > 0);
            finishedSection.style.display = hasFinishedInfo ? "block" : "none";
            let custHtml = '<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.5rem 1.5rem;">';
            const custRow = (label, value) => `<div style="display:flex; flex-direction:column; padding:0.4rem 0;"><span style="font-size:0.8rem; color:#888;">${label}</span><span style="font-size:0.9rem; font-weight:500; color:#111;">${value || '-'}</span></div>`;
            custHtml += custRow('ชื่อผู้จบงาน', custName);
            custHtml += custRow('เบอร์โทร', custPhone);
            custHtml += custRow('ตำแหน่ง', custPos);
            custHtml += '</div>';
            if (custSig) {
                custHtml += '<div style="margin-top:0.75rem;">';
                custHtml += '<span style="font-size:0.8rem; color:#888; display:block; margin-bottom:0.35rem;">ลายเซ็นผู้จบงาน</span>';
                custHtml += '<div style="border:1px solid rgba(0,0,0,0.08); border-radius:8px; padding:0.5rem; background:#fafafa; display:inline-block;">';
                custHtml += '<img src="' + custSig + '" style="max-height:80px; max-width:200px; object-fit:contain; display:block;" alt="Customer Signature">';
                custHtml += '</div></div>';
            }
            finishedContent.innerHTML = custHtml;
        }

        const postBtn = document.getElementById("btn-post-comment");
        const commentInput = document.getElementById("log-comment-input");
        const attachBtn = document.getElementById("btn-attach-file");
        const attachInput = document.getElementById("comment-attachment-input");

        if (postBtn && commentInput) {
            // Clone button to remove old listeners
            const newBtn = postBtn.cloneNode(true);
            postBtn.parentNode.replaceChild(newBtn, postBtn);
            newBtn.addEventListener("click", () =>
                postLogComment(log.id, commentInput),
            );
            commentInput.onkeydown = (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    postLogComment(log.id, commentInput);
                }
            };
        }

        if (attachBtn && attachInput) {
            // Clone to remove old listeners
            const newAttachBtn = attachBtn.cloneNode(true);
            attachBtn.parentNode.replaceChild(newAttachBtn, attachBtn);

            newAttachBtn.addEventListener("click", () => {
                attachInput.click();
            });

            attachInput.onchange = (e) => {
                const files = Array.from(e.target.files);
                commentAttachments.push(...files);
                updateAttachmentPreview();
                e.target.value = ''; // Reset input
            };
        }

        // Recorder
        const recorderEl = document.getElementById("detail-log-recorder");
        if (recorderEl) {
            recorderEl.textContent = recorderName;
        }
        const timestampEl = document.getElementById("detail-log-timestamp");
        if (timestampEl) {
            timestampEl.textContent = timestampStr;
        }

        // Check if user can edit (admin can always edit, regular users can't edit closed cases)
        const user = auth.currentUser;

        if (log.status === 'Case Closed' && user) {
            // For closed cases, check if user is admin
            FirestoreService.getUser(user.uid).then(userDoc => {
                const isAdmin = userDoc?.role === 'admin';
                if (!isAdmin) {
                    const editBtn = document.getElementById("detail-log-edit-btn");
                    if (editBtn) editBtn.style.display = 'none';
                }
            });
        }

        // Record footer - metadata only
        const recordFooter = document.querySelector('.modal-record-footer');
        if (recordFooter) {
            recordFooter.innerHTML = `
            <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                <div>
                    <i class="fa-solid fa-user-pen" style="margin-right: 4px;"></i> แก้ไขล่าสุด: <span style="color: var(--text-color); font-weight: 500;">${recorderName}</span>
                </div>
                <div>
                    <i class="fa-solid fa-clock" style="margin-right: 4px;"></i> บันทึกเมื่อ: <span style="color: var(--text-color); font-weight: 500;">${timestampStr}</span>
                </div>
            </div>
        `;
        }

        // Collapse comments by default on mobile
        const commentCollapsible = document.getElementById("comment-collapsible");
        const commentIcon = document.getElementById("comment-collapse-icon");
        if (window.innerWidth <= 768) {
            if (commentCollapsible) commentCollapsible.style.display = "none";
            if (commentIcon) commentIcon.style.transform = "rotate(180deg)";
        } else {
            if (commentCollapsible) commentCollapsible.style.display = "";
            if (commentIcon) commentIcon.style.transform = "";
        }

        // Force close device details and edit modals to prevent overlapping UI
        toggleModal("siteDetails", false);
        toggleModal("addSite", false);

        toggleModal("logDetails", true);
    } catch (error) {
        console.error("Error in viewLogDetails:", error);
        alert("เกิดข้อผิดพลาดในการเปิดรายละเอียดเคส:\n" + error.message + "\n\n" + error.stack);
    }
}

function viewSiteLogs(siteId) {
    // 1. Force Switch to List View (resets filters and UI state)
    switchLogView("list");

    // Switch to Engineer/Logs View
    views.admin.classList.remove("active");
    views.engineer.classList.add("active");

    // Update Nav Buttons (Both Desktop and Mobile)
    document
        .querySelectorAll(".nav-btn")
        .forEach((btn) => btn.classList.remove("active"));

    // Activate Logs Tab
    const navDesktop = document.getElementById("nav-logs-desktop");
    const navMobile = document.getElementById("nav-logs-mobile");
    if (navDesktop) navDesktop.classList.add("active");
    if (navMobile) navMobile.classList.add("active");

    // Force close details modal if open
    toggleModal("siteDetails", false);

    // Set Filter
    const searchInput = document.getElementById("site-filter-input");
    const filterHidden = document.getElementById("site-filter");

    // Find Site by ID
    const site = state.sites.find((s) => s.id === siteId);

    // Fallback: If not found by ID, try Name (backward compatibility or in case of mixed usage)
    const siteByName = !site ? state.sites.find((s) => s.name === siteId) : null;
    const effectiveSite = site || siteByName;

    if (searchInput) {
        searchInput.value = effectiveSite ? effectiveSite.name : "";
    }

    if (filterHidden) {
        filterHidden.value = effectiveSite ? effectiveSite.id : "all";
        // IMPORTANT: Update the 'selects' reference if it matches, or ensure getFilteredLogs reads DOM
        if (selects.filterHidden) selects.filterHidden.value = filterHidden.value;
    }

    renderLogs();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ... initialization and other code ...

// ...

// Helper: Pure Client-Side Filtering
function filterLogsClientSide(logsToFilter, filters) {
    let result = logsToFilter;

    // 1. Site Filter (Exact ID match if selected, otherwise fallback to search string)
    if (filters.siteId && filters.siteId !== "all") {
        result = result.filter((l) => l.siteId === filters.siteId);
    } else if (filters.siteSearchQuery) {
        const q = filters.siteSearchQuery.toLowerCase().trim();
        result = result.filter((l) => {
            const site = state.sites.find((s) => s.id === l.siteId);
            const siteName = site ? site.name.toLowerCase() : "";
            const siteCode = site && site.siteCode ? site.siteCode.toLowerCase() : "";
            const caseId = (l.caseId || "").toLowerCase();
            const objective = (l.objective || "").toLowerCase();
            const details = (l.details || "").toLowerCase();

            // Get first comment (description) if exists
            const firstComment = l.comments && l.comments.length > 0 ? l.comments[0].text.toLowerCase() : "";

            const recorderName = (l.updatedBy ||
                (state.users && l.recorderId && state.users[l.recorderId]
                    ? state.users[l.recorderId].displayName ||
                    state.users[l.recorderId].email ||
                    l.recordedBy
                    : l.recordedBy || "")).toLowerCase();

            return (
                siteName.includes(q) ||
                siteCode.includes(q) ||
                caseId.includes(q) ||
                objective.includes(q) ||
                details.includes(q) ||
                firstComment.includes(q) ||
                recorderName.includes(q)
            );
        });
    }

    // 2. Date Filter (refining time if needed, though fetch usually handles date range)
    if (filters.startDate || filters.endDate) {
        const start = filters.startDate ? new Date(filters.startDate) : null;
        if (start) start.setHours(0, 0, 0, 0);

        const end = filters.endDate ? new Date(filters.endDate) : null;
        if (end) end.setHours(23, 59, 59, 999);

        result = result.filter((l) => {
            const logDate = new Date(l.date);
            logDate.setHours(0, 0, 0, 0);
            if (start && logDate < start) return false;
            if (end && logDate > end) return false;
            return true;
        });
    }

    // 3. Category Filter
    if (filters.category && filters.category !== "all") {
        result = result.filter((l) => l.category === filters.category);
    }

    // 4. Status Filter
    if (filters.status && filters.status !== "all") {
        result = result.filter((l) => l.status === filters.status);
    }

    // 5. Price Filter
    const min = filters.minPrice || 0;
    const max = filters.maxPrice || Infinity;
    if (min > 0 || max < Infinity) {
        result = result.filter((l) => {
            const cost = parseFloat(l.cost) || 0;
            return cost >= min && cost <= max;
        });
    }

    // 6. Additional Keyword Search (from separate search box if exists)
    if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase().trim();
        result = result.filter((l) => {
            const site = state.sites.find((s) => s.id === l.siteId);
            const siteName = site ? site.name.toLowerCase() : "";
            const objective = (l.objective || "").toLowerCase();
            const notes = (l.notes || "").toLowerCase();
            const details = (l.details || "").toLowerCase();

            return (
                siteName.includes(q) ||
                objective.includes(q) ||
                notes.includes(q) ||
                details.includes(q)
            );
        });
    }

    return result;
}

function getFilteredLogs() {
    // Get filter values from DOM
    const siteSearchQuery = document.getElementById("site-filter-input")
        ? document.getElementById("site-filter-input").value
        : "";
    const siteId = selects.filterHidden
        ? selects.filterHidden.value
        : "all";
    const startDate =
        selects.filterStart && selects.filterStart.value
            ? new Date(selects.filterStart.value)
            : null;
    const endDate =
        selects.filterEnd && selects.filterEnd.value
            ? new Date(selects.filterEnd.value)
            : null;
    const categoryFilter = selects.filterCategory
        ? selects.filterCategory.value
        : "all";
    const statusFilter = document.getElementById("filter-status")
        ? document.getElementById("filter-status").value
        : "all";

    // Search
    const searchQuery = document.getElementById("log-search-input")
        ? document.getElementById("log-search-input").value
        : "";

    return filterLogsClientSide(state.logs, {
        siteId,
        siteSearchQuery,
        startDate,
        endDate,
        category: categoryFilter,
        status: statusFilter,
        minPrice: 0,
        maxPrice: Infinity,
        searchQuery,
    });
}

async function exportSitesToExcel() {
    if (typeof XLSX === "undefined") {
        await showDialog(
            "Error: SheetJS library not loaded. Please check your internet connection or try refreshing.",
        );
        return;
    }

    // 1. Get Current Filters
    const searchInput = document.getElementById("site-search-input");
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const provinceFilter =
        document.getElementById("filter-site-province")?.value || "all";
    const contractFilter =
        document.getElementById("filter-site-contract")?.value || "all";

    // 2. Filter Sites (Logic mirrors renderSites)
    const filteredSites = state.sites.filter((site) => {
        const nameMatch = (site.name || "").toLowerCase().includes(searchTerm);
        const provinceMatch = (site.province || "")
            .toLowerCase()
            .includes(searchTerm);
        const hospitalMatch = (site.hospital || "")
            .toLowerCase()
            .includes(searchTerm);

        const otherFields = [
            site.district,
            site.subdistrict,
            site.zipcode,
            site.installLocation || site.villageName,
            site.deviceType,
            site.brand,
            site.model,
        ].join(" ");
        const addressMatch = otherFields.toLowerCase().includes(searchTerm);

        const isSearchMatch =
            nameMatch || provinceMatch || hospitalMatch || addressMatch;
        const isProvinceMatch =
            provinceFilter === "all" || site.province === provinceFilter;
        const isContractMatch =
            contractFilter === "all" || site.deviceType === contractFilter;

        return isSearchMatch && isProvinceMatch && isContractMatch;
    });

    if (filteredSites.length === 0) {
        await showDialog("ไม่พบข้อมูลสถานที่สำหรับส่งออก");
        return;
    }

    // 3. Prepare Data for Excel
    // 3. Prepare Data for Excel
    const formatDDMMYYYY = (isoDate) => {
        if (!isoDate || isoDate === "-") return "-";
        const parts = isoDate.split("-");
        if (parts.length !== 3) return isoDate;
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    };

    const dataForSheet = filteredSites.map((site) => {
        // Use sanitizeDate first (YYYY-MM-DD), then format to DD-MM-YYYY
        const startDate = site.insuranceStartDate
            ? formatDDMMYYYY(sanitizeDate(site.insuranceStartDate))
            : "-";
        const endDate = site.insuranceEndDate
            ? formatDDMMYYYY(sanitizeDate(site.insuranceEndDate))
            : "-";
        const firstMaDate = site.firstMaDate
            ? formatDDMMYYYY(sanitizeDate(site.firstMaDate))
            : "-";

        // Calculate Log Count
        const logCount = state.logs.filter((l) => l.siteId === site.id).length;

        // Format address
        const address = [
            site.installLocation || site.villageName,
            site.moo ? `หมู่ที่ ${site.moo}` : "",
            site.subdistrict,
            site.district,
            site.province,
            site.zipcode,
        ]
            .filter((x) => x)
            .join(" ");

        let installDateExcel = site.installationDate;
        if (!installDateExcel && state.logs) {
            const installLog = state.logs.find(l => l.siteId === site.id && l.category === "ติดตั้ง");
            if (installLog && installLog.date) {
                installDateExcel = sanitizeDate(installLog.date).split('T')[0];
            }
        }
        installDateExcel = installDateExcel ? formatDDMMYYYY(installDateExcel) : "-";

        return {
            "รหัสเครื่อง": site.siteCode || "-",
            "ชื่อเครื่อง": site.name || "-",
            "รูปแบบสัญญา": site.deviceType || "-",
            "ยี่ห้อ": site.brand || "-",
            "รุ่น": site.model || "-",
            "Serial Number": site.serialNumber || "-",
            "โรงพยาบาล/หน่วยงาน": site.hospital || site.installLocation || site.villageName || "-",
            "หมู่ที่": site.moo || "-",
            "ตำบล": site.subdistrict || "-",
            "อำเภอ": site.district || "-",
            "จังหวัด": site.province || "-",
            "รหัสไปรษณีย์": site.zipcode || "-",
            "ที่อยู่เต็ม": address || "-",
            "ผู้รับผิดชอบ (PIC)": site.picName || "-",
            "ชื่อผู้ติดต่อ": site.contactName || "-",
            "เบอร์โทรศัพท์": site.contactPhone || "-",
            "เลขที่ใบรับประกัน": site.warrantyNumber || "-",
            "วันที่ติดตั้ง": installDateExcel,
            "วันเริ่มประกัน": startDate,
            "วันหมดประกัน": endDate,
            "รอบ MA (วัน)": site.maintenanceCycle || "-",
            "วันเข้า MA ครั้งแรก": firstMaDate,
            "ลิงก์ Google Maps": site.locationUrl || "-",
            "รายละเอียด": site.description || "-",
            "จำนวนบันทึก": logCount
        };
    });

    // 4. Generate Columns & Worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(dataForSheet, { origin: "A2" });

    // Title Row
    let titleLabel = "รายชื่อเครื่อง";
    if (provinceFilter !== "all") titleLabel += ` (จังหวัด ${provinceFilter})`;

    // Search query info
    let subtitle = "";
    if (searchTerm) subtitle = `คำค้นหา: "${searchTerm}"`;

    XLSX.utils.sheet_add_aoa(worksheet, [[titleLabel]], { origin: "A1" });
    if (subtitle) {
        // If subtitle exists, append it to title or add new row?
        // Let's just append for simplicity in A1 or use A1 for main title.
        // Actually, let's keep it simple.
    }

    // Merge Title
    if (!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 18 } });

    // Column Widths
    worksheet["!cols"] = [
        { wch: 15 }, // Site Code
        { wch: 30 }, // Name
        { wch: 20 }, // Village Name
        { wch: 10 }, // Moo
        { wch: 15 }, // Subdistrict
        { wch: 15 }, // District
        { wch: 15 }, // Province
        { wch: 12 }, // Zipcode
        { wch: 50 }, // Full Address
        { wch: 25 }, // Agency
        { wch: 20 }, // Contact Name
        { wch: 15 }, // Phone
        { wch: 30 }, // Google Maps URL
        { wch: 12 }, // Maintenance Cycle
        { wch: 15 }, // Insurance Start
        { wch: 15 }, // Insurance End
        { wch: 15 }, // First MA Date
        { wch: 12 }, // Log Count
        { wch: 30 }, // Description
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sites");

    // 5. Download
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `sites_export_${timestamp}.xlsx`;

    try {
        const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], { type: "application/octet-stream" });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 2000);
    } catch (err) {
        console.error("Export failed:", err);
        await showDialog("เกิดข้อผิดพลาดในการส่งออกไฟล์");
    }
}

async function exportCasePDF(logId) {
    const log = state.logs.find(l => l.id === logId);
    if (!log) return;

    const site = log._mockSite || state.sites.find(s => s.id === log.siteId) || { name: '-' };
    const isBlank = !!log._isBlank;
    const fallback = isBlank ? '....................' : 'ไม่ระบุข้อมูล';

    const thaiDate = isBlank ? '....................' : formatDateDDMMYYYY(log.date);
    const recorderName = isBlank ? '....................' : (log.updatedBy || (state.users && log.recorderId && state.users[log.recorderId]
        ? state.users[log.recorderId].displayName || state.users[log.recorderId].email || log.recordedBy
        : log.recordedBy || '-'));
    const timestampStr = isBlank ? '....................' : (log.timestamp ? new Date(log.timestamp).toLocaleString('th-TH') : '-');

    // Get responder info (from user profile)
    const responderUser = log.responderId && state.users ? state.users[log.responderId] : null;
    const responderName = responderUser ? (responderUser.displayName || responderUser.email || '-') : '-';
    const responderSignature = responderUser?.signature || '';

    // Get Done signature — prefer customer fields (always synced), fallback to statusSignatures
    const reporterName = log.reporterName || log.recordedBy || log.customerName || '-';
    const reporterPhone = log.reporterPhone || log.customerPhone || '-';
    const reporterPosition = log.reporterPosition || log.customerPosition || '-';

    let doneSignature = log.customerSignature || '';
    let doneName = log.customerName || '-';
    let customerTel = log.customerPhone || '-';
    let customerPosition = log.customerPosition || '-';
    if (!doneSignature && log.statusSignatures && log.statusSignatures['Done']) {
        const sig = log.statusSignatures['Done'];
        doneSignature = sig.data || '';
        if (doneName === '-') doneName = sig.signerName || sig.signedBy || '-';
        if (customerTel === '-') customerTel = sig.signerTel || '-';
        if (customerPosition === '-') customerPosition = sig.signerPosition || '-';
    }

    // Get Case Closed closer info (from user profile)
    let closerName = '-';
    let closerSignature = '';
    if (log.statusHistory && log.statusHistory['Case Closed'] && state.users) {
        // Find who closed the case from the status change comments
        const closeComment = (log.comments || []).find(c => c.isSystemLog && c.text && c.text.includes('ปิดเคส'));
        if (closeComment && closeComment.authorId && state.users[closeComment.authorId]) {
            const closerUser = state.users[closeComment.authorId];
            closerName = closerUser.displayName || closerUser.email || '-';
            closerSignature = closerUser.signature || '';
        }
    }

    const statusLabels = {
        'Open': 'เปิดงาน', 'On Process': 'กำลังดำเนินการ',
        'Done': 'เสร็จสิ้น', 'Case Closed': 'ปิดเคส', 'Cancel': 'ยกเลิก'
    };
    const statusText = statusLabels[log.status] || log.status || '-';

    const totalCost = log.lineItems && log.lineItems.length > 0
        ? log.lineItems.reduce((s, li) => s + (li.cost || 0), 0)
        : log.cost || 0;
    const fmtCost = (v) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

    // Build line items rows
    let lineItemsHtml = '';
    if (log.lineItems && log.lineItems.length > 0) {
        lineItemsHtml = log.lineItems.map((li, i) =>
            `<tr><td style="padding:6px 8px; border-bottom:1px solid #eee;">${i + 1}</td>
             <td style="padding:6px 8px; border-bottom:1px solid #eee;">${li.item || '-'}</td>
             <td style="padding:6px 8px; border-bottom:1px solid #eee; text-align:right;">${fmtCost(li.cost)}</td></tr>`
        ).join('');
    }

    // Build status history timeline (horizontal)
    const statusDefs = [
        { value: 'Open', label: 'เปิดงาน', icon: '●', color: '#ca8a04' },
        { value: 'On Process', label: 'ดำเนินการ', icon: '●', color: '#f97316' },
        { value: 'Done', label: 'เสร็จสิ้น', icon: '●', color: '#a855f7' },
        { value: 'Case Closed', label: 'ปิดเคส', icon: '●', color: '#22c55e' },
        { value: 'Cancel', label: 'ยกเลิก', icon: '●', color: '#ef4444' }
    ];
    const isCancelled = log.status === 'Cancel';
    const currentIndex = statusDefs.findIndex(s => s.value === log.status);
    let statusTimelineHtml = '';
    if (log.statusHistory) {
        statusTimelineHtml = statusDefs.map((s, i) => {
            const hasTimestamp = !!log.statusHistory[s.value];
            const ts = hasTimestamp ? new Date(log.statusHistory[s.value]).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
            const isActive = s.value === log.status;
            const isCompleted = !isCancelled && i < currentIndex;
            const isCancelledStep = isCancelled && hasTimestamp;

            let bgColor = '#fff';
            let borderColor = '#e0e0e0';
            let textColor = '#999';
            if (isActive) { bgColor = '#f5f5f5'; borderColor = '#333'; textColor = '#333'; }
            else if (isCompleted) { bgColor = '#f5f5f5'; borderColor = '#555'; textColor = '#333'; }
            else if (isCancelledStep) { bgColor = '#f5f5f5'; borderColor = '#555'; textColor = '#333'; }

            return `<div style="flex:1; text-align:center; padding:10px 6px; background:${bgColor}; border:1.5px solid ${borderColor}; border-radius:8px;">
                <div style="width:10px; height:10px; border-radius:50%; background:${isActive || isCompleted || isCancelledStep ? '#333' : '#ddd'}; margin:0 auto 6px;"></div>
                <div style="font-size:9px; font-weight:${isActive ? '700' : '500'}; color:${textColor};">${s.label}</div>
                <div style="font-size:7px; color:${hasTimestamp ? '#333' : '#ccc'}; margin-top:2px;">${ts}</div>
            </div>`;
        }).join('');
    }

    // Build 3-column signature section
    const sigBoxStyle = 'flex:1; text-align:center; padding:12px 8px; min-width:0;';
    const sigImgStyle = 'max-width:150px; height:50px; object-fit:contain;';
    const sigLineStyle = 'border-top:1px solid #333; width:80%; margin:6px auto 3px;';
    const sigNameStyle = 'font-size:9px; font-weight:600;';
    const sigRoleStyle = 'font-size:8px; color:#333;';

    const buildSigBox = (signature, thaiLabel, engLabel, name = '') => {
        // If useESignature is true → show system signature image (or empty space if none)
        // If useESignature is false → always blank (for physical pen signing)
        const showSig = log.useESignature && signature;
        const imgHtml = showSig
            ? `<img src="${signature}" style="${sigImgStyle}">`
            : `<div style="height:60px;"></div>`;
        const nameHtml = name ? `<div style="font-size:8px; color:#333; margin-top:2px;">${name}</div>` : '';
        return `<div style="${sigBoxStyle}">
            ${imgHtml}
            <div style="${sigLineStyle}"></div>
            ${nameHtml}
            <div style="font-size:10px; font-weight:700; margin-top:3px;">${thaiLabel}</div>
            <div style="font-size:8px; color:#333;">${engLabel}</div>
        </div>`;
    };

    const signatureHtml = `<div style="display:flex; gap:16px; margin-top:8px;">
        ${buildSigBox(responderSignature, 'เจ้าหน้าที่ช่างบริการ', 'Service Engineer')}
        ${buildSigBox(doneSignature, 'ลูกค้า', 'Customer Authorized PIC')}
        ${buildSigBox(closerSignature, 'ผู้จัดการฝ่ายช่างบริการ', 'Service Manager')}
    </div>${(() => {
            // When not using e-signature, show any uploaded signed document copies
            if (log.useESignature) return '';
            const docs = log.signedDocAttachments || [];
            if (docs.length === 0) return '';
            const items = docs.map(d => {
                const isPdf = d.name && d.name.toLowerCase().endsWith('.pdf');
                const isImg = d.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(d.name || '');
                if (isImg) {
                    return `<div style="display:inline-block; margin:4px;">
                    <img src="${d.url}" style="max-width:200px; max-height:160px; border:1px solid #ddd; border-radius:4px; display:block;">
                    <div style="font-size:8px; color:#666; margin-top:2px; text-align:center;">${d.name || ''}</div>
                </div>`;
                }
                return `<div style="display:inline-flex; align-items:center; gap:6px; margin:4px; padding:6px 10px; border:1px solid #ddd; border-radius:4px; background:#fafafa;">
                <i class="fa-solid fa-file-pdf" style="color:#ef4444;"></i>
                <a href="${d.url}" style="font-size:9px; color:#333; text-decoration:none;">${d.name || 'เอกสาร'}</a>
            </div>`;
            }).join('');
            return `<div style="margin-top:10px;"><div style="font-size:10px; font-weight:700; color:#333; margin-bottom:4px; border-bottom:1px solid #eee; padding-bottom:3px;">สำเนาเอกสารที่เซ็นแล้ว (Signed Document Copy)</div><div style="display:flex; flex-wrap:wrap; gap:4px;">${items}</div></div>`;
        })()}`;

    // Get initial case detail from first comment
    const initialDetail = log.comments && log.comments.length > 0 && log.comments[0].text
        ? log.comments[0].text : '-';
    let initialAttachmentsHtml = '';
    if (log.comments && log.comments.length > 0 && log.comments[0].attachments && log.comments[0].attachments.length > 0) {
        log.comments[0].attachments.forEach(att => {
            if (att.type && att.type.startsWith('image/')) {
                initialAttachmentsHtml += `<img src="${att.url}" style="max-width:200px; max-height:120px; border:1px solid #ddd; border-radius:4px; margin-top:4px; margin-right:4px;">`;
            }
        });
    }

    // --- Build inspection data for PDF ---
    const renderPillGroup = (items) => {
        return '<div style="display:inline-flex; border:1px solid #ddd; border-radius:5px; overflow:hidden; font-size:8.5px; background:#fff; white-space:nowrap;">' +
            items.map((it, i) =>
                '<div style="padding:4px 12px; border-left:' + (i === 0 ? '0' : '1px solid #ddd') + '; color:' + (it.color || '#333') + '; font-weight:700; display:flex; align-items:center; gap:4px; min-width:35px; justify-content:center;">' +
                '<div style="width:9px; height:9px; border:1.2px solid ' + (it.color || '#ddd') + '; border-radius:2px; display:inline-block; flex:none;"></div> ' + it.label + '</div>'
            ).join('') +
            '</div>';
    };
    const pdfBadge = (val) => {
        if (isBlank) return renderPillGroup([{ label: 'ผ่าน', color: '#22c55e' }, { label: 'ไม่ผ่าน', color: '#ef4444' }]);
        if (!val) return '-';
        const bg = val === 'pass' ? '#22c55e' : '#ef4444';
        const text = val === 'pass' ? 'ผ่าน' : 'ไม่ผ่าน';
        return '<span style="background:' + bg + '; color:#fff; padding:1px 6px; border-radius:3px; font-size:9px; font-weight:600; display:inline-block; min-width:45px; text-align:center;">' + text + '</span>';
    };
    const pdfInspBadge = (val) => {
        if (isBlank) return renderPillGroup([{ label: 'Check', color: '#22c55e' }, { label: 'Service', color: '#f59e0b' }, { label: 'Replace', color: '#ef4444' }]);
        if (!val) return '-';
        const cfg = { check: { l: 'Check', b: '#22c55e' }, service: { l: 'Service', b: '#f59e0b' }, replace: { l: 'Replace', b: '#ef4444' } };
        const c = cfg[val] || { l: val, b: '#111' };
        return '<span style="background:' + c.b + '; color:#fff; padding:1px 6px; border-radius:3px; font-size:9px; font-weight:700; display:inline-block; width:42px; text-align:center;">' + c.l + '</span>';
    };

    const hasElec = isBlank || log.voltageL1 || log.voltageL2 || log.voltageL3 || log.currentL1 || log.currentL2 || log.currentL3;
    const hasPhys = isBlank || log.avgWorkTemp || log.avgAreaTemp || log.leakCheck || log.leakPressure;
    const hasPerf = isBlank || log.complyType5 || log.ciPcdType5;
    const hasGas = isBlank || log.gasDoor1 || log.gasDoor2 || log.gasDoor3 || log.gas1m1 || log.gas1m2 || log.gas1m3 || log.gas2m1 || log.gas2m2 || log.gas2m3;
    const pdfInspItems = [
        ['insp_exteriorCleaning', '1. ความสะอาดภายนอก'], ['insp_interiorCleaning', '2. ความสะอาดภายใน'],
        ['insp_doorSystem', '3. การทำงานระบบประตู'], ['insp_footSwitch', '4. การทำงาน Foot Switch'], ['insp_sensor', '5. ระบบ Sensor'],
        ['insp_tempPoints', '6. อุณหภูมิจุดที่ 1-4'], ['insp_workingPressure', '7. ความดันขณะทำงาน'], ['insp_rfGenerator', '8. RF Generator'],
        ['insp_chemicalAmount', '9. ปริมาณน้ำยาที่ฉีด'], ['insp_airChargingValue', '10. Air Charging Valve'], ['insp_filter', '11. Filter'],
        ['insp_decomposer', '12. Decomposor'], ['insp_vacuumPumpOil', '13. น้ำมันปั้มสุญากาศ'], ['insp_connectors', '14. ระบบข้อต่อต่างๆ'],
        ['insp_drainTank', '15. ถังเดรนน้ำ'], ['insp_chemicalLine', '16. สายส่งน้ำยา'], ['insp_phaseRelay', '17. รีเลย์ควบคุมลำดับเฟส'], ['insp_systemRelay', '18. รีเลย์ควบคุมระบบต่างๆ'],
    ];
    const hasInspChecklist = isBlank || pdfInspItems.some(function (item) { return log[item[0]]; });

    var inspHtml = '';
    var isMaPdf = isMaCategory(log.category);
    var isInstallPdf = log.category === 'ติดตั้ง' || log.category === 'รื้อถอน';
    var isRepairPdf = log.category === 'ซ่อม';

    if (isMaPdf) {

        if (hasElec) {
            let flashCountPdf = 0;
            if (String(log.voltageL1 || '').trim() !== '' && String(log.currentL1 || '').trim() !== '') flashCountPdf++;
            if (String(log.voltageL2 || '').trim() !== '' && String(log.currentL2 || '').trim() !== '') flashCountPdf++;
            if (String(log.voltageL3 || '').trim() !== '' && String(log.currentL3 || '').trim() !== '') flashCountPdf++;
            const flashTextPdf = flashCountPdf > 0 ? ' (' + flashCountPdf + ' Flash)' : '';

            const vF = isBlank ? '......' : '___';
            inspHtml += '<div class="section-block"><table style="border:1px solid #ddd; border-radius:6px; font-size:10px; margin-top:10px;">'
                + '<tr style="border-bottom:1px solid #eee;"><td colspan="4" style="padding:6px 8px; font-weight:700; font-size:11px;">ข้อมูลไฟฟ้า (Electrical)' + flashTextPdf + '</td></tr>'
                + '<tr style="border-bottom:1px solid #eee;"><td style="padding:4px 8px;"><b>แรงดันไฟฟ้า</b></td>'
                + '<td style="text-align:center; padding:4px 8px;">R <b>' + (log.voltageL1 || vF) + '</b> V (Load/Unload)</td>'
                + '<td style="text-align:center; padding:4px 8px;">S <b>' + (log.voltageL2 || vF) + '</b> V (Load/Unload)</td>'
                + '<td style="text-align:center; padding:4px 8px;">T <b>' + (log.voltageL3 || vF) + '</b> V (Load/Unload)</td></tr>'
                + '<tr><td style="padding:4px 8px;"><b>กระแส</b></td>'
                + '<td style="text-align:center; padding:4px 8px;">R <b>' + (log.currentL1 || vF) + '</b> A (Load/Unload)</td>'
                + '<td style="text-align:center; padding:4px 8px;">S <b>' + (log.currentL2 || vF) + '</b> A (Load/Unload)</td>'
                + '<td style="text-align:center; padding:4px 8px;">T <b>' + (log.currentL3 || vF) + '</b> A (Load/Unload)</td></tr>'
                + '</table></div>';
        }

        if (hasPhys || hasPerf) {
            inspHtml += '<div class="section-block"><div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:10px;">';
            if (hasPhys) {
                const vF = isBlank ? '......' : '-';
                inspHtml += '<div style="border:1px solid #ddd; border-radius:6px; padding:8px; font-size:10px;">'
                    + '<div style="font-weight:700; margin-bottom:4px; font-size:11px;">ตรวจสอบทางกายภาพ (Physical Inspection)</div>'
                    + '<div style="display:flex; justify-content:space-between; padding:3px 0;">อุณหภูมิเฉลี่ยทำงาน <span style="display:flex; align-items:center; gap:6px;">' + (log.avgWorkTemp ? log.avgWorkTemp + ' °C' : vF) + ' ' + pdfBadge(log.avgWorkTempCheck) + '</span></div>'
                    + '<div style="display:flex; justify-content:space-between; padding:3px 0;">อุณหภูมิเฉลี่ยพื้นที่ <span style="display:flex; align-items:center; gap:6px;">' + (log.avgAreaTemp ? log.avgAreaTemp + ' °C' : vF) + ' ' + pdfBadge(log.avgAreaTempCheck) + '</span></div>'
                    + '<div style="display:flex; justify-content:space-between; padding:3px 0;">ตรวจสอบการรั่วไหล <span style="display:flex; align-items:center; gap:6px;">' + (log.leakPressure ? log.leakPressure + ' PSI' : vF) + ' ' + pdfBadge(log.leakCheck) + '</span></div>'
                    + '</div>';
            }
            if (hasPerf) {
                inspHtml += '<div style="border:1px solid #ddd; border-radius:6px; padding:8px; font-size:10px;">'
                    + '<div style="font-weight:700; margin-bottom:4px; font-size:11px;">ประสิทธิภาพการทำงาน (Performance)</div>'
                    + '<div style="display:flex; justify-content:space-between; padding:3px 0;">ตรวจสอบด้วย Comply Type 5 ' + pdfBadge(log.complyType5) + '</div>'
                    + '<div style="display:flex; justify-content:space-between; padding:3px 0;">ตรวจสอบการทะลุทะลวงด้วย CI PCD Type 5 ' + pdfBadge(log.ciPcdType5) + '</div>'
                    + '</div>';
            }
            inspHtml += '</div></div>';
        }

        if (hasGas) {
            const vF = isBlank ? '......' : '-';
            inspHtml += '<div class="section-block"><table style="border:1px solid #ddd; border-radius:6px; font-size:10px; margin-top:10px;">'
                + '<thead><tr style="border-bottom:1px solid #ddd;"><th style="padding:4px 8px;">ตรวจสอบปริมาณแก๊ส (Gas Detection)</th><th style="text-align:center; padding:4px 8px;">ครั้งที่ 1</th><th style="text-align:center; padding:4px 8px;">ครั้งที่ 2</th><th style="text-align:center; padding:4px 8px;">ครั้งที่ 3</th></tr></thead>'
                + '<tbody>'
                + '<tr style="border-bottom:1px solid #eee;"><td style="padding:4px 8px;">บริเวณหน้าประตู</td><td style="text-align:center;">' + (log.gasDoor1 || vF) + ' PPM</td><td style="text-align:center;">' + (log.gasDoor2 || vF) + ' PPM</td><td style="text-align:center;">' + (log.gasDoor3 || vF) + ' PPM</td></tr>'
                + '<tr style="border-bottom:1px solid #eee;"><td style="padding:4px 8px;">ระยะห่าง 1 เมตร</td><td style="text-align:center;">' + (log.gas1m1 || vF) + ' PPM</td><td style="text-align:center;">' + (log.gas1m2 || vF) + ' PPM</td><td style="text-align:center;">' + (log.gas1m3 || vF) + ' PPM</td></tr>'
                + '<tr><td style="padding:4px 8px;">ระยะห่าง 2 เมตร</td><td style="text-align:center;">' + (log.gas2m1 || vF) + ' PPM</td><td style="text-align:center;">' + (log.gas2m2 || vF) + ' PPM</td><td style="text-align:center;">' + (log.gas2m3 || vF) + ' PPM</td></tr>'
                + '</tbody></table>';
        }

        if (hasInspChecklist) {
            inspHtml += '<div class="section-block"><div style="display:grid; grid-template-columns:1fr 1fr; gap:0 20px; border:1px solid #ddd; border-radius:6px; padding:8px; margin-top:10px;">'
                + '<div style="grid-column: span 2; font-weight:700; font-size:11px; margin-bottom:4px; padding-bottom:4px; border-bottom:1px solid #eee;">รายการตรวจสอบ (Inspection Checklist)</div>';
            pdfInspItems.forEach(function (item) {
                inspHtml += '<div style="display:flex; justify-content:space-between; align-items:center; padding:3px 0; border-bottom:1px solid #f0f0f0; font-size:10px;"><span>' + item[1] + '</span>' + pdfInspBadge(log[item[0]]) + '</div>';
            });
            inspHtml += '</div></div>';
        }

    } // end isMaPdf

    // Install/Uninstall section for PDF
    if (isInstallPdf) {
        var pdfYesNo = function (val) {
            if (isBlank) return renderPillGroup([{ label: 'ใช่', color: '#22c55e' }, { label: 'ไม่ใช่', color: '#ef4444' }]);
            if (!val) return fallback;
            var isYes = val === 'yes';
            return '<span style="background:' + (isYes ? '#22c55e' : '#ef4444') + '; color:#fff; padding:1px 6px; border-radius:3px; font-size:9px; font-weight:600; display:inline-block; min-width:35px; text-align:center; margin-right:6px;">' + (isYes ? 'ใช่' : 'ไม่ใช่') + '</span>';
        };
        var installDateStr = log.installDate ? formatDateTimeDDMMYYYY(log.installDate) : fallback;
        inspHtml += '<div class="section-block"><h2>ข้อมูลสถานที่การติดตั้ง/รื้อถอน <span style="font-weight:400; font-size:9px; color:#666; margin-left:8px;">วันที่ดำเนินการ: ' + installDateStr + '</span></h2>';
        var pdfCell = function (label, value) {
            return '<div style="display:flex; align-items:center; justify-content:space-between; padding:5px 0; border-bottom:1px solid #eee; font-size:10px; min-height:22px;"><span style="font-weight:600; color:#555; white-space:nowrap;">' + label + '</span><span style="text-align:right;">' + value + '</span></div>';
        };
        inspHtml += '<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px 16px; border:1px solid #ddd; border-radius:6px; padding:8px;">';
        inspHtml += '<div style="display:flex; align-items:center; justify-content:space-between; padding:5px 0; border-bottom:1px solid #eee; font-size:10px; min-height:22px;"><span style="font-weight:700; color:#333;">ประเภทงาน</span><span style="font-weight:700; color:#333;">' + (log.installType || log.category || fallback) + '</span></div>';
        inspHtml += pdfCell('มีทางลาด', pdfYesNo(log.useRamp) + (log.useRamp === 'yes' && log.rampWidth ? ' <span style="font-weight:600; color:#555;">กว้าง:</span> ' + log.rampWidth + ' ม.' : ''));
        inspHtml += pdfCell('มีลิฟต์', pdfYesNo(log.useElevator) + (log.useElevator === 'yes' ? ' <span style="font-weight:600; color:#555;">น้ำหนัก:</span> ' + (log.elevatorCapacity ? log.elevatorCapacity + ' kg' : fallback) + ' <span style="font-weight:600; color:#555;">ประตู:</span> ' + (log.elevatorDoorWidth && log.elevatorDoorHeight ? log.elevatorDoorWidth + '×' + log.elevatorDoorHeight + ' ม.' : fallback) : ''));
        inspHtml += pdfCell('ช่องทางเดิน (แคบสุด)', (log.walkwayWidth ? 'กว้าง ' + log.walkwayWidth + ' ม.' : fallback) + ' / ' + (log.walkwayHeight ? 'สูง ' + log.walkwayHeight + ' ม.' : fallback));
        inspHtml += pdfCell('ต้องเดินสายไฟ', pdfYesNo(log.needWiring));
        inspHtml += pdfCell('ต้องเดิน Power Plug', pdfYesNo(log.needPowerPlug));
        inspHtml += pdfCell('ระยะจากตู้ไฟไปยังเครื่อง', log.wireDistance ? log.wireDistance + ' ม.' : fallback);
        inspHtml += pdfCell('เจาะกำแพง', pdfYesNo(log.needDrillWall));
        inspHtml += pdfCell('สายไฟเดินลอดฝ้า', pdfYesNo(log.wireThroughCeiling));
        inspHtml += pdfCell('ช่างโรงพยาบาล', (log.hospitalTechName || fallback) + ' / ' + (log.hospitalTechPhone || fallback));
        inspHtml += '</div>';
        // Door section - full width
        inspHtml += '<div style="border:1px solid #ddd; border-radius:6px; padding:8px; margin-top:6px; font-size:10px;">';
        inspHtml += '<div style="font-weight:600; margin-bottom:4px;">ประตูที่ต้องผ่าน: ' + (log.doorCount || fallback) + (log.doorCount ? ' ประตู' : '') + '</div>';
        if (log.doorSizes && log.doorSizes.length > 0) {
            inspHtml += '<div style="display:grid; grid-template-columns:repeat(' + Math.min(log.doorSizes.length, 4) + ', 1fr); gap:6px;">';
            log.doorSizes.forEach(function (door, i) {
                inspHtml += '<div style="background:#f9f9f9; border:1px solid #eee; border-radius:4px; padding:4px 8px; text-align:center;"><div style="font-weight:600; font-size:9px; color:#555;">ประตูที่ ' + (i + 1) + '</div><div>กว้าง ' + (door.width || fallback) + ' × สูง ' + (door.height || fallback) + ' ม.</div></div>';
            });
            inspHtml += '</div>';
        }
        inspHtml += '</div>';
        // ผลการปฎิบัติงาน section
        inspHtml += '<div class="section-block">';
        inspHtml += '<h2>ผลการปฎิบัติงาน</h2>';
        inspHtml += '<div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:4px 16px; border:1px solid #ddd; border-radius:6px; padding:8px; font-size:10px;">';
        var startDate = log.timeStart ? formatDateTimeDDMMYYYY(log.timeStart) : (log.date ? formatDateDDMMYYYY(log.date) : '-');
        var endDate = log.timeEnd ? formatDateTimeDDMMYYYY(log.timeEnd) : '-';
        var totalTime = '-';
        if (log.timeStart && log.timeEnd) {
            var msStart = new Date(log.timeStart).getTime();
            var msEnd = new Date(log.timeEnd).getTime();
            if (msEnd > msStart) {
                var diff = msEnd - msStart;
                var days = Math.floor(diff / (1000 * 60 * 60 * 24));
                var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                totalTime = (days > 0 ? days + ' วัน ' : '') + hours + ' ชั่วโมง ' + mins + ' นาที';
            }
        }
        var resultCell = function (label, value) {
            return '<div style="display:flex; flex-direction:column; padding:4px 0;"><span style="font-weight:600; color:#555; font-size:9px;">' + label + '</span><span style="font-size:10px;">' + value + '</span></div>';
        };
        inspHtml += resultCell('วันเวลาเริ่ม', startDate);
        inspHtml += resultCell('วันเวลาสิ้นสุด', endDate);
        inspHtml += resultCell('สถานะ', statusText);
        inspHtml += resultCell('ระยะเวลารวม', totalTime);
        inspHtml += '</div>';
        if (log.actionPlan) {
            inspHtml += '<div style="margin-top:6px; font-size:10px;"><span style="font-weight:600; color:#555;">แนวทางการดำเนินงาน:</span><div style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; margin-top:2px; white-space:pre-wrap;">' + log.actionPlan + '</div></div>';
        }
        inspHtml += '</div>';

        // ตรวจสอบรายละเอียดก่อนส่งมอบ section
        if (log.category !== 'รื้อถอน') {
            var precheckItems = [
                ['precheck_electrical', 'ระบบไฟฟ้าภายในเครื่อง'],
                ['precheck_wiring', 'ระบบการเดินสายไฟ'],
                ['precheck_grounding', 'ระบบสายดิน'],
                ['precheck_doorMotor', 'ระบบประตู, มอเตอร์'],
                ['precheck_connectors', 'ระบบข้อต่อ'],
                ['precheck_vacuumPump', 'ระบบปั้มสุญญากาศ'],
                ['precheck_leakTest', 'การตรวจการรั่วไหล'],
                ['precheck_chemical', 'การตรวจปริมาณน้ำยาที่ฉีด'],
                ['precheck_sensors', 'ระบบ Sensor ต่างๆ'],
                ['precheck_sterilize', 'การตรวจ Sterilize ด้วย CI, CI PCD'],
                ['precheck_gasResidual', 'การตรวจปริมาณแก๊สตกค้าง'],
                ['precheck_interior', 'การตรวจความเรียบร้อยภายในเครื่อง'],
                ['precheck_exterior', 'การตรวจความเรียบร้อยภายนอกเครื่อง']
            ];
            var precheckBadge = function (val) {
                if (isBlank) return renderPillGroup([{ label: 'ผ่าน', color: '#22c55e' }, { label: 'ไม่ผ่าน', color: '#ef4444' }, { label: 'ไม่จำเป็น', color: '#94a3b8' }]);
                if (val === 'noneed') return '<span style="background:#94a3b8; color:#fff; padding:1px 6px; border-radius:3px; font-size:9px; font-weight:600; display:inline-block; min-width:42px; text-align:center;">ไม่จำเป็น</span>';
                if (!val || val === 'pending') return '<span style="background:#f59e0b; color:#fff; padding:1px 6px; border-radius:3px; font-size:9px; font-weight:600; display:inline-block; min-width:42px; text-align:center;">รอตรวจ</span>';
                if (val === 'pass') return '<span style="background:#22c55e; color:#fff; padding:1px 6px; border-radius:3px; font-size:9px; font-weight:600; display:inline-block; min-width:42px; text-align:center;">ผ่าน</span>';
                return '<span style="background:#ef4444; color:#fff; padding:1px 6px; border-radius:3px; font-size:9px; font-weight:600; display:inline-block; min-width:42px; text-align:center;">ไม่ผ่าน</span>';
            };
            var precheckDateStr = log.precheckDate ? formatDateTimeDDMMYYYY(log.precheckDate) : '-';
            inspHtml += '<div class="section-block"><h2>ตรวจสอบรายละเอียดก่อนส่งมอบ (กรณีติดตั้งเครื่องเท่านั้น) <span style="font-weight:400; font-size:9px; color:#666; margin-left:8px;">วันที่ตรวจ: ' + precheckDateStr + '</span></h2>';
            inspHtml += '<table style="border:1px solid #ddd; border-radius:6px; font-size:10px; width:100%;">';
            inspHtml += '<thead><tr style="border-bottom:1px solid #ddd;"><th style="padding:4px 8px; width:25px;">ลำดับ</th><th style="padding:4px 8px; width:160px;">รายการตรวจสอบ</th><th style="padding:4px 8px; width:' + (isBlank ? '160px' : '55px') + '; text-align:center;">ผลตรวจ</th><th style="padding:4px 8px;">หมายเหตุ</th></tr></thead>';
            inspHtml += '<tbody>';
            precheckItems.forEach(function (item, idx) {
                var val = log[item[0]] || 'pending';
                var note = log[item[0] + '_note'] || '-';
                inspHtml += '<tr style="border-bottom:1px solid #eee;"><td style="padding:3px 8px; text-align:center;">' + (idx + 1) + '</td><td style="padding:3px 8px;">' + item[1] + '</td><td style="padding:3px 8px; text-align:center;">' + precheckBadge(val) + '</td><td style="padding:3px 8px; color:#666;">' + note + '</td></tr>';
            });
            inspHtml += '</tbody></table></div>';
        }

    }

    // Repair section for PDF
    if (isRepairPdf) {
        // Initial description
        inspHtml += '<h2>รายละเอียดอาการ</h2>';
        inspHtml += '<div style="padding:6px 8px; background:#f9f9f9; border:1px solid #ddd; border-radius:6px; white-space:pre-wrap; font-size:10px;">' + initialDetail + '</div>';

        inspHtml += '<h2>รายการที่ซ่อม</h2>';
        if (log.repairChecklist && log.repairChecklist.length > 0) {
            var repairBadge = function (val) {
                if (isBlank) return renderPillGroup([{ label: 'ผ่าน', color: '#22c55e' }, { label: 'ไม่ผ่าน', color: '#ef4444' }]);
                if (val === 'pass') return '<span style="background:#22c55e; color:#fff; padding:1px 6px; border-radius:3px; font-size:9px; font-weight:600; display:inline-block; min-width:42px; text-align:center;">ผ่าน</span>';
                if (val === 'fail') return '<span style="background:#ef4444; color:#fff; padding:1px 6px; border-radius:3px; font-size:9px; font-weight:600; display:inline-block; min-width:42px; text-align:center;">ไม่ผ่าน</span>';
                return '<span style="color:#999; font-size:9px;">-</span>';
            };
            inspHtml += '<table style="border:1px solid #ddd; border-radius:6px; font-size:10px; width:100%;">';
            inspHtml += '<thead><tr style="border-bottom:1px solid #ddd;"><th style="padding:4px 8px; width:25px;">ลำดับ</th><th style="padding:4px 8px;">รายการ</th><th style="padding:4px 8px; width:' + (isBlank ? '110px' : '55px') + '; text-align:center;">ผลตรวจ</th><th style="padding:4px 8px;">หมายเหตุ</th></tr></thead>';
            inspHtml += '<tbody>';
            log.repairChecklist.forEach(function (item, i) {
                inspHtml += '<tr style="border-bottom:1px solid #eee;"><td style="padding:3px 8px; text-align:center;">' + (i + 1) + '</td><td style="padding:3px 8px;">' + (item.label || '-') + '</td><td style="padding:3px 8px; text-align:center;">' + repairBadge(item.status) + '</td><td style="padding:3px 8px; color:#666;">' + (item.note || '-') + '</td></tr>';
            });
            inspHtml += '</tbody></table>';
        } else {
            inspHtml += '<div style="font-size:10px; color:#999; padding:8px;">ไม่มีรายการ</div>';
        }

        // ผลการปฎิบัติงาน (merged with สภาพเครื่อง)
        var isReady = log.machineStatusAfter === 'ready';
        var isNotReady = log.machineStatusAfter === 'not_ready';
        var statusBg = isReady ? '#dcfce7' : (isNotReady ? '#fee2e2' : '#f3f4f6');
        var statusColor = isReady ? '#15803d' : (isNotReady ? '#dc2626' : '#666');
        var statusLabel = isReady ? 'พร้อมใช้งาน' : (isNotReady ? 'ไม่พร้อมใช้งาน' : '-');

        inspHtml += '<h2>ผลการปฎิบัติงาน</h2>';
        var rStart = log.timeStart ? formatDateTimeDDMMYYYY(log.timeStart) : (log.date ? formatDateDDMMYYYY(log.date) : '-');
        var rEnd = log.timeEnd ? formatDateTimeDDMMYYYY(log.timeEnd) : '-';
        var rTime = '-';
        if (log.timeStart && log.timeEnd) {
            var ms1 = new Date(log.timeStart).getTime(), ms2 = new Date(log.timeEnd).getTime();
            if (ms2 > ms1) { var df = ms2 - ms1; var dy = Math.floor(df / 864e5); var hr = Math.floor((df % 864e5) / 36e5); var mn = Math.floor((df % 36e5) / 6e4); rTime = (dy > 0 ? dy + ' วัน ' : '') + hr + ' ชั่วโมง ' + mn + ' นาที'; }
        }
        var rc = function (l, v) { return '<div style="padding:4px 0;"><span style="font-weight:700; color:#333; font-size:9px;">' + l + '</span><br><span>' + v + '</span></div>'; };
        inspHtml += '<div style="border:1px solid #ddd; border-radius:6px; padding:8px; font-size:10px;">';
        inspHtml += '<div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:4px 16px;">';
        inspHtml += rc('วันเวลาเริ่ม', rStart) + rc('วันเวลาสิ้นสุด', rEnd) + rc('สถานะ', statusText) + rc('ระยะเวลารวม', rTime);
        inspHtml += '</div>';
        inspHtml += '<div style="display:grid; grid-template-columns:auto 1fr; gap:0; border-top:1px solid #eee; margin-top:8px; padding-top:8px;">';
        inspHtml += '<div style="display:flex; align-items:center; justify-content:center; padding:6px 20px; background:' + statusBg + '; border-radius:6px; min-width:130px;"><span style="font-size:13px; font-weight:700; color:' + statusColor + '; white-space:nowrap;">สภาพเครื่อง: ' + statusLabel + '</span></div>';
        inspHtml += '<div style="padding:6px 14px; font-size:10px;"><span style="font-weight:600; color:#555;">หมายเหตุ:</span> <span style="color:#333;">' + (log.machineStatusAfterNote || '-') + '</span></div>';
        inspHtml += '</div></div>';

        // กรณีรับสินค้ากลับ
        if ((log.returnProducts && log.returnProducts.length > 0) || log.returnProductNote) {
            inspHtml += '<h2>กรณีรับสินค้ากลับ</h2>';
            if (log.returnProductNote) {
                inspHtml += '<div style="font-size:10px; padding:6px 8px; border:1px solid #ddd; border-radius:4px; margin-bottom:6px; white-space:pre-wrap; color:#555;">' + log.returnProductNote + '</div>';
            }
            if (log.returnProducts && log.returnProducts.length > 0) {
                inspHtml += '<table style="border:1px solid #ddd; border-radius:6px; font-size:10px; width:100%;">';
                inspHtml += '<thead><tr style="border-bottom:1px solid #ddd;"><th style="padding:4px 8px; width:25px;">ลำดับ</th><th style="padding:4px 8px;">รายการสินค้า</th><th style="padding:4px 8px;">หมายเหตุ</th></tr></thead>';
                inspHtml += '<tbody>';
                log.returnProducts.forEach(function (item, i) {
                    inspHtml += '<tr style="border-bottom:1px solid #eee;"><td style="padding:3px 8px; text-align:center;">' + (i + 1) + '</td><td style="padding:3px 8px;">' + (item.name || '-') + '</td><td style="padding:3px 8px; color:#666;">' + (item.note || '-') + '</td></tr>';
                });
                inspHtml += '</tbody></table>';
            }
        }
    }

    var pdfDocTitle = isInstallPdf ? 'ใบบันทึกการติดตั้ง-รื้อถอน' : (isRepairPdf ? 'ใบบันทึกการซ่อมเครื่องมือ' : 'ใบตรวจเช็คการบำรุงรักษาเครื่อง');
    var pdfFooterCode = isInstallPdf ? 'FM-SER-01' : (isRepairPdf ? 'FM-SER-06' : 'FM-SER-05');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${log.caseId || 'MA Case'}</title>
<style>
    @page { size: A4 portrait; margin: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; font-size: 11px; color: #333; box-sizing: border-box; }
    .wrap-table { width: 100%; border-collapse: collapse; }
    .wrap-table > thead > tr > td, .wrap-table > tfoot > tr > td, .wrap-table > tbody > tr > td { padding: 0; vertical-align: top; }
    .wrap-table > thead > tr > td { padding: 0 10mm; }
    .wrap-table > tfoot > tr > td { padding: 0 10mm; visibility: hidden; height: 24mm; }
    .wrap-table > tbody > tr > td { padding: 0 10mm; }
    .fixed-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 0 10mm 3mm; background: #fff; }
    .hdr-space, .ftr-space { height: 0; }
    .page-header { display: flex; align-items: center; gap: 12px; padding: 5mm 0 4px; }
    .page-header img { height: 45px; width: auto; }
    .page-header .company-info { flex: 1; text-align: right; font-size: 9px; color: #333; line-height: 1.6; }
    .header-line { position: relative; height: 2px; background: #ddd !important; margin-bottom: 6mm; }
    .header-line::before { content: ''; position: absolute; top: 50%; left: 0; transform: translateY(-50%); width: 25%; height: 5px; background: #8bc53f !important; border-radius: 2px; }
    .header-dots { text-align: right; margin-top: -2px; margin-bottom: 4px; }
    .header-dots span { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-left: 3px; }
    h2 { font-size: 11px; color: #333; margin: 10px 0 4px; padding-bottom: 0; border-bottom: none; }
    .label { color: #333; font-weight: bold; }
    table:not(.wrap-table) { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 4px 6px; background: #f5f5f5 !important; border-bottom: 2px solid #ddd; font-size: 10px; }
    td { font-size: 10px; }
    .footer-line { position: relative; height: 2px; background: #ddd !important; }
    .footer-line::before { content: ''; position: absolute; top: 50%; right: 0; transform: translateY(-50%); width: 25%; height: 5px; background: #8bc53f !important; border-radius: 2px; }
    .footer-text { font-size: 8px; color: #333; padding: 3px 0 4mm; display: flex; justify-content: space-between; }
    img { page-break-inside: avoid; }
    .no-break { page-break-inside: avoid; }
    .section-block { }
</style>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
</head><body>

<table class="wrap-table">
<thead><tr><td>
    <div class="page-header">
        <img src="/bioinnotech.svg" alt="Logo">
        <div class="company-info">
            <b>บริษัท ไบโอ อินโน เทค จำกัด</b><br>
            36/41 หมู่ 13 ต.บึงคำพร้อย อ.ลำลูกกา จ.ปทุมธานี 12150<br>
            โทรศัพท์ 02-152-5405 เลขประจำตัวผู้เสียภาษี 0105557108369
        <div class="header-dots">
            <span style="background: #c5e1a5;"></span>
            <span style="background: #81c784;"></span>
            <span style="background: #4caf50;"></span>
        </div>
    </div>
</div>
<div class="header-line"></div>
</td></tr></thead>

<tfoot><tr><td>
    <div style="height: 24mm;"></div>
</td></tr></tfoot>

<tbody><tr><td>
<h1 style="text-align:center; font-size:15px; margin:0 0 4px; color:#333;">${pdfDocTitle}</h1>

${isRepairPdf ? `
<div class="section-block">
<h2 style="margin-top:8px;">รายละเอียดเคส</h2>
<div style="font-size:10px; line-height:1.8; padding:4px 0;">
    <span class="label">รหัสเคส:</span> ${log.caseId || '-'} &nbsp;&nbsp; <span class="label">วันที่:</span> ${thaiDate} &nbsp;&nbsp; <span class="label">ผู้เปิดเคส:</span> ${recorderName} &nbsp;&nbsp; <span class="label">เจ้าหน้าที่ช่างบริการ:</span> ${responderName}
</div>
</div>

<div class="section-block">
<h2>ข้อมูลผู้แจ้ง</h2>
<div style="font-size:10px; line-height:1.8; padding:4px 0;">
    <span class="label">โรงพยาบาล:</span> ${site.name} &nbsp;&nbsp; <span class="label">หน่วยงาน:</span> ${site.installLocation || site.villageName || '-'} &nbsp;&nbsp; <span class="label">ที่อยู่:</span> ${[site.subdistrict, site.district, site.province].filter(Boolean).join(', ') || '-'}<br>
    <span class="label">ชื่อผู้แจ้ง:</span> ${reporterName !== '-' ? reporterName : (site.picName || '-')} &nbsp;&nbsp; <span class="label">เบอร์โทร:</span> ${reporterPhone !== '-' ? reporterPhone : (site.contactPhone || '-')}
    &nbsp;&nbsp; <span class="label">ตำแหน่ง:</span> ${reporterPosition !== '-' ? reporterPosition : '-'}
</div>
</div>
` : ''}

${isRepairPdf ? `
<div class="section-block">
<h2 style="margin-top:8px;">รายละเอียดอุปกรณ์</h2>
<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:2px 16px; font-size:10px; border:1px solid #ddd; border-radius:6px; padding:8px;">
    <div style="padding:4px 0; border-bottom:1px solid #eee;"><span style="font-weight:600; color:#555;">ยี่ห้อ</span><br>${site.brand || '-'}</div>
    <div style="padding:4px 0; border-bottom:1px solid #eee;"><span style="font-weight:600; color:#555;">รุ่น</span><br>${site.model || '-'}</div>
    <div style="padding:4px 0; border-bottom:1px solid #eee;"><span style="font-weight:600; color:#555;">ประเภท</span><br>${site.deviceType || '-'}</div>
    <div style="padding:4px 0;"><span style="font-weight:600; color:#555;">S/N</span><br>${site.serialNumber || '-'}</div>
    <div style="padding:4px 0;"><span style="font-weight:600; color:#555;">จำนวนรอบขณะเช็ค</span><br>${log.cycleCount ? Number(log.cycleCount).toLocaleString() + ' รอบ' : '-'}</div>
    <div style="padding:4px 0;"><span style="font-weight:600; color:#555;">ระยะเวลาประกัน</span><br>${site.insuranceStartDate || '-'} ถึง ${site.insuranceEndDate || '-'}</div>
</div>
</div>
` : `
<div class="section-block">
<h2 style="margin-top:8px;">ข้อมูลงาน (Job Information)</h2>
${isInstallPdf ? `<div style="font-size:10px; line-height:1.8; padding:4px 0;">
    <span class="label">รหัสเคส:</span> ${log.caseId || '-'} &nbsp;&nbsp; <span class="label">โรงพยาบาล:</span> ${site.name} &nbsp;&nbsp; <span class="label">หน่วยงาน:</span> ${site.installLocation || site.villageName || '-'} &nbsp;&nbsp; <span class="label">S/N:</span> ${site.serialNumber || '-'} &nbsp;&nbsp; <span class="label">ยี่ห้อ:</span> ${site.brand || '-'} &nbsp;&nbsp; <span class="label">รุ่น:</span> ${site.model || '-'}<br>
    <span class="label">วันที่:</span> ${thaiDate} &nbsp;&nbsp; <span class="label">รูปแบบสัญญา:</span> ${site.deviceType || '-'} &nbsp;&nbsp; <span class="label">เจ้าหน้าที่ช่างบริการ:</span> ${responderName} &nbsp;&nbsp; <span class="label">หมวดหมู่:</span> ${log.category || '-'} &nbsp;&nbsp; <span class="label">จังหวัด:</span> ${site.province || '-'}
</div>` : `<div style="font-size:10px; line-height:1.8; padding:4px 0;">
    <span class="label">โรงพยาบาล:</span> ${site.name} &nbsp;&nbsp; <span class="label">หน่วยงาน:</span> ${site.installLocation || site.villageName || '-'} &nbsp;&nbsp; <span class="label">S/N:</span> ${site.serialNumber || '-'} &nbsp;&nbsp; <span class="label">ยี่ห้อ:</span> ${site.brand || '-'} &nbsp;&nbsp; <span class="label">รุ่น:</span> ${site.model || '-'}<br>
    <span class="label">รหัสเคส:</span> ${log.caseId || '-'} &nbsp;&nbsp; <span class="label">วันที่:</span> ${thaiDate} &nbsp;&nbsp; <span class="label">รูปแบบสัญญา:</span> ${site.deviceType || '-'} &nbsp;&nbsp; <span class="label">เจ้าหน้าที่ช่างบริการ:</span> ${responderName} &nbsp;&nbsp; <span class="label">หมวดหมู่:</span> ${log.category || '-'}<br>
    <span class="label">จังหวัด:</span> ${site.province || '-'} &nbsp;&nbsp; <span class="label">สถานะ:</span> ${statusText} &nbsp;&nbsp; <span class="label">รอบซ่อมบำรุง:</span> ${site.maintenanceCycle ? site.maintenanceCycle + ' วัน' : '-'} &nbsp;&nbsp; <span class="label">ระยะเวลาประกัน:</span> ${site.insuranceStartDate || '-'} ถึง ${site.insuranceEndDate || '-'} &nbsp;&nbsp; <span class="label">จำนวนรอบขณะเช็ค:</span> ${log.cycleCount ? Number(log.cycleCount).toLocaleString() + ' รอบ' : '-'}
</div>`}
</div>
`}

${inspHtml}


<div class="section-block">
<h2>ข้อมูลลูกค้าผู้จบงาน</h2>
<table style="font-size:10px; border:1px solid #ddd; border-radius:6px;">
    <tr style="border-bottom:1px solid #eee;">
        <td style="padding:4px 8px; font-weight:700; width:33%;">ชื่อผู้จบงาน</td>
        <td style="padding:4px 8px; font-weight:700; width:33%;">เบอร์โทร</td>
        <td style="padding:4px 8px; font-weight:700; width:34%;">ตำแหน่ง</td>
    </tr>
    <tr>
        <td style="padding:4px 8px;">${doneName}</td>
        <td style="padding:4px 8px;">${customerTel}</td>
        <td style="padding:4px 8px;">${customerPosition}</td>
    </tr>
</table>
</div>

${isInstallPdf ? `
<div style="page-break-before: always;">
<h2>รูปถ่ายก่อนติดตั้ง/รื้อถอน (Pre-installation/removal Photos)</h2>
${(log.preInstallPhotos && log.preInstallPhotos.length > 0) ? `
<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
${log.preInstallPhotos.map(function (img) { return '<div style="border:1px solid #eee; border-radius:4px; overflow:hidden; aspect-ratio:4/3;"><img src="' + img.url + '" style="width:100%; height:100%; display:block; object-fit:contain;"></div>'; }).join('')}
</div>` : `<div style="padding:15px; text-align:center; color:#999; font-size:11px; border:1px solid #eee; border-radius:6px; background:#fafafa;">ไม่มีข้อมูล</div>`}
</div>

<h2>รูปถ่ายหลังติดตั้ง/รื้อถอน (Post-installation/removal Photos)</h2>
${(log.installPhotos && log.installPhotos.length > 0) ? `
<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
${log.installPhotos.map(function (img) { return '<div style="border:1px solid #eee; border-radius:4px; overflow:hidden; aspect-ratio:4/3;"><img src="' + img.url + '" style="width:100%; height:100%; display:block; object-fit:contain;"></div>'; }).join('')}
</div>` : `<div style="padding:15px; text-align:center; color:#999; font-size:11px; border:1px solid #eee; border-radius:6px; background:#fafafa;">ไม่มีข้อมูล</div>`}
` : `
${(() => {
            const descAtts = [...(log.descriptionAttachments || []), ...(log.attachments || [])].filter(a => a.url && !a.type?.startsWith('video/'));
            const repairAtts = (log.repairPhotos || []).filter(a => a.url && !a.type?.startsWith('video/'));
            const afterAtts = (log.attachmentsAfter || []).filter(a => a.url && !a.type?.startsWith('video/'));
            const hasAny = descAtts.length || repairAtts.length || afterAtts.length;
            if (!hasAny) return '';
            const renderPhotoSection = (title, items) => {
                if (!items.length) return '';
                return `<div style="margin-bottom:16px; page-break-inside:avoid;">
<h2 style="font-size:11px; margin:0 0 6px; color:#333;">${title}</h2>
<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
${items.map(function (img) { return '<div style="border:1px solid #eee; border-radius:4px; overflow:hidden; aspect-ratio:4/3;"><img src="' + img.url + '" style="width:100%; height:100%; display:block; object-fit:contain;"></div>'; }).join('')}
</div></div>`;
            };
            return `<div style="page-break-before: always;">
${renderPhotoSection('ไฟล์ประกอบคำอธิบายงาน', descAtts)}
${renderPhotoSection('รูปหลังซ่อม', repairAtts)}
${renderPhotoSection('รูปถ่ายหลังซ่อม (After Repair)', afterAtts)}
</div>`;
        })()
        }`}

<div style="page-break-inside: avoid;">
<h2>ลายเซ็น (Signatures)</h2>
${signatureHtml}
</div>

</td></tr></tbody>
</table>

<div class="fixed-footer">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:3px;">
        <div style="display:flex; align-items:center; gap:8px; visibility: ${isBlank ? 'hidden' : 'visible'};">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`https://water-plant-maintenance.web.app?logId=${log.id}`)}" alt="QR" style="width:45px; height:45px;">
            <div>
                <div style="font-size:8px; font-weight:700; color:#333;">สแกนเพื่อดูรายละเอียดเคสฉบับเต็ม</div>
                <div style="font-size:7px; color:#888;">Scan to view full case detail</div>
            </div>
        </div>
        <span id="page-info2" style="font-size:8px; color:#333;"></span>
    </div>
    <div class="footer-line"></div>
    <div class="footer-text">
        <span>บริษัท ไบโอ อินโน เทค จำกัด</span>
        <span>${pdfFooterCode} Rev.00 Effective date : 02-02-2026</span>
    </div>
</div>

<script>
window.onload = function() {
    var contentHeight = document.body.scrollHeight;
    var pageHeight = 297 * 3.78;
    var totalPages = Math.max(1, Math.ceil(contentHeight / pageHeight));
    var el = document.getElementById('page-info');
    if (el) el.textContent = '';
    var el2 = document.getElementById('page-info2');
    if (el2) el2.textContent = '';

    // Create page number overlays for each page
    var pageNumStyle = 'position:absolute; right:10mm; font-size:8px; color:#333; z-index:100; background:#fff; padding:0 4px;';
    var pagePx = 297 * 3.78;
    var footerOffset = 20 * 3.78;
    
    for (var p = 1; p <= totalPages; p++) {
        var marker = document.createElement('div');
        marker.style.cssText = pageNumStyle;
        marker.style.top = (p * pagePx - footerOffset) + 'px';
        marker.textContent = 'หน้า ' + p + ' จาก ' + totalPages;
        document.body.appendChild(marker);
    }
};
</script>

</body></html>`;

    // Show PDF preview as lightbox
    let pdfModal = document.getElementById('pdf-preview-modal');
    if (!pdfModal) {
        pdfModal = document.createElement('div');
        pdfModal.id = 'pdf-preview-modal';
        pdfModal.style.cssText = 'display:none; position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,0.7); justify-content:center; align-items:center; padding:16px;';
        pdfModal.innerHTML = '<div id="pdf-preview-inner" style="position:relative; width:100%; max-width:900px; height:90vh; background:#fff; border-radius:12px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 8px 32px rgba(0,0,0,0.3);">'
            + '<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #e5e7eb; background:#f9fafb; flex-shrink:0;">'
            + '<span id="pdf-preview-title" style="font-weight:700; font-size:12px; color:#333;">PDF Preview</span>'
            + '<div style="display:flex; gap:8px;">'
            + '<button id="pdf-btn-print" title="พิมพ์" style="display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:#ffffff; color:#111111; border:1.5px solid #111111; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); white-space:nowrap;" onmouseover="this.style.background=\'#111111\';this.style.color=\'#ffffff\';this.style.transform=\'scale(1.03)\';" onmouseout="this.style.background=\'#ffffff\';this.style.color=\'#111111\';this.style.transform=\'none\';"><i class="fa-solid fa-print"></i> พิมพ์</button>'
            + '<button id="pdf-btn-close" title="ปิด" style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; background:#ffffff; color:#111111; border:1.5px solid #e5e5e5; border-radius:8px; font-size:16px; cursor:pointer; transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);" onmouseover="this.style.background=\'#f3f4f6\';this.style.borderColor=\'#d1d5db\';this.style.transform=\'scale(1.05)\';" onmouseout="this.style.background=\'#ffffff\';this.style.borderColor=\'#e5e5e5\';this.style.transform=\'none\';"><i class="fa-solid fa-xmark"></i></button>'
            + '</div></div>'
            + '<iframe id="pdf-preview-iframe" style="flex:1; border:none; width:100%; background:#fff;"></iframe>'
            + '</div>';
        document.body.appendChild(pdfModal);

        document.getElementById('pdf-btn-close').onclick = function () { pdfModal.style.display = 'none'; };
        pdfModal.onclick = function (e) { if (e.target === pdfModal) pdfModal.style.display = 'none'; };
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && pdfModal.style.display === 'flex') pdfModal.style.display = 'none';
        });
        document.getElementById('pdf-btn-print').onclick = function () {
            var fr = document.getElementById('pdf-preview-iframe');
            if (fr && fr.contentWindow) fr.contentWindow.print();
        };
    }

    var iframe = pdfModal.querySelector('iframe');
    var titleEl = pdfModal.querySelector('#pdf-preview-title') || pdfModal.querySelector('span');
    if (titleEl) titleEl.textContent = log.caseId || 'PDF Preview';
    if (iframe) iframe.srcdoc = html;
    pdfModal.style.display = 'flex';
}

window.exportCasePDF = exportCasePDF;

async function exportLogsToExcel() {
    if (typeof XLSX === "undefined") {
        await showDialog(
            "Error: SheetJS library not loaded. Please check your internet connection or try refreshing.",
        );
        return;
    }

    let logs;
    const isCalendarView =
        document.getElementById("logs-calendar-view") &&
        !document.getElementById("logs-calendar-view").classList.contains("hidden");
    let titleLabel = "";

    if (isCalendarView) {
        // Filter by Calendar Month/Year
        const monthSelect = document.getElementById("filter-cal-month");
        const yearSelect = document.getElementById("filter-cal-year");
        const month = parseInt(monthSelect.value);
        const year = parseInt(yearSelect.value);

        const monthNames = [
            "มกราคม",
            "กุมภาพันธ์",
            "มีนาคม",
            "เมษายน",
            "พฤษภาคม",
            "มิถุนายน",
            "กรกฎาคม",
            "สิงหาคม",
            "กันยายน",
            "ตุลาคม",
            "พฤศจิกายน",
            "ธันวาคม",
        ];
        titleLabel = `รายงานประจำเดือน ${monthNames[month]} ${year + 543}`;

        titleLabel = `รายงานประจำเดือน ${monthNames[month]} ${year + 543}`;

        logs = state.calendarLogs.filter((l) => {
            if (!l.date) return false;
            const d = new Date(l.date);
            if (d.getFullYear() !== year || d.getMonth() !== month) return false;

            // Apply Active Filters (Site, Price, Search) - mirroring renderCalendar logic
            const filterId = selects.filterHidden
                ? selects.filterHidden.value
                : "all";
            if (filterId !== "all" && l.siteId !== filterId) return false;

            // [NEW] Category Filter
            const categorySelect = document.getElementById("filter-category");
            const categoryValue = categorySelect ? categorySelect.value : "all";
            if (categoryValue !== "all" && l.category !== categoryValue) return false;

            const minPrice = document.getElementById("filter-min-price")
                ? parseCurrency(document.getElementById("filter-min-price").value)
                : 0;
            const maxPrice = document.getElementById("filter-max-price")
                ? parseCurrency(document.getElementById("filter-max-price").value)
                : Infinity;
            const cost = parseFloat(l.cost) || 0;
            if (cost < minPrice) return false;

            // Handle maxPrice manual check
            const maxInput = document.getElementById("filter-max-price")
                ? document.getElementById("filter-max-price").value
                : "";
            if (maxInput !== "" && cost > maxPrice) return false;

            const query = document.getElementById("log-search-input")
                ? document.getElementById("log-search-input").value.toLowerCase().trim()
                : "";
            if (query) {
                const site = state.sites.find((s) => s.id === l.siteId);
                const siteName = site ? site.name.toLowerCase() : "";
                const objective = l.objective.toLowerCase();
                const notes = l.notes ? l.notes.toLowerCase() : "";
                if (
                    !siteName.includes(query) &&
                    !objective.includes(query) &&
                    !notes.includes(query)
                )
                    return false;
            }
            return true;
        });
    } else {
        // List View: Fetch ALL logs matching criteria to avoid pagination limits

        // 1. Gather Filters
        const filterId = selects.filterHidden ? selects.filterHidden.value : "all";
        const startVal = selects.filterStart && selects.filterStart.value;
        const endVal = selects.filterEnd && selects.filterEnd.value;
        const startDate = startVal ? new Date(startVal) : null;
        const endDate = endVal ? new Date(endVal) : null;

        const categoryFilter = selects.filterCategory
            ? selects.filterCategory.value
            : "all";
        const minPrice = parseCurrency(
            document.getElementById("filter-min-price")?.value,
        );
        const maxPriceVal = document.getElementById("filter-max-price")?.value;
        const maxPrice = maxPriceVal ? parseCurrency(maxPriceVal) : Infinity;
        const searchQuery = document.getElementById("log-search-input")
            ? document.getElementById("log-search-input").value
            : "";

        try {
            // 2. Fetch Full Dataset via dedicated Service Method
            const rawLogs = await FirestoreService.fetchLogsInRange(
                startDate,
                endDate,
            );

            // 3. Apply Filters locally
            logs = filterLogsClientSide(rawLogs, {
                siteId: filterId,
                startDate,
                endDate,
                category: categoryFilter,
                minPrice,
                maxPrice,
                searchQuery,
            });
        } catch (fetchErr) {
            console.error("Export Fetch Error:", fetchErr);
            await showDialog(
                "เกิดข้อผิดพลาดในการดึงข้อมูลทั้งหมด: " + fetchErr.message,
            );
            return;
        }

        // Title Formatting
        const start = startDate
            ? startDate.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "2-digit",
            })
            : null;
        const end = endDate
            ? endDate.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "2-digit",
            })
            : null;

        if (start && end) {
            titleLabel = `รายงานประวัติการซ่อมบำรุง (${start} - ${end})`;
        } else if (start) {
            titleLabel = `รายงานประวัติการซ่อมบำรุง (ตั้งแต่ ${start})`;
        } else if (end) {
            titleLabel = `รายงานประวัติการซ่อมบำรุง (ถึง ${end})`;
        } else {
            titleLabel = "รายงานประวัติการซ่อมบำรุงทั้งหมด";
        }
    }

    let subtitleLabel = [];

    // 1. Site/Case ID/Description Search Filter
    const siteSearchQuery = document.getElementById("site-filter-input")
        ? document.getElementById("site-filter-input").value.trim()
        : "";
    if (siteSearchQuery) {
        subtitleLabel.push(`ค้นหา: "${siteSearchQuery}"`);
    }

    // 2. Search Filter
    const searchQuery = document.getElementById("log-search-input")
        ? document.getElementById("log-search-input").value.trim()
        : "";
    if (searchQuery) {
        subtitleLabel.push(`คำค้นหา: "${searchQuery}"`);
    }

    // 3. Price Filter
    const minPriceInput = document.getElementById("filter-min-price")
        ? document.getElementById("filter-min-price").value
        : "";
    const maxPriceInput = document.getElementById("filter-max-price")
        ? document.getElementById("filter-max-price").value
        : "";
    if (minPriceInput || maxPriceInput) {
        const minStr = minPriceInput || "0";
        const maxStr = maxPriceInput || "สูงสุด";
        subtitleLabel.push(`ช่วงราคา: ${minStr} - ${maxStr}`);
    }

    // 4. Category Filter Info ([NEW])
    const categorySelect = document.getElementById("filter-category");
    const categoryValue = categorySelect ? categorySelect.value : "all";
    if (categoryValue !== "all") {
        subtitleLabel.push(`หมวดหมู่: ${categoryValue}`);
    }

    const subtitleText =
        subtitleLabel.length > 0
            ? `ตัวกรอง: ${subtitleLabel.join(" | ")}`
            : "ตัวกรอง: -";

    if (logs.length === 0) {
        await showDialog("ไม่มีข้อมูลสำหรับส่งออก");
        return;
    }

    // Transform data for Excel - Summary Sheet
    const dataForSheet = logs.map((log) => {
        const site = state.sites.find((s) => s.id === log.siteId) || {
            name: "ไม่พบข้อมูลสถานที่",
        };

        // Handle dates - Standard DD-MM-YYYY
        const stdDate = sanitizeDate(log.date);
        let formattedDate = "-";
        if (stdDate && stdDate.includes("-")) {
            const parts = stdDate.split("-");
            if (parts.length === 3)
                formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            else formattedDate = stdDate;
        }

        // Format timestamp
        const timestampStr = log.timestamp
            ? new Date(log.timestamp).toLocaleString('th-TH', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
            : "-";

        // Calculate total cost from line items or use legacy cost
        const totalCost =
            log.lineItems && log.lineItems.length > 0
                ? log.lineItems.reduce((s, li) => s + (li.cost || 0), 0)
                : parseFloat(log.cost) || 0;

        // Count line items
        const lineItemsCount = log.lineItems && log.lineItems.length > 0
            ? log.lineItems.length
            : (log.details ? 1 : 0);

        // Status label mapping
        const statusLabels = {
            Open: "เปิดงาน",
            "On Process": "กำลังดำเนินการ",
            Cancel: "ยกเลิก",
            Done: "เสร็จสิ้น",
            "Case Closed": "ปิดเคส",
            Completed: "เสร็จสิ้น",
        };

        // Get comments summary
        const commentsText = log.comments && log.comments.length > 0
            ? log.comments.map((c, i) => {
                const userName = state.users && c.userId && state.users[c.userId]
                    ? state.users[c.userId].displayName || state.users[c.userId].email
                    : "ไม่ระบุ";
                const commentDate = c.timestamp ? new Date(c.timestamp).toLocaleString('th-TH') : "";
                return `[${commentDate}] ${userName}: ${c.text || ""}`;
            }).join("\n")
            : "";

        return {
            "รหัสเคส": log.caseId ? log.caseId.replace('CASE-', '') : "-",
            วันที่: formattedDate,
            สถานที่: (site.siteCode ? site.siteCode + ' - ' : '') + site.name,
            หมวดหมู่: log.category || "-",
            สถานะ: statusLabels[log.status] || log.status || "เปิดงาน",
            วัตถุประสงค์: log.objective || "-",
            หมายเหตุ: log.notes || "",
            "จำนวนรายการ": lineItemsCount,
            ผู้บันทึก:
                state.users && log.recorderId && state.users[log.recorderId]
                    ? state.users[log.recorderId].displayName ||
                    state.users[log.recorderId].email ||
                    log.recordedBy
                    : log.recordedBy || "-",
            "ค่าใช้จ่ายรวม (บาท)": totalCost,
            "จำนวนไฟล์แนบ": log.attachments ? log.attachments.length : 0,
            ความคิดเห็น: commentsText,
            "บันทึกเมื่อ": timestampStr,
        };
    });

    // Transform data for Line Items Sheet
    const lineItemsData = [];
    logs.forEach((log) => {
        const site = state.sites.find((s) => s.id === log.siteId) || {
            name: "ไม่พบข้อมูลสถานที่",
        };

        // Handle dates
        const stdDate = sanitizeDate(log.date);
        let formattedDate = "-";
        if (stdDate && stdDate.includes("-")) {
            const parts = stdDate.split("-");
            if (parts.length === 3)
                formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            else formattedDate = stdDate;
        }

        // Status label mapping
        const statusLabels = {
            Open: "เปิดงาน",
            "On Process": "กำลังดำเนินการ",
            Cancel: "ยกเลิก",
            Done: "เสร็จสิ้น",
            "Case Closed": "ปิดเคส",
            Completed: "เสร็จสิ้น",
        };

        if (log.lineItems && log.lineItems.length > 0) {
            // Add each line item as a separate row
            log.lineItems.forEach((item, index) => {
                lineItemsData.push({
                    "รหัสเคส": log.caseId ? log.caseId.replace('CASE-', '') : "-",
                    วันที่: formattedDate,
                    สถานที่: (site.siteCode ? site.siteCode + ' - ' : '') + site.name,
                    หมวดหมู่: log.category || "-",
                    สถานะ: statusLabels[log.status] || log.status || "เปิดงาน",
                    ลำดับ: index + 1,
                    รายการ: item.item || "-",
                    "ค่าใช้จ่าย (บาท)": parseFloat(item.cost) || 0,
                    วัตถุประสงค์: log.objective || "-",
                    หมายเหตุ: log.notes || "",
                });
            });
        } else if (log.details) {
            // Legacy format - add single row with details
            lineItemsData.push({
                "รหัสเคส": log.caseId ? log.caseId.replace('CASE-', '') : "-",
                วันที่: formattedDate,
                สถานที่: (site.siteCode ? site.siteCode + ' - ' : '') + site.name,
                หมวดหมู่: log.category || "-",
                สถานะ: statusLabels[log.status] || log.status || "เปิดงาน",
                ลำดับ: 1,
                รายการ: log.details || "-",
                "ค่าใช้จ่าย (บาท)": parseFloat(log.cost) || 0,
                วัตถุประสงค์: log.objective || "-",
                หมายเหตุ: log.notes || "",
            });
        }
    });

    // Create Workbook
    const workbook = XLSX.utils.book_new();

    // ===== SHEET 1: Summary =====
    // Data starts at Row 3 (A3)
    const worksheet = XLSX.utils.json_to_sheet(dataForSheet, { origin: "A3" });

    // Add Title Row (Row 1)
    XLSX.utils.sheet_add_aoa(worksheet, [[titleLabel]], { origin: "A1" });

    // Add Subtitle Row (Row 2)
    XLSX.utils.sheet_add_aoa(worksheet, [[subtitleText]], { origin: "A2" });

    // Merge Cells for Title and Subtitle
    if (!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }); // Merge A1:M1 (Title)
    worksheet["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 12 } }); // Merge A2:M2 (Subtitle)

    // Adjust Column Widths for Summary Sheet
    const wscols = [
        { wch: 12 }, // Case ID
        { wch: 15 }, // Date
        { wch: 30 }, // Site
        { wch: 15 }, // Category
        { wch: 15 }, // Status
        { wch: 30 }, // Objective
        { wch: 20 }, // Notes
        { wch: 12 }, // Line Items Count
        { wch: 20 }, // Recorder
        { wch: 15 }, // Total Cost
        { wch: 12 }, // Attachments Count
        { wch: 50 }, // Comments
        { wch: 20 }, // Timestamp
    ];
    worksheet["!cols"] = wscols;

    XLSX.utils.book_append_sheet(workbook, worksheet, "สรุป");

    // ===== SHEET 2: Line Items Detail =====
    if (lineItemsData.length > 0) {
        const lineItemsWorksheet = XLSX.utils.json_to_sheet(lineItemsData, { origin: "A3" });

        // Add Title Row (Row 1)
        XLSX.utils.sheet_add_aoa(lineItemsWorksheet, [["รายละเอียดรายการค่าใช้จ่าย"]], { origin: "A1" });

        // Add Subtitle Row (Row 2)
        XLSX.utils.sheet_add_aoa(lineItemsWorksheet, [[subtitleText]], { origin: "A2" });

        // Merge Cells for Title and Subtitle
        if (!lineItemsWorksheet["!merges"]) lineItemsWorksheet["!merges"] = [];
        lineItemsWorksheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }); // Merge A1:J1
        lineItemsWorksheet["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }); // Merge A2:J2

        // Adjust Column Widths for Line Items Sheet
        const lineItemsCols = [
            { wch: 12 }, // Case ID
            { wch: 15 }, // Date
            { wch: 30 }, // Site
            { wch: 15 }, // Category
            { wch: 15 }, // Status
            { wch: 8 },  // Order
            { wch: 40 }, // Item Description
            { wch: 15 }, // Item Cost
            { wch: 30 }, // Objective
            { wch: 20 }, // Notes
        ];
        lineItemsWorksheet["!cols"] = lineItemsCols;

        XLSX.utils.book_append_sheet(workbook, lineItemsWorksheet, "รายการค่าใช้จ่าย");
    }

    // Generate Filename
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `maintenance_logs_${timestamp}.xlsx`;

    try {
        // Write to binary string/array
        const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

        // Create Blob
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        console.log("Exporting Excel. Blob size:", blob.size);

        if (blob.size === 0) {
            await showDialog("Error: Generated Excel file is empty.");
            return;
        }

        // Create Download Link
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            console.log("Download cleanup complete");
        }, 2000);
    } catch (err) {
        console.error("Export failed:", err);
        await showDialog("การส่งออกข้อมูลล้มเหลว: " + err.message);
    }
}

// Helper to update Count and Total Cost UI
function updateLogStats(filteredLogs, globalSummary = null) {
    let totalCost, totalCount;

    if (globalSummary) {
        totalCost = globalSummary.totalCost;
        totalCount = globalSummary.count;
    } else {
        totalCost = filteredLogs.reduce(
            (sum, log) => sum + (parseFloat(log.cost) || 0),
            0,
        );
        totalCount = filteredLogs.length;
    }

    const costDisplay = document.getElementById("total-cost-display");
    const countDisplay = document.getElementById("total-logs-count");

    if (countDisplay) {
        countDisplay.textContent = `${totalCount} รายการ`;
    }

    if (costDisplay) {
        costDisplay.textContent = new Intl.NumberFormat('th-TH', {
            style: "currency",
            currency: "THB",
        }).format(totalCost).replace("฿", "").trim() + " บาท";
    }
}

let currentDashboardFetchPromise = null;

function updateCaseDashboard() {
    const dashboard = document.getElementById("case-type-dashboard");
    if (!dashboard) return;

    const scrollY = window.scrollY;

    if (state.isInitialLoading) {
        dashboard.style.display = 'none';
        window.scrollTo({ top: scrollY, behavior: 'instant' });
        return;
    }

    const calendarView = document.getElementById("logs-calendar-view");
    const isCalendar = calendarView && !calendarView.classList.contains("hidden");

    if (isCalendar) {
        dashboard.style.display = 'flex';
        const sourceLogs = state.calendarLogs || [];
        processDashboardLogs(sourceLogs);
    } else {
        const currentFilters = {
            siteId: selects.filterHidden ? selects.filterHidden.value : "all",
            startDate: selects.filterStart && selects.filterStart.value ? new Date(selects.filterStart.value) : null,
            endDate: selects.filterEnd && selects.filterEnd.value ? new Date(selects.filterEnd.value) : null,
        };

        dashboard.style.display = 'none';

        const fetchPromise = FirestoreService.fetchFilteredLogs(currentFilters);
        currentDashboardFetchPromise = fetchPromise;

        fetchPromise.then((fullLogs) => {
            if (currentDashboardFetchPromise !== fetchPromise) return;
            dashboard.style.display = 'flex';
            processDashboardLogs(fullLogs);
        }).catch((err) => {
            console.error("Error updating case dashboard:", err);
            dashboard.style.display = 'flex';
            processDashboardLogs(state.logs || []);
        });
    }

    function processDashboardLogs(sourceLogs) {

        const siteSearchQuery = document.getElementById("site-filter-input")
            ? document.getElementById("site-filter-input").value
            : "";
        const siteId = selects.filterHidden
            ? selects.filterHidden.value
            : "all";
        const statusFilter = document.getElementById("filter-status")
            ? document.getElementById("filter-status").value
            : "all";
        const searchQuery = document.getElementById("log-search-input")
            ? document.getElementById("log-search-input").value
            : "";

        // For Calendar, the month is already implicit in state.calendarLogs, so we don't need additional date filters.
        // For List view, we apply the selected date filter range.
        const startDate = !isCalendar && selects.filterStart && selects.filterStart.value
            ? new Date(selects.filterStart.value)
            : null;
        const endDate = !isCalendar && selects.filterEnd && selects.filterEnd.value
            ? new Date(selects.filterEnd.value)
            : null;

        const logsForDashboard = filterLogsClientSide(sourceLogs, {
            siteId,
            siteSearchQuery,
            startDate,
            endDate,
            category: "all", // IGNORE category filter
            status: statusFilter,
            minPrice: 0,
            maxPrice: Infinity,
            searchQuery,
        });

        const categoryFilter = document.getElementById("filter-category")
            ? document.getElementById("filter-category").value
            : "all";

        const logsForStatusDashboard = filterLogsClientSide(sourceLogs, {
            siteId,
            siteSearchQuery,
            startDate,
            endDate,
            category: categoryFilter, // respects category filter
            status: "all",            // ignores status filter
            minPrice: 0,
            maxPrice: Infinity,
            searchQuery,
        });

        // Calculate count for each category
        const counts = {
            all: logsForDashboard.length,
            pm: 0,
            install: 0,
            repair: 0,
            deinstall: 0
        };

        logsForDashboard.forEach(log => {
            const cat = log.category;
            if (cat === "บำรุงรักษาตามรอบ") counts.pm++;
            else if (cat === "ติดตั้ง") counts.install++;
            else if (cat === "ซ่อม") counts.repair++;
            else if (cat === "รื้อถอน") counts.deinstall++;
        });

        // Calculate count for each status
        const statusCounts = {
            open: 0,
            process: 0,
            done: 0,
            closed: 0,
            cancel: 0
        };

        logsForStatusDashboard.forEach(log => {
            const stat = log.status;
            if (stat === "Open") statusCounts.open++;
            else if (stat === "On Process") statusCounts.process++;
            else if (stat === "Done") statusCounts.done++;
            else if (stat === "Case Closed") statusCounts.closed++;
            else if (stat === "Cancel") statusCounts.cancel++;
        });

        // Update UI elements
        const dashAll = document.getElementById("dash-case-all");
        const dashPm = document.getElementById("dash-case-pm");
        const dashInstall = document.getElementById("dash-case-install");
        const dashRepair = document.getElementById("dash-case-repair");
        const dashDeinstall = document.getElementById("dash-case-deinstall");

        const dashStatusOpen = document.getElementById("dash-status-open");
        const dashStatusProcess = document.getElementById("dash-status-process");
        const dashStatusDone = document.getElementById("dash-status-done");
        const dashStatusClosed = document.getElementById("dash-status-closed");
        const dashStatusCancel = document.getElementById("dash-status-cancel");

        const displayVal = (val) => state.isInitialLoading ? '<i class="fa-solid fa-spinner fa-spin text-muted" style="font-size: 0.8em; opacity: 0.5;"></i>' : val;

        if (dashAll) dashAll.innerHTML = displayVal(counts.all);
        if (dashPm) dashPm.innerHTML = displayVal(counts.pm);
        if (dashInstall) dashInstall.innerHTML = displayVal(counts.install);
        if (dashRepair) dashRepair.innerHTML = displayVal(counts.repair);
        if (dashDeinstall) dashDeinstall.innerHTML = displayVal(counts.deinstall);

        if (dashStatusOpen) dashStatusOpen.innerHTML = displayVal(statusCounts.open);
        if (dashStatusProcess) dashStatusProcess.innerHTML = displayVal(statusCounts.process);
        if (dashStatusDone) dashStatusDone.innerHTML = displayVal(statusCounts.done);
        if (dashStatusClosed) dashStatusClosed.innerHTML = displayVal(statusCounts.closed);
        if (dashStatusCancel) dashStatusCancel.innerHTML = displayVal(statusCounts.cancel);

        if (state.isInitialLoading) return; // Skip updating chart while loading

        // --- Update Histograms ---
        const ctx = document.getElementById('case-type-pie-chart');
        if (ctx) {
            const canvasCtx = ctx.getContext('2d');

            // Define canvas gradients matching the category card colors
            const pmGrad = canvasCtx.createLinearGradient(0, 0, 0, 200);
            pmGrad.addColorStop(0, '#38bdf8');
            pmGrad.addColorStop(1, '#0369a1');

            const installGrad = canvasCtx.createLinearGradient(0, 0, 0, 200);
            installGrad.addColorStop(0, '#4ade80');
            installGrad.addColorStop(1, '#15803d');

            const repairGrad = canvasCtx.createLinearGradient(0, 0, 0, 200);
            repairGrad.addColorStop(0, '#f87171');
            repairGrad.addColorStop(1, '#dc2626');

            const deinstallGrad = canvasCtx.createLinearGradient(0, 0, 0, 200);
            deinstallGrad.addColorStop(0, '#fbbf24');
            deinstallGrad.addColorStop(1, '#b45309');

            const bgColors = [pmGrad, installGrad, repairGrad, deinstallGrad];

            const isDarkMode = document.body.classList.contains("dark-mode");
            const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
            const tickColor = isDarkMode ? '#94a3b8' : '#64748b';

            const barChartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return ` ${context.parsed.y} งาน`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: tickColor,
                            font: {
                                family: "'Kanit', 'Prompt', sans-serif",
                                size: 11,
                                weight: '500'
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: tickColor,
                            stepSize: 1,
                            beginAtZero: true,
                            font: {
                                family: "'Kanit', 'Prompt', sans-serif",
                                size: 11
                            }
                        }
                    }
                }
            };

            if (window.caseTypePieChart instanceof Chart && window.caseTypePieChart.config.type === 'bar') {
                window.caseTypePieChart.data.datasets[0].data = [counts.pm, counts.install, counts.repair, counts.deinstall];
                window.caseTypePieChart.data.datasets[0].backgroundColor = bgColors;
                window.caseTypePieChart.update();
            } else {
                if (window.caseTypePieChart instanceof Chart) {
                    window.caseTypePieChart.destroy();
                }
                window.caseTypePieChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['บำรุงรักษา', 'ติดตั้ง', 'ซ่อม', 'รื้อถอน'],
                        datasets: [{
                            data: [counts.pm, counts.install, counts.repair, counts.deinstall],
                            backgroundColor: bgColors,
                            borderRadius: 6,
                            borderWidth: 0
                        }]
                    },
                    options: barChartOptions
                });
            }

            // --- Update Case Status Histogram ---
            const ctxStatus = document.getElementById('case-status-pie-chart');
            if (ctxStatus) {
                const canvasCtxStatus = ctxStatus.getContext('2d');

                const openGrad = canvasCtxStatus.createLinearGradient(0, 0, 0, 200);
                openGrad.addColorStop(0, '#7dd3fc');
                openGrad.addColorStop(1, '#0ea5e9');

                const processGrad = canvasCtxStatus.createLinearGradient(0, 0, 0, 200);
                processGrad.addColorStop(0, '#fde047');
                processGrad.addColorStop(1, '#f59e0b');

                const doneGrad = canvasCtxStatus.createLinearGradient(0, 0, 0, 200);
                doneGrad.addColorStop(0, '#99f6e4');
                doneGrad.addColorStop(1, '#14b8a6');

                const closedGrad = canvasCtxStatus.createLinearGradient(0, 0, 0, 200);
                closedGrad.addColorStop(0, '#cbd5e1');
                closedGrad.addColorStop(1, '#475569');

                const cancelGrad = canvasCtxStatus.createLinearGradient(0, 0, 0, 200);
                cancelGrad.addColorStop(0, '#fca5a5');
                cancelGrad.addColorStop(1, '#ef4444');

                const bgColorsStatus = [openGrad, processGrad, doneGrad, closedGrad, cancelGrad];

                if (window.caseStatusPieChart instanceof Chart && window.caseStatusPieChart.config.type === 'bar') {
                    window.caseStatusPieChart.data.datasets[0].data = [
                        statusCounts.open,
                        statusCounts.process,
                        statusCounts.done,
                        statusCounts.closed,
                        statusCounts.cancel
                    ];
                    window.caseStatusPieChart.data.datasets[0].backgroundColor = bgColorsStatus;
                    window.caseStatusPieChart.update();
                } else {
                    if (window.caseStatusPieChart instanceof Chart) {
                        window.caseStatusPieChart.destroy();
                    }
                    window.caseStatusPieChart = new Chart(ctxStatus, {
                        type: 'bar',
                        data: {
                            labels: ['เปิดงาน', 'ดำเนินการ', 'เสร็จสิ้น', 'ปิดเคส', 'ยกเลิก'],
                            datasets: [{
                                data: [
                                    statusCounts.open,
                                    statusCounts.process,
                                    statusCounts.done,
                                    statusCounts.closed,
                                    statusCounts.cancel
                                ],
                                backgroundColor: bgColorsStatus,
                                borderRadius: 6,
                                borderWidth: 0
                            }]
                        },
                        options: barChartOptions
                    });
                }
            }
        }

        // Highlight active card and update dynamic descriptions
        const activeCategory = selects.filterCategory ? selects.filterCategory.value : "all";

        // 1. Get Status Text
        let statusText = "ทุกสถานะ";
        if (statusFilter !== "all") {
            const statusMap = {
                "Open": "เปิดงาน",
                "On Process": "กำลังดำเนินการ",
                "Done": "เสร็จสิ้น",
                "Case Closed": "ปิดเคส",
                "Cancel": "ยกเลิก"
            };
            statusText = statusMap[statusFilter] || statusFilter;
        }

        // 2. Get Period Text
        let periodText = "ทุกช่วงเวลา";
        if (isCalendar) {
            const calHeader = document.getElementById("cal-current-month");
            if (calHeader) {
                periodText = `ประจำเดือน ${calHeader.textContent.trim()}`;
            }
        } else if (startDate || endDate) {
            const formatThaiDate = (date) => {
                if (!date) return "";
                return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
            };
            if (startDate && endDate) {
                periodText = `ช่วง ${formatThaiDate(startDate)} - ${formatThaiDate(endDate)}`;
            } else if (startDate) {
                periodText = `ตั้งแต่ ${formatThaiDate(startDate)}`;
            } else if (endDate) {
                periodText = `ถึง ${formatThaiDate(endDate)}`;
            }
        }

        const filterDetails = `สถานะ: ${statusText} • ${periodText}`;

        dashboard.querySelectorAll(".dashboard-card").forEach(card => {
            const cardCategory = card.getAttribute("data-category");
            if (!cardCategory) return; // Skip status card since it doesn't filter category directly

            // Remove all active states
            card.classList.remove("active-card", "active-pm", "active-install", "active-repair", "active-deinstall");

            if (cardCategory === activeCategory) {
                card.classList.add("active-card");
                if (cardCategory === "บำรุงรักษาตามรอบ") card.classList.add("active-pm");
                else if (cardCategory === "ติดตั้ง") card.classList.add("active-install");
                else if (cardCategory === "ซ่อม") card.classList.add("active-repair");
                else if (cardCategory === "รื้อถอน") card.classList.add("active-deinstall");
            }

            // Update description dynamically
            const descEl = card.querySelector(".dashboard-card-content > span:nth-child(3)");
            if (descEl) {
                descEl.textContent = filterDetails;
            }
        });

        requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY, behavior: 'instant' });
        });
    }
}

function renderLogs() {
    if (!grids.logs) return;
    grids.logs.innerHTML = "";

    const logsToRender = getFilteredLogs();

    // 1. Initial update with visible logs (immediate UI feedback)
    updateLogStats(logsToRender);

    // 2. Async fetch for TRUE GLOBAL totals (for Site/Date range)
    const currentFilters = {
        siteId: selects.filterHidden ? selects.filterHidden.value : "all",
        startDate:
            selects.filterStart && selects.filterStart.value
                ? new Date(selects.filterStart.value)
                : null,
        endDate:
            selects.filterEnd && selects.filterEnd.value
                ? new Date(selects.filterEnd.value)
                : null,
    };

    FirestoreService.fetchFilteredStats(currentFilters)
        .then((summary) => {
            state.globalLogSummary = summary; // Cache it
            updateLogStats(logsToRender, summary);
        })
        .catch((err) => {
            console.error("Error fetching global filtered stats:", err);
            updateLogStats(logsToRender, null);
        });

    // Fetch Total Count asynchronously for header (avoid blocking UI)
    FirestoreService.fetchGlobalLogCount()
        .then((total) => {
            const headerLogsCount = document.getElementById("header-logs-count");
            if (headerLogsCount) {
                headerLogsCount.textContent = `(${new Intl.NumberFormat(undefined).format(total)})`;
            }
        })
        .catch((err) => console.error("Error fetching global logs count:", err));

    if (logsToRender.length === 0) {
        grids.logs.innerHTML = `
            <div class="empty-state">
                <p>ไม่พบประวัติการซ่อมบำรุงตามเงื่อนไขที่เลือก</p>
            </div>`;
        return;
    }

    const tableContainer = document.createElement("div");
    tableContainer.className = "table-container";

    const table = document.createElement("table");
    table.className = "data-table";

    window.logsDateSortOrder = window.logsDateSortOrder || 'desc';
    const sortIcon = window.logsDateSortOrder === 'desc' ? '<i class="fa-solid fa-sort-down"></i>' : '<i class="fa-solid fa-sort-up"></i>';

    // Apply sorting to logsToRender before rendering
    logsToRender.sort((a, b) => {
        const dateA = new Date(a.date).getTime() || 0;
        const dateB = new Date(b.date).getTime() || 0;
        return window.logsDateSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    window.toggleLogsDateSort = function () {
        window.logsDateSortOrder = window.logsDateSortOrder === 'desc' ? 'asc' : 'desc';
        renderLogs();
    };

    // Header
    table.innerHTML = `
        <thead>
            <tr>
                <th style="width: 5%;" class="desktop-only">ที่</th>
                <th style="width: 1%; white-space: nowrap;">รหัสเคส</th>
                <th style="width: 1%; white-space: nowrap; cursor: pointer; user-select: none;" onclick="toggleLogsDateSort()" title="คลิกเพื่อสลับการเรียงลำดับวันที่">วันที่ ${sortIcon}</th>
                <th style="width: 30%;">สถานที่</th>
                <th style="width: 12%;">หมวดหมู่</th>
                <th style="width: 10%;">สถานะ</th>

                <th style="width: 12%;">แก้ไขล่าสุด</th>
                <th style="width: 8%;"></th>
            </tr>
        </thead>
        <tbody id="logs-table-body">
        </tbody>
    `;

    const tbody = table.querySelector("tbody");

    appendLogRows(logsToRender, tbody);

    tableContainer.appendChild(table);

    // --- Infinite Scroll Sentinel ---
    if (state.hasMoreLogs) {
        const sentinel = document.createElement("div");
        sentinel.id = "logs-sentinel";
        sentinel.style.height = "20px";
        sentinel.innerHTML =
            '<div style="text-align: center; color: var(--text-muted); padding: 10px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
        tableContainer.appendChild(sentinel);

        // Observe directly
        logsObserver.disconnect();
        logsObserver.observe(sentinel);
    }
    // -----------------------

    grids.logs.appendChild(tableContainer);
}

const logsObserver = new IntersectionObserver(
    (entries) => {
        if (entries[0].isIntersecting && !state.isLoadingLogs) {
            handleLoadMoreLogs();
        }
    },
    { root: null, threshold: 0.1 },
);

// Helper setup function removed/refactored

async function handleLoadMoreLogs() {
    if (state.isLoadingLogs) return;

    try {
        const newLogs = await FirestoreService.fetchMoreLogs();

        const oldSentinel = document.getElementById("logs-sentinel");
        if (oldSentinel) {
            logsObserver.unobserve(oldSentinel);
            oldSentinel.remove();
        }

        if (newLogs.length > 0) {
            state.logs = [...state.logs, ...newLogs];

            // Get current filters to only append matching logs
            const currentFilters = {
                siteId: selects.filterHidden ? selects.filterHidden.value : "all",
                startDate:
                    selects.filterStart && selects.filterStart.value
                        ? new Date(selects.filterStart.value)
                        : null,
                endDate:
                    selects.filterEnd && selects.filterEnd.value
                        ? new Date(selects.filterEnd.value)
                        : null,
                category: selects.filterCategory ? selects.filterCategory.value : "all",
                minPrice: parseCurrency(
                    document.getElementById("filter-min-price")?.value,
                ),
                maxPrice: document.getElementById("filter-max-price")?.value
                    ? parseCurrency(document.getElementById("filter-max-price").value)
                    : Infinity,
                searchQuery: document.getElementById("log-search-input")
                    ? document.getElementById("log-search-input").value
                    : "",
            };

            const filteredNewLogs = filterLogsClientSide(newLogs, currentFilters);
            appendLogRows(filteredNewLogs);

            // Update counts based on TOTAL filtered logs now in state.logs
            const allFilteredLogs = getFilteredLogs();
            updateLogStats(allFilteredLogs, state.globalLogSummary);

            if (state.hasMoreLogs) {
                const tableContainer = document.querySelector(".table-container");
                const sentinel = document.createElement("div");
                sentinel.id = "logs-sentinel";
                sentinel.style.height = "20px";
                sentinel.innerHTML =
                    '<div style="text-align: center; color: var(--text-muted); padding: 10px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
                tableContainer.appendChild(sentinel);

                // Re-observe
                logsObserver.observe(sentinel);
            }
        }
    } catch (err) {
        console.error("Error loading more logs:", err);
        const oldSentinel = document.getElementById("logs-sentinel");
        if (oldSentinel) {
            logsObserver.unobserve(oldSentinel);
            oldSentinel.remove();
        }
    }
}

// Helper to append rows without clearing table
function appendLogRows(newLogs, targetTbody = null) {
    const tbody = targetTbody || document.getElementById("logs-table-body");
    if (!tbody) return;

    newLogs.forEach((log) => {
        const site = state.sites.find((s) => s.id === log.siteId) || {
            name: "ไม่พบข้อมูลสถานที่",
        };
        const recorderName = log.updatedBy ||
            (state.users && log.recorderId && state.users[log.recorderId]
                ? state.users[log.recorderId].displayName ||
                state.users[log.recorderId].email ||
                log.recordedBy
                : log.recordedBy || "-");
        const thaiDate = formatDateDDMMYYYY(log.date);
        const logTime = log.date && log.date.includes('T') && log.date.split('T')[1].substring(0, 5) !== '00:00' ? log.date.split('T')[1].substring(0, 5) : '';
        const siteColor = getSiteColor(site.name);

        const tr = document.createElement("tr");
        tr.style.setProperty("border-left", `4px solid ${siteColor}`, "important");
        tr.style.cursor = "pointer";
        tr.onclick = (e) => {
            if (e.target.closest("button") || e.target.closest("a")) return;
            viewLogDetails(log.id);
        };

        // Get icon for category with colors
        let catIcon = '';
        let catBadge = '';
        let catColor = '#64748b';
        let catBg = 'rgba(100,116,139,0.12)';

        if (isMaCategory(log.category)) {
            catColor = '#0369a1';
            catBg = '#e0f2fe';
        } else if (log.category === "ติดตั้ง") {
            catColor = '#15803d';
            catBg = '#dcfce7';
        } else if (log.category === "รื้อถอน") {
            catColor = '#b45309';
            catBg = '#fef3c7';
        } else if (log.category === "ซ่อม") {
            catColor = '#dc2626';
            catBg = '#fee2e2';
        } else if (log.category === "ตามสัญญาจ้าง") {
            catColor = '#7c3aed';
            catBg = '#ede9fe';
        } else if (log.category === "ตามใบสั่งซื้อ") {
            catColor = '#0891b2';
            catBg = '#cffafe';
        }

        catBadge = `<span style="background:${catBg}; color:${catColor}; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:600; white-space:nowrap; ">${log.category || "-"}</span>`;
        const catBadgeMobile = `<span style="background:${catBg}; color:${catColor}; padding:0.2rem 0.6rem; border-radius:6px; font-size:0.75rem; font-weight:700; white-space:nowrap;">${log.category || "-"}</span>`;

        // Render Status Badge
        const statusColors = {
            Open: { bg: "rgba(234,179,8,0.15)", color: "#ca8a04", label: "เปิดงาน" },
            "On Process": {
                bg: "rgba(249,115,22,0.15)",
                color: "#f97316",
                label: "กำลังดำเนินการ",
            },
            Cancel: {
                bg: "rgba(239,68,68,0.15)",
                color: "#ef4444",
                label: "ยกเลิก",
            },
            Done: { bg: "rgba(168,85,247,0.15)", color: "#a855f7", label: "เสร็จสิ้น" },
            "Case Closed": { bg: "rgba(34,197,94,0.15)", color: "#22c55e", label: "ปิดเคส" },
            Completed: {
                bg: "rgba(168,85,247,0.15)",
                color: "#a855f7",
                label: "เสร็จสิ้น",
            },
        };
        const s = statusColors[log.status] || {
            bg: "rgba(100,116,139,0.15)",
            color: "var(--text-muted)",
            label: log.status || "เปิดงาน",
        };
        const statusBadge = `<span style="background:${s.bg}; color:${s.color}; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:600; white-space: nowrap;">${s.label}</span>`;

        // Mobile status: solid filled, white text, no emoji
        const statusLabelClean = {
            Open: 'เปิดงาน', 'On Process': 'ดำเนินการ',
            Done: 'เสร็จสิ้น', 'Case Closed': 'ปิดเคส', Cancel: 'ยกเลิก', Completed: 'เสร็จสิ้น'
        };
        const mobileStatusBadge = `<span style="background:${s.color}; color:#fff; padding:0.3rem 0.75rem; border-radius:8px; font-size:0.8rem; font-weight:700; white-space:nowrap;">${statusLabelClean[log.status] || log.status || '-'}</span>`;

        // Calculate Row Number (Global Index)
        const rowNumber = tbody.querySelectorAll("tr").length + 1;

        // Get initial detail from first comment
        let initialDetail = '';
        if (log.comments && log.comments.length > 0 && log.comments[0].text) {
            const text = log.comments[0].text;
            const truncated = text.length > 50 ? text.substring(0, 50) + '...' : text;
            initialDetail = `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; font-style: italic;">${truncated}</div>`;
        }

        tr.innerHTML = `
            <td class="cell-index desktop-only">${rowNumber}</td>
            <td class="cell-case-id" data-label="รหัสเคส"><span class="value" style="font-family: 'Courier New', monospace; font-weight: 600; color: var(--primary-color);">${log.caseId ? log.caseId.replace('CASE-', '') : "-"}</span></td>
            <td class="cell-date" data-label="วันที่"><span class="value">${thaiDate}</span>${logTime ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${logTime}</div>` : ''}</td>
            <td class="cell-site" data-label="สถานที่" style="font-weight: 500;">
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <span class="value">${site.siteCode ? site.siteCode + ' - ' : ''}${site.name}</span>
                    ${log.attachments && log.attachments.length > 0 ? '<i class="fa-solid fa-paperclip desktop-only" style="color: var(--text-muted); font-size: 0.8rem;" title="มีไฟล์แนบ"></i>' : ""}
                    <button class="site-filter-btn desktop-only" onclick="event.stopPropagation(); viewSiteLogs('${site.id}')" title="กรองเฉพาะสถานที่นี้" style="display:inline-flex; align-items:center; justify-content:center; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#0369a1; border-radius:6px; padding:2px 6px; font-size:0.7rem; cursor:pointer; gap:3px; white-space:nowrap; transition:background 0.15s;"><i class="fa-solid fa-filter" style="font-size:0.65rem;"></i></button>
                </div>
                ${initialDetail}
            </td>
            <td class="cell-category" data-label="หมวดหมู่"><span class="value">${catBadge}</span></td>
            <td class="cell-status" data-label="สถานะ">${statusBadge}</td>
            <td class="cell-user" data-label="แก้ไขล่าสุด"><span class="value">${recorderName}</span></td>
            <td class="cell-mobile-card mobile-only" data-label="">
                <div class="mc-top">
                    <span style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;"><span class="mc-caseid">${log.caseId ? log.caseId.replace('CASE-', '') : '-'}</span> <span class="mc-siteid">${site.siteCode || '-'}</span></span>
                </div>
                <div class="mc-site" style="display:flex; align-items:center; gap:6px;">
                    <span>${site.name}</span>
                    <button onclick="event.stopPropagation(); viewSiteLogs('${site.id}')" title="กรองเฉพาะสถานที่นี้" style="display:inline-flex; align-items:center; justify-content:center; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#0369a1; border-radius:6px; padding:2px 7px; font-size:0.7rem; cursor:pointer; flex-shrink:0;"><i class="fa-solid fa-filter" style="font-size:0.65rem;"></i></button>
                </div>
                <div class="mc-detail">
                    <div><span class="mc-label">วันที่:</span> ${thaiDate}${logTime ? ' ' + logTime : ''}</div>
                    <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><span class="mc-label">รายละเอียด:</span> ${log.comments && log.comments.length > 0 && log.comments[0].text ? (log.comments[0].text.length > 60 ? log.comments[0].text.substring(0, 60) + '...' : log.comments[0].text) : (log.objective || '-')}</div>
                    <div><span class="mc-label">ช่าง:</span> ${log.responderId && state.users && state.users[log.responderId] ? (state.users[log.responderId].displayName || state.users[log.responderId].email) : '-'}</div>
                </div>
                <div class="mc-footer">
                    <span style="display:flex; gap:6px; align-items:center;"><span class="mc-status-big">${mobileStatusBadge}</span><span class="mc-catbadge" style="color:${catColor}; background:${catBg};">${log.category || '-'}</span></span>
                    <span class="mc-footer-actions">
                        <button class="mc-btn" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}')" title="แก้ไข">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        ${currentUserRole === 'admin' || currentUserRole === 'manager' ? `
                        <button class="mc-btn" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}', true)" title="ลบ">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                        ` : ''}
                    </span>
                </div>
            </td>
            <td class="cell-actions" data-label="">
                <div class="actions-wrapper">
                    <button class="btn-icon action-edit" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}')" title="แก้ไข">
                        <i class="fa-solid fa-pen" style="font-size: 0.9rem;"></i>
                    </button>
                    ${currentUserRole === 'admin' || currentUserRole === 'manager' ? `
                    <button class="btn-icon action-delete" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}', true)" title="ลบ">
                        <i class="fa-solid fa-trash" style="font-size: 0.9rem;"></i>
                    </button>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Pagination functions removed

// function setupInfiniteScroll() replaced above

// function updateSiteSelects() {} // Removed

// --- Auth Functions ---
// Legacy handleEmailLogin removed; using handleLogin defined at top.

function isMobile() {
    const ua = navigator.userAgent;

    // Standard mobile/tablet detection
    const standardMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    // Modern iPad detection (iPadOS 13+ reports as Macintosh)
    const isIpadOS =
        /Macintosh/i.test(ua) &&
        navigator.maxTouchPoints &&
        navigator.maxTouchPoints > 1;

    // Android tablets
    const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);

    return standardMobile || isIpadOS || isAndroidTablet;
}


async function handleLogout() {
    if (await showDialog("คุณต้องการออกจากระบบหรือไม่?", { type: "confirm" })) {
        try {
            teardownRealtimeListeners(); // Stop real-time listeners on logout
            await FirestoreService.logAction("AUTH", "LOGOUT", `User logged out`); // Log before signout

            // Logout from LINE (LIFF) if initialized and logged in
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

// --- Auth Observers & Listeners ---
const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);


}



const btnLogout = document.getElementById("btn-logout");
// if (btnLogout) btnLogout.addEventListener('click', handleLogout); // Removed old button

const btnLogoutProfile = document.getElementById("btn-logout-profile");
if (btnLogoutProfile) btnLogoutProfile.addEventListener("click", handleLogout);

// --- Profile Signature ---
const btnDrawSignature = document.getElementById("btn-draw-signature");
if (btnDrawSignature) {
    btnDrawSignature.addEventListener("click", () => {
        pendingStatusChange = null;
        window._profileSignatureMode = true;
        const modal = document.getElementById("modal-signature");
        if (modal) { modal.classList.remove("hidden"); modal.style.display = "flex"; }
        // Hide contact fields for profile mode
        const contactFields = document.getElementById("signature-contact-fields");
        if (contactFields) contactFields.style.display = "none";
        setTimeout(() => {
            if (!signaturePad) { initSignatureCanvas(); } else {
                const canvas = document.getElementById("signature-canvas");
                if (canvas) {
                    const ratio = Math.max(window.devicePixelRatio || 1, 1);
                    const rect = canvas.getBoundingClientRect();
                    canvas.width = rect.width * ratio;
                    canvas.height = rect.height * ratio;
                    canvas.getContext("2d").scale(ratio, ratio);
                }
                signaturePad.clear();
            }
        }, 50);
    });
}

const uploadSignatureInput = document.getElementById("upload-signature-input");
const btnUploadSignature = document.getElementById("btn-upload-signature");
if (btnUploadSignature && uploadSignatureInput) {
    btnUploadSignature.addEventListener("click", () => uploadSignatureInput.click());
}
if (uploadSignatureInput) {
    uploadSignatureInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const dataUrl = ev.target.result;
            await saveProfileSignature(dataUrl);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    });
}

const btnClearProfileSig = document.getElementById("btn-clear-profile-signature");
if (btnClearProfileSig) {
    btnClearProfileSig.addEventListener("click", async () => {
        if (!(await showDialog("ต้องการลบลายเซ็นใช่หรือไม่?", { type: "confirm" }))) return;
        const user = auth.currentUser;
        if (!user) return;
        await updateDoc(doc(db, "users", user.uid), { signature: "" });
        renderProfile();
        showToast("ลบลายเซ็นเรียบร้อย", "success");
    });
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
    renderLineStatus(user);
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

async function loadNotificationSettings() {
    try {
        const settings = await FirestoreService.getNotificationSettings();

        if (settings) {
            // Load SMTP settings
            if (settings.smtp) {
                document.getElementById("email-enabled").checked = settings.smtp.enabled || false;
                document.getElementById("smtp-host").value = settings.smtp.host || "";
                document.getElementById("smtp-port").value = settings.smtp.port || 587;
                document.getElementById("smtp-user").value = settings.smtp.user || "";
                document.getElementById("smtp-password").value = settings.smtp.password || "";
                document.getElementById("smtp-from").value = settings.smtp.from || "";
                document.getElementById("smtp-secure").checked = settings.smtp.secure || false;

                // Load recipients
                if (settings.smtp.recipients && settings.smtp.recipients.length > 0) {
                    loadEmailRecipients(settings.smtp.recipients);
                } else {
                    loadEmailRecipients([]);
                }
            } else {
                // Default to OFF if no settings
                document.getElementById("email-enabled").checked = false;
                loadEmailRecipients([]);
            }

            // Load Telegram settings
            if (settings.telegram) {
                document.getElementById("telegram-enabled").checked = settings.telegram.enabled || false;
                document.getElementById("telegram-bot-token").value = settings.telegram.botToken || "";
                document.getElementById("telegram-chat-id").value = settings.telegram.chatId || "";
            } else {
                // Default to OFF if no settings
                document.getElementById("telegram-enabled").checked = false;
            }
        } else {
            // No settings found - default all toggles to OFF
            document.getElementById("email-enabled").checked = false;

            document.getElementById("telegram-enabled").checked = false;
            loadEmailRecipients([]);
        }
    } catch (error) {
        console.error("Error loading notification settings:", error);
        showToast("เกิดข้อผิดพลาดในการโหลดการตั้งค่า", "error");
    }
}

async function renderUserRoles() {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Check if current user is admin
    const currentUserDoc = await FirestoreService.getUser(currentUser.uid);
    const isAdmin = currentUserDoc?.role === 'admin';

    if (!isAdmin) {
        usersList.innerHTML = '<p class="text-muted" style="font-size: 0.9rem;">คุณไม่มีสิทธิ์จัดการผู้ใช้งาน</p>';
        return;
    }

    try {
        usersList.innerHTML = '<p class="text-muted" style="font-size: 0.9rem;">กำลังโหลดข้อมูล...</p>';

        const users = await FirestoreService.getAllUsers();

        console.log('=== USER MANAGEMENT DEBUG ===');
        console.log('Current user:', currentUser.email);
        console.log('Users loaded:', users.length);
        users.forEach((user, index) => {
            console.log(`User ${index + 1}:`, {
                email: user.email,
                displayName: user.displayName,
                uid: user.uid,
                role: user.role,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            });
        });
        console.log('=== END DEBUG ===');

        if (!users || users.length === 0) {
            usersList.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p class="text-muted" style="font-size: 0.9rem;">ไม่พบผู้ใช้งาน</p>
                    <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.5rem;">
                        ตรวจสอบ Console (F12) เพื่อดูข้อมูล Debug
                    </p>
                </div>
            `;
            return;
        }

        renderUsersList(users);
        setupUserSearch(users);

        // Setup cleanup button
        const cleanupBtn = document.getElementById('btn-cleanup-users');
        if (cleanupBtn) {
            cleanupBtn.onclick = handleCleanupUsers;
        }

    } catch (error) {
        console.error('Error loading users:', error);
        usersList.innerHTML = '<p class="text-muted" style="font-size: 0.9rem; color: var(--danger-color);">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

async function handleCleanupUsers() {
    const confirmed = await showDialog(
        'คุณต้องการลบข้อมูลผู้ใช้ที่ไม่ถูกต้องหรือไม่?\n\nระบบจะลบผู้ใช้ที่:\n- ไม่มีอีเมล\n- มีข้อมูลเป็น null\n- เป็นข้อมูลทดสอบ',
        { type: 'confirm' }
    );

    if (!confirmed) return;

    try {
        const invalidUsers = await FirestoreService.cleanupInvalidUsers();

        if (invalidUsers.length === 0) {
            showToast('ไม่พบข้อมูลผู้ใช้ที่ไม่ถูกต้อง', 'success');
            return;
        }

        // Show what will be deleted
        const userNames = invalidUsers.map(u => u.data.displayName || u.data.email || u.id).join('\n');
        const confirmDelete = await showDialog(
            `พบผู้ใช้ไม่ถูกต้อง ${invalidUsers.length} คน:\n\n${userNames}\n\nต้องการลบหรือไม่?`,
            { type: 'confirm' }
        );

        if (!confirmDelete) return;

        // Delete invalid users
        for (const user of invalidUsers) {
            await FirestoreService.deleteInvalidUser(user.id);
        }

        showToast(`ลบข้อมูลผู้ใช้ไม่ถูกต้อง ${invalidUsers.length} คนเรียบร้อยแล้ว`, 'success');

        // Reload user list
        await renderUserRoles();

    } catch (error) {
        console.error('Error cleaning up users:', error);
        showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    }
}

function renderUsersList(users) {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;

    const currentUser = auth.currentUser;

    usersList.innerHTML = users.map(user => {
        const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
        const photoUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=38bdf8&color=fff`;
        const role = user.role || 'user';
        const isCurrentUser = user.uid === currentUser.uid;

        // Format dates
        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : 'ไม่ระบุ';

        const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'ไม่เคยเข้าสู่ระบบ';

        const phone = user.phone || 'ไม่ระบุ';

        // Role badge
        const roleBadge = role === 'admin'
            ? '<span class="user-role-badge admin"><i class="fa-solid fa-shield-halved"></i> ผู้ดูแลระบบ</span>'
            : role === 'manager'
                ? '<span class="user-role-badge manager"><i class="fa-solid fa-user-tie"></i> ผู้จัดการ</span>'
                : '<span class="user-role-badge viewer"><i class="fa-solid fa-user"></i> ผู้ใช้งานทั่วไป</span>';

        return `<div class="user-role-item" data-user-email="${user.email}" data-user-name="${user.displayName || ''}">
            <div class="user-role-avatar">
                ${user.photoURL ? `<img src="${photoUrl}" alt="${user.displayName || 'User'}">` : initial}
            </div>
            <div class="user-role-info">
                <div class="user-role-name">
                    ${user.displayName || 'ไม่ระบุชื่อ'}
                    ${isCurrentUser ? '<span class="user-role-badge admin"><i class="fa-solid fa-user-shield"></i> คุณ</span>' : ''}
                </div>
                <div class="user-role-email">${user.email}</div>
                <div class="user-role-details">
                    <span class="user-detail-item">
                        <i class="fa-solid fa-phone"></i>
                        ${phone}
                    </span>
                    <span class="user-detail-item">
                        <i class="fa-solid fa-calendar-plus"></i>
                        สมัคร: ${createdAt}
                    </span>
                    <span class="user-detail-item">
                        <i class="fa-solid fa-clock"></i>
                        เข้าล่าสุด: ${lastLogin}
                    </span>
                </div>
            </div>
            <div class="user-role-actions">
                ${roleBadge}
                <select class="user-role-select" data-user-id="${user.uid}" ${isCurrentUser ? 'disabled' : ''}>
                    <option value="admin" ${role === 'admin' ? 'selected' : ''}>ผู้ดูแลระบบ</option>
                    <option value="manager" ${role === 'manager' ? 'selected' : ''}>ผู้จัดการ</option>
                    <option value="user" ${role === 'user' ? 'selected' : ''}>ผู้ใช้งานทั่วไป</option>
                </select>
            </div>
        </div>`;
    }).join('');

    // Add event listeners to role selects
    usersList.querySelectorAll('.user-role-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const userId = e.target.getAttribute('data-user-id');
            const newRole = e.target.value;
            await handleRoleChange(userId, newRole);
        });
    });
}

function setupUserSearch(users) {
    const searchInput = document.getElementById('user-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        if (!query) {
            renderUsersList(users);
            return;
        }

        const filtered = users.filter(user => {
            const name = (user.displayName || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            return name.includes(query) || email.includes(query);
        });

        renderUsersList(filtered);
    });
}

async function handleRoleChange(userId, newRole) {
    try {
        await FirestoreService.updateUserRole(userId, newRole);
        const roleLabel = newRole === 'admin' ? 'ผู้ดูแลระบบ' : newRole === 'manager' ? 'ผู้จัดการ' : 'ผู้ใช้งานทั่วไป';
        showToast(`อัปเดตสิทธิ์ผู้ใช้เป็น ${roleLabel} เรียบร้อยแล้ว`, 'success');

        // Log the action
        await FirestoreService.logAction('USER', 'UPDATE_ROLE', `Updated user role to ${newRole}`, {
            userId: userId,
            newRole: newRole
        });

        // Reload to update badges
        await renderUserRoles();
    } catch (error) {
        console.error('Error updating role:', error);
        showToast('ไม่สามารถอัปเดตสิทธิ์ผู้ใช้ได้', 'error');
        // Reload to reset the select
        await renderUserRoles();
    }
}

// --- User Management Logic Removed ---

let currentUserRole = "user"; // Default

// --- Mock Data Generation ---
window.generateMockLogs = async function (count = 50) {
    console.log(`Generating ${count} mock logs...`);
    const objectives = [
        "เปลี่ยนไส้กรอง",
        "ล้างถังพัก",
        "ตรวจเช็คสภาพ pump",
        "ซ่อมท่อแตก",
        "เปลี่ยนวาล์ว",
        "เติมสารเคมี",
        "ตรวจสอบคุณภาพน้ำ",
        "ทำความสะอาดทั่วไป",
        "เปลี่ยนมิเตอร์",
    ];

    try {
        const sites =
            state.sites.length > 0
                ? state.sites
                : await FirestoreService.fetchSites();
        if (sites.length === 0) {
            console.error("No sites found. Cannot generate logs.");
            return;
        }

        const batchPromises = [];
        for (let i = 0; i < count; i++) {
            const randomSite = sites[Math.floor(Math.random() * sites.length)];
            const randomObjective =
                objectives[Math.floor(Math.random() * objectives.length)];
            const randomCost = Math.floor(Math.random() * (5000 - 500 + 1)) + 500;

            // Random date within current month +/- 1 month
            const date = new Date();
            // Random date within past 3 months to present
            date.setDate(date.getDate() - Math.floor(Math.random() * 90));
            const dateStr = date.toISOString().split("T")[0];

            const categories = ["บุคลากร", "เครื่อง", "อื่นๆ"];
            const randomCategory =
                categories[Math.floor(Math.random() * categories.length)];

            const logData = {
                siteId: randomSite.id,
                date: dateStr,
                category: randomCategory,
                details: `${randomObjective} (Mock Data ${i + 1})`,
                objective: `หมายเหตุเพิ่มเติมสำหรับ ${randomObjective}`,
                cost: randomCost,
                recorderId: auth.currentUser ? auth.currentUser.uid : "system",
                recordedBy: auth.currentUser
                    ? auth.currentUser.displayName || auth.currentUser.email
                    : "System",
                timestamp: new Date().toISOString(),
            };

            batchPromises.push(FirestoreService.addLog(logData));
        }

        await Promise.all(batchPromises);
        console.log("Mock logs generated successfully!");
        await refreshData();
    } catch (error) {
        console.error("Error generating mock logs:", error);
    }
};

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

// Initialize Password Toggles, PIN Validation & Public Report Page
document.addEventListener("DOMContentLoaded", () => {
    setupPasswordToggles();
    setupPinValidation();
    initPublicReportPage();
    initStaffCycleUpload();
});

// ============================================================
// ANNUAL MAINTENANCE PLAN
// ============================================================

function getPlanMonthData(site, year, month) {
    const planData = site.maintenancePlans && site.maintenancePlans[year];
    if (!planData) return { planned: false, cycleCount: null, inputDate: null, planDate: null, notes: null, attachments: [], history: [], source: null };
    if (Array.isArray(planData)) {
        return { planned: planData.includes(month), cycleCount: null, inputDate: null, planDate: null, notes: null, attachments: [], history: [], source: null };
    }
    const monthKey = String(month);
    const monthData = planData[monthKey];
    if (!monthData) return { planned: false, cycleCount: null, inputDate: null, planDate: null, notes: null, attachments: [], history: [], source: null, reporterName: null, reporterPhone: null };

    // Collect all entries with their metadata and original index
    const allEntries = [];
    if (monthData.cycleCount != null) {
        allEntries.push({
            cycleCount: monthData.cycleCount,
            inputDate: monthData.inputDate,
            notes: monthData.notes,
            attachments: monthData.attachments || [],
            source: monthData.source || 'staff',
            reporterName: monthData.reporterName || null,
            reporterPhone: monthData.reporterPhone || null,
            dbIsLatest: true,
            dbHistoryIndex: -1
        });
    }

    if (monthData.history && Array.isArray(monthData.history)) {
        monthData.history.forEach((item, index) => {
            if (item.cycleCount != null) {
                allEntries.push({
                    ...item,
                    dbIsLatest: false,
                    dbHistoryIndex: index
                });
            }
        });
    }

    // Sort allEntries by date descending (latest day first), then cycleCount descending (latest count first)
    allEntries.sort((a, b) => {
        const dateA = a.inputDate ? new Date(a.inputDate) : new Date(0);
        const dateB = b.inputDate ? new Date(b.inputDate) : new Date(0);
        if (dateB - dateA !== 0) {
            return dateB - dateA;
        }
        const valA = parseInt(a.cycleCount, 10) || 0;
        const valB = parseInt(b.cycleCount, 10) || 0;
        return valB - valA;
    });

    if (allEntries.length === 0) {
        return {
            planned: monthData.planned !== false,
            cycleCount: null,
            inputDate: null,
            planDate: monthData.planDate || null,
            notes: monthData.notes || null,
            attachments: [],
            history: [],
            source: monthData.source || null,
            reporterName: monthData.reporterName || null,
            reporterPhone: monthData.reporterPhone || null
        };
    }

    // The latest entry overall is allEntries[0]
    const latestEntry = allEntries[0];

    // The history consists of the remaining entries (allowing multiple per day)
    const historyEntries = allEntries.slice(1);

    return {
        planned: monthData.planned !== false,
        cycleCount: latestEntry.cycleCount,
        inputDate: latestEntry.inputDate,
        planDate: monthData.planDate || latestEntry.inputDate || null,
        notes: latestEntry.notes || null,
        attachments: latestEntry.attachments || [],
        history: historyEntries,
        source: latestEntry.source || null,
        reporterName: latestEntry.reporterName || null,
        reporterPhone: latestEntry.reporterPhone || null,
        dbIsLatest: latestEntry.dbIsLatest,
        dbHistoryIndex: latestEntry.dbHistoryIndex
    };
}

function migratePlanToObjectFormat(existingPlan) {
    if (Array.isArray(existingPlan)) {
        const obj = {};
        existingPlan.forEach(m => { obj[String(m)] = { planned: true, cycleCount: null, inputDate: null, notes: null }; });
        return obj;
    }
    return existingPlan || {};
}

function renderMaintenancePlan() {
    const yearSelect = document.getElementById('plan-year-select');
    const headerRow = document.getElementById('plan-timeline-header');
    const tbody = document.getElementById('plan-timeline-body');
    const emptyState = document.getElementById('plan-empty-state');
    if (!yearSelect || !headerRow || !tbody) return;

    const currentYear = new Date().getFullYear();
    const currentBE = currentYear + 543;
    if (yearSelect.options.length === 0) {
        const userLocale = navigator.language || 'th-TH';
        const usesBE = userLocale.startsWith('th');
        for (let y = currentBE + 1; y >= currentBE - 5; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = usesBE ? `พ.ศ. ${y}` : `${y - 543}`;
            if (y === currentBE) opt.selected = true;
            yearSelect.appendChild(opt);
        }
        yearSelect.addEventListener('change', renderMaintenancePlan);
    }

    const selectedBE = String(yearSelect.value);
    const now = new Date();
    const currentMonth = (currentYear + 543) == parseInt(selectedBE) ? now.getMonth() : -1;
    const userLocale = navigator.language || 'th-TH';
    const monthNames = Array.from({ length: 12 }, (_, i) => new Date(2024, i, 1).toLocaleString(userLocale, { month: 'short' }));

    headerRow.innerHTML = `<th style="text-align:center; padding:0.6rem 0.4rem; border:1px solid rgba(0,0,0,0.08); width:30px; background:#f5f5f5;">No.</th><th style="text-align:center; padding:0.6rem 0.4rem; border:1px solid rgba(0,0,0,0.08); width:50px; background:#f5f5f5;">รหัส</th><th style="text-align:left; padding:0.6rem 0.75rem; border:1px solid rgba(0,0,0,0.08); min-width:180px; position:sticky; left:0; background:#f5f5f5; z-index:3;">อุปกรณ์</th>`;
    for (let m = 0; m < 12; m++) {
        const isCurrent = m === currentMonth;
        headerRow.innerHTML += `<th style="text-align:center; padding:0.5rem 0.4rem; border:1px solid rgba(0,0,0,0.08); min-width:80px; font-size:0.8rem; ${isCurrent ? 'background:#111; color:#fff;' : ''}">${monthNames[m]}</th>`;
    }

    if (!state.sites || state.sites.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = state.sites.map((site, siteIndex) => {
        const siteColor = getSiteColor(site.name);
        const noCell = `<td style="text-align:center; padding:0.4rem; border:1px solid rgba(0,0,0,0.06); font-size:0.82rem; font-weight:600;">${siteIndex + 1}</td>`;
        const siteIdCell = `<td style="text-align:center; padding:0.4rem; border:1px solid rgba(0,0,0,0.06); font-size:0.78rem; white-space:nowrap;">${site.siteCode || '-'}</td>`;
        const deviceSubtle = [
            site.brand || site.model ? [site.brand, site.model].filter(Boolean).join(' ') : '',
            site.serialNumber ? `S/N: ${site.serialNumber}` : '',
            site.province ? `จ.${site.province}` : '',
        ].filter(Boolean).map(t => `<span style="display:inline-block; background:rgba(0,0,0,0.05); padding:1px 6px; border-radius:3px; font-size:0.7rem; color:#555; white-space:nowrap;">${t}</span>`).join(' ');
        const deviceCell = `<td class="plan-device-cell" onclick="viewSiteDetails('${site.id}')" style="border-left:4px solid ${siteColor}; min-width:180px; position:sticky; left:0; background:#fff; z-index:2; cursor:pointer; padding:0.5rem 0.75rem;">
            <div><span style="font-weight:600; font-size:0.88rem;">${site.name}</span>${deviceSubtle ? `<div style="display:flex; flex-wrap:wrap; gap:3px; margin-top:3px;">${deviceSubtle}</div>` : ''}</div>
        </td>`;

        const monthCells = Array.from({ length: 12 }, (_, m) => {
            const monthNum = m + 1;
            const isCurrent = m === currentMonth;
            const pd = getPlanMonthData(site, selectedBE, monthNum);
            const { planned, cycleCount, inputDate, planDate } = pd;
            const hasData = planned || cycleCount != null;
            const bg = planned ? `${siteColor}0d` : (cycleCount != null ? 'rgba(0,0,0,0.015)' : (isCurrent ? 'rgba(0,0,0,0.02)' : ''));

            let cellContent = '';
            if (hasData) {
                let planBadgeHtml = '';
                if (planned) {
                    planBadgeHtml = `<span style="background:${siteColor}15; color:${siteColor}; border:1px solid ${siteColor}35; font-size:0.7rem; font-weight:700; padding:4px 8px; border-radius:4px; display:inline-flex; flex-direction:column; align-items:center; justify-content:center; line-height:1.15; white-space:nowrap;"><i class="fa-solid fa-wrench" style="font-size:0.75rem;"></i>${planDate ? `<span style="font-size:0.58rem; font-weight:600; margin-top:2px; opacity:0.85;">${planDate}</span>` : ''}</span>`;
                }

                let cycleBadgeHtml = '';
                if (cycleCount != null) {
                    const datePart = inputDate ? inputDate.split('T')[0] : '';
                    const dateHtml = datePart ? `<span style="font-size:0.58rem; color:${siteColor}; opacity:0.8; display:block; margin-top:2px; font-weight:600;">${datePart}</span>` : '';
                    cycleBadgeHtml = `<span style="background:#fff; color:${siteColor}; border:1.5px dashed ${siteColor}60; font-size:0.7rem; font-weight:700; padding:4px 8px; border-radius:4px; display:inline-flex; flex-direction:column; align-items:center; justify-content:center; line-height:1.15; white-space:nowrap;"><span style="font-size:0.72rem; font-weight:700;">${Number(cycleCount).toLocaleString()}</span>${dateHtml}</span>`;
                }

                cellContent = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; width:100%; box-sizing:border-box; padding:4px 0 2px 0; min-height:42px;">${planBadgeHtml}${cycleBadgeHtml}</div>`;
            }

            return `<td style="position:relative; text-align:center; padding:0.35rem 0.25rem; border:1px solid rgba(0,0,0,0.06); background:${bg}; min-width:85px; cursor:pointer; vertical-align:middle;"
                onmouseenter="showPlanCellMenu(this, '${site.id}','${selectedBE}',${monthNum},${hasData})"
                onmouseleave="hidePlanCellMenu()"
            >${cellContent}${!hasData ? `<span class="plan-cell-add-hint" style="display:none; color:#bbb; font-size:1.1rem; pointer-events:none;">+</span>` : ''}</td>`;
        }).join('');

        return `<tr>${noCell}${siteIdCell}${deviceCell}${monthCells}</tr>`;
    }).join('');
}

window.renderMaintenancePlan = renderMaintenancePlan;

// --- Plan cell hover menu (appended to body to escape overflow clipping) ---
let _planMenuTimeout = null;

function showPlanCellMenu(td, siteId, year, month, hasData) {
    clearTimeout(_planMenuTimeout);

    const existing = document.getElementById('plan-cell-menu');
    if (existing) existing.remove();

    const rect = td.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'plan-cell-menu';

    // Unify overlay container styling
    menu.style.cssText = `
        position: fixed;
        top: ${rect.top}px;
        left: ${rect.left}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background: rgba(255, 255, 255, 0.88);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 6px;
        z-index: 99999;
        pointer-events: auto;
    `;

    // Fetch site and plan data to determine current state
    const site = state.sites.find(s => s.id === siteId);
    const pd = site ? getPlanMonthData(site, year, month) : { planned: false, cycleCount: null };
    const isPlanned = pd.planned;
    const hasCycle = pd.cycleCount != null;

    // 1. Plan Toggle Button (Calendar icon)
    const planBtn = document.createElement('button');
    planBtn.type = 'button';
    planBtn.innerHTML = '<i class="fa-solid fa-calendar-check" style="font-size:0.75rem;"></i>';
    planBtn.title = isPlanned ? 'ยกเลิกแผนซ่อมบำรุงประจำปี' : 'เพิ่มเป็นแผนซ่อมบำรุงประจำปี';

    // Premium theme styles based on active/inactive status
    if (isPlanned) {
        planBtn.style.cssText = 'width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; border-radius:6px; cursor:pointer; flex-shrink:0; transition:all 0.15s ease;';
        planBtn.onmouseenter = () => { planBtn.style.background = '#bae6fd'; planBtn.style.transform = 'scale(1.05)'; };
        planBtn.onmouseleave = () => { planBtn.style.background = '#e0f2fe'; planBtn.style.transform = 'none'; };
    } else {
        planBtn.style.cssText = 'width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:#f3f4f6; color:#9ca3af; border:1px solid #e5e7eb; border-radius:6px; cursor:pointer; flex-shrink:0; transition:all 0.15s ease;';
        planBtn.onmouseenter = () => { planBtn.style.background = '#e5e7eb'; planBtn.style.color = '#4b5563'; planBtn.style.transform = 'scale(1.05)'; };
        planBtn.onmouseleave = () => { planBtn.style.background = '#f3f4f6'; planBtn.style.color = '#9ca3af'; planBtn.style.transform = 'none'; };
    }

    planBtn.onclick = (e) => {
        e.stopPropagation();
        hidePlanCellMenu();
        togglePlanStatus(siteId, year, month);
    };
    menu.appendChild(planBtn);

    // 2. Cycle Count Button (Eye or Plus icon)
    const cycleBtn = document.createElement('button');
    cycleBtn.type = 'button';
    cycleBtn.title = hasCycle ? 'ดูรายละเอียด / บันทึกรอบเครื่อง' : 'บันทึกรอบเครื่องใหม่';

    if (hasCycle) {
        cycleBtn.innerHTML = '<i class="fa-solid fa-eye" style="font-size:0.75rem;"></i>';
        cycleBtn.style.cssText = 'width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:#f3f4f6; color:#4b5563; border:1px solid #d1d5db; border-radius:6px; cursor:pointer; flex-shrink:0; transition:all 0.15s ease;';
        cycleBtn.onmouseenter = () => { cycleBtn.style.background = '#e5e7eb'; cycleBtn.style.transform = 'scale(1.05)'; };
        cycleBtn.onmouseleave = () => { cycleBtn.style.background = '#f3f4f6'; cycleBtn.style.transform = 'none'; };
    } else {
        cycleBtn.innerHTML = '<i class="fa-solid fa-plus" style="font-size:0.75rem;"></i>';
        cycleBtn.style.cssText = 'width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:#ffffff; color:#4b5563; border:1px solid #d1d5db; border-radius:6px; cursor:pointer; flex-shrink:0; transition:all 0.15s ease;';
        cycleBtn.onmouseenter = () => { cycleBtn.style.background = '#f3f4f6'; cycleBtn.style.transform = 'scale(1.05)'; };
        cycleBtn.onmouseleave = () => { cycleBtn.style.background = '#ffffff'; cycleBtn.style.transform = 'none'; };
    }

    cycleBtn.onclick = (e) => {
        e.stopPropagation();
        hidePlanCellMenu();
        openCycleCountModal(siteId, year, month);
    };
    menu.appendChild(cycleBtn);

    menu.onmouseenter = () => clearTimeout(_planMenuTimeout);
    menu.onmouseleave = () => { _planMenuTimeout = setTimeout(hidePlanCellMenu, 80); };

    document.body.appendChild(menu);
}

function hidePlanCellMenu() {
    _planMenuTimeout = setTimeout(() => {
        const menu = document.getElementById('plan-cell-menu');
        if (menu) menu.remove();
    }, 80);
}

window.showPlanCellMenu = showPlanCellMenu;
window.hidePlanCellMenu = hidePlanCellMenu;

// --- Cycle Count Modal ---
let staffCycleMedia = [];

function updateStaffCyclePreview() {
    const previewDiv = document.getElementById('cycle-form-preview');
    const statusText = document.getElementById('cycle-upload-status');
    if (!previewDiv || !statusText) return;

    previewDiv.innerHTML = '';
    if (staffCycleMedia.length === 0) {
        previewDiv.style.display = 'none';
        statusText.textContent = 'ยังไม่ได้เลือกไฟล์';
        return;
    }

    statusText.textContent = `เลือกแล้ว ${staffCycleMedia.length} ไฟล์`;
    previewDiv.style.display = 'flex';

    staffCycleMedia.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'position:relative; width:50px; height:50px; border-radius:6px; overflow:hidden; border:1px solid rgba(0,0,0,0.1); flex-shrink:0;';

            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
            wrapper.appendChild(img);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
            removeBtn.style.cssText = 'position:absolute; top:-1px; right:-1px; background:none; border:none; color:#ef4444; font-size:13px; cursor:pointer; padding:0; line-height:1; z-index:10;';
            removeBtn.onclick = (event) => {
                event.stopPropagation();
                staffCycleMedia.splice(index, 1);
                updateStaffCyclePreview();
            };
            wrapper.appendChild(removeBtn);
            previewDiv.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
    });
}

function initStaffCycleUpload() {
    const fileInput = document.getElementById('cycle-file-input');
    if (!fileInput) return;

    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);

    newFileInput.addEventListener('change', function (e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        staffCycleMedia = [...staffCycleMedia, ...files];
        updateStaffCyclePreview();
    });
}
window.initStaffCycleUpload = initStaffCycleUpload;

async function deleteCycleRecord(siteId, year, month, isLatest, historyIndex) {
    if (!(await showDialog('คุณแน่ใจหรือไม่ที่จะลบรายการบันทึกรอบเครื่องนี้?', {
        type: 'confirm',
        confirmText: 'ลบข้อมูล',
        cancelText: 'ยกเลิก',
        danger: true
    }))) return;

    const site = state.sites.find(s => s.id === siteId);
    if (!site || !site.maintenancePlans || !site.maintenancePlans[year]) return;

    const monthKey = String(month);
    const plan = site.maintenancePlans[year][monthKey];
    if (!plan) return;

    const history = plan.history || [];

    if (isLatest) {
        if (history.length > 0) {
            const nextActive = history.pop();
            plan.cycleCount = nextActive.cycleCount;
            plan.inputDate = nextActive.inputDate;
            plan.notes = nextActive.notes || null;
            plan.attachments = nextActive.attachments || [];
            plan.source = nextActive.source || 'staff';
            plan.history = history;
        } else {
            plan.cycleCount = null;
            plan.inputDate = null;
            plan.notes = null;
            plan.attachments = [];
            plan.source = null;
            plan.history = [];
        }
    } else {
        if (historyIndex >= 0 && historyIndex < history.length) {
            history.splice(historyIndex, 1);
            plan.history = history;
        }
    }

    if (!plan.planned && plan.cycleCount == null && history.length === 0) {
        delete site.maintenancePlans[year][monthKey];
        if (Object.keys(site.maintenancePlans[year]).length === 0) {
            delete site.maintenancePlans[year];
        }
    }

    try {
        await FirestoreService.updateSite(siteId, { maintenancePlans: site.maintenancePlans });
        showToast('ลบรายการบันทึกสำเร็จ', 'success', 2000);
        renderMaintenancePlan();
        openCycleCountModal(siteId, year, month);
    } catch (e) {
        console.error('Failed to delete cycle record:', e);
        showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    }
}
window.deleteCycleRecord = deleteCycleRecord;

function parseDateToTimelineCoords(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length < 2) return null;
    const yearAD = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (isNaN(yearAD) || isNaN(month)) return null;
    return {
        yearBE: yearAD + 543,
        month: month
    };
}

function isBeforeTimeline(a, b) {
    if (!a || !b) return false;
    if (a.yearBE < b.yearBE) return true;
    if (a.yearBE === b.yearBE && a.month < b.month) return true;
    return false;
}

function isAfterTimeline(a, b) {
    if (!a || !b) return false;
    if (a.yearBE > b.yearBE) return true;
    if (a.yearBE === b.yearBE && a.month > b.month) return true;
    return false;
}

function getLatestCycleCountFromPlans(site) {
    if (!site || !site.maintenancePlans) return 0;
    let maxVal = 0;
    Object.keys(site.maintenancePlans).forEach(yStr => {
        const planData = site.maintenancePlans[yStr];
        if (planData && !Array.isArray(planData)) {
            Object.keys(planData).forEach(mKey => {
                const pd = planData[mKey];
                if (pd && pd.cycleCount != null) {
                    const val = parseInt(pd.cycleCount, 10);
                    if (!isNaN(val) && val > maxVal) {
                        maxVal = val;
                    }
                }
                if (pd && pd.history && Array.isArray(pd.history)) {
                    pd.history.forEach(item => {
                        if (item.cycleCount != null) {
                            const val = parseInt(item.cycleCount, 10);
                            if (!isNaN(val) && val > maxVal) {
                                maxVal = val;
                            }
                        }
                    });
                }
            });
        }
    });
    return maxVal;
}

function getPreviousCycleCount(site, currentYear, currentMonth) {
    const currentCoords = { yearBE: parseInt(currentYear, 10), month: parseInt(currentMonth, 10) };
    const records = [];

    // 1. Collect from logs
    const siteLogs = state.logs.filter(l => l.siteId === site.id);
    siteLogs.forEach(log => {
        if (log.cycleCount != null) {
            const val = parseInt(log.cycleCount, 10);
            if (!isNaN(val)) {
                const logCoords = parseDateToTimelineCoords(log.date);
                if (logCoords && isBeforeTimeline(logCoords, currentCoords)) {
                    records.push({ val: val, date: log.date, yearBE: logCoords.yearBE, month: logCoords.month });
                }
            }
        }
    });

    // 2. Collect from maintenancePlans
    if (site.maintenancePlans) {
        Object.keys(site.maintenancePlans).forEach(yStr => {
            const planData = site.maintenancePlans[yStr];
            if (planData && !Array.isArray(planData)) {
                Object.keys(planData).forEach(mKey => {
                    const yearBE = parseInt(yStr, 10);
                    const month = parseInt(mKey, 10);
                    const cellCoords = { yearBE, month };

                    if (isBeforeTimeline(cellCoords, currentCoords)) {
                        const pd = getPlanMonthData(site, yStr, mKey);
                        if (pd.cycleCount != null) {
                            const val = parseInt(pd.cycleCount, 10);
                            if (!isNaN(val)) {
                                records.push({ val: val, date: pd.inputDate || `${yearBE - 543}-${String(month).padStart(2, '0')}-01`, yearBE, month });
                            }
                        }
                        if (pd.history && Array.isArray(pd.history)) {
                            pd.history.forEach(item => {
                                if (item.cycleCount != null) {
                                    const val = parseInt(item.cycleCount, 10);
                                    if (!isNaN(val)) {
                                        records.push({ val: val, date: item.inputDate || `${yearBE - 543}-${String(month).padStart(2, '0')}-01`, yearBE, month });
                                    }
                                }
                            });
                        }
                    }
                });
            }
        });
    }

    if (records.length === 0) return { val: 0, date: '1970-01-01', yearBE: 0, month: 0 };

    // Sort by date descending, then value descending to find the latest previous reading
    records.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateB - dateA !== 0) {
            return dateB - dateA;
        }
        return b.val - a.val;
    });

    return records[0];
}

function getNextCycleCount(site, currentYear, currentMonth) {
    const currentCoords = { yearBE: parseInt(currentYear, 10), month: parseInt(currentMonth, 10) };
    const records = [];

    // 1. Collect from logs
    const siteLogs = state.logs.filter(l => l.siteId === site.id);
    siteLogs.forEach(log => {
        if (log.cycleCount != null) {
            const val = parseInt(log.cycleCount, 10);
            if (!isNaN(val)) {
                const logCoords = parseDateToTimelineCoords(log.date);
                if (logCoords && isAfterTimeline(logCoords, currentCoords)) {
                    records.push({ val: val, date: log.date, yearBE: logCoords.yearBE, month: logCoords.month });
                }
            }
        }
    });

    // 2. Collect from maintenancePlans
    if (site.maintenancePlans) {
        Object.keys(site.maintenancePlans).forEach(yStr => {
            const planData = site.maintenancePlans[yStr];
            if (planData && !Array.isArray(planData)) {
                Object.keys(planData).forEach(mKey => {
                    const yearBE = parseInt(yStr, 10);
                    const month = parseInt(mKey, 10);
                    const cellCoords = { yearBE, month };

                    if (isAfterTimeline(cellCoords, currentCoords)) {
                        const pd = getPlanMonthData(site, yStr, mKey);
                        if (pd.cycleCount != null) {
                            const val = parseInt(pd.cycleCount, 10);
                            if (!isNaN(val)) {
                                records.push({ val: val, date: pd.inputDate || `${yearBE - 543}-${String(month).padStart(2, '0')}-01`, yearBE, month });
                            }
                        }
                        if (pd.history && Array.isArray(pd.history)) {
                            pd.history.forEach(item => {
                                if (item.cycleCount != null) {
                                    const val = parseInt(item.cycleCount, 10);
                                    if (!isNaN(val)) {
                                        records.push({ val: val, date: item.inputDate || `${yearBE - 543}-${String(month).padStart(2, '0')}-01`, yearBE, month });
                                    }
                                }
                            });
                        }
                    }
                });
            }
        });
    }

    if (records.length === 0) return null;

    // Sort by date ascending (earliest first), then value ascending
    records.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA - dateB !== 0) {
            return dateA - dateB;
        }
        return a.val - b.val;
    });

    return records[0];
}

let _cycleModalState = { siteId: null, year: null, month: null };

function openCycleCountModal(siteId, year, month) {
    const site = state.sites.find(s => s.id === siteId);
    if (!site) return;
    const modal = document.getElementById('modal-plan-cycle-count');
    if (!modal) return;
    const userLocale = navigator.language || 'th-TH';
    const monthName = new Date(2024, month - 1, 1).toLocaleString(userLocale, { month: 'long' });
    _cycleModalState = { siteId, year, month };
    const nameEl = document.getElementById('cycle-device-name');
    const labelEl = document.getElementById('cycle-month-label');
    if (nameEl) nameEl.textContent = site.name || siteId;
    if (labelEl) labelEl.textContent = `${monthName} ${year}`;
    const pd = getPlanMonthData(site, year, month);

    // Render source badge
    const sourceEl = document.getElementById('cycle-source-badge');
    if (sourceEl) {
        if (pd.source === 'customer') {
            sourceEl.innerHTML = `<span style="background:rgba(29,78,216,0.08); color:#1d4ed8; padding:4px 8px; border-radius:8px; font-size:0.7rem; font-weight:700; display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-qrcode"></i> ลูกค้าบันทึก (QR)</span>`;
            sourceEl.style.display = 'block';
        } else {
            sourceEl.style.display = 'none';
        }
    }

    const prevCycleObj = getPreviousCycleCount(site, year, month);
    const prevCycle = prevCycleObj.val;
    const activeCycle = pd.cycleCount != null ? parseInt(pd.cycleCount, 10) : null;
    const latestCycle = activeCycle != null && activeCycle > prevCycle ? activeCycle : prevCycle;
    const nextRecord = getNextCycleCount(site, year, month);

    // Set dynamic label with latest cycle count
    const label = document.querySelector('label[for="cycle-count-input"]');
    if (label) {
        if (latestCycle > 0) {
            label.innerHTML = `<i class="fa-solid fa-arrows-spin" style="color:#111;"></i> จำนวนรอบ (Cycle Count) <span style="color:#64748b; font-weight:normal; margin-left:4px;">(ล่าสุด: ${latestCycle.toLocaleString()})</span>`;
        } else {
            label.innerHTML = `<i class="fa-solid fa-arrows-spin" style="color:#111;"></i> จำนวนรอบ (Cycle Count)`;
        }
    }

    const countEl = document.getElementById('cycle-count-input');
    const dateEl = document.getElementById('cycle-date-input');
    const notesEl = document.getElementById('cycle-notes-input');

    if (countEl) {
        countEl.value = ''; // Clean for new entry
        if (latestCycle > 0) {
            countEl.min = latestCycle;
            if (nextRecord) {
                countEl.max = nextRecord.val;
                countEl.placeholder = `ต้องมีค่าระหว่าง ${latestCycle.toLocaleString()} ถึง ${nextRecord.val.toLocaleString()} รอบ`;
            } else {
                countEl.removeAttribute('max');
                countEl.placeholder = `ต้องมีค่าอย่างน้อย ${latestCycle.toLocaleString()} รอบ`;
            }
        } else {
            countEl.removeAttribute('min');
            if (nextRecord) {
                countEl.max = nextRecord.val;
                countEl.placeholder = `ต้องมีค่าไม่เกิน ${nextRecord.val.toLocaleString()} รอบ`;
            } else {
                countEl.removeAttribute('max');
                countEl.placeholder = `ระบุจำนวนรอบ เช่น 12500`;
            }
        }
    }

    if (dateEl) {
        const yearAD = parseInt(year) - 543;
        const monthStr = String(month).padStart(2, '0');
        const today = new Date();
        const hrsStr = String(today.getHours()).padStart(2, '0');
        const minsStr = String(today.getMinutes()).padStart(2, '0');
        if (today.getFullYear() === yearAD && (today.getMonth() + 1) === parseInt(month)) {
            const localISO = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            dateEl.value = localISO;
        } else {
            dateEl.value = `${yearAD}-${monthStr}-01T${hrsStr}:${minsStr}`;
        }
    }
    if (notesEl) notesEl.value = ''; // Clean for new entry notes

    // Reset staff upload media
    staffCycleMedia = [];
    updateStaffCyclePreview();
    const fileInput = document.getElementById('cycle-file-input');
    if (fileInput) fileInput.value = '';

    // Render list of all records (active + history)
    const historyContainer = document.getElementById('cycle-history-container');
    const historyList = document.getElementById('cycle-history-list');
    if (historyContainer && historyList) {
        historyList.innerHTML = '';

        const allRecords = [];
        if (pd.cycleCount != null) {
            allRecords.push({
                cycleCount: pd.cycleCount,
                inputDate: pd.inputDate,
                notes: pd.notes,
                attachments: pd.attachments || [],
                source: pd.source || 'staff',
                reporterName: pd.reporterName || null,
                reporterPhone: pd.reporterPhone || null,
                reporterId: pd.reporterId || null,
                dbIsLatest: pd.dbIsLatest !== undefined ? pd.dbIsLatest : true,
                dbHistoryIndex: pd.dbHistoryIndex !== undefined ? pd.dbHistoryIndex : -1
            });
        }
        if (pd.history && pd.history.length > 0) {
            pd.history.forEach((item) => {
                allRecords.push({
                    ...item,
                    dbIsLatest: item.dbIsLatest !== undefined ? item.dbIsLatest : false,
                    dbHistoryIndex: item.dbHistoryIndex !== undefined ? item.dbHistoryIndex : -1
                });
            });
        }

        if (allRecords.length > 0) {
            allRecords.forEach((item, index) => {
                const tr = document.createElement('tr');
                let rowBg = '';
                const isVisualLatest = index === 0;
                if (isVisualLatest) {
                    rowBg = 'background:rgba(17,17,17,0.03); font-weight:600; border-left:3px solid #111111;';
                } else {
                    rowBg = 'border-bottom:1px solid rgba(0,0,0,0.05);';
                }
                tr.style.cssText = `${rowBg} transition:background 0.15s ease;`;
                tr.onmouseenter = () => { tr.style.background = 'rgba(0,0,0,0.04)'; };
                tr.onmouseleave = () => { tr.style.background = isVisualLatest ? 'rgba(17,17,17,0.03)' : ''; };

                const isCustomerItem = item.source === 'customer' || item.source === 'public';
                const itemBadge = isCustomerItem
                    ? `<span style="font-size:12px; font-weight:600; color:#1d4ed8; display:inline-block; white-space:nowrap;">ลูกค้า</span>`
                    : `<span style="font-size:12px; font-weight:600; color:#10b981; display:inline-block; white-space:nowrap;">เจ้าหน้าที่</span>`;

                // Photo cell
                let photoHtml = '-';
                if (item.attachments && item.attachments.length > 0) {
                    const firstUrl = item.attachments[0].url || item.attachments[0];
                    photoHtml = `<div style="width:48px; height:48px; border-radius:5px; overflow:hidden; border:1px solid rgba(0,0,0,0.12); cursor:pointer; margin:0 auto; display:flex;" onclick="window.openImageViewer('${firstUrl}')">
                         <img src="${firstUrl}" style="width:100%; height:100%; object-fit:cover;">
                    </div>`;
                }

                let reporterNameText = item.reporterName || (isCustomerItem ? '-' : 'เจ้าหน้าที่');
                let reporterPhoneText = item.reporterPhone || '-';
                if (!isCustomerItem && item.reporterId && state.users && state.users[item.reporterId]) {
                    const uProfile = state.users[item.reporterId];
                    if (uProfile.displayName) reporterNameText = uProfile.displayName;
                    if (uProfile.phone) reporterPhoneText = uProfile.phone;
                }
                let notesText = item.notes || '-';
                if (notesText && typeof notesText === 'string') {
                    notesText = notesText.replace(/บันทึกโดยลูกค้า:\.?\s*/g, '').trim();
                    if (!notesText) notesText = '-';
                }

                const detailsHtml = `
                    <div style="display:flex; flex-direction:column; gap:2px; line-height:1.3; color:#64748b; word-break:break-word; font-size:10px;">
                        <div><span style="color:#94a3b8; font-size:10px;">ชื่อ:</span> <span style="color:#4b5563; font-weight:500; font-size:10px;">${reporterNameText}</span></div>
                        <div><span style="color:#94a3b8; font-size:10px;">เบอร์โทร:</span> <span style="color:#4b5563; font-weight:500; font-size:10px;">${reporterPhoneText}</span></div>
                        <div title="${notesText.replace(/"/g, '&quot;')}"><span style="color:#94a3b8; font-size:10px;">หมายเหตุ:</span> <span style="color:#64748b; font-size:10px;">${notesText}</span></div>
                    </div>
                `;

                const deleteBtnHtml = `<button type="button" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:2px 4px; font-size:12px; transition:transform 0.15s ease;" onclick="deleteCycleRecord('${siteId}', ${year}, ${month}, ${item.dbIsLatest}, ${item.dbHistoryIndex})" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='none'">
                    <i class="fa-solid fa-trash-can"></i>
                </button>`;

                let displayDate = '-';
                if (item.inputDate) {
                    try {
                        const d = new Date(item.inputDate);
                        if (!isNaN(d.getTime())) {
                            const userLocale = navigator.language || 'th-TH';
                            displayDate = d.toLocaleString(userLocale, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            });
                        } else {
                            displayDate = item.inputDate;
                        }
                    } catch (e) {
                        displayDate = item.inputDate;
                    }
                }

                tr.innerHTML = `
                    <td style="padding:10px 8px; vertical-align:middle; color:#4b5563; font-size:12px; white-space:nowrap; min-width:120px;">${displayDate}</td>
                    <td style="padding:10px 8px; vertical-align:middle; font-size:12px; white-space:nowrap; min-width:80px;">
                        <div style="display:flex; align-items:center; gap:3px;">
                            <span style="font-weight:700; color:#111; font-size:12px;">${item.cycleCount ? Number(item.cycleCount).toLocaleString() : '-'}</span>
                        </div>
                    </td>
                    <td style="padding:10px 8px; vertical-align:middle; text-align:center; font-size:12px; white-space:nowrap; min-width:70px;">${itemBadge}</td>
                    <td style="padding:10px 8px; vertical-align:middle; color:#4b5563; font-size:10px; word-break:break-word; width:100%;">${detailsHtml}</td>
                    <td style="padding:10px 8px; vertical-align:middle; text-align:center; white-space:nowrap; min-width:60px;">${photoHtml}</td>
                    <td style="padding:10px 8px; vertical-align:middle; text-align:center; font-size:12px; white-space:nowrap; min-width:40px;">${deleteBtnHtml}</td>
                `;
                historyList.appendChild(tr);
            });
            historyContainer.style.display = 'flex';
        } else {
            historyContainer.style.display = 'none';
        }
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    setTimeout(() => { if (countEl) countEl.focus(); }, 150);
}
window.openCycleCountModal = openCycleCountModal;

function closeCycleCountModal() {
    const modal = document.getElementById('modal-plan-cycle-count');
    if (modal) { modal.classList.add('hidden'); modal.style.display = ''; }
    _cycleModalState = { siteId: null, year: null, month: null };
}
window.closeCycleCountModal = closeCycleCountModal;

async function saveCycleCount() {
    const { siteId, year, month } = _cycleModalState;
    if (!siteId || !year || !month) return;
    const site = state.sites.find(s => s.id === siteId);
    if (!site) return;
    const cycleCountVal = document.getElementById('cycle-count-input')?.value;
    const inputDate = document.getElementById('cycle-date-input')?.value;
    const notes = document.getElementById('cycle-notes-input')?.value.trim() || '';
    const cycleCount = cycleCountVal !== '' ? parseInt(cycleCountVal, 10) : null;

    if (!site.maintenancePlans) site.maintenancePlans = {};
    if (Array.isArray(site.maintenancePlans[year])) site.maintenancePlans[year] = migratePlanToObjectFormat(site.maintenancePlans[year]);
    if (!site.maintenancePlans[year]) site.maintenancePlans[year] = {};
    const monthKey = String(month);

    // Preserve existing attachments & history if any
    const existingPlan = site.maintenancePlans[year][monthKey] || {};
    const planned = existingPlan.planned ?? false;
    const attachments = existingPlan.attachments || [];
    const history = existingPlan.history || [];

    const prevRecord = getPreviousCycleCount(site, year, month);
    const nextRecord = getNextCycleCount(site, year, month);

    if (cycleCount != null && !inputDate) {
        showToast('กรุณาระบุวันที่บันทึก', 'error');
        return;
    }

    if (cycleCount != null) {
        if (prevRecord.val > 0 && cycleCount < prevRecord.val) {
            const userLocale = navigator.language || 'th-TH';
            const monthName = new Date(2024, prevRecord.month - 1, 1).toLocaleString(userLocale, { month: 'long' });
            showToast(`จำนวนรอบต้องไม่น้อยกว่าค่าก่อนหน้า (${prevRecord.val.toLocaleString()} รอบ ในเดือน${monthName} พ.ศ. ${prevRecord.yearBE})`, 'error');
            return;
        }
        if (nextRecord && cycleCount > nextRecord.val) {
            const userLocale = navigator.language || 'th-TH';
            const monthName = new Date(2024, nextRecord.month - 1, 1).toLocaleString(userLocale, { month: 'long' });
            showToast(`จำนวนรอบต้องไม่มากกว่าค่าถัดไป (${nextRecord.val.toLocaleString()} รอบ ในเดือน${monthName} พ.ศ. ${nextRecord.yearBE})`, 'error');
            return;
        }
    }

    // Push previous count to history if it has changed
    if (existingPlan.cycleCount != null) {
        history.push({
            cycleCount: existingPlan.cycleCount,
            inputDate: existingPlan.inputDate,
            notes: existingPlan.notes,
            attachments: existingPlan.attachments || [],
            source: existingPlan.source || 'staff',
            reporterName: existingPlan.reporterName || null,
            reporterPhone: existingPlan.reporterPhone || null,
            reporterId: existingPlan.reporterId || null
        });
    }

    const saveBtn = document.getElementById('btn-cycle-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังบันทึก...'; }
    try {
        let uploadedAttachments = [];
        if (staffCycleMedia.length > 0) {
            uploadedAttachments = await uploadMediaFiles(staffCycleMedia, 'cycle-count');
        }

        // Fetch staff profile info
        let reporterName = 'เจ้าหน้าที่';
        let reporterPhone = '';
        const user = auth.currentUser;
        if (user) {
            reporterName = user.displayName || user.email || 'เจ้าหน้าที่';
            if (state.users && state.users[user.uid]) {
                const uData = state.users[user.uid];
                if (uData.displayName) reporterName = uData.displayName;
                if (uData.phone) reporterPhone = uData.phone;
            } else {
                try {
                    const userDoc = await FirestoreService.getUser(user.uid);
                    if (userDoc) {
                        if (userDoc.displayName) reporterName = userDoc.displayName;
                        if (userDoc.phone) reporterPhone = userDoc.phone;
                    }
                } catch (e) {
                    console.error('Failed to get staff user profile:', e);
                }
            }
        }

        if (!planned && cycleCount == null && !inputDate && !notes && uploadedAttachments.length === 0) {
            delete site.maintenancePlans[year][monthKey];
            if (Object.keys(site.maintenancePlans[year]).length === 0) delete site.maintenancePlans[year];
        } else {
            site.maintenancePlans[year][monthKey] = {
                planned,
                cycleCount,
                inputDate: inputDate || new Date().toISOString().split('T')[0],
                planDate: existingPlan.planDate || null,
                notes: notes || null,
                attachments: uploadedAttachments,
                history: history,
                source: 'staff',
                reporterName: reporterName,
                reporterPhone: reporterPhone,
                reporterId: user ? user.uid : null
            };
        }

        await FirestoreService.updateSite(siteId, { maintenancePlans: site.maintenancePlans });

        // Reset staff upload variables
        staffCycleMedia = [];
        updateStaffCyclePreview();
        const fileInput = document.getElementById('cycle-file-input');
        if (fileInput) fileInput.value = '';

        closeCycleCountModal();
        renderMaintenancePlan();
        showToast('บันทึก Cycle Count สำเร็จ', 'success', 2000);
    } catch (e) {
        console.error('Failed to save cycle count:', e);
        showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึก'; }
    }
}
window.saveCycleCount = saveCycleCount;

async function clearCycleCount() {
    if (!(await showDialog('คุณแน่ใจหรือไม่ที่จะล้างข้อมูลของเดือนนี้?', { type: 'confirm', confirmText: 'ล้างข้อมูล', cancelText: 'ยกเลิก', danger: true }))) return;
    const countEl = document.getElementById('cycle-count-input');
    const dateEl = document.getElementById('cycle-date-input');
    const notesEl = document.getElementById('cycle-notes-input');
    if (countEl) countEl.value = '';
    if (dateEl) dateEl.value = '';
    if (notesEl) notesEl.value = '';

    staffCycleMedia = [];
    updateStaffCyclePreview();

    await saveCycleCount();
}
window.clearCycleCount = clearCycleCount;

async function deletePlanEntry(siteId, year, month) {
    if (!(await showDialog('คุณแน่ใจหรือไม่ที่จะล้างข้อมูลของเดือนนี้?', { type: 'confirm', confirmText: 'ล้างข้อมูล', cancelText: 'ยกเลิก', danger: true }))) return;
    const site = state.sites.find(s => s.id === siteId);
    if (!site) return;

    if (!site.maintenancePlans) site.maintenancePlans = {};

    // Migrate legacy array format to object format before deleting
    if (Array.isArray(site.maintenancePlans[year])) {
        site.maintenancePlans[year] = migratePlanToObjectFormat(site.maintenancePlans[year]);
    }

    if (site.maintenancePlans[year]) {
        delete site.maintenancePlans[year][String(month)];
        // Clean up empty year
        if (Object.keys(site.maintenancePlans[year]).length === 0) {
            delete site.maintenancePlans[year];
        }
    }

    try {
        await FirestoreService.updateSite(siteId, { maintenancePlans: site.maintenancePlans });
        renderMaintenancePlan();
        showToast('ล้างข้อมูลสำเร็จ', 'success', 2000);
    } catch (e) {
        console.error('deletePlanEntry failed:', e);
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}
window.deletePlanEntry = deletePlanEntry;

let _planDateModalState = { siteId: null, year: null, month: null };

function openPlanDateModal(siteId, year, month) {
    const site = state.sites.find(s => s.id === siteId);
    if (!site) return;
    const monthKey = String(month);
    const existingPlan = (site.maintenancePlans && site.maintenancePlans[year] && site.maintenancePlans[year][monthKey]) || {};

    _planDateModalState = { siteId, year, month };
    const modal = document.getElementById('modal-plan-date');
    const dateInput = document.getElementById('plan-date-input');
    if (!modal || !dateInput) return;

    // Pre-fill date
    if (existingPlan.inputDate) {
        dateInput.value = existingPlan.inputDate;
    } else {
        const yearAD = parseInt(year) - 543;
        const monthStr = String(month).padStart(2, '0');
        dateInput.value = `${yearAD}-${monthStr}-01`;
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function closePlanDateModal() {
    const modal = document.getElementById('modal-plan-date');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = '';
    }
    _planDateModalState = { siteId: null, year: null, month: null };
}

async function savePlanDate() {
    const { siteId, year, month } = _planDateModalState;
    if (!siteId || !year || !month) return;
    const dateInput = document.getElementById('plan-date-input');
    const dateVal = dateInput ? dateInput.value : '';
    if (!dateVal) {
        showToast('กรุณาระบุวันที่ซ่อมบำรุง', 'error');
        return;
    }

    // Validate that the date matches the selected month and year
    const dateObj = new Date(dateVal);
    const dateYear = dateObj.getFullYear();
    const dateMonth = dateObj.getMonth() + 1; // 1-indexed
    const cellYearAD = parseInt(year) - 543;
    const cellMonth = parseInt(month);

    if (dateYear !== cellYearAD || dateMonth !== cellMonth) {
        const userLocale = navigator.language || 'th-TH';
        const monthName = new Date(2024, cellMonth - 1, 1).toLocaleString(userLocale, { month: 'long' });
        showToast(`วันที่ต้องอยู่ในเดือน ${monthName} พ.ศ. ${year}`, 'error');
        return;
    }

    const site = state.sites.find(s => s.id === siteId);
    if (!site) return;

    if (!site.maintenancePlans) site.maintenancePlans = {};
    if (Array.isArray(site.maintenancePlans[year])) {
        site.maintenancePlans[year] = migratePlanToObjectFormat(site.maintenancePlans[year]);
    }
    if (!site.maintenancePlans[year]) site.maintenancePlans[year] = {};

    const monthKey = String(month);
    const existingPlan = site.maintenancePlans[year][monthKey] || {};

    site.maintenancePlans[year][monthKey] = {
        ...existingPlan,
        planned: true,
        planDate: dateVal,
        inputDate: existingPlan.inputDate || dateVal
    };

    const saveBtn = document.getElementById('btn-plan-date-save');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังบันทึก...';
    }

    try {
        await FirestoreService.updateSite(siteId, { maintenancePlans: site.maintenancePlans });
        showToast('เพิ่มแผนซ่อมบำรุงประจำปีสำเร็จ', 'success', 1500);
        closePlanDateModal();
        renderMaintenancePlan();
    } catch (e) {
        console.error('Failed to save plan date:', e);
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'บันทึก';
        }
    }
}

function initPlanDateModal() {
    const saveBtn = document.getElementById('btn-plan-date-save');
    const cancelBtn = document.getElementById('btn-plan-date-cancel');
    const closeBtn = document.getElementById('btn-close-plan-date-modal');
    const modal = document.getElementById('modal-plan-date');
    if (saveBtn) saveBtn.onclick = savePlanDate;
    if (cancelBtn) cancelBtn.onclick = closePlanDateModal;
    if (closeBtn) closeBtn.onclick = closePlanDateModal;
    if (modal) modal.onclick = (e) => { if (e.target === modal) closePlanDateModal(); };
}

async function togglePlanStatus(siteId, year, month) {
    const site = state.sites.find(s => s.id === siteId);
    if (!site) return;
    const monthKey = String(month);

    if (!site.maintenancePlans) site.maintenancePlans = {};
    if (Array.isArray(site.maintenancePlans[year])) {
        site.maintenancePlans[year] = migratePlanToObjectFormat(site.maintenancePlans[year]);
    }
    if (!site.maintenancePlans[year]) site.maintenancePlans[year] = {};

    const existingPlan = site.maintenancePlans[year][monthKey] || {};
    const newPlanned = !existingPlan.planned;

    if (newPlanned) {
        openPlanDateModal(siteId, year, month);
    } else {
        if (existingPlan.cycleCount == null && (!existingPlan.history || existingPlan.history.length === 0)) {
            delete site.maintenancePlans[year][monthKey];
            if (Object.keys(site.maintenancePlans[year]).length === 0) {
                delete site.maintenancePlans[year];
            }
        } else {
            site.maintenancePlans[year][monthKey] = {
                ...existingPlan,
                planned: false
            };
        }

        try {
            await FirestoreService.updateSite(siteId, { maintenancePlans: site.maintenancePlans });
            showToast('ยกเลิกแผนซ่อมบำรุงประจำปีสำเร็จ', 'success', 1500);
            renderMaintenancePlan();
        } catch (e) {
            console.error('Failed to toggle plan status:', e);
            showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
        }
    }
}
window.togglePlanStatus = togglePlanStatus;

/** Wire up cycle count modal buttons. Called once during init. */
function initCycleCountModal() {
    const saveBtn = document.getElementById('btn-cycle-save');
    const clearBtn = document.getElementById('btn-cycle-clear');
    const cancelBtn = document.getElementById('btn-cycle-cancel');
    const closeBtn = document.getElementById('btn-close-cycle-modal');
    const modal = document.getElementById('modal-plan-cycle-count');
    if (saveBtn) saveBtn.addEventListener('click', saveCycleCount);
    if (clearBtn) clearBtn.addEventListener('click', clearCycleCount);
    if (cancelBtn) cancelBtn.addEventListener('click', closeCycleCountModal);
    if (closeBtn) closeBtn.addEventListener('click', closeCycleCountModal);
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeCycleCountModal(); });
    const countInput = document.getElementById('cycle-count-input');
    if (countInput) countInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveCycleCount(); });
}

// ============================================================
// QR CODE DEVICE FEATURE
// ============================================================

function getAppBaseUrl() {
    return window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
}

function showDeviceQR(siteId) {
    try {
        const site = state.sites.find(s => s.id === siteId);
        if (!site) {
            showToast('ไม่พบข้อมูลเครื่อง', 'error');
            return;
        }
        const modal = document.getElementById('modal-device-qr');
        if (!modal) return;

        // Move modal to end of <body> to avoid being clipped/constrained by any parent
        // modal's stacking context (e.g. when opened from site detail modal)
        if (modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }

        // Show modal immediately with forced top-level z-index
        const btnClose = document.getElementById('btn-close-qr-modal');
        if (btnClose) btnClose.onclick = () => closeDeviceQRModal();
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.zIndex = '10050';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';

        // Delay binding modal backdrop click to prevent the same click event from
        // immediately closing the modal via event bubbling
        setTimeout(() => {
            modal.onclick = (e) => { if (e.target === modal) closeDeviceQRModal(); };
        }, 0);

        const baseUrl = getAppBaseUrl();
        const reportUrl = `${baseUrl}index.html?report=${siteId}`;

        // Set modal header
        const nameEl = document.getElementById('qr-modal-device-name');
        if (nameEl) nameEl.textContent = site.name || 'QR Code เครื่อง';

        // Show URL
        const urlEl = document.getElementById('qr-url-display');
        if (urlEl) urlEl.textContent = reportUrl;

        // Load company settings, then render everything
        FirestoreService.getCompanySettings().then(company => {
            const companyName = company.name || 'บริษัท ไบโอ อินโน เทค จำกัด';
            const hotline = company.hotline || '';

            // Build the unified card HTML (used for preview, print, and download)
            const buildCardHtml = (qrSrc) => `
            <div style="
                font-family:'Sarabun',Arial,sans-serif;
                width:280px;
                background:#fff;
                border-radius:16px;
                border:1.5px solid #e5e7eb;
                box-shadow:0 4px 20px rgba(0,0,0,0.10);
                overflow:hidden;
                margin:0 auto;
            ">
                <!-- Top accent -->
                <div style="height:4px; background:linear-gradient(90deg,#8bc53f,#38bdf8);"></div>

                <!-- Body -->
                <div style="padding:20px 20px 16px; text-align:center;">
                    <!-- Company -->
                    <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:12px;">
                        <img src="/bioinnotech.svg" alt="Logo" style="height:22px; width:auto;" onerror="this.style.display='none'">
                        <span style="font-size:0.72rem; font-weight:700; color:#374151;">${companyName}</span>
                    </div>

                    <!-- QR Code -->
                    <div style="display:inline-block; padding:8px; background:#fff; border:1.5px solid #e5e7eb; border-radius:10px; margin-bottom:14px;">
                        ${qrSrc ? `<img src="${qrSrc}" style="width:180px; height:180px; display:block;">` : `<div style="width:180px;height:180px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:0.8rem;">กำลังโหลด...</div>`}
                    </div>

                    <!-- Scan hint -->
                    <div style="font-size:0.72rem; color:#6b7280; margin-bottom:12px;">สแกนเพื่อแจ้งปัญหาเครื่อง<br>หรือ บันทึก Cycle Count</div>

                    <!-- Device name -->
                    <div style="font-size:0.95rem; font-weight:700; color:#111; margin-bottom:4px;">${site.name}</div>
                    ${site.installLocation || site.villageName ? `<div style="font-size:0.75rem; color:#6b7280; margin-bottom:4px;">${site.installLocation || site.villageName}</div>` : ''}

                    <!-- Badges -->
                    <div style="display:flex; align-items:center; justify-content:center; gap:6px; flex-wrap:wrap; margin-bottom:${hotline ? '10px' : '4px'};">
                        ${site.siteCode ? `<span style="background:#f3f4f6; color:#374151; font-size:0.68rem; font-weight:600; padding:2px 8px; border-radius:6px;">${site.siteCode}</span>` : ''}
                        ${site.serialNumber ? `<span style="background:#f3f4f6; color:#374151; font-size:0.68rem; padding:2px 8px; border-radius:6px;">S/N: ${site.serialNumber}</span>` : ''}
                    </div>

                    <!-- Hotline -->
                    ${hotline ? `<div style="font-size:0.78rem; font-weight:600; color:#000000;">สายด่วน: ${hotline}</div>` : ''}
                </div>

                <!-- Footer -->
                <div style="background:#f9fafb; border-top:1px solid #e5e7eb; padding:7px 16px; text-align:center;">
                    <span style="font-size:0.62rem; color:#9ca3af; letter-spacing:0.04em; text-transform:uppercase;">CASP Maintenance System</span>
                </div>
            </div>`;

            // Render preview card in modal (replace canvas with card preview)
            const canvas = document.getElementById('device-qr-canvas');
            const cardPreviewEl = document.getElementById('qr-card-preview');

            // Generate QR then render card
            let cachedQrDataUrl = ''; // store clean QR data URL to avoid tainted canvas
            const renderCard = (qrDataUrl) => {
                cachedQrDataUrl = qrDataUrl;
                if (cardPreviewEl) {
                    cardPreviewEl.innerHTML = buildCardHtml(qrDataUrl);
                }
            };

            if (typeof QRCode !== 'undefined') {
                const offscreen = document.createElement('canvas');
                QRCode.toCanvas(offscreen, reportUrl, {
                    width: 220, margin: 2,
                    color: { dark: '#0f172a', light: '#ffffff' },
                    errorCorrectionLevel: 'M'
                }, (err) => {
                    const qrDataUrl = err ? '' : offscreen.toDataURL('image/png');
                    renderCard(qrDataUrl);
                });
            } else {
                // Fetch external QR image as blob and convert to data URL to avoid tainted canvas
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(reportUrl)}`;
                fetch(qrUrl)
                    .then(res => res.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onload = () => renderCard(reader.result);
                        reader.onerror = () => renderCard(qrUrl); // fallback: show img but can't download
                        reader.readAsDataURL(blob);
                    })
                    .catch(() => renderCard(qrUrl));
            }


            // Download: render card PNG matching buildCardHtml exactly (2× scale)
            const btnDownload = document.getElementById('btn-download-qr');
            if (btnDownload) {
                btnDownload.onclick = async () => {
                    try {
                        const S = 2; // 2× retina scale
                        const CW = 280 * S; // card width = 560px

                        // Helper: fetch any URL → blob → data URL (avoids tainted canvas)
                        const toDataUrl = async (src) => {
                            try {
                                const blob = await fetch(src).then(r => r.blob());
                                return await new Promise((res, rej) => {
                                    const fr = new FileReader();
                                    fr.onload = () => res(fr.result);
                                    fr.onerror = rej;
                                    fr.readAsDataURL(blob);
                                });
                            } catch { return null; }
                        };

                        const loadImg = (src) => new Promise(res => {
                            if (!src) return res(null);
                            const img = new Image();
                            img.onload = () => res(img);
                            img.onerror = () => res(null);
                            img.src = src;
                        });

                        // Pre-load logo and QR in parallel
                        const [logoDataUrl, qrImg] = await Promise.all([
                            toDataUrl('/bioinnotech.svg'),
                            loadImg(cachedQrDataUrl),
                        ]);
                        const logoImg = await loadImg(logoDataUrl);

                        // ── Layout constants mirroring buildCardHtml (scaled × S) ──
                        const accentH = 4 * S;
                        const bPadT = 20 * S;   // body top padding
                        const bPadH = 20 * S;   // body horizontal padding (not used for clip, just reference)
                        const bPadB = 16 * S;   // body bottom padding
                        const logoH = 22 * S;   // logo image height (html: 22px)
                        const logoGap = 8 * S;   // gap between logo and company name
                        const afterLogoRow = 12 * S; // margin-bottom on company row
                        const qrBorder = 1.5 * S;
                        const qrPad = 8 * S;
                        const qrSize = 180 * S;
                        const qrBoxR = 10 * S;
                        const qrBoxW = qrSize + qrPad * 2;
                        const qrBoxH = qrSize + qrPad * 2;
                        const afterQrBox = 14 * S;   // margin-bottom on QR box
                        const hintPx = Math.round(0.72 * 16 * S);
                        const afterHint = 12 * S;
                        const namePx = Math.round(0.95 * 16 * S);
                        const locPx = Math.round(0.75 * 16 * S);
                        const badgePx = Math.round(0.68 * 16 * S);
                        const badgePadH = 8 * S;
                        const badgePadV = 2 * S;
                        const badgeR = 6 * S;
                        const badgeGap = 6 * S;
                        const hotlinePx = Math.round(0.78 * 16 * S);
                        const footerPadV = 7 * S;
                        const footerPx = Math.round(0.62 * 16 * S);

                        // Calculate total height
                        const hintH = hintPx * 2 + 2 * S;
                        let bodyH = bPadT + logoH + afterLogoRow + qrBoxH + afterQrBox + hintH + afterHint + namePx;
                        if (site.installLocation || site.villageName) bodyH += 4 * S + locPx;
                        const badges = [site.siteCode, site.serialNumber ? `S/N: ${site.serialNumber}` : ''].filter(Boolean);
                        if (badges.length) bodyH += 6 * S + badgePx + badgePadV * 2;
                        if (hotline) bodyH += 10 * S + hotlinePx;
                        bodyH += bPadB;
                        const footerH = footerPadV + footerPx + footerPadV;
                        const totalH = accentH + bodyH + footerH;

                        // ── Canvas setup ──
                        const oc = document.createElement('canvas');
                        oc.width = CW;
                        oc.height = totalH;
                        const ctx = oc.getContext('2d');

                        // White background + rounded-rect clip (border-radius: 16px)
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, CW, totalH);
                        const cardR = 16 * S;
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(cardR, 0); ctx.lineTo(CW - cardR, 0);
                        ctx.arcTo(CW, 0, CW, cardR, cardR);
                        ctx.lineTo(CW, totalH - cardR);
                        ctx.arcTo(CW, totalH, CW - cardR, totalH, cardR);
                        ctx.lineTo(cardR, totalH);
                        ctx.arcTo(0, totalH, 0, totalH - cardR, cardR);
                        ctx.lineTo(0, cardR);
                        ctx.arcTo(0, 0, cardR, 0, cardR);
                        ctx.closePath();
                        ctx.clip();

                        // ── Accent bar ──
                        const accentGrad = ctx.createLinearGradient(0, 0, CW, 0);
                        accentGrad.addColorStop(0, '#8bc53f');
                        accentGrad.addColorStop(1, '#38bdf8');
                        ctx.fillStyle = accentGrad;
                        ctx.fillRect(0, 0, CW, accentH);

                        let y = accentH + bPadT;

                        // ── Company row: logo img + gap + name (centered) ──
                        {
                            ctx.font = `700 ${Math.round(0.72 * 16 * S)}px Sarabun, Arial, sans-serif`;
                            const textW = ctx.measureText(companyName).width;
                            const logoDrawW = logoImg ? Math.round(logoH * (logoImg.width / logoImg.height)) : 0;
                            const rowW = logoDrawW + (logoImg ? logoGap : 0) + textW;
                            let rx = (CW - rowW) / 2;
                            if (logoImg) {
                                ctx.drawImage(logoImg, rx, y + (logoH - logoH) / 2, logoDrawW, logoH);
                                rx += logoDrawW + logoGap;
                            }
                            ctx.fillStyle = '#374151';
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(companyName, rx, y + logoH / 2);
                        }
                        y += logoH + afterLogoRow;

                        // ── QR box ──
                        {
                            const bx = (CW - qrBoxW) / 2;
                            // Draw rounded box (border + fill)
                            ctx.beginPath();
                            ctx.moveTo(bx + qrBoxR, y);
                            ctx.lineTo(bx + qrBoxW - qrBoxR, y);
                            ctx.arcTo(bx + qrBoxW, y, bx + qrBoxW, y + qrBoxR, qrBoxR);
                            ctx.lineTo(bx + qrBoxW, y + qrBoxH - qrBoxR);
                            ctx.arcTo(bx + qrBoxW, y + qrBoxH, bx + qrBoxW - qrBoxR, y + qrBoxH, qrBoxR);
                            ctx.lineTo(bx + qrBoxR, y + qrBoxH);
                            ctx.arcTo(bx, y + qrBoxH, bx, y + qrBoxH - qrBoxR, qrBoxR);
                            ctx.lineTo(bx, y + qrBoxR);
                            ctx.arcTo(bx, y, bx + qrBoxR, y, qrBoxR);
                            ctx.closePath();
                            ctx.fillStyle = '#ffffff';
                            ctx.fill();
                            ctx.strokeStyle = '#e5e7eb';
                            ctx.lineWidth = qrBorder;
                            ctx.stroke();
                            if (qrImg) ctx.drawImage(qrImg, bx + qrPad, y + qrPad, qrSize, qrSize);
                        }
                        y += qrBoxH + afterQrBox;

                        // ── Scan hint ──
                        ctx.font = `${hintPx}px Sarabun, Arial, sans-serif`;
                        ctx.fillStyle = '#6b7280';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('สแกนเพื่อแจ้งปัญหาเครื่อง', CW / 2, y + hintPx / 2);
                        ctx.fillText('หรือ บันทึก Cycle Count', CW / 2, y + hintPx * 1.5 + 2 * S);
                        y += (hintPx * 2 + 2 * S) + afterHint;

                        // ── Device name ──
                        ctx.font = `700 ${namePx}px Sarabun, Arial, sans-serif`;
                        ctx.fillStyle = '#111111';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(site.name || '', CW / 2, y + namePx / 2);
                        y += namePx;

                        // ── Location ──
                        if (site.installLocation || site.villageName) {
                            y += 4 * S;
                            ctx.font = `${locPx}px Sarabun, Arial, sans-serif`;
                            ctx.fillStyle = '#6b7280';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(site.installLocation || site.villageName, CW / 2, y + locPx / 2);
                            y += locPx;
                        }

                        // ── Badges (pill-shaped, same as HTML) ──
                        if (badges.length) {
                            y += 6 * S;
                            ctx.font = `600 ${badgePx}px Sarabun, Arial, sans-serif`;
                            const bWs = badges.map(b => ctx.measureText(b).width + badgePadH * 2);
                            const totalBW = bWs.reduce((a, b) => a + b, 0) + (badges.length - 1) * badgeGap;
                            const bh = badgePx + badgePadV * 2;
                            let bx = (CW - totalBW) / 2;
                            badges.forEach((badge, i) => {
                                const bw = bWs[i];
                                ctx.beginPath();
                                ctx.moveTo(bx + badgeR, y);
                                ctx.lineTo(bx + bw - badgeR, y);
                                ctx.arcTo(bx + bw, y, bx + bw, y + badgeR, badgeR);
                                ctx.lineTo(bx + bw, y + bh - badgeR);
                                ctx.arcTo(bx + bw, y + bh, bx + bw - badgeR, y + bh, badgeR);
                                ctx.lineTo(bx + badgeR, y + bh);
                                ctx.arcTo(bx, y + bh, bx, y + bh - badgeR, badgeR);
                                ctx.lineTo(bx, y + badgeR);
                                ctx.arcTo(bx, y, bx + badgeR, y, badgeR);
                                ctx.closePath();
                                ctx.fillStyle = '#f3f4f6';
                                ctx.fill();
                                ctx.fillStyle = '#374151';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(badge, bx + bw / 2, y + bh / 2);
                                bx += bw + badgeGap;
                            });
                            y += bh;
                        }

                        // ── Hotline ──
                        if (hotline) {
                            y += 10 * S;
                            ctx.font = `600 ${hotlinePx}px Sarabun, Arial, sans-serif`;
                            ctx.fillStyle = '#000000';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(`สายด่วน: ${hotline}`, CW / 2, y + hotlinePx / 2);
                            y += hotlinePx;
                        }

                        y += bPadB;

                        // ── Footer ──
                        ctx.fillStyle = '#f9fafb';
                        ctx.fillRect(0, y, CW, footerH);
                        ctx.strokeStyle = '#e5e7eb';
                        ctx.lineWidth = 1 * S;
                        ctx.beginPath();
                        ctx.moveTo(0, y); ctx.lineTo(CW, y);
                        ctx.stroke();
                        ctx.font = `${footerPx}px Sarabun, Arial, sans-serif`;
                        ctx.fillStyle = '#9ca3af';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.letterSpacing = `${0.04 * footerPx}px`;
                        ctx.fillText('CASP MAINTENANCE SYSTEM', CW / 2, y + footerH / 2);
                        ctx.letterSpacing = '0px';

                        ctx.restore(); // end clip

                        // Trigger download
                        const a = document.createElement('a');
                        a.href = oc.toDataURL('image/png');
                        a.download = `QR-${site.name || siteId}.png`;
                        a.click();
                        showToast('ดาวน์โหลดรูปภาพเรียบร้อย', 'success');
                    } catch (e) {
                        console.error('QR download error:', e);
                        showToast('เกิดข้อผิดพลาดในการดาวน์โหลด', 'error');
                    }
                };
            }


            // Copy link
            const btnCopy = document.getElementById('btn-copy-qr-link');
            if (btnCopy) btnCopy.onclick = () => {
                navigator.clipboard.writeText(reportUrl).then(() => showToast('คัดลอกลิงก์เรียบร้อย', 'success')).catch(() => {
                    const ta = document.createElement('textarea');
                    ta.value = reportUrl;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    showToast('คัดลอกลิงก์เรียบร้อย', 'success');
                });
            };

            // Print
            const btnPrint = document.getElementById('btn-print-qr');
            if (btnPrint) btnPrint.onclick = () => {
                const cardHtml = buildCardHtml(cachedQrDataUrl);
                const printWin = window.open('', '_blank');
                printWin.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A6 portrait;margin:8mm;}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
body{margin:0;padding:0;background:#fff;display:flex;justify-content:center;align-items:flex-start;}
</style>
</head><body>${cardHtml}</body></html>`);
                printWin.document.close();
                printWin.focus();
                setTimeout(() => { printWin.print(); }, 500);
            };
        }).catch(err => {
            console.error("Firestore getCompanySettings error in showDeviceQR:", err);
        });
    } catch (e) {
        console.error("Error in showDeviceQR:", e);
        alert("Error showing QR modal: " + e.message);
    }
}
window.showDeviceQR = showDeviceQR;

function closeDeviceQRModal() {
    const modal = document.getElementById('modal-device-qr');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        modal.onclick = null;
    }
}
window.closeDeviceQRModal = closeDeviceQRModal;

function printDeviceQR(site, reportUrl, canvas) {
    const qrDataUrl = canvas ? canvas.toDataURL('image/png') : '';
    // Load company settings then print
    FirestoreService.getCompanySettings().then(company => {
        const companyName = company.name || 'บริษัท ไบโอ อินโน เทค จำกัด';
        const hotline = company.hotline || '';
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR Code - ${site.name}</title>
<style>
body{font-family:'Sarabun',Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fff;}
.card{text-align:center;padding:24px 28px;border:2px solid #e5e7eb;border-radius:16px;max-width:320px;box-shadow:0 4px 16px rgba(0,0,0,0.08);}
.company{font-size:0.78rem;font-weight:700;color:#555;margin-bottom:2px;}
.title{font-size:1.05rem;font-weight:700;color:#1e293b;margin:8px 0 2px;}
.sub{font-size:0.78rem;color:#64748b;margin-bottom:14px;}
.qr-img{width:200px;height:200px;border:1px solid #e5e7eb;border-radius:8px;padding:8px;}
.name{font-size:0.9rem;font-weight:600;color:#1e293b;margin-top:12px;}
.code{font-size:0.75rem;color:#64748b;margin-top:4px;}
.hotline{font-size:0.8rem;font-weight:600;color:#000000;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:4px;}
.badge{display:inline-block;background:#f0fdf4;color:#16a34a;font-size:0.72rem;font-weight:600;padding:3px 10px;border-radius:20px;margin-top:8px;border:1px solid #bbf7d0;}
</style>
</head><body><div class="card">
<div class="company">${companyName}</div>
<div class="title">แจ้งปัญหาเครื่อง</div>
<div class="sub">สแกน QR Code เพื่อแจ้งปัญหา</div>
${qrDataUrl ? `<img src="${qrDataUrl}" class="qr-img" alt="QR">` : ''}
<div class="name">${site.name}</div>
${site.siteCode ? `<div class="code">${site.siteCode}</div>` : ''}
${site.serialNumber ? `<div class="code">S/N: ${site.serialNumber}</div>` : ''}
${hotline ? `<div class="hotline">สายด่วน: ${hotline}</div>` : ''}
<div class="badge">CASP Maintenance System</div>
</div></body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 400);
    });
}

// ============================================================
// PUBLIC INCIDENT REPORT PAGE (?report=DEVICE_ID)
// ============================================================

let publicReportMedia = [];
let publicCycleMedia = [];

function updatePublicReportMediaPreview() {
    const preview = document.getElementById('report-media-preview');
    if (!preview) return;

    const addButton = document.getElementById('btn-add-media');
    preview.innerHTML = '';
    if (addButton) preview.appendChild(addButton);

    publicReportMedia.forEach((file, index) => {
        const isImage = file.type && file.type.startsWith('image/');
        const isVideo = file.type && file.type.startsWith('video/');

        const card = document.createElement('div');
        card.className = 'media-preview-item';

        if (isImage) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            card.appendChild(img);
        } else if (isVideo) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.muted = true;
            card.appendChild(video);

            const badge = document.createElement('span');
            badge.className = 'video-badge';
            badge.innerHTML = '<i class="fa-solid fa-video"></i>';
            card.appendChild(badge);
        } else {
            const docIcon = document.createElement('div');
            docIcon.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #64748b;';
            docIcon.innerHTML = '<i class="fa-solid fa-file-invoice" style="font-size: 1.5rem;"></i>';
            card.appendChild(docIcon);
        }

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'media-remove-btn';
        removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            publicReportMedia.splice(index, 1);
            updatePublicReportMediaPreview();
        };
        card.appendChild(removeBtn);

        if (addButton) {
            preview.insertBefore(card, addButton);
        } else {
            preview.appendChild(card);
        }
    });
}

function updatePublicCycleMediaPreview() {
    const preview = document.getElementById('cycle-media-preview');
    if (!preview) return;

    const addButton = document.getElementById('btn-add-cycle-media');
    preview.innerHTML = '';
    if (addButton) preview.appendChild(addButton);

    publicCycleMedia.forEach((file, index) => {
        const card = document.createElement('div');
        card.className = 'media-preview-item';

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        card.appendChild(img);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'media-remove-btn';
        removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            publicCycleMedia.splice(index, 1);
            updatePublicCycleMediaPreview();
        };
        card.appendChild(removeBtn);

        if (addButton) {
            preview.insertBefore(card, addButton);
        } else {
            preview.appendChild(card);
        }
    });
}

function showPortalMode(mode) {
    const selector = document.getElementById('portal-mode-selector');
    const reportForm = document.getElementById('public-report-form');
    const cycleForm = document.getElementById('public-cycle-form');
    const successMsg = document.getElementById('report-success-msg');

    // Hide everything first
    if (selector) selector.style.display = 'none';
    if (reportForm) reportForm.style.display = 'none';
    if (cycleForm) cycleForm.style.display = 'none';
    if (successMsg) successMsg.style.display = 'none';

    if (mode === 'selector') {
        if (selector) selector.style.display = 'block';
    } else if (mode === 'report') {
        if (reportForm) reportForm.style.display = 'flex';
    } else if (mode === 'cycle') {
        if (cycleForm) cycleForm.style.display = 'flex';
    }
}

async function uploadMediaFiles(files, folder) {
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filename = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `logs/${folder}/${filename}`);
        const uploadTask = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(uploadTask.ref);
        uploaded.push({
            name: file.name,
            url: downloadUrl,
            type: file.type,
            path: storageRef.fullPath
        });
    }
    return uploaded;
}
window.uploadMediaFiles = uploadMediaFiles;

function initPublicReportPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const reportSiteId = urlParams.get('report');
    if (!reportSiteId) return;

    // This is a public page - hide login, main app views, and loaders
    document.querySelectorAll('.app-container, #login-view, #loading-splash').forEach(el => {
        el.style.display = 'none';
        el.classList.add('hidden');
    });

    const reportView = document.getElementById('public-report-view');
    if (reportView) {
        reportView.style.display = 'flex';
        reportView.classList.remove('hidden');
    }

    // Show mode selector by default
    showPortalMode('selector');

    // Mode selector buttons
    const btnReport = document.getElementById('btn-mode-report');
    const btnCycle = document.getElementById('btn-mode-cycle');
    if (btnReport) btnReport.onclick = () => showPortalMode('report');
    if (btnCycle) btnCycle.onclick = () => showPortalMode('cycle');

    // Back buttons
    const btnBackReport = document.getElementById('btn-back-from-report');
    const btnBackCycle = document.getElementById('btn-back-from-cycle');
    if (btnBackReport) btnBackReport.onclick = () => showPortalMode('selector');
    if (btnBackCycle) btnBackCycle.onclick = () => showPortalMode('selector');

    // Load device info anonymously
    (async function () {
        try {
            // Sign in anonymously to access Firestore
            try {
                if (!auth.currentUser) {
                    await signInAnonymously(auth);
                }
            } catch (e) {
                console.warn('Anonymous auth failed:', e);
            }

            const deviceInfoEl = document.getElementById('report-device-info');
            try {
                const docSnap = await getDoc(doc(db, 'sites', reportSiteId));
                if (docSnap.exists()) {
                    const site = { id: docSnap.id, ...docSnap.data() };
                    if (deviceInfoEl) {
                        deviceInfoEl.innerHTML = `
                            <div class="report-device-loaded-unified">
                                <div class="report-device-icon-unified"><i class="fa-solid fa-microchip"></i></div>
                                <div class="report-device-details-unified">
                                    ${site.siteCode ? `<span class="report-device-code-unified">${site.siteCode}</span>` : ''}
                                    <div class="report-device-name-unified">${site.name || 'เครื่อง'}</div>
                                    <div class="report-device-meta-unified">
                                        ${site.serialNumber ? `<span class="report-device-meta-item"><i class="fa-solid fa-barcode"></i> S/N: ${site.serialNumber}</span>` : ''}
                                        <span class="report-device-meta-item"><i class="fa-solid fa-tag"></i> ยี่ห้อ/รุ่น: ${[site.brand, site.model].filter(Boolean).join(' ') || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }

                    // Calculate and render latest cycle count dynamically
                    const maxVal = getLatestCycleCountFromPlans(site);
                    if (maxVal > 0) {
                        const reportDescEl = document.getElementById('report-cycle-latest-desc');
                        if (reportDescEl) {
                            reportDescEl.textContent = `(ล่าสุด: ${maxVal.toLocaleString()} รอบ)`;
                        }
                        const reportInput = document.getElementById('report-cycle-count');
                        if (reportInput) {
                            reportInput.min = maxVal;
                            reportInput.placeholder = `ต้องมีค่าอย่างน้อย ${maxVal.toLocaleString()} รอบ`;
                        }

                        const cycleDescEl = document.getElementById('cycle-latest-desc');
                        if (cycleDescEl) {
                            cycleDescEl.textContent = `(ล่าสุด: ${maxVal.toLocaleString()} รอบ)`;
                        }
                        const cycleInput = document.getElementById('cycle-count-value');
                        if (cycleInput) {
                            cycleInput.min = maxVal;
                            cycleInput.placeholder = `ต้องมีค่าอย่างน้อย ${maxVal.toLocaleString()} รอบ`;
                        }
                    }
                } else {
                    if (deviceInfoEl) {
                        deviceInfoEl.innerHTML = `
                            <div class="report-device-error-unified">
                                <i class="fa-solid fa-triangle-exclamation"></i>
                                <span>ไม่พบข้อมูลเครื่องในระบบ</span>
                            </div>
                        `;
                    }
                }
            } catch (e) {
                console.warn('Could not load device info:', e);
                if (deviceInfoEl) {
                    deviceInfoEl.innerHTML = `
                        <div class="report-device-error-unified">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            <span>ไม่สามารถโหลดข้อมูลเครื่องได้</span>
                        </div>
                    `;
                }
            }

            // ===== REPORT MODE: Bind media picker =====
            const mediaInput = document.getElementById('report-media');
            const addMediaBtn = document.getElementById('btn-add-media');
            if (mediaInput && addMediaBtn) {
                addMediaBtn.onclick = () => mediaInput.click();
                mediaInput.onchange = (e) => {
                    const files = Array.from(e.target.files);
                    if (files.length > 0) {
                        const validFiles = files.filter(f => f.size <= 20 * 1024 * 1024);
                        if (validFiles.length < files.length) {
                            alert('บางไฟล์มีขนาดเกิน 20MB และถูกข้าม');
                        }
                        publicReportMedia.push(...validFiles);
                        updatePublicReportMediaPreview();
                    }
                    e.target.value = '';
                };
            }

            // ===== CYCLE MODE: Bind media picker =====
            const cycleMediaInput = document.getElementById('cycle-media');
            const addCycleMediaBtn = document.getElementById('btn-add-cycle-media');
            if (cycleMediaInput && addCycleMediaBtn) {
                addCycleMediaBtn.onclick = () => cycleMediaInput.click();
                cycleMediaInput.onchange = (e) => {
                    const files = Array.from(e.target.files);
                    if (files.length > 0) {
                        const validFiles = files.filter(f => f.size <= 20 * 1024 * 1024);
                        if (validFiles.length < files.length) {
                            alert('บางไฟล์มีขนาดเกิน 20MB และถูกข้าม');
                        }
                        publicCycleMedia.push(...validFiles);
                        updatePublicCycleMediaPreview();
                    }
                    e.target.value = '';
                };
            }

            // Phone input validations: allow numbers only
            const reportTelInput = document.getElementById('report-tel');
            if (reportTelInput) {
                reportTelInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/\D/g, '');
                });
            }
            const cycleTelInput = document.getElementById('cycle-reporter-tel');
            if (cycleTelInput) {
                cycleTelInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/\D/g, '');
                });
            }

            // Clear warning labels on input
            const reportCycleInput = document.getElementById('report-cycle-count');
            if (reportCycleInput) {
                reportCycleInput.addEventListener('input', () => {
                    const warningEl = document.getElementById('report-cycle-warning-msg');
                    if (warningEl) warningEl.style.display = 'none';
                });
            }
            const cycleInput = document.getElementById('cycle-count-value');
            if (cycleInput) {
                cycleInput.addEventListener('input', () => {
                    const warningEl = document.getElementById('cycle-warning-msg');
                    if (warningEl) warningEl.style.display = 'none';
                });
            }



            // Helper: show success message
            function showSuccessMessage(title, text, caseId) {
                const reportForm = document.getElementById('public-report-form');
                const cycleForm = document.getElementById('public-cycle-form');
                if (reportForm) reportForm.style.display = 'none';
                if (cycleForm) cycleForm.style.display = 'none';

                const successEl = document.getElementById('report-success-msg');
                const titleEl = document.getElementById('report-success-title');
                const textEl = document.getElementById('report-success-text');
                const caseIdDisplay = document.getElementById('report-case-id-display');
                const displayCaseId = caseId ? caseId.replace(/^CASE-/, '') : '';

                if (titleEl) titleEl.textContent = title;
                if (textEl) textEl.innerHTML = text;
                if (caseIdDisplay) {
                    if (caseId) {
                        caseIdDisplay.innerHTML = `<i class="fa-solid fa-ticket"></i> รหัสเคส: <strong>${displayCaseId}</strong>`;
                        caseIdDisplay.style.display = 'flex';
                    } else {
                        caseIdDisplay.style.display = 'none';
                    }
                }
                if (successEl) successEl.style.display = 'flex';
            }

            // ===== REPORT FORM SUBMISSION =====
            const form = document.getElementById('public-report-form');
            const submitBtn = document.getElementById('btn-public-report-submit');
            if (form && submitBtn) {
                form.addEventListener('submit', async function (e) {
                    e.preventDefault();

                    const name = document.getElementById('report-name')?.value.trim();
                    const tel = document.getElementById('report-tel')?.value.trim();
                    const position = document.getElementById('report-position')?.value.trim();
                    const description = document.getElementById('report-description')?.value.trim();
                    const cycleCountVal = document.getElementById('report-cycle-count')?.value.trim();

                    if (!name || !tel || !description) {
                        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
                        return;
                    }

                    let cycleCountNum = null;
                    if (cycleCountVal) {
                        cycleCountNum = parseInt(cycleCountVal, 10);
                    }

                    submitBtn.disabled = true;
                    const btnIcon = submitBtn.querySelector('i');
                    const btnText = submitBtn.querySelector('span');
                    if (btnIcon) btnIcon.className = 'fa-solid fa-circle-notch fa-spin';
                    if (btnText) btnText.textContent = 'กำลังส่ง...';

                    try {
                        if (!auth.currentUser) await signInAnonymously(auth);

                        // Validate cycle count if provided
                        if (cycleCountNum !== null && !isNaN(cycleCountNum)) {
                            const siteSnap = await getDoc(doc(db, 'sites', reportSiteId));
                            if (siteSnap.exists()) {
                                const site = { id: siteSnap.id, ...siteSnap.data() };
                                const nowVal = new Date();
                                const yearBE = String(nowVal.getFullYear() + 543);
                                const monthKey = String(nowVal.getMonth() + 1);
                                const maxVal = getLatestCycleCountFromPlans(site);
                                const warningEl = document.getElementById('report-cycle-warning-msg');

                                if (maxVal > 0 && cycleCountNum < maxVal) {
                                    const errMsg = `(ไม่ต่ำกว่า ${maxVal.toLocaleString()} รอบ)`;
                                    if (warningEl) {
                                        warningEl.textContent = errMsg;
                                        warningEl.style.display = 'inline-block';
                                    }
                                    alert(`จำนวนรอบเครื่องต้องไม่น้อยกว่าค่าก่อนหน้า (${maxVal.toLocaleString()} รอบ)`);
                                    submitBtn.disabled = false;
                                    if (btnIcon) btnIcon.className = 'fa-solid fa-paper-plane';
                                    if (btnText) btnText.textContent = 'ส่งคำร้อง';
                                    return;
                                } else {
                                    if (warningEl) warningEl.style.display = 'none';
                                }
                            }
                        }

                        const uploadedAttachments = await uploadMediaFiles(publicReportMedia, 'public');

                        const caseId = FirestoreService.generateCaseId();

                        const now = new Date();
                        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

                        const logData = {
                            siteId: reportSiteId,
                            caseId: caseId,
                            category: 'ซ่อม',
                            status: 'Open',
                            objective: description,
                            details: description,
                            date: dateStr,
                            timestamp: now.toISOString(),
                            recordedBy: name,
                            recorderId: 'public',
                            reporterName: name,
                            reporterPhone: tel,
                            reporterPosition: position || '',
                            isPublicReport: true,
                            cycleCount: cycleCountVal ? parseInt(cycleCountVal, 10) : null,
                            lineItems: [],
                            attachments: uploadedAttachments,
                            attachmentsBefore: [],
                            attachmentsAfter: [],
                            statusHistory: { 'Open': now.toISOString() }
                        };

                        await addDoc(collection(db, 'logs'), logData);
                        showSuccessMessage(
                            'ส่งคำร้องสำเร็จ!',
                            'ทีมงานได้รับคำร้องของคุณแล้ว<br>และจะติดต่อกลับโดยเร็วที่สุด',
                            caseId
                        );
                    } catch (err) {
                        console.error('Public report submission failed:', err);
                        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง\n' + err.message);
                        submitBtn.disabled = false;
                        if (btnIcon) btnIcon.className = 'fa-solid fa-paper-plane';
                        if (btnText) btnText.textContent = 'ส่งคำร้อง';
                    }
                });
            }

            // ===== CYCLE COUNT FORM SUBMISSION =====
            const cycleForm = document.getElementById('public-cycle-form');
            const cycleSubmitBtn = document.getElementById('btn-public-cycle-submit');
            if (cycleForm && cycleSubmitBtn) {
                cycleForm.addEventListener('submit', async function (e) {
                    e.preventDefault();

                    const name = document.getElementById('cycle-reporter-name')?.value.trim();
                    const tel = document.getElementById('cycle-reporter-tel')?.value.trim();
                    const cycleVal = document.getElementById('cycle-count-value')?.value.trim();
                    const note = document.getElementById('cycle-note')?.value.trim();

                    if (!name || !tel || !cycleVal) {
                        alert('กรุณากรอกชื่อ เบอร์โทร และจำนวนรอบเครื่องให้ครบถ้วน');
                        return;
                    }

                    if (publicCycleMedia.length === 0) {
                        alert('กรุณาถ่ายรูปหน้าจอ Cycle Count อย่างน้อย 1 รูป');
                        return;
                    }

                    cycleSubmitBtn.disabled = true;
                    const btnIcon = cycleSubmitBtn.querySelector('i');
                    const btnText = cycleSubmitBtn.querySelector('span');
                    if (btnIcon) btnIcon.className = 'fa-solid fa-circle-notch fa-spin';
                    if (btnText) btnText.textContent = 'กำลังบันทึก...';

                    try {
                        if (!auth.currentUser) await signInAnonymously(auth);

                        const siteSnap = await getDoc(doc(db, 'sites', reportSiteId));
                        if (!siteSnap.exists()) {
                            alert('ไม่พบข้อมูลเครื่องในระบบ');
                            cycleSubmitBtn.disabled = false;
                            if (btnIcon) btnIcon.className = 'fa-solid fa-paper-plane';
                            if (btnText) btnText.textContent = 'บันทึก Cycle Count';
                            return;
                        }
                        const site = { id: siteSnap.id, ...siteSnap.data() };

                        const now = new Date();
                        const currentYear = now.getFullYear();
                        const yearBE = String(currentYear + 543);
                        const monthKey = String(now.getMonth() + 1);
                        const cycleCountNum = parseInt(cycleVal, 10);

                        // Validate that cycle count is not less than the previous recorded count
                        const maxVal = getLatestCycleCountFromPlans(site);
                        const warningEl = document.getElementById('cycle-warning-msg');
                        if (maxVal > 0 && cycleCountNum < maxVal) {
                            const errMsg = `(ไม่ต่ำกว่า ${maxVal.toLocaleString()} รอบ)`;
                            if (warningEl) {
                                warningEl.textContent = errMsg;
                                warningEl.style.display = 'inline-block';
                            }
                            alert(`จำนวนรอบต้องไม่น้อยกว่าค่าก่อนหน้า (${maxVal.toLocaleString()} รอบ)`);
                            cycleSubmitBtn.disabled = false;
                            if (btnIcon) btnIcon.className = 'fa-solid fa-paper-plane';
                            if (btnText) btnText.textContent = 'บันทึก Cycle Count';
                            return;
                        } else {
                            if (warningEl) warningEl.style.display = 'none';
                        }

                        const uploadedAttachments = await uploadMediaFiles(publicCycleMedia, 'public-cycle');

                        const dateStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

                        if (!site.maintenancePlans) site.maintenancePlans = {};
                        if (Array.isArray(site.maintenancePlans[yearBE])) {
                            const migratePlanToObjectFormat = (existingPlan) => {
                                if (Array.isArray(existingPlan)) {
                                    const obj = {};
                                    existingPlan.forEach(m => { obj[String(m)] = { planned: true, cycleCount: null, inputDate: null, notes: null }; });
                                    return obj;
                                }
                                return existingPlan || {};
                            };
                            site.maintenancePlans[yearBE] = migratePlanToObjectFormat(site.maintenancePlans[yearBE]);
                        }
                        if (!site.maintenancePlans[yearBE]) site.maintenancePlans[yearBE] = {};

                        const existingPlan = site.maintenancePlans[yearBE][monthKey] || {};
                        const planned = existingPlan.planned ?? false;
                        const history = existingPlan.history || [];

                        // Push previous count to history if it has changed
                        if (existingPlan.cycleCount != null) {
                            history.push({
                                cycleCount: existingPlan.cycleCount,
                                inputDate: existingPlan.inputDate,
                                notes: existingPlan.notes,
                                attachments: existingPlan.attachments || [],
                                source: existingPlan.source || 'staff',
                                reporterName: existingPlan.reporterName || null,
                                reporterPhone: existingPlan.reporterPhone || null
                            });
                        }

                        site.maintenancePlans[yearBE][monthKey] = {
                            planned: planned,
                            cycleCount: parseInt(cycleVal, 10),
                            inputDate: dateStr,
                            planDate: existingPlan.planDate || null,
                            notes: note || existingPlan.notes || null,
                            attachments: uploadedAttachments,
                            history: history,
                            source: 'public',
                            reporterName: name,
                            reporterPhone: tel
                        };

                        await FirestoreService.updateSite(reportSiteId, {
                            name: site.name,
                            maintenancePlans: site.maintenancePlans
                        });

                        showSuccessMessage(
                            'บันทึก Cycle Count สำเร็จ!',
                            `รอบเครื่อง: <strong>${parseInt(cycleVal, 10).toLocaleString()}</strong> รอบ<br>ข้อมูลถูกบันทึกเรียบร้อยแล้ว`,
                            null
                        );
                    } catch (err) {
                        console.error('Public cycle count submission failed:', err);
                        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง\n' + err.message);
                        cycleSubmitBtn.disabled = false;
                        if (btnIcon) btnIcon.className = 'fa-solid fa-paper-plane';
                        if (btnText) btnText.textContent = 'บันทึก Cycle Count';
                    }
                });
            }
        } catch (err) {
            console.error('Public report page init error:', err);
        }
    })();
}

// Re-add initCycleCountModal call to setupEventListeners via init
// (called from init() after setupEventListeners)

// --- Shared PDF Preview ---
function showPdfPreview(html, title) {
    let pdfModal = document.getElementById('pdf-preview-modal');
    if (!pdfModal) {
        pdfModal = document.createElement('div');
        pdfModal.id = 'pdf-preview-modal';
        pdfModal.style.cssText = 'display:none; position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,0.7); justify-content:center; align-items:center; padding:16px;';
        pdfModal.innerHTML = '<div style="position:relative; width:100%; max-width:1100px; height:90vh; background:#fff; border-radius:12px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 8px 32px rgba(0,0,0,0.3);">'
            + '<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #e5e7eb; background:#f9fafb; flex-shrink:0;">'
            + '<span id="pdf-preview-title" style="font-weight:700; font-size:12px; color:#333;">PDF Preview</span>'
            + '<div style="display:flex; gap:8px;">'
            + '<button id="pdf-btn-print" style="display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:#ffffff; color:#111111; border:1.5px solid #111111; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); white-space:nowrap;" onmouseover="this.style.background=\'#111111\';this.style.color=\'#ffffff\';this.style.transform=\'scale(1.03)\';" onmouseout="this.style.background=\'#ffffff\';this.style.color=\'#111111\';this.style.transform=\'none\';"><i class="fa-solid fa-print"></i> พิมพ์</button>'
            + '<button id="pdf-btn-close" style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; background:#ffffff; color:#111111; border:1.5px solid #e5e5e5; border-radius:8px; font-size:16px; cursor:pointer; transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);" onmouseover="this.style.background=\'#f3f4f6\';this.style.borderColor=\'#d1d5db\';this.style.transform=\'scale(1.05)\';" onmouseout="this.style.background=\'#ffffff\';this.style.borderColor=\'#e5e5e5\';this.style.transform=\'none\';"><i class="fa-solid fa-xmark"></i></button>'
            + '</div></div>'
            + '<iframe id="pdf-preview-iframe" style="flex:1; border:none; width:100%; background:#fff;"></iframe>'
            + '</div>';
        document.body.appendChild(pdfModal);
        document.getElementById('pdf-btn-close').onclick = () => { pdfModal.style.display = 'none'; };
        pdfModal.onclick = (e) => { if (e.target === pdfModal) pdfModal.style.display = 'none'; };
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pdfModal.style.display === 'flex') pdfModal.style.display = 'none'; });
    }
    const iframe = document.getElementById('pdf-preview-iframe');
    const titleEl = document.getElementById('pdf-preview-title');
    if (titleEl) titleEl.textContent = title;
    if (iframe) iframe.srcdoc = html;
    pdfModal.style.display = 'flex';
    const printBtn = document.getElementById('pdf-btn-print');
    if (printBtn) {
        const newPrint = printBtn.cloneNode(true);
        printBtn.parentNode.replaceChild(newPrint, printBtn);
        newPrint.id = 'pdf-btn-print';
        newPrint.onclick = () => { if (iframe) iframe.contentWindow.print(); };
    }
}
window.showPdfPreview = showPdfPreview;

// --- Annual Plan PDF Export ---
function exportAnnualPlanPDF() {
    const yearSelect = document.getElementById('plan-year-select');
    const selectedBE = yearSelect ? yearSelect.value : String(new Date().getFullYear() + 543);
    const userLocale = navigator.language || 'th-TH';
    const usesBE = userLocale.startsWith('th');
    const displayYear = usesBE ? `พ.ศ. ${selectedBE}` : `${parseInt(selectedBE) - 543}`;
    const monthNames = Array.from({ length: 12 }, (_, i) => new Date(2024, i, 1).toLocaleString(userLocale, { month: 'short' }));

    const rowsHtml = (state.sites || []).map((site, idx) => {
        const siteColor = getSiteColor(site.name);
        const cells = Array.from({ length: 12 }, (_, m) => {
            const pd = getPlanMonthData(site, selectedBE, m + 1);
            const { planned, cycleCount, inputDate, planDate } = pd;
            if (!planned && cycleCount == null) return `<td style="text-align:center; padding:4px 2px; border:1px solid #ddd; background:#fff;"></td>`;

            const cellBg = planned ? `${siteColor}0d` : '#fff';
            const cellBorder = 'border:1px solid #ddd;';

            let planHtml = '';
            if (planned) {
                planHtml = `<span style="background:${siteColor}15; color:${siteColor}; border:1px solid ${siteColor}35; font-size:6px; font-weight:700; padding:2px 5px; border-radius:2px; display:inline-flex; flex-direction:column; align-items:center; justify-content:center; line-height:1.1; white-space:nowrap;"><i class="fa-solid fa-wrench" style="font-size:6.5px;"></i>${planDate ? `<span style="font-size:5px; font-weight:500; margin-top:1px; opacity:0.85;">${planDate}</span>` : ''}</span>`;
            }

            let cycleHtml = '';
            if (cycleCount != null) {
                const datePart = inputDate ? inputDate.split('T')[0] : '';
                const dateHtml = datePart ? `<span style="font-size:5px; color:${siteColor}; opacity:0.8; display:block; margin-top:1px; font-weight:normal;">${datePart}</span>` : '';
                cycleHtml = `<span style="background:#fff; color:${siteColor}; border:1px dashed ${siteColor}50; font-size:6px; font-weight:700; padding:2px 5px; border-radius:2px; display:inline-flex; flex-direction:column; align-items:center; justify-content:center; line-height:1.1; white-space:nowrap;"><span style="font-size:6px; font-weight:700;">${Number(cycleCount).toLocaleString()}</span>${dateHtml}</span>`;
            }

            return `<td style="position:relative; text-align:center; padding:3px 2px; ${cellBorder} background:${cellBg}; vertical-align:middle;">
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;">
                    ${planHtml}
                    ${cycleHtml}
                </div>
            </td>`;
        }).join('');
        const warranty = site.insuranceStartDate && site.insuranceEndDate ? `${site.insuranceStartDate} ~ ${site.insuranceEndDate}` : '-';
        const subtleInfo = [
            '<span style="font-weight:600; color:#333;">รหัส: ' + (site.siteCode || '-') + '</span>',
            site.brand || site.model ? '<span style="font-weight:600;">รุ่น:</span> ' + [site.brand, site.model].filter(Boolean).join(' ') : '',
            site.serialNumber ? '<span style="font-weight:600;">S/N:</span> ' + site.serialNumber : '',
            '<span style="font-weight:600;">ประกัน:</span> ' + warranty,
            site.province ? '<span style="font-weight:600;">จ.</span>' + site.province : ''
        ].filter(Boolean).join(' | ');
        return `<tr>
            <td style="text-align:center; padding:5px 4px; border:1px solid #ddd; font-size:9px; font-weight:600;">${idx + 1}</td>
            <td style="padding:5px 8px; border:1px solid #ddd; border-left:4px solid ${siteColor}; font-size:9px;"><b>${site.name}</b><div style="font-size:7px; color:#999; margin-top:2px;">${subtleInfo}</div></td>
            ${cells}
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Annual Maintenance Plan ${displayYear}</title>
<style>
    @page { size: A4 landscape; margin: 12mm 10mm 0 10mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; font-size: 10px; color: #333; margin: 0; padding: 0 0 25mm 0; box-sizing: border-box; min-height: 100vh; display: flex; flex-direction: column; }
    .page-content { flex: 1; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th { background: #f5f5f5 !important; font-size: 9px; padding: 5px 3px; border: 1px solid #ddd; }
    .fixed-footer { position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; padding: 4mm 0; box-sizing: border-box; z-index: 100; }
    .footer-line { position: relative; height: 2px; background: #ddd !important; }
    .footer-line::before { content: ''; position: absolute; top: 50%; right: 0; transform: translateY(-50%); width: 25%; height: 5px; background: #8bc53f !important; border-radius: 2px; }
    .footer-text { display: flex; justify-content: space-between; font-size: 8px; color: #333; padding: 4px 0; }
    .header-line { margin-bottom: 10px; position: relative; height: 2px; background: #ddd !important; }
    .header-line::before { content: ''; position: absolute; top: 50%; left: 0; transform: translateY(-50%); width: 25%; height: 5px; background: #8bc53f !important; border-radius: 2px; }
    @media screen {
        body { padding: 12mm 10mm 25mm 10mm; }
    }
</style>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
</head><body>
<div class="page-content">
<table>
    <colgroup>
        <col style="width: 2.5%;">
        <col style="width: 43.5%;">
        ${monthNames.map(() => '<col style="width: 4.5%;">').join('')}
    </colgroup>
    <thead>
        <tr>
            <td colspan="14" style="border: none; padding: 0;">
                <div style="display:flex; align-items:center; gap:12px; padding-bottom:10px;">
                    <img src="/bioinnotech.svg" alt="Logo" style="height:55px; width:auto;">
                    <div style="flex:1; text-align:right; font-size:9px; color:#333; line-height:1.6;">
                        <b>บริษัท ไบโอ อินโน เทค จำกัด</b><br>
                        36/41 หมู่ 13 ต.บึงคำพร้อย อ.ลำลูกกา จ.ปทุมธานี 12150<br>
                        โทรศัพท์ 02-152-5405 เลขประจำตัวผู้เสียภาษี 0105557108369
                    </div>
                </div>
                <div class="header-line"></div>
                <h1 style="text-align:center; font-size:12px; margin:0 0 8px;">แผนการบำรุงรักษาประจำปี ${displayYear}</h1>
                <p style="text-align:center; font-size:9px; color:#666; margin:0 0 10px;">Annual Maintenance Plan — จำนวนอุปกรณ์ ${(state.sites || []).length} เครื่อง</p>
            </td>
        </tr>
        <tr>
            <th style="text-align:center; width:2.5%;">No.</th>
            <th style="text-align:left; width:43.5%;">อุปกรณ์ (Device)</th>
            ${monthNames.map(m => `<th style="width:4.5%; text-align:center;">${m}</th>`).join('')}
        </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
        <tr><td colspan="15" style="height: 25mm; border: none; padding: 0;"></td></tr>
    </tfoot>
</table>
</div>
</div>
<div class="fixed-footer">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:3px;">
        <div style="display:flex; align-items:center; gap:8px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent('https://water-plant-maintenance.web.app')}" alt="QR" style="width:45px; height:45px;">
            <div>
                <div style="font-size:8px; font-weight:700; color:#333;">สแกนเพื่อเข้าสู่ระบบบำรุงรักษา</div>
                <div style="font-size:7px; color:#888;">Scan to access maintenance system</div>
            </div>
        </div>
        <span id="page-info2" style="font-size:8px; color:#333;"></span>
    </div>
    <div class="footer-line"></div>
    <div class="footer-text">
        <span>บริษัท ไบโอ อินโน เทค จำกัด</span>
        <span>FM-SER-04 Rev.00 Effective date : 02-02-2026</span>
    </div>
</div>
<script>
window.onload = function() {
    var contentHeight = document.body.scrollHeight;
    var pageHeight = 198 * 3.78;
    var totalPages = Math.max(1, Math.ceil(contentHeight / pageHeight));
    var pageNumStyle = 'position:absolute; right:0; font-size:8px; color:#333; z-index:100; background:#fff; padding:0 4px;';
    var pagePx = 198 * 3.78;
    var footerOffset = 22 * 3.78;
    for (var p = 1; p <= totalPages; p++) {
        var marker = document.createElement('div');
        marker.style.cssText = pageNumStyle;
        marker.style.top = (p * pagePx - footerOffset) + 'px';
        marker.textContent = 'หน้า ' + p + ' จาก ' + totalPages;
        document.body.appendChild(marker);
    }
};
</script>
</body></html>`;

    showPdfPreview(html, `แผนการบำรุงรักษาประจำปี ${displayYear}`);
}
window.exportAnnualPlanPDF = exportAnnualPlanPDF;

// --- Case History PDF Export ---
async function exportCaseHistoryPDF(siteId) {
    const site = state.sites.find(s => s.id === siteId);
    if (!site) { showToast('ไม่พบข้อมูลเครื่อง', 'error'); return; }

    const siteLogs = (state.logs || [])
        .filter(l => l.siteId === siteId)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const userLocale = navigator.language || 'th-TH';
    const thaiDate = (d) => d ? new Date(d).toLocaleDateString(userLocale, { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

    const statusColor = (s) => {
        if (!s) return '#6b7280';
        if (s === 'Case Closed') return '#16a34a';
        if (s === 'Open') return '#ef4444';
        if (s === 'กำลังดำเนินการ') return '#f59e0b';
        return '#6b7280';
    };

    const rowsHtml = siteLogs.length === 0
        ? '<tr><td colspan="6" style="text-align:center; padding:1rem; color:#999; font-style:italic;">ไม่มีประวัติเคส</td></tr>'
        : siteLogs.map((log, idx) => `
            <tr style="background:${idx % 2 === 0 ? '#fff' : '#f9fafb'};">
                <td style="padding:5px 8px; border:1px solid #e5e7eb; font-size:9px; text-align:center; font-weight:600; color:#555;">${idx + 1}</td>
                <td style="padding:5px 8px; border:1px solid #e5e7eb; font-size:9px; font-family:monospace;">${log.caseId || '-'}</td>
                <td style="padding:5px 8px; border:1px solid #e5e7eb; font-size:9px;">${thaiDate(log.date)}</td>
                <td style="padding:5px 8px; border:1px solid #e5e7eb; font-size:9px;">${log.category || '-'}</td>
                <td style="padding:5px 8px; border:1px solid #e5e7eb; font-size:9px; max-width:200px; word-break:break-word;">${log.objective || log.details || '-'}</td>
                <td style="padding:5px 8px; border:1px solid #e5e7eb; font-size:9px; text-align:center;">
                    <span style="display:inline-block; padding:2px 8px; border-radius:10px; font-size:8px; font-weight:600; background:${statusColor(log.status)}22; color:${statusColor(log.status)}; border:1px solid ${statusColor(log.status)}44;">${log.status || '-'}</span>
                </td>
            </tr>
        `).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>ประวัติเคส - ${site.name}</title>
<style>
    @page { size: A4 landscape; margin: 12mm 10mm 15mm 10mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; font-size: 10px; color: #333; margin: 0; padding: 0; box-sizing: border-box; min-height: 100vh; display: flex; flex-direction: column; }
    .page-content { flex: 1; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th { background: #f3f4f6 !important; font-size: 9px; padding: 6px 8px; border: 1px solid #e5e7eb; text-align: left; font-weight: 700; }
    .header-line { margin-bottom: 10px; position: relative; height: 2px; background: #ddd !important; }
    .header-line::before { content: ''; position: absolute; top: 50%; left: 0; transform: translateY(-50%); width: 25%; height: 5px; background: #8bc53f !important; border-radius: 2px; }
    .page-footer { margin-top: auto; }
    .footer-line { position: relative; height: 2px; background: #ddd !important; }
    .footer-line::before { content: ''; position: absolute; top: 50%; right: 0; transform: translateY(-50%); width: 25%; height: 5px; background: #8bc53f !important; border-radius: 2px; }
    .footer-text { display: flex; justify-content: space-between; font-size: 8px; color: #333; padding: 4px 0; }
    .device-info { display: flex; gap: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; flex-wrap: wrap; }
    .device-info-item { display: flex; flex-direction: column; gap: 2px; }
    .device-info-label { font-size: 7px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
    .device-info-value { font-size: 9px; font-weight: 600; color: #111; }
    @media screen {
        body { padding: 12mm 10mm 15mm 10mm; }
    }
</style>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
</head><body>
<div style="display:flex; align-items:center; gap:12px; padding-bottom:10px;">
    <img src="/bioinnotech.svg" alt="Logo" style="height:50px; width:auto;">
    <div style="flex:1; text-align:right; font-size:9px; color:#333; line-height:1.6;">
        <b>บริษัท ไบโอ อินโน เทค จำกัด</b><br>
        36/41 หมู่ 13 ต.บึงคำพร้อย อ.ลำลูกกา จ.ปทุมธานี 12150<br>
        โทรศัพท์ 02-152-5405
    </div>
</div>
<div class="header-line"></div>
<div class="page-content">
    <h1 style="text-align:center; font-size:13px; margin:0 0 4px;">ประวัติการซ่อมเครื่อง</h1>
    <p style="text-align:center; font-size:9px; color:#666; margin:0 0 12px;">Case History Report — พิมพ์วันที่ ${new Date().toLocaleDateString(userLocale, { dateStyle: 'long' })}</p>

    <div class="device-info">
        <div class="device-info-item"><span class="device-info-label">ชื่อโรงพยาบาล</span><span class="device-info-value">${site.name}</span></div>
        <div class="device-info-item"><span class="device-info-label">รหัส</span><span class="device-info-value">${site.siteCode || '-'}</span></div>
        <div class="device-info-item"><span class="device-info-label">ยี่ห้อ / รุ่น</span><span class="device-info-value">${[site.brand, site.model].filter(Boolean).join(' ') || '-'}</span></div>
        <div class="device-info-item"><span class="device-info-label">Serial No.</span><span class="device-info-value">${site.serialNumber || '-'}</span></div>
        <div class="device-info-item"><span class="device-info-label">จำนวนเคสทั้งหมด</span><span class="device-info-value">${siteLogs.length} เคส</span></div>
    </div>

    <table>
        <thead>
            <tr><td colspan="6" style="height: 12mm; border: none; padding: 0;"></td></tr>
            <tr>
                <th style="width:4%; text-align:center;">#</th>
                <th style="width:14%;">รหัสเคส</th>
                <th style="width:13%;">วันที่</th>
                <th style="width:13%;">หมวดหมู่</th>
                <th>รายละเอียด</th>
                <th style="width:12%; text-align:center;">สถานะ</th>
            </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
            <tr><td colspan="6" style="height: 15mm; border: none; padding: 0;"></td></tr>
        </tfoot>
    </table>
</div>
<div class="page-footer">
    <div class="footer-line"></div>
    <div class="footer-text">
        <span>บริษัท ไบโอ อินโน เทค จำกัด</span>
        <span>FM-SER-07 Rev.00 Effective date : 02-02-2026</span>
    </div>
</div>
</body></html>`;

    showPdfPreview(html, `ประวัติการซ่อมเครื่อง — ${site.name}`);
}
window.exportCaseHistoryPDF = exportCaseHistoryPDF;

// --- Company Settings ---
async function setupCompanySettingsForm() {
    // Load existing settings
    const settings = await FirestoreService.getCompanySettings();
    const nameEl = document.getElementById('company-name-input');
    const hotlineEl = document.getElementById('company-hotline-input');
    const addressEl = document.getElementById('company-address-input');
    if (nameEl && settings.name) nameEl.value = settings.name;
    if (hotlineEl && settings.hotline) hotlineEl.value = settings.hotline;
    if (addressEl && settings.address) addressEl.value = settings.address;

    // Save button
    const saveBtn = document.getElementById('btn-save-company-settings');
    if (saveBtn) {
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        newBtn.addEventListener('click', async () => {
            const data = {
                name: nameEl?.value.trim() || 'บริษัท ไบโอ อินโน เทค จำกัด',
                hotline: hotlineEl?.value.trim() || '',
                address: addressEl?.value.trim() || '',
            };
            newBtn.disabled = true;
            newBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังบันทึก...';
            try {
                await FirestoreService.updateCompanySettings(data);
                showToast('บันทึกข้อมูลบริษัทสำเร็จ', 'success');
            } catch (e) {
                showToast('เกิดข้อผิดพลาด', 'error');
            } finally {
                newBtn.disabled = false;
                newBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูลบริษัท';
            }
        });
    }
}
window.setupCompanySettingsForm = setupCompanySettingsForm;

// --- Devices List PDF Export ---
function exportDevicesPDF() {
    if (!state.sites || state.sites.length === 0) {
        showToast('ไม่มีข้อมูลเครื่อง', 'error');
        return;
    }

    const userLocale = navigator.language || 'th-TH';
    const thaiDate = (d) => d ? new Date(d).toLocaleDateString(userLocale, { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

    const rowsHtml = state.sites.map((site, idx) => {
        const siteColor = getSiteColor(site.name);
        const warranty = site.insuranceStartDate && site.insuranceEndDate
            ? `${thaiDate(site.insuranceStartDate)} ~ ${thaiDate(site.insuranceEndDate)}` : '-';
        const address = [site.subdistrict, site.district, site.province].filter(Boolean).join(', ') || '-';
        const installLog = (state.logs || []).find(l => l.siteId === site.id && l.category === 'ติดตั้ง');
        const installDate = installLog ? thaiDate(installLog.date) : '-';
        return `<tr style="background:${idx % 2 === 0 ? '#fff' : '#f9fafb'};">
            <td style="text-align:center; padding:4px 6px; border:1px solid #e5e7eb; font-size:9px; font-weight:600;">${idx + 1}</td>
            <td style="padding:4px 6px; border:1px solid #e5e7eb; font-size:9px;">${site.siteCode || '-'}</td>
            <td style="padding:4px 6px; border:1px solid #e5e7eb; border-left:3px solid ${siteColor}; font-size:9px;">
                <b>${site.name}</b>
                ${site.installLocation || site.villageName ? `<div style="font-size:8px; color:#6b7280;">${site.installLocation || site.villageName}</div>` : ''}
                ${address !== '-' ? `<div style="font-size:8px; color:#9ca3af;">${address}</div>` : ''}
            </td>
            <td style="padding:4px 6px; border:1px solid #e5e7eb; font-size:9px;">${site.picName || '-'}</td>
            <td style="padding:4px 6px; border:1px solid #e5e7eb; font-size:9px;">${site.contactPhone || '-'}</td>
            <td style="padding:4px 6px; border:1px solid #e5e7eb; font-size:9px;">${site.deviceType || '-'}</td>
            <td style="padding:4px 6px; border:1px solid #e5e7eb; font-size:9px;">${[site.brand, site.model].filter(Boolean).join(' ') || '-'}</td>
            <td style="padding:4px 6px; border:1px solid #e5e7eb; font-size:9px;">${site.serialNumber || '-'}</td>
            <td style="padding:4px 6px; border:1px solid #e5e7eb; font-size:9px;">${installDate}</td>
            <td style="padding:4px 6px; border:1px solid #e5e7eb; font-size:9px;">${warranty}</td>
            <td style="padding:4px 6px; border:1px solid #e5e7eb; font-size:9px;">${site.warrantyNumber || '-'}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>ทะเบียนเครื่องมือ</title>
<style>
    @page { size: A4 landscape; margin: 12mm 10mm 15mm 10mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; font-size: 10px; color: #333; margin: 0; padding: 0; box-sizing: border-box; min-height: 100vh; display: flex; flex-direction: column; }
    .page-content { flex: 1; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6 !important; font-size: 9px; padding: 5px 6px; border: 1px solid #e5e7eb; text-align: left; font-weight: 700; }
    .header-line { margin-bottom: 10px; position: relative; height: 2px; background: #ddd !important; }
    .header-line::before { content: ''; position: absolute; top: 50%; left: 0; transform: translateY(-50%); width: 25%; height: 5px; background: #8bc53f !important; border-radius: 2px; }
    .page-footer { margin-top: auto; }
    .footer-line { position: relative; height: 2px; background: #ddd !important; }
    .footer-line::before { content: ''; position: absolute; top: 50%; right: 0; transform: translateY(-50%); width: 25%; height: 5px; background: #8bc53f !important; border-radius: 2px; }
    .footer-text { display: flex; justify-content: space-between; font-size: 8px; color: #333; padding: 4px 0; }
    @media screen {
        body { padding: 12mm 10mm 15mm 10mm; }
    }
</style>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
</head><body>
<div style="display:flex; align-items:center; gap:12px; padding-bottom:10px;">
    <img src="/bioinnotech.svg" alt="Logo" style="height:50px; width:auto;">
    <div style="flex:1; text-align:right; font-size:9px; color:#333; line-height:1.6;">
        <b>บริษัท ไบโอ อินโน เทค จำกัด</b><br>
        36/41 หมู่ 13 ต.บึงคำพร้อย อ.ลำลูกกา จ.ปทุมธานี 12150<br>
        โทรศัพท์ 02-152-5405
    </div>
</div>
<div class="header-line"></div>
<div class="page-content">
    <h1 style="text-align:center; font-size:13px; margin:0 0 4px;">ทะเบียนเครื่องมือ</h1>
    <p style="text-align:center; font-size:9px; color:#666; margin:0 0 10px;">จำนวนทั้งหมด ${state.sites.length} เครื่อง — พิมพ์วันที่ ${new Date().toLocaleDateString(userLocale, { dateStyle: 'long' })}</p>
    <table>
        <thead>
            <tr>
                <th style="width:3%; text-align:center;">No.</th>
                <th style="width:7%;">รหัส</th>
                <th style="width:20%;">โรงพยาบาล</th>
                <th style="width:9%;">ผู้ดูแล</th>
                <th style="width:9%;">เบอร์โทร</th>
                <th style="width:8%;">สัญญา</th>
                <th style="width:10%;">ยี่ห้อ/รุ่น</th>
                <th style="width:9%;">S/N</th>
                <th style="width:8%;">วันที่ติดตั้ง</th>
                <th style="width:10%;">ประกัน</th>
                <th style="width:7%;">เลขที่ใบรับประกัน</th>
            </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
    </table>
</div>
<div class="page-footer">
    <div class="footer-line"></div>
    <div class="footer-text">
        <span>บริษัท ไบโอ อินโน เทค จำกัด</span>
        <span>FM-SER-03 Rev.00 Effective date : 02-02-2026</span>
    </div>
</div>
</body></html>`;

    showPdfPreview(html, 'ทะเบียนเครื่องมือ');
}

// --- Inventory Logic ---
let inventoryItems = [];
let inventoryHistoryItems = [];
let unsubscribeInventory = null;
let unsubscribeHistory = null;

function fetchInventory() {
    if (unsubscribeInventory) {
        unsubscribeInventory();
    }
    if (unsubscribeHistory) {
        unsubscribeHistory();
    }

    // Listen to history to dynamically determine the last transaction per item
    const historyRef = collection(db, "inventory_history");
    unsubscribeHistory = onSnapshot(historyRef, (historySnapshot) => {
        inventoryHistoryItems = historySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderInventory();
    }, (error) => {
        console.error("Error fetching inventory history:", error);
    });

    const inventoryRef = collection(db, "inventory");
    const q = query(inventoryRef, orderBy("name"));

    unsubscribeInventory = onSnapshot(q, (snapshot) => {
        inventoryItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderInventory();
    }, (error) => {
        console.error("Error fetching inventory:", error);
    });
}

function renderInventory() {
    const container = document.getElementById("inventory-list-container");
    const searchInput = document.getElementById("inventory-search");
    const countSpan = document.getElementById("header-inventory-count");

    if (!container) return;

    // We don't need cards-grid anymore since it's a table
    if (container.classList.contains("cards-grid")) {
        container.classList.remove("cards-grid");
    }

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";

    const filteredItems = inventoryItems.filter(item => {
        const nameMatch = (item.name || "").toLowerCase().includes(searchTerm);
        const codeMatch = (item.code || "").toLowerCase().includes(searchTerm);
        return nameMatch || codeMatch;
    });

    if (countSpan) {
        countSpan.textContent = filteredItems.length;
    }

    if (filteredItems.length === 0) {
        container.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    <div class="empty-state">
                        <p>ไม่พบรายการสินค้า${searchTerm ? "ที่ตรงกับคำค้นหา" : ""}</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    // Build map of the latest transaction for each item from inventoryHistoryItems
    const lastTxMap = {};
    inventoryHistoryItems.forEach(tx => {
        const itemId = tx.itemId;
        if (!itemId) return;

        let txDate = null;
        if (tx.timestamp) {
            txDate = typeof tx.timestamp.toDate === 'function' ? tx.timestamp.toDate() : new Date(tx.timestamp);
        }

        if (txDate && (!lastTxMap[itemId] || txDate > lastTxMap[itemId].date)) {
            lastTxMap[itemId] = {
                quantity: tx.quantity,
                type: tx.type,
                date: txDate
            };
        }
    });

    let html = "";
    filteredItems.forEach((item, index) => {
        const stock = parseInt(item.stock) || 0;
        const imageUrl = item.imageUrl || "https://placehold.co/150x150?text=No+Image";
        const stockColor = stock > 0 ? 'var(--primary-color)' : 'var(--danger-color)';

        // Find last transaction: prioritize computed history, fallback to document fields
        let lastTxDateStr = item.lastTxDateTime ? formatDateTimeDDMMYYYY(item.lastTxDateTime) : "-";

        const computedTx = lastTxMap[item.id];
        if (computedTx) {
            lastTxDateStr = formatDateTimeDDMMYYYY(computedTx.date.toISOString());
        }

        html += `
            <tr>
                <td class="cell-index" data-label="ลำดับ">${index + 1}</td>
                <td class="cell-code" data-label="รหัสสินค้า" style="font-weight: 600;">${item.code || "-"}</td>
                <td class="cell-image" data-label="รูปภาพ" style="text-align: center; vertical-align: middle;">
                    <img src="${imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); display: block; margin: 0 auto;">
                </td>
                <td class="cell-name" data-label="ชื่อสินค้า">
                    <div style="font-weight: 600; font-size: 1rem;">${item.name}</div>
                </td>
                <td class="cell-stock" data-label="จำนวนคงเหลือ" style="text-align: center; font-weight: 700; font-size: 1.1rem; color: ${stockColor};">
                    ${stock}
                </td>
                <td class="cell-date" data-label="วันเวลาทำรายการล่าสุด" style="text-align: center; font-size: 0.9rem; color: var(--text-muted);">${lastTxDateStr}</td>
                <td class="cell-actions" data-label="เมนูจัดการ" style="text-align: right;">
                    <div class="actions-wrapper">
                        <button class="btn-icon" onclick="openStockAdjustment('${item.id}', 'add')" title="เพิ่มสต๊อก">
                            <i class="fa-solid fa-plus" style="font-size: 0.9rem; color: #16a34a;"></i>
                        </button>
                        <button class="btn-icon" onclick="openStockAdjustment('${item.id}', 'remove')" title="ลดสต๊อก">
                            <i class="fa-solid fa-minus" style="font-size: 0.9rem; color: #dc2626;"></i>
                        </button>
                        <button class="btn-icon" onclick="openEditInventoryModal('${item.id}')" title="แก้ไขข้อมูลสินค้า">
                            <i class="fa-solid fa-pen" style="font-size: 0.9rem;"></i>
                        </button>
                        ${currentUserRole === 'admin' || currentUserRole === 'manager' ? `
                        <button class="btn-icon action-delete" onclick="deleteInventoryItem('${item.id}', '${item.name.replace(/'/g, "\\'")}')" title="ลบสินค้า">
                            <i class="fa-solid fa-trash" style="font-size: 0.9rem; color: #dc2626;"></i>
                        </button>
                        ` : ''}
                        <button class="btn-icon" onclick="viewInventoryHistory('${item.id}')" title="ประวัติการทำรายการ">
                            <i class="fa-solid fa-clock-rotate-left" style="font-size: 0.9rem;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    container.innerHTML = html;
}

window.deleteInventoryItem = async function (itemId, itemName) {
    if (!confirm(`คุณต้องการลบสินค้า "${itemName}" ใช่หรือไม่? การลบนี้จะไม่สามารถย้อนกลับได้`)) {
        return;
    }

    try {
        const docRef = doc(db, "inventory", itemId);
        await deleteDoc(docRef);

        const user = auth.currentUser;
        await addDoc(collection(db, "inventory_history"), {
            itemId: itemId,
            type: "remove",
            quantity: 0,
            notes: `ลบสินค้า: ${itemName}`,
            timestamp: serverTimestamp(),
            userEmail: user ? user.email : "Unknown"
        });

        alert("ลบสินค้าเรียบร้อยแล้ว");
    } catch (error) {
        console.error("Error deleting inventory item:", error);
        alert("เกิดข้อผิดพลาดในการลบสินค้า");
    }
};

window.openStockAdjustment = function (itemId, type) {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById("stock-adjustment-form").reset();
    document.getElementById("stock-adj-item-id").value = itemId;
    document.getElementById("stock-adj-type").value = type;
    document.getElementById("stock-adj-current").value = item.stock;

    const titleStr = type === 'add' ? `นำเข้าสต๊อก: ${item.name}` : `เบิกจ่ายสต๊อก: ${item.name}`;
    document.getElementById("modal-stock-adjustment-title").textContent = titleStr;
    document.getElementById("modal-stock-adjustment-title").style.color = type === 'add' ? '#16a34a' : '#dc2626';

    const modal = document.getElementById("modal-stock-adjustment");
    modal.classList.remove("hidden");
    modal.style.display = "flex";
};

window.submitStockAdjustment = async function () {
    const itemId = document.getElementById("stock-adj-item-id").value;
    const type = document.getElementById("stock-adj-type").value;
    const currentStock = parseInt(document.getElementById("stock-adj-current").value) || 0;
    const quantity = parseInt(document.getElementById("stock-adj-quantity").value);
    const notes = document.getElementById("stock-adj-notes").value.trim();

    if (!quantity || quantity <= 0) {
        alert("กรุณาระบุจำนวนให้ถูกต้อง (มากกว่า 0)");
        return;
    }
    if (!notes) {
        alert("กรุณาระบุรายละเอียดหรือหมายเหตุ");
        return;
    }

    let newStock = currentStock;
    if (type === 'add') {
        newStock += quantity;
    } else {
        newStock -= quantity;
        if (newStock < 0) {
            alert("จำนวนสินค้าไม่เพียงพอสำหรับการเบิกจ่าย");
            return;
        }
    }

    const btnSave = document.getElementById("btn-save-stock-adj");
    const originalText = btnSave.innerHTML;

    try {
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';

        // 1. Update stock and last transaction info in inventory
        const itemRef = doc(db, "inventory", itemId);
        await updateDoc(itemRef, {
            stock: newStock,
            lastTxQty: quantity,
            lastTxType: type,
            lastTxDateTime: new Date().toISOString()
        });

        // 2. Record in history
        const user = auth.currentUser;
        await addDoc(collection(db, "inventory_history"), {
            itemId: itemId,
            type: type,
            quantity: quantity,
            notes: notes,
            timestamp: serverTimestamp(),
            userEmail: user ? user.email : "Unknown"
        });

        document.getElementById("modal-stock-adjustment").classList.add("hidden");
    } catch (error) {
        console.error("Error updating stock:", error);
        alert("เกิดข้อผิดพลาดในการปรับปรุงยอดสต๊อก");
    } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = originalText;
    }
};

window.viewInventoryHistory = async function (itemId) {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    const isManageable = currentUserRole === 'admin' || currentUserRole === 'manager';
    const actionHeader = document.getElementById("history-action-header");
    if (actionHeader) {
        actionHeader.style.display = isManageable ? "table-cell" : "none";
    }

    document.getElementById("modal-inventory-history-subtitle").textContent = item.name;
    const tbody = document.getElementById("inventory-history-list");
    const totalCols = isManageable ? 5 : 4;
    tbody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align: center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดประวัติ...</td></tr>`;

    const modal = document.getElementById("modal-inventory-history");
    modal.classList.remove("hidden");
    modal.style.display = "flex";

    try {
        const historyRef = collection(db, "inventory_history");
        // Remove orderBy to avoid requiring a composite index in Firestore
        const q = query(historyRef, where("itemId", "==", itemId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="${totalCols}"><div class="empty-state"><p>ยังไม่มีประวัติการทำรายการ</p></div></td></tr>`;
            return;
        }

        let historyData = [];
        snapshot.forEach(doc => {
            historyData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort descending by timestamp on client-side
        historyData.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
            const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
            return timeB - timeA;
        });

        let html = "";
        historyData.forEach(data => {
            const dateStr = data.timestamp ? data.timestamp.toDate().toLocaleString('th-TH') : "N/A";
            const typeStr = data.type === 'add' ? `<span style="color: #16a34a; font-weight: 600;"><i class="fa-solid fa-plus"></i> นำเข้า</span>` : `<span style="color: #dc2626; font-weight: 600;"><i class="fa-solid fa-minus"></i> เบิกจ่าย</span>`;

            html += `
                <tr>
                    <td class="cell-date" style="font-size: 0.85rem; white-space: nowrap;" data-label="วันที่-เวลา">${dateStr}</td>
                    <td data-label="ประเภท">${typeStr}</td>
                    <td style="text-align: center; font-weight: 700;" data-label="จำนวน">${data.quantity}</td>
                    <td style="font-size: 0.9rem;" data-label="รายละเอียด">
                        <div>${data.notes}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">${data.userEmail || ""}</div>
                    </td>
                    ${isManageable ? `
                    <td style="text-align: right;" data-label="การจัดการ">
                        <button class="btn-icon action-delete" onclick="deleteHistoryEntry('${data.id}', '${itemId}')" title="ลบรายการ">
                            <i class="fa-solid fa-trash" style="font-size: 0.85rem; color: #dc2626;"></i>
                        </button>
                    </td>
                    ` : ""}
                </tr>
            `;
        });
        tbody.innerHTML = html;

    } catch (error) {
        console.error("Error fetching history:", error);
        tbody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align: center; color: var(--danger-color);">เกิดข้อผิดพลาดในการโหลดประวัติ</td></tr>`;
    }
};

window.deleteHistoryEntry = async function (historyId, itemId) {
    if (!confirm("คุณต้องการลบประวัติการทำรายการนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้")) {
        return;
    }

    try {
        await deleteDoc(doc(db, "inventory_history", historyId));
        alert("ลบประวัติเรียบร้อยแล้ว");
        viewInventoryHistory(itemId);
    } catch (error) {
        console.error("Error deleting history entry:", error);
        alert("เกิดข้อผิดพลาดในการลบประวัติ");
    }
};

// --- Event Listeners for Inventory ---
window.openAddInventoryModal = function () {
    const modal = document.getElementById("modal-inventory");
    if (!modal) return;

    const title = document.getElementById("modal-inventory-title");
    if (title) title.textContent = "เพิ่มสินค้ารายการใหม่";

    const form = document.getElementById("inventory-form");
    if (form) {
        form.reset();
        delete form.dataset.mode;
        delete form.dataset.itemId;
    }

    const preview = document.getElementById("inventory-image-preview");
    if (preview) {
        preview.src = "";
        preview.style.display = "none";
    }

    const uploadArea = document.getElementById("inventory-upload-area");
    if (uploadArea) {
        const i = uploadArea.querySelector("i");
        if (i) i.style.display = "block";
        const p = uploadArea.querySelector("p");
        if (p) p.style.display = "block";
    }

    modal.classList.remove("hidden");
    modal.style.display = "flex";
};

window.openEditInventoryModal = function (itemId) {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    const modal = document.getElementById("modal-inventory");
    if (!modal) return;

    const title = document.getElementById("modal-inventory-title");
    if (title) title.textContent = "แก้ไขข้อมูลสินค้า";

    const form = document.getElementById("inventory-form");
    if (form) {
        form.dataset.mode = "edit";
        form.dataset.itemId = itemId;
    }

    document.getElementById("inventory-name").value = item.name || "";
    document.getElementById("inventory-code").value = item.code || "";
    document.getElementById("inventory-stock").value = item.stock !== undefined ? item.stock : 0;

    const preview = document.getElementById("inventory-image-preview");
    const uploadArea = document.getElementById("inventory-upload-area");

    if (preview) {
        if (item.imageUrl) {
            preview.src = item.imageUrl;
            preview.style.display = "block";
            if (uploadArea) {
                const i = uploadArea.querySelector("i");
                if (i) i.style.display = "none";
                const p = uploadArea.querySelector("p");
                if (p) p.style.display = "none";
            }
        } else {
            preview.src = "";
            preview.style.display = "none";
            if (uploadArea) {
                const i = uploadArea.querySelector("i");
                if (i) i.style.display = "block";
                const p = uploadArea.querySelector("p");
                if (p) p.style.display = "block";
            }
        }
    }

    modal.classList.remove("hidden");
    modal.style.display = "flex";
};

function setupInventoryListeners() {
    const searchInput = document.getElementById("inventory-search");
    if (searchInput) {
        searchInput.addEventListener("input", renderInventory);
    }

    const inventoryImageInput = document.getElementById("inventory-image-input");
    const inventoryUploadArea = document.getElementById("inventory-upload-area");

    if (inventoryUploadArea && inventoryImageInput) {
        inventoryUploadArea.addEventListener("click", () => inventoryImageInput.click());
        inventoryImageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const preview = document.getElementById("inventory-image-preview");
                    preview.src = e.target.result;
                    preview.style.display = "block";
                    inventoryUploadArea.querySelector("i").style.display = "none";
                    inventoryUploadArea.querySelector("p").style.display = "none";
                }
                reader.readAsDataURL(file);
            }
        });
    }

    const btnSave = document.getElementById("btn-save-inventory");
    if (btnSave) {
        // Prevent multiple bindings
        const newBtnSave = btnSave.cloneNode(true);
        btnSave.parentNode.replaceChild(newBtnSave, btnSave);

        newBtnSave.addEventListener("click", async () => {
            const form = document.getElementById("inventory-form");
            const mode = form ? form.dataset.mode : "add";
            const itemId = form ? form.dataset.itemId : "";

            const name = document.getElementById("inventory-name").value.trim();
            const code = document.getElementById("inventory-code").value.trim();
            const stockVal = document.getElementById("inventory-stock").value;
            const fileInput = document.getElementById("inventory-image-input");

            if (!name || stockVal === "") {
                alert("กรุณากรอกข้อมูลให้ครบถ้วน");
                return;
            }

            const stock = parseInt(stockVal);

            try {
                newBtnSave.disabled = true;
                newBtnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';

                let imageUrl = "";
                if (fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];
                    const storageRef = ref(storage, `inventory/${Date.now()}_${file.name}`);
                    const snapshot = await uploadBytes(storageRef, file);
                    imageUrl = await getDownloadURL(snapshot.ref);
                }

                if (mode === "edit") {
                    const updateData = { name, code, stock };
                    if (imageUrl) {
                        updateData.imageUrl = imageUrl;
                    }

                    const item = inventoryItems.find(i => i.id === itemId);
                    if (item && item.stock !== stock) {
                        const diff = Math.abs(stock - item.stock);
                        const type = stock > item.stock ? "add" : "remove";
                        updateData.lastTxQty = diff;
                        updateData.lastTxType = type;
                        updateData.lastTxDateTime = new Date().toISOString();

                        const user = auth.currentUser;
                        await addDoc(collection(db, "inventory_history"), {
                            itemId: itemId,
                            type: type,
                            quantity: diff,
                            notes: "แก้ไขข้อมูลสินค้า (ปรับปรุงยอดคงเหลือ)",
                            timestamp: serverTimestamp(),
                            userEmail: user ? user.email : "Unknown"
                        });
                    }

                    await updateDoc(doc(db, "inventory", itemId), updateData);
                } else {
                    await addDoc(collection(db, "inventory"), {
                        name,
                        code,
                        stock,
                        imageUrl,
                        createdAt: serverTimestamp(),
                        lastTxQty: stock,
                        lastTxType: "add",
                        lastTxDateTime: new Date().toISOString()
                    });
                }

                document.getElementById("modal-inventory").classList.add("hidden");

            } catch (error) {
                console.error("Error saving inventory:", error);
                alert("เกิดข้อผิดพลาดในการบันทึกสินค้า");
            } finally {
                newBtnSave.disabled = false;
                newBtnSave.innerHTML = "บันทึกข้อมูล";
            }
        });
    }
}

// Call setupInventoryListeners
setupInventoryListeners();

window.exportDevicesPDF = exportDevicesPDF;

// ============================================================
// === LINE Login System (LIFF SDK) ===
// ============================================================

const LIFF_ID = '2010697063-kIdzAXLc';
let liffInitialized = false;
let liffInitPromise = null;

/**
 * Initialize LIFF SDK (called lazily on first LINE action)
 */
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

// --- LINE Login Button Event Listener ---
const btnLineLogin = document.getElementById('btn-line-login');
if (btnLineLogin) {
    btnLineLogin.addEventListener('click', (e) => {
        e.preventDefault();
        handleLineLogin();
    });
}

// --- Handle LIFF Redirect Return ---
// When user returns from LIFF login, check if we need to complete an action
(async function handleLiffReturn() {
    try {
        // Check if LIFF SDK is available
        if (typeof liff === 'undefined') return;

        const ok = await initLiff();
        if (!ok) return;

        // Check if we are returning from a LIFF action
        const urlParams = new URLSearchParams(window.location.search);
        const hasLiffParams = urlParams.has('liff.state') || window.location.hash.includes('access_token');
        let pendingAction = localStorage.getItem('liff_pending_action');

        if (liff.isLoggedIn()) {
            if (!hasLiffParams && !pendingAction) {
                if (typeof auth.authStateReady === 'function') {
                    await auth.authStateReady();
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
                if (!auth.currentUser) {
                    if (sessionStorage.getItem('skip_line_auto_login')) {
                        console.log('Skipping LIFF auto-login because user explicitly logged out.');
                        return;
                    }
                    console.log('LIFF session is active but Firebase is not. Auto-logging in...');
                    pendingAction = 'login';
                } else {
                    return;
                }
            }

            console.log(`LIFF return detected. Pending action: ${pendingAction}`);
            localStorage.removeItem('liff_pending_action');
            const accessToken = liff.getAccessToken();
            if (!accessToken) return;

            // Important: Wait for Firebase Auth to initialize before proceeding!
            // Otherwise, auth.currentUser will be null even if the user is already signed in.
            if (typeof auth.authStateReady === 'function') {
                await auth.authStateReady();
            } else {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            const currentUser = auth.currentUser;

            if (pendingAction === 'link' || (pendingAction !== 'login' && currentUser)) {
                // Handle Link Action
                console.log('LIFF return: Attempting to link LINE...');
                if (!currentUser) {
                    showToast('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'error');
                    return;
                }

                showToast('กำลังประมวลผลการเชื่อมต่อ LINE...', 'info');
                const linkFn = httpsCallable(functions, 'linkLineAccount');
                const result = await linkFn({ accessToken });

                if (result.data.success) {
                    showToast(result.data.message || 'เชื่อมต่อ LINE สำเร็จ!', 'success');
                    renderProfile();
                } else {
                    if (liffInitialized && liff.isLoggedIn()) {
                        liff.logout();
                    }
                    await showDialog(result.data.message || 'เชื่อมต่อ LINE ไม่สำเร็จ');
                }
            } else if (pendingAction === 'sync' && currentUser) {
                // Handle Sync Photo Action
                console.log('LIFF return: Attempting to sync LINE photo...');
                showToast('กำลังประมวลผลซิงค์รูป...', 'info');
                const linkFn = httpsCallable(functions, 'linkLineAccount');
                const result = await linkFn({ accessToken });

                if (result.data.success) {
                    showToast('ซิงค์รูปโปรไฟล์สำเร็จ!', 'success');
                    renderProfile();
                } else {
                    showToast(result.data.message || 'เกิดข้อผิดพลาดในการซิงค์', 'error');
                }
            } else {
                // Handle Login Action
                console.log('LIFF return: Attempting LINE login...');

                const loginOverlayHTML = `
                    <div id="liff-login-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.9); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem;">
                        <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; color:#06C755;"></i>
                        <p style="font-weight:600; color:#111;">กำลังเข้าสู่ระบบด้วย LINE...</p>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', loginOverlayHTML);

                const lineLoginFn = httpsCallable(functions, 'lineLogin');
                const result = await lineLoginFn({ accessToken });

                const overlay = document.getElementById('liff-login-overlay');
                if (overlay) overlay.remove();

                if (result.data.success) {
                    await signInWithCustomToken(auth, result.data.customToken);
                    showToast('เข้าสู่ระบบด้วย LINE สำเร็จ!', 'success');
                    FirestoreService.logAction('AUTH', 'LOGIN', `User logged in via LINE (${result.data.lineProfile?.displayName || 'unknown'})`);
                } else if (result.data.error === 'NOT_LINKED') {
                    // Wrong account -> logout from LIFF so they can switch
                    if (liffInitialized && liff.isLoggedIn()) {
                        liff.logout();
                    }
                    await showDialog(result.data.message || 'ไม่พบบัญชีที่เชื่อมต่อกับ LINE นี้\n\nกรุณาเข้าสู่ระบบด้วยอีเมล/เบอร์โทร แล้วเชื่อมต่อ LINE ที่หน้าโปรไฟล์ก่อน');
                } else {
                    if (liffInitialized && liff.isLoggedIn()) {
                        liff.logout();
                    }
                    await showDialog(result.data.message || 'การเข้าสู่ระบบผิดพลาด');
                }
            }

            // Clean up URL (remove LIFF params without refreshing)
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    } catch (err) {
        console.warn('LIFF return handling error:', err);
        localStorage.removeItem('liff_pending_action');
        const overlay = document.getElementById('liff-login-overlay');
        if (overlay) overlay.remove();
    }
})();
