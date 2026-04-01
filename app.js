/**
 * AquaFlow - Water Plant Maintenance App
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
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// Helper: check if category is a maintenance-type category
function isMaCategory(cat) {
    return cat === "บำรุงรักษาตามรอบ" || cat === "ตามสัญญาจ้าง" || cat === "ตามใบสั่งซื้อ" || cat === "Maintenance" || cat === "อื่นๆ";
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

            // --- RESTRICT NEW USERS (LINE) ---
            if (
                result.providerId === "oidc.line" ||
                result.user.providerData.some((p) => p.providerId === "oidc.line")
            ) {
                const additionalInfo = getAdditionalUserInfo(result);
                if (additionalInfo && additionalInfo.isNewUser) {
                    console.warn(
                        "New User Registration via LINE is NOT ALLOWED. Deleting user...",
                    );
                    await deleteUser(result.user);
                    await signOut(auth);
                    await showDialog(
                        "ไม่อนุญาตให้ลงทะเบียนบัญชีใหม่ด้วย LINE\n(กรุณาติดต่อผู้ดูแลระบบ)",
                        { title: "Access Denied" },
                    );
                    return; // Stop processing
                }
            }
            // -------------------------------
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
            if (isLineBrowser()) {
                await showDialog(
                    "พบปัญหาการยืนยันตัวตน (Auth State)\n\nระบบไม่สามารถจำสถานะการล็อกอินได้เนื่องจากข้อจำกัดของ Browser นี้\n\nกรุณากดเมนูและเลือก 'เปิดในเบราว์เซอร์เริ่มต้น' (Open in Browser) เพื่อใช้งาน",
                    { title: "ข้อจำกัดของ Browser" },
                );
            } else {
                await showDialog(
                    "ไม่สามารถเข้าสู่ระบบได้ (" + error.code + "): " + error.message,
                );
            }
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

        const btn = document.getElementById("btn-login-line");
        if (btn) btn.disabled = false;
        const btnLink = document.getElementById("btn-link-line");
        if (btnLink) btnLink.disabled = false;
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
                let userDoc = await FirestoreService.getUser(user.uid);

                // Auto-Register New Users (Except LINE)
                if (!userDoc) {
                    // Check if user authenticated via LINE
                    const isLineUser = user.providerData.some(
                        (p) => p.providerId === "oidc.line",
                    );

                    if (isLineUser) {
                        console.warn(
                            "New User Registration via LINE is NOT ALLOWED. Deleting user...",
                        );
                        await deleteUser(user);
                        await signOut(auth);
                        await showDialog(
                            "ไม่อนุญาตให้ลงทะเบียนบัญชีใหม่ด้วย LINE\n(กรุณาติดต่อผู้ดูแลระบบ)",
                            { title: "Access Denied" },
                        );
                        return; // Stop processing
                    }

                    console.log("New user detected, registering...");
                    await FirestoreService.addUser(user);
                    userDoc = await FirestoreService.getUser(user.uid);
                    // Suppressed Welcome Toast here (moved to explicit login)
                } else {
                    // --- Sync LINE profile photo if it changed ---
                    // Firebase Auth's providerData contains the LATEST photo from LINE
                    // at the moment the user signed in. If the user changed their LINE
                    // profile picture, this value will differ from the stored user.photoURL.
                    const lineProvider = user.providerData.find(
                        (p) => p.providerId === "oidc.line",
                    );
                    if (
                        lineProvider &&
                        lineProvider.photoURL &&
                        lineProvider.photoURL !== user.photoURL
                    ) {
                        console.log(
                            "LINE photo changed, syncing new photo from LINE provider...",
                        );
                        try {
                            await updateProfile(user, { photoURL: lineProvider.photoURL });
                            console.log("Firebase Auth photoURL updated from LINE provider.");
                        } catch (photoErr) {
                            console.warn(
                                "Could not update Auth photoURL from LINE:",
                                photoErr,
                            );
                        }
                    }

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

                init();
                renderProfile(user);
                setupSessionTimeout(); // Start inactivity monitor
                const splash = document.getElementById("loading-splash");
                if (splash) setTimeout(() => splash.classList.add("hidden"), 500);
            } else {
                console.log("Auth State Changed: No User");
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
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
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
    idleTimer = setTimeout(handleSessionTimeout, SESSION_TIMEOUT_MS);
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

        await showDialog(
            "เซสชันหมดอายุเนื่องจากไม่มีการใช้งานเกิน 30 นาที\nกรุณาเข้าสู่ระบบใหม่",
            { title: "Session Expired" },
        );
        window.location.reload();
    } catch (err) {
        console.error("Timeout Logout Error:", err);
    }
}

function setupSessionTimeout() {
    // Check persistent timestamp
    const lastActive = parseInt(
        localStorage.getItem("sessionLastActive") || "0",
        10,
    );
    const now = Date.now();

    if (lastActive > 0) {
        const elapsed = now - lastActive;
        if (elapsed > SESSION_TIMEOUT_MS) {
            console.warn("Persistent session expired.");
            handleSessionTimeout();
            return;
        }
        // If valid, we could technically start with reduced time,
        // but standard behavior is usually 'activity resets timer'.
        // To be strict: remaining = SESSION_TIMEOUT_MS - elapsed;
        // But for this requirement (activity reset), we just reset to full.
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

    async fetchGlobalLogCount() {
        const q = query(collection(db, "logs"));
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    },

    async fetchFilteredStats(filters) {
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
        await this.logAction("SITE", "ADD", `Added new site: ${siteData.name}`, {
            siteId: docRef.id,
            data: siteData,
        });
        return docRef.id;
    },

    async updateSite(id, siteData) {
        siteData.updatedAt = serverTimestamp();
        const siteRef = doc(db, "sites", id);

        // Fetch previous data for logging
        let previousData = null;
        try {
            const docSnap = await getDoc(siteRef);
            if (docSnap.exists()) previousData = docSnap.data();
        } catch (e) {
            console.warn("Could not fetch previous site data", e);
        }

        await updateDoc(siteRef, siteData);
        await this.logAction("SITE", "EDIT", `Updated site: ${siteData.name}`, {
            siteId: id,
            data: siteData,
            previousData: previousData,
        });
    },

    async deleteSite(id) {
        const docRef = doc(db, "sites", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            await this.moveToRecycleBin("sites", id, data, `สถานที่: ${data.name}`);
            await this.logAction("SITE", "DELETE", `Deleted site (moved to bin)`, {
                siteId: id,
                data: data,
            });
        }
        await deleteDoc(docRef);
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
            
            // Sort by displayName
            validUsers.sort((a, b) => {
                const nameA = (a.displayName || a.email || '').toLowerCase();
                const nameB = (b.displayName || b.email || '').toLowerCase();
                return nameA.localeCompare(nameB, 'th');
            });
            
            console.log('Valid users after filtering:', validUsers.length);
            console.log('Valid users:', validUsers.map(u => ({ email: u.email, name: u.displayName })));
            console.log('=== END FIRESTORE DEBUG ===');
            
            return validUsers;
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
        await this.logAction("LOG", "ADD", `Added logs: ${logData.objective}`, {
            logId: docRef.id,
            caseId: logData.caseId,
            data: { ...logData, _cachedSiteName: (state.sites.find(s => s.id === logData.siteId) || {}).name || '-' },
        });
        return docRef.id;
    },

    async updateLog(id, logData) {
        const logRef = doc(db, "logs", id);

        // Fetch previous data for logging
        let previousData = null;
        try {
            const docSnap = await getDoc(logRef);
            if (docSnap.exists()) previousData = docSnap.data();
        } catch (e) {
            console.warn("Could not fetch previous log data", e);
        }

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
    },

    async deleteLog(id) {
        const docRef = doc(db, "logs", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const site = state.sites.find((s) => s.id === data.siteId) || {
                name: "Unknown Site",
            };
            // Cache site name in data for robustness
            data._cachedSiteName = site.name;
            await this.moveToRecycleBin(
                "logs",
                id,
                data,
                `บันทึก: ${data.objective} @ ${site.name} (${data.date})`,
            );
            await this.logAction("LOG", "DELETE", `Deleted log (moved to bin)`, {
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

    async recycleLogsBySiteId(siteId) {
        const logsRef = collection(db, "logs");
        const q = query(logsRef);
        const snapshot = await getDocs(q);
        const site = state.sites.find((s) => s.id === siteId) || {
            name: "Deleted Site",
        }; // Get site name once

        const batchPromises = [];
        snapshot.forEach((docSnap) => {
            if (docSnap.data().siteId === siteId) {
                const data = docSnap.data();
                data._cachedSiteName = site.name; // Cache name
                batchPromises.push(
                    this.moveToRecycleBin(
                        "logs",
                        docSnap.id,
                        data,
                        `บันทึก (จาก ${site.name}): ${data.objective || "-"}`,
                    ).then(() => deleteDoc(doc(db, "logs", docSnap.id))),
                );
            }
        });
        await Promise.all(batchPromises);
    },

    // --- Recycle Bin ---
    async moveToRecycleBin(collectionName, id, data, description) {
        const user = auth.currentUser;
        await addDoc(collection(db, "deleted_items"), {
            originalCollection: collectionName,
            originalId: id,
            data: data,
            description: description || "No Description",
            deletedBy: user ? user.displayName || user.email : "Unknown",
            deletedAt: new Date().toISOString(),
        });
    },

    async restoreFromRecycleBin(binId, originalCollection, originalId, data) {
        await setDoc(doc(db, originalCollection, originalId), data);
        await deleteDoc(doc(db, "deleted_items", binId));
    },

    async deletePermanently(binId) {
        // Fetch to find file info before deleting
        const binRef = doc(db, "deleted_items", binId);
        const binSnap = await getDoc(binRef);

        if (binSnap.exists()) {
            const binData = binSnap.data();
            const originalData = binData.data || {};
            // Check for attachments to delete (attachments are inside data.data)
            const attachments = [];
            // Normalize
            if (originalData.attachments && Array.isArray(originalData.attachments)) {
                attachments.push(...originalData.attachments);
            } else if (originalData.attachmentUrl) {
                attachments.push({ url: originalData.attachmentUrl, path: null });
            }

            // Cleanup Storage
            for (const att of attachments) {
                try {
                    // Prefer path if available, else derive from URL if possible (legacy)
                    if (att.path) {
                        const fileRef = ref(storage, att.path);
                        await deleteObject(fileRef);
                        console.log("Permanently deleted file:", att.path);
                    } else if (att.url && att.url.includes("firebasestorage")) {
                        // Attempt to reconstruct ref from URL for legacy files?
                        // It's tricky without path. Better to just verify valid path usage moving forward.
                        // Or use refFromURL logic (ref(storage, url))
                        const fileRef = ref(storage, att.url);
                        await deleteObject(fileRef);
                        console.log("Permanently deleted file from URL:", att.url);
                    }
                } catch (err) {
                    console.warn("Failed to delete associated storage file:", err);
                }
            }
        }
        await deleteDoc(binRef);
    },

    async fetchDeletedItems() {
        const q = query(
            collection(db, "deleted_items"),
            orderBy("deletedAt", "desc"),
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async emptyRecycleBin() {
        const q = query(collection(db, "deleted_items"));
        const snapshot = await getDocs(q);

        // Use serial or limited concurrency to avoid errors
        for (const d of snapshot.docs) {
            const binData = d.data();
            const originalData = binData.data || {};
            // Check for attachments logic (attachments are inside data.data)
            const attachments = [];
            if (originalData.attachments && Array.isArray(originalData.attachments)) {
                attachments.push(...originalData.attachments);
            } else if (originalData.attachmentUrl) {
                attachments.push({ url: originalData.attachmentUrl, path: null });
            }

            for (const att of attachments) {
                try {
                    if (att.path) {
                        await deleteObject(ref(storage, att.path));
                    } else if (att.url && att.url.includes("firebasestorage")) {
                        await deleteObject(ref(storage, att.url));
                    }
                } catch (e) {
                    console.warn("Cleanup file fail:", e);
                }
            }
            // Delete doc
            await deleteDoc(doc(db, "deleted_items", d.id));
        }
        console.log("Recycle bin emptied.");
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

    async fetchActionLogs(limitCount = 500) {
        try {
            const q = query(
                collection(db, "action_logs"),
                orderBy("timestamp", "desc"),
            ); // Get newest first
            // Note: Limit could be applied here if query supports it easily,
            // but for now we fetch and client-side slice if usage is low.
            // JS SDK `limit` import needed if strict.
            const snapshot = await getDocs(q);
            return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error("Error fetching action logs:", e);
            return [];
        }
    },

    // Real-time Subscription for Action Logs
    subscribeToActionLogs(callback, limitCount = 50) {
        try {
            const q = query(
                collection(db, "action_logs"),
                orderBy("timestamp", "desc"),
                limit(limitCount),
            );

            // onSnapshot returns the unsubscribe function
            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const logs = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    callback(logs);
                },
                (error) => {
                    console.error("Error in action logs subscription:", error);
                },
            );

            return unsubscribe;
        } catch (error) {
            console.error("Error setting up subscription:", error);
            return () => { }; // return empty fn fallback
        }
    },

    async deleteAllActionLogs() {
        const logsRef = collection(db, "action_logs");
        const snapshot = await getDocs(logsRef);
        const total = snapshot.size;
        console.log(`Deleting ${total} action logs...`);
        
        // Delete in small batches to avoid rate limits
        const batchSize = 50;
        const docs = snapshot.docs;
        for (let i = 0; i < docs.length; i += batchSize) {
            const chunk = docs.slice(i, i + batchSize);
            await Promise.all(chunk.map((d) => deleteDoc(d.ref)));
            console.log(`Deleted ${Math.min(i + batchSize, total)} / ${total}`);
        }
        console.log("All action logs deleted.");
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
    login: document.getElementById("login-view"),
    profile: document.getElementById("profile-view"),
    recycleBin: document.getElementById("recycle-bin-view"),
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
        // 1. Strip non-numeric chars (preserve existing hyphens? No, re-format from scratch)
        let rawValue = e.target.value.replace(/\D/g, "");

        // 2. Limit to 10 digits
        if (rawValue.length > 10) {
            rawValue = rawValue.substring(0, 10);
        }

        // 3. Format (xxx-xxx-xxxx)
        let formattedValue = "";
        if (rawValue.length > 0) {
            formattedValue = rawValue.substring(0, 3);
            if (rawValue.length > 3) {
                formattedValue += "-" + rawValue.substring(3, 6);
            }
            if (rawValue.length > 6) {
                formattedValue += "-" + rawValue.substring(6, 10);
            }
        }

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
            "profile-view",
            "recycle-bin-view",
        ];
        const initialView = allowedViews.includes(savedView)
            ? savedView
            : "admin-view";
        switchView(initialView);

        await loadAddressData();
        setupEventListeners();
        setupRecycleBinTabs(); // New Tab Logic
        setupRecycleBinTabs(); // New Tab Logic
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
        console.log("init() complete");

        // Run MA Backfill in the background silently
        runBackgroundMaBackfill();

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

        console.log("2. Emptying Recycle Bin...");
        await FirestoreService.emptyRecycleBin();

        console.log("3. Deleting Action Logs...");
        await FirestoreService.deleteAllActionLogs();

        console.log("--- WIPE COMPLETE ---");
        alert("Success: All data (except Sites/Users) has been wiped.");
        window.location.reload();
    } catch (e) {
        console.error("Wipe Failed:", e);
        alert("Error during wipe: " + e.message);
        if (loading) loading.classList.add("hidden");
    }
};

// --- Address Logic ---
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

    if (views.admin && viewName === "admin-view")
        views.admin.classList.add("active");
    if (views.engineer && viewName === "engineer-view")
        views.engineer.classList.add("active");
    if (views.profile && viewName === "profile-view") {
        views.profile.classList.add("active");
        renderProfile();
    }
    if (views.recycleBin && viewName === "recycle-bin-view")
        views.recycleBin.classList.add("active");
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

    if (viewName === "recycle-bin-view") {
        renderRecycleBin();
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
            () => [...new Set(state.sites.map(s => s[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')),
            () => {},
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

// --- Global State for Site Uploads ---
let pendingSiteUploads = [];
let pendingSiteDeletions = [];

// Helper to render site previews (Legacy wrapper)
function renderPendingSitePreviews() {
    refreshSiteAttachmentPreviews();
}

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

            maintenanceCycle: formData.get("maintenanceCycle")
                ? Number(formData.get("maintenanceCycle"))
                : null,
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
    setVal("maintenanceCycle", site.maintenanceCycle);
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

function buildInspectionSummary(logData) {
    const lines = [];
    if (logData.cycleCount) lines.push(`จำนวนรอบ: ${logData.cycleCount}`);
    // Electrical
    const hasE = logData.voltageL1 || logData.voltageL2 || logData.voltageL3 || logData.currentL1 || logData.currentL2 || logData.currentL3;
    if (hasE) {
        lines.push(`⚡ Electrical — V: R${logData.voltageL1||'-'} S${logData.voltageL2||'-'} T${logData.voltageL3||'-'} | A: R${logData.currentL1||'-'} S${logData.currentL2||'-'} T${logData.currentL3||'-'}`);
    }
    // Physical
    const pf = (v) => !v ? '' : v === 'pass' ? '✅' : '❌';
    if (logData.avgWorkTemp) lines.push(`อุณหภูมิทำงาน: ${logData.avgWorkTemp}°C ${pf(logData.avgWorkTempCheck)}`);
    if (logData.avgAreaTemp) lines.push(`อุณหภูมิพื้นที่: ${logData.avgAreaTemp}°C ${pf(logData.avgAreaTempCheck)}`);
    if (logData.leakPressure || logData.leakCheck) lines.push(`การรั่วไหล: ${logData.leakPressure||'-'} PSI ${pf(logData.leakCheck)}`);
    if (logData.complyType5) lines.push(`Comply Type 5: ${pf(logData.complyType5)}`);
    if (logData.ciPcdType5) lines.push(`CI PCD Type 5: ${pf(logData.ciPcdType5)}`);
    // Inspection checklist
    const inspLabels = { check: 'Check', service: 'Service', replace: 'Replace' };
    const inspItems = [
        ['insp_exteriorCleaning','ความสะอาดภายนอก'],['insp_interiorCleaning','ความสะอาดภายใน'],
        ['insp_doorSystem','ระบบประตู'],['insp_footSwitch','Foot Switch'],['insp_sensor','Sensor'],
        ['insp_tempPoints','อุณหภูมิจุดที่ 1-4'],['insp_workingPressure','ความดัน'],['insp_rfGenerator','RF Generator'],
        ['insp_chemicalAmount','น้ำยาที่ฉีด'],['insp_airChargingValue','Air Charging'],['insp_filter','Filter'],
        ['insp_decomposer','Decomposer'],['insp_vacuumPumpOil','น้ำมันปั๊มสุญญากาศ'],['insp_connectors','ข้อต่อ'],
        ['insp_drainTank','ถังเดรนน้ำ'],['insp_gasDoor','แก๊สหน้าประตู'],['insp_gas1m','แก๊สห่าง 1ม.'],['insp_gas2m','แก๊สห่าง 2ม.'],
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

        showProgress(70, 'กำลังบันทึกข้อมูล...');

        const logData = {
            siteId: formData.get("siteId"),
            date: sanitizeDate(formData.get("date")),
            category: formData.get("category") || "อื่นๆ",
            status: formData.get("status") || (logId ? (state.logs.find(l => l.id === logId)?.status || "Open") : "Open"),
            responderId: formData.get("responderId") || "",
            lineItems: getLineItems(),
            details:
                getLineItems()
                    .map((li) => li.item)
                    .filter(Boolean)
                    .join(", ") || "-",
            objective: formData.get("objective"),
            cost: getLineItems().reduce((s, li) => s + (li.cost || 0), 0),
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
                responderId: 'ผู้รับผิดชอบ',
                cost: 'ค่าใช้จ่าย'
            };
            
            const statusLabels = {
                'Open': 'เปิดงาน',
                'Planning': 'วางแผน',
                'On Process': 'กำลังดำเนินการ',
                'Done': 'เสร็จสิ้น',
                'Case Closed': 'ปิดเคส',
                'Cancel': 'ยกเลิก'
            };
            
            // Compare fields
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
                
                // Check line items changes (show detailed changes)
                const oldItems = existingLog.lineItems || [];
                const newItems = logData.lineItems || [];
                if (JSON.stringify(oldItems) !== JSON.stringify(newItems)) {
                    // Show count change if different
                    if (oldItems.length !== newItems.length) {
                        changes.push(`จำนวนรายการ: ${oldItems.length} รายการ → ${newItems.length} รายการ`);
                    } else if (oldCost === newCost) {
                        // Items changed but cost same - show that items were modified
                        changes.push(`รายการค่าใช้จ่าย: แก้ไขรายการ`);
                    }
                }
            }
            
            await FirestoreService.updateLog(logId, logData);
            
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
                    const hasActiveMaintenance = state.logs.some((l) => 
                        l.siteId === site.id && 
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
                        const siteMaLogs = state.logs.filter(
                            (l) => l.siteId === site.id && 
                            l.id !== logId && // Exclude current log being changed
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
                    try { await FirestoreService.updateLog(newLogId, { comments: [{ text: inspSummary, author: "System", authorId: "system", photoURL: "", timestamp: new Date().toISOString(), attachments: [], isSystemLog: true }] }); } catch(e) {}
                }
            }
            
            showToast("บันทึกการบำรุงรักษาสำเร็จ", "success");
        }

        // Auto-create next cycle if Maintenance & newly Case Closed
        if (
            isNewlyCompleted &&
            (isMaCategory(logData.category) ||
                logData.category === "อื่นๆ" ||
                logData.objective?.includes("รอบซ่อมบำรุง"))
        ) {
            const site = state.sites.find((s) => s.id === logData.siteId);
            if (site && site.maintenanceCycle && site.maintenanceCycle > 0) {
                // Check if there's already an active maintenance case for this site
                const hasActiveMaintenance = state.logs.some((l) => 
                    l.siteId === site.id && 
                    (isMaCategory(l.category)) &&
                    l.status !== "Cancel" && 
                    l.status !== "Done" && 
                    l.status !== "Completed" &&
                    l.status !== "Case Closed"
                );
                
                if (!hasActiveMaintenance) {
                    const currentDate = new Date(logData.date);
                    if (!isNaN(currentDate.getTime())) {
                        currentDate.setDate(currentDate.getDate() + site.maintenanceCycle);
                        const nextDateStr = currentDate.toISOString().split("T")[0];

                        // Check if next maintenance date is beyond insurance end date
                        if (site.insuranceEndDate) {
                            const insuranceEndDate = new Date(site.insuranceEndDate);
                            if (currentDate > insuranceEndDate) {
                                console.log('[Auto-generate] Skipped - next maintenance date is beyond insurance end date');
                                return;
                            }
                        }

                        const siteMaLogs = state.logs.filter(
                            (l) => l.siteId === site.id && (isMaCategory(l.category) || l.objective?.includes("รอบซ่อมบำรุง"))
                        );
                        const nextCycleNum = siteMaLogs.length + 1;

                        const nextLogData = {
                            siteId: site.id,
                            date: nextDateStr,
                            category: logData.category || "บำรุงรักษาตามรอบ",
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
                            console.log('[Auto-generate] Created next maintenance cycle for completed case');
                        } catch (cycleErr) {
                            console.error("Failed to add next MA cycle log:", cycleErr);
                        }
                    }
                } else {
                    console.log('[Auto-generate] Skipped - site already has active maintenance case');
                }
            }
        }

        // Auto-create replacement case if newly Cancelled
        if (isNewlyCancelled) {
            const site = state.sites.find((s) => s.id === logData.siteId);
            if (site && site.maintenanceCycle && site.maintenanceCycle > 0) {
                // Check if there's already an active maintenance case for this site
                const hasActiveMaintenance = state.logs.some((l) => 
                    l.siteId === site.id && 
                    (isMaCategory(l.category)) &&
                    l.status !== "Cancel" && 
                    l.status !== "Done" && 
                    l.status !== "Completed" &&
                    l.status !== "Case Closed"
                );
                
                if (!hasActiveMaintenance) {
                    const currentDate = new Date(logData.date);
                    if (!isNaN(currentDate.getTime())) {
                        currentDate.setDate(currentDate.getDate() + site.maintenanceCycle);
                        const nextDateStr = currentDate.toISOString().split("T")[0];

                        // Check if next maintenance date is beyond insurance end date
                        if (site.insuranceEndDate) {
                            const insuranceEndDate = new Date(site.insuranceEndDate);
                            if (currentDate > insuranceEndDate) {
                                console.log('[Auto-generate] Skipped - next maintenance date is beyond insurance end date');
                                return;
                            }
                        }

                        const siteMaLogs = state.logs.filter(
                            (l) => l.siteId === site.id && (isMaCategory(l.category) || l.objective?.includes("รอบซ่อมบำรุง"))
                        );
                        const nextCycleNum = siteMaLogs.length + 1;

                        const nextLogData = {
                            siteId: site.id,
                            date: nextDateStr,
                            category: logData.category || "บำรุงรักษาตามรอบ",
                            status: "Open",
                            lineItems: [],
                            details: "-",
                            objective: logData.objective || `รอบซ่อมบำรุงตามกำหนด (${site.maintenanceCycle} วัน)`,
                            cost: 0,
                            attachments: [],
                            attachmentsBefore: [],
                            attachmentsAfter: [],
                            recordedBy: "System",
                            timestamp: new Date().toISOString(),
                            comments: [{
                                text: `สร้างอัตโนมัติจากเคสที่ถูกยกเลิก (${logData.caseId || 'N/A'}) - รอบที่ ${nextCycleNum}`,
                                author: "System",
                                authorId: "system",
                                photoURL: "",
                                timestamp: new Date().toISOString(),
                                attachments: []
                            }]
                        };
                        try {
                            await FirestoreService.addLog(nextLogData);
                            console.log('[Auto-generate] Created replacement case for cancelled case with cycle date');
                            showToast("สร้างเคสใหม่อัตโนมัติแล้ว", "info");
                        } catch (err) {
                            console.error("Failed to add replacement case:", err);
                        }
                    }
                } else {
                    console.log('[Auto-generate] Skipped - site already has active maintenance case');
                }
            }
        }

        showProgress(90, 'กำลังรีเฟรชข้อมูล...');

        await refreshData();

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
    }
}

// --- Global State for Pending Uploads & Deletions ---
let pendingUploadsBefore = [];
let pendingUploadsAfter = [];
let pendingDeletions = []; // Store paths of files to delete on save

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
        const json = form.querySelector(
            'input[name="existingAttachmentsBeforeJSON"]',
        ).value;
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
        const json = form.querySelector(
            'input[name="existingAttachmentsAfterJSON"]',
        ).value;
        if (json) existing = JSON.parse(json);
    } catch (e) {
        console.error(e);
    }

    const allAttachments = [
        ...existing.map((i) => ({ ...i, _source: "existing" })),
        ...pendingUploadsAfter.map((file, idx) => ({
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
            await FirestoreService.recycleLogsBySiteId(id);
            showToast("ลบสถานที่สำเร็จ (ย้ายไปถังขยะ)", "success");
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
            "https://raw.githubusercontent.com/kongvut/thai-province-data/master/api/latest/province_with_district_and_sub_district.json",
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

// --- LINE Login with OIDC ---
// --- LINE Login with OIDC (Restricted) ---
async function handleLineLogin() {
    console.log("Starting LINE Login via OIDC...");

    // [NEW] Restriction Logic
    if (isMobile() && !isLineInAppBrowser()) {
        await showDialog(
            "การเข้าสู่ระบบด้วย LINE บนมือถือ\nรองรับเฉพาะการเปิดผ่านแอป LINE เท่านั้น\n\nกรุณากดเมนูและเลือก 'Login via LINE' บน Rich Menu\nหรือใช้งานผ่านคอมพิวเตอร์",
            { title: "Browser ไม่รองรับ" },
        );
        return;
    }

    const provider = new OAuthProvider("oidc.line");
    provider.addScope("openid");
    provider.addScope("profile");
    provider.addScope("email");

    try {
        // Use Popup for Desktop, Redirect for Mobile (better UX/compatibility)
        if (isMobile()) {
            await signInWithRedirect(auth, provider);
            // Logic pauses here as page redirects
        } else {
            const result = await signInWithPopup(auth, provider);
            // Result comes back immediately
            const user = result.user;
            console.log("LINE Login Success:", user);

            // --- RESTRICT NEW USERS (LINE Popup) ---
            const additionalInfo = getAdditionalUserInfo(result);
            if (additionalInfo && additionalInfo.isNewUser) {
                console.warn(
                    "New User Registration via LINE is NOT ALLOWED. Deleting user...",
                );
                await deleteUser(result.user);
                await signOut(auth);
                await showDialog(
                    "ไม่อนุญาตให้ลงทะเบียนบัญชีใหม่ด้วย LINE\n(กรุณาติดต่อผู้ดูแลระบบ)",
                    { title: "Access Denied" },
                );
                return; // Stop processing
            }
            // ----------------------------------------

            // The onAuthStateChanged will handle the UI switch
            await FirestoreService.logAction(
                "AUTH",
                "LOGIN",
                "User logged in via LINE (OIDC)",
            );
            showToast("เข้าสู่ระบบสำเร็จ!", "success");
        }
    } catch (error) {
        console.error("LINE Login Error:", error);
        await showDialog("การเข้าสู่ระบบผ่าน LINE ล้มเหลว: " + error.message);
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

        // Check if loginId is numeric (Phone Number)
        const cleanLoginId = loginId.replace(/\s/g, "");
        if (/^\d{9,10}$/.test(cleanLoginId)) {
            console.log("Phone login detected:", cleanLoginId);
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("phone", "==", cleanLoginId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0].data();
                if (userDoc.email) {
                    email = userDoc.email;
                    console.log("Found user email for phone:", email);
                } else {
                    console.warn("User found for phone but has no email in Firestore");
                }
            } else {
                console.log("No user found with phone:", cleanLoginId);
                // We let it fall through to Firebase Auth which will probably fail with invalid email
                // but that's the correct behavior for unlinked phones.
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

function setupMaDateAutoCalculation() {
    const mainForm = document.getElementById("form-add-site");
    if (!mainForm) return;

    const insStartInput = mainForm.querySelector(
        'input[name="insuranceStartDate"]',
    );
    const maCycleInput = mainForm.querySelector('input[name="maintenanceCycle"]');
    const firstMaDateInput = mainForm.querySelector('input[name="firstMaDate"]');

    if (!insStartInput || !maCycleInput || !firstMaDateInput) return;

    // Track if user manually set the first MA date
    let userModifiedMaDate = false;

    firstMaDateInput.addEventListener("input", () => {
        userModifiedMaDate = !!firstMaDateInput.value;
    });

    // Reset tracker when form is reset (we can plug this into resetSiteForm later, but catching empty is enough here)
    mainForm.addEventListener("reset", () => {
        userModifiedMaDate = false;
    });

    const calculateMaDate = () => {
        if (userModifiedMaDate && !!firstMaDateInput.value) return;

        const startVal = insStartInput.value;
        const cycleVal = parseInt(maCycleInput.value, 10);

        if (startVal && !isNaN(cycleVal) && cycleVal > 0) {
            const startDate = new Date(startVal);
            startDate.setDate(startDate.getDate() + cycleVal);

            // Format to YYYY-MM-DD
            const yyyy = startDate.getFullYear();
            const mm = String(startDate.getMonth() + 1).padStart(2, "0");
            const dd = String(startDate.getDate()).padStart(2, "0");

            firstMaDateInput.value = `${yyyy}-${mm}-${dd}`;
            userModifiedMaDate = false; // System filled it
        } else if (!userModifiedMaDate) {
            firstMaDateInput.value = ""; // clear if invalid/empty inputs
        }
    };

    insStartInput.addEventListener("change", calculateMaDate);
    insStartInput.addEventListener("input", calculateMaDate);
    maCycleInput.addEventListener("input", calculateMaDate);
    maCycleInput.addEventListener("change", calculateMaDate);
    maCycleInput.addEventListener("keyup", calculateMaDate);
}

function setupEventListeners() {
    // Brand Logo Redirect (Desktop & Mobile)
    const brandIcons = document.querySelectorAll(
        ".brand .logo-icon, .mobile-only-text",
    );
    brandIcons.forEach((el) => {
        el.style.cursor = "pointer";
        el.addEventListener("click", () => {
            console.log("Logo clicked, switching to admin view");
            switchView("admin-view");
        });
    });

    // ... existing listeners ...
    setupMaDateAutoCalculation();

    document.querySelectorAll(".nav-btn").forEach((btn) => {
        btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    const recycleBtn = document.getElementById("btn-view-recycle-bin");
    if (recycleBtn) {
        recycleBtn.addEventListener("click", () => {
            switchView("recycle-bin-view");
            renderRecycleBin();
        });
    }

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
        btn.addEventListener("click", (e) => {
            const modal = e.target.closest(".modal-overlay");
            modal.classList.add("hidden");
            modal.style.display = "none";
        });
    });

    // Close modal when clicking outside (on the overlay)
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
        overlay.addEventListener("click", (e) => {
            // DO NOT allow clicking outside to close mandatory modals
            if (
                overlay.id === "modal-force-password" ||
                overlay.id === "modal-referral-gate"
            )
                return;

            if (e.target === overlay) {
                overlay.classList.add("hidden");
                overlay.style.display = "none";
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
        await FirestoreService.emptyRecycleBin();
        await refreshData();
        await showDialog("All data cleared successfully.");
    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    }
};

async function runBackgroundMaBackfill() {
    if (!state.sites || state.sites.length === 0) return;

    let addedCount = 0;
    try {
        for (const site of state.sites) {
            if (!site.maintenanceCycle || !site.firstMaDate) continue;

            const maLogs = state.logs.filter(
                (l) =>
                    l.siteId === site.id &&
                    (isMaCategory(l.category) ||
                        l.category === "อื่นๆ" ||
                        (l.objective && l.objective.includes("รอบซ่อมบำรุง"))),
            );

            if (maLogs.length === 0) {
                const initialLogData = {
                    siteId: site.id,
                    date: site.firstMaDate,
                    category: "บำรุงรักษาตามรอบ",
                    status: "Open",
                    lineItems: [],
                    details: "-",
                    objective: `รอบซ่อมบำรุงครั้งแรก (${site.maintenanceCycle} วัน)`,
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

                await FirestoreService.addLog(initialLogData);
                addedCount++;
            } else {
                maLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
                const latestLog = maLogs[0];

                if (latestLog.status === "Completed" || latestLog.status === "Done") {
                    const hasOpen = maLogs.some(
                        (l) => l.status !== "Completed" && l.status !== "Done",
                    );
                    if (!hasOpen) {
                        const currentDate = new Date(latestLog.date);
                        if (!isNaN(currentDate.getTime())) {
                            currentDate.setDate(
                                currentDate.getDate() + site.maintenanceCycle,
                            );
                            const nextDateStr = currentDate.toISOString().split("T")[0];

                            // Check if next maintenance date is beyond insurance end date
                            if (site.insuranceEndDate) {
                                const insuranceEndDate = new Date(site.insuranceEndDate);
                                if (currentDate > insuranceEndDate) {
                                    console.log('[Bulk Import] Skipped site', site.name, '- next maintenance date is beyond insurance end date');
                                    continue;
                                }
                            }

                            const nextCycleNum = maLogs.length + 1;

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
                            await FirestoreService.addLog(nextLogData);
                            addedCount++;
                        }
                    }
                }
            }
        }

        if (addedCount > 0) {
            await refreshData();
            console.log(
                `Background MA Backfill: Successfully added ${addedCount} logs.`,
            );
        }
    } catch (e) {
        console.error("Background MA Backfill failed:", e);
    }
}

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
    updateDescriptionAttachmentPreview();

    // Clear pending uploads & deletions
    if (typeof pendingUploadsBefore !== "undefined") pendingUploadsBefore = [];
    if (typeof pendingUploadsAfter !== "undefined") pendingUploadsAfter = [];
    if (typeof pendingDeletions !== "undefined") pendingDeletions = [];

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
        // Set today's date as default
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    }

    // Reset line items — clear and add one blank row
    const lineContainer = document.getElementById("line-items-container");
    if (lineContainer) {
        lineContainer.innerHTML = "";
        addLineItemRow();
    }
    recalcLineItemTotal();
    populateResponderDropdown();
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
    select.innerHTML = '<option value="">-- เลือกผู้รับผิดชอบ --</option>';
    Object.entries(state.users).forEach(([uid, u]) => {
        const name = u.displayName || u.email || uid;
        select.innerHTML += `<option value="${uid}" ${uid === selectedId ? 'selected' : ''}>${name}</option>`;
    });
}

// Check if user has permission to edit/delete a case
async function checkEditPermission(logId, status, isDelete = false) {
    const log = state.logs.find((l) => l.id === logId);
    if (!log) return;

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

    // Update title with case ID in header
    const caseIdEl = document.getElementById('ma-form-case-id');
    const titleEl = document.getElementById('ma-form-title');
    
    if (caseIdEl && log.caseId) {
        caseIdEl.textContent = log.caseId;
    }
    if (titleEl) {
        titleEl.textContent = 'แก้ไขบันทึก';
    } else if (titleEl) {
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
    form.querySelector('input[name="date"]').value = log.date;
    const objectiveEl = form.querySelector('textarea[name="objective"]');
    if (objectiveEl) objectiveEl.value = log.objective || "";

    // Populate description from first comment if exists
    const descriptionTextarea = document.getElementById('log-description');
    if (descriptionTextarea && log.comments && log.comments.length > 0) {
        const firstComment = log.comments[0];
        descriptionTextarea.value = firstComment.text || "";
        
        // Restore description attachments from first comment
        if (firstComment.attachments && firstComment.attachments.length > 0) {
            // Store attachments for preview (we'll need to handle these specially)
            // Note: These are already uploaded, so we just show them in preview
            descriptionAttachments = firstComment.attachments.map(att => ({
                name: att.name,
                url: att.url,
                type: att.type,
                size: att.size,
                isExisting: true // Mark as existing so we don't re-upload
            }));
            updateDescriptionAttachmentPreview();
        }
    } else if (descriptionTextarea) {
        descriptionTextarea.value = "";
        descriptionAttachments = [];
        updateDescriptionAttachmentPreview();
    }

    // Populate new fields
    const categorySelect = form.querySelector('select[name="category"]');
    if (categorySelect) categorySelect.value = log.category || "บำรุงรักษาตามรอบ";

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

    form.querySelector('input[name="cost"]').value = formatCurrency(log.cost);
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
    ];
    inspKeys.forEach(key => checkRadios(key, log[key]));

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

async function quickUpdateStatus(logId, newStatus) {
    if (!newStatus) return;
    if (newStatus === 'Done') {
        openSignatureModal(logId, newStatus);
    } else {
        await executeStatusUpdate(logId, newStatus, null);
    }
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
}

// --- Calendar Logic ---
function resetFilters() {
    // 1. Reset Site Search Filter
    const siteInput = document.getElementById("site-filter-input");
    if (siteInput) siteInput.value = "";

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
                    Planning: { color: "#3b82f6", bg: "rgba(59,130,246,0.2)" },
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
                    Open: 'เปิดงาน', Planning: 'วางแผน', 'On Process': 'ดำเนินการ',
                    Done: 'เสร็จสิ้น', 'Case Closed': 'ปิดเคส', Cancel: 'ยกเลิก', Completed: 'เสร็จสิ้น'
                };
                const statusLabel = statusLabelsCalendar[log.status] || log.status || '-';

                badge.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-bottom:3px;">
                        <span style="font-size:0.7rem; font-weight:600; color:var(--text-color);">${site.siteCode || "-"}</span>
                        <span style="font-size:0.65rem; font-weight:600; color:${statusStyle.color}; background:${statusStyle.color}20; padding:1px 5px; border-radius:4px;">${statusLabel}</span>
                    </div>
                    <span style="white-space:normal; word-break:break-word; line-height:1.3; font-size:0.8rem; color:var(--text-color);">${siteName}</span>
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
                <th style="width: 12%; text-align: right;">ค่าใช้จ่าย</th>
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
        const logTime = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';

        const formattedCost = new Intl.NumberFormat('th-TH', {
            style: "currency",
            currency: "THB",
        }).format(log.cost).replace("฿", "").trim() + " บาท";

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
        let catColor = 'var(--text-muted)';
        let catBg = 'rgba(100,116,139,0.15)';
        
        if (isMaCategory(log.category)) {
            catIcon = '<i class="fa-solid fa-screwdriver-wrench" style="color: #111111; margin-right: 4px;"></i>';
            catColor = '#111111';
            catBg = 'rgba(0,0,0,0.08)';
        } else if (log.category === "ตามใบสั่งซื้อ") {
            catIcon = '<i class="fa-solid fa-cart-shopping" style="color: #111111; margin-right: 4px;"></i>';
            catColor = '#111111';
            catBg = 'rgba(0,0,0,0.08)';
        } else if (log.category === "Cleaning") {
            catIcon = '<i class="fa-solid fa-broom" style="color: var(--text-muted); margin-right: 4px;"></i>';
        } else if (log.category === "Installation") {
            catIcon = '<i class="fa-solid fa-plus-square" style="color: var(--text-muted); margin-right: 4px;"></i>';
        } else if (log.category === "Repair") {
            catIcon = '<i class="fa-solid fa-hammer" style="color: var(--text-muted); margin-right: 4px;"></i>';
        } else {
            catIcon = '<i class="fa-solid fa-wrench" style="color: var(--text-muted); margin-right: 4px;"></i>';
        }
        
        catBadge = `<span style="background:${catBg}; color:${catColor}; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:600; white-space:nowrap; display:inline-flex; align-items:center; gap:4px;">${catIcon}${log.category || "-"}</span>`;
        const catBadgeMobile = `<span style="background:${catBg}; color:${catColor}; padding:0.2rem 0.6rem; border-radius:6px; font-size:0.75rem; font-weight:700; white-space:nowrap;">${log.category || "-"}</span>`;

        // Render Status Badge
        const statusColors = {
            Open: { bg: "rgba(234,179,8,0.15)", color: "#ca8a04", label: "🟡 เปิดงาน" },
            Planning: {
                bg: "rgba(59,130,246,0.15)",
                color: "#3b82f6",
                label: "🔵 วางแผน",
            },
            "On Process": {
                bg: "rgba(249,115,22,0.15)",
                color: "#f97316",
                label: "🟠 กำลังดำเนินการ",
            },
            Cancel: {
                bg: "rgba(239,68,68,0.15)",
                color: "#ef4444",
                label: "🔴 ยกเลิก",
            },
            Done: { bg: "rgba(168,85,247,0.15)", color: "#a855f7", label: "🟣 เสร็จสิ้น" },
            "Case Closed": { bg: "rgba(34,197,94,0.15)", color: "#22c55e", label: "🟢 ปิดเคส" },
            Completed: {
                bg: "rgba(168,85,247,0.15)",
                color: "#a855f7",
                label: "🟣 เสร็จสิ้น",
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
            Open: 'เปิดงาน', Planning: 'วางแผน', 'On Process': 'ดำเนินการ',
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
            <td class="cell-site clickable-site" data-label="สถานที่" onclick="event.stopPropagation(); viewSiteLogs('${site.id}')" title="ดูประวัติทั้งหมดของสถานที่นี้" style="cursor: pointer; font-weight: 500;">
                <span class="value">${site.siteCode ? site.siteCode + ' - ' : ''}${site.name}</span>
            </td>
            <td class="cell-category" data-label="หมวดหมู่"><span class="value">${catBadge}</span></td>
            <td class="cell-status" data-label="สถานะ">${statusBadge}</td>
            <td class="cell-user" data-label="แก้ไขล่าสุด"><span class="value">${recorderName}</span></td>
            <td class="cell-cost" data-label="ค่าใช้จ่าย"><span class="value">${formattedCost}</span></td>
            <td class="cell-mobile-card mobile-only" data-label="">
                <div class="mc-top">
                    <span><span class="mc-caseid">${log.caseId || '-'}</span> <span class="mc-siteid">${site.siteCode || '-'}</span> <span class="mc-catbadge" style="color:${catColor}; background:${catBg};">${log.category || '-'}</span></span>
                    <span class="mc-cost">${formattedCost}</span>
                </div>
                <div class="mc-site">${site.name}</div>
                <div class="mc-detail">
                    <div><span class="mc-label">วันที่:</span> ${thaiDate}${logTime ? ` ${logTime}` : ''}</div>
                    <div><span class="mc-label">รายละเอียด:</span> ${calInitialDetail}</div>
                    <div><span class="mc-label">ผู้รับผิดชอบ:</span> ${calResponder}</div>
                </div>
                <div class="mc-footer">
                    <span class="mc-status-big">${mobileStatusBadge}</span>
                    <span class="mc-footer-actions">
                        <button class="mc-btn" onclick="event.stopPropagation(); viewLogDetails('${log.id}')" title="ดู">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="mc-btn" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}')" title="แก้ไข">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="mc-btn" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}', true)" title="ลบ">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </span>
                </div>
            </td>
            <td class="cell-actions" data-label="">
                <div class="actions-wrapper">
                    <button class="btn-icon action-edit" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}')" title="แก้ไข">
                        <i class="fa-solid fa-pen" style="font-size: 0.9rem;"></i>
                    </button>
                    <button class="btn-icon action-delete" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}', true)" title="ลบ">
                        <i class="fa-solid fa-trash" style="font-size: 0.9rem;"></i>
                    </button>
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
                <button type="button" id="btn-add-line-item" style="width: 100%; height: 100%; padding: 0.65rem 0.75rem; border-radius: 6px; background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.3); color: var(--primary-color); font-weight: 500; transition: all 0.2s; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer;">
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

                </div>
                 <div style="display: flex; gap: 0.5rem;">
                     ${site.locationUrl
                ? `
                     <a href="${site.locationUrl}" target="_blank" onclick="event.stopPropagation();" title="เปิด Google Maps"
                        class="card-btn-action card-btn-maps">
                         <i class="fa-solid fa-map-location-dot"></i>
                     </a>`
                : ""
            }
                     ${site.contactPhone
                ? `
                     <a href="tel:${site.contactPhone}" onclick="event.stopPropagation();" title="โทร ${site.contactPhone}"
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
        if (site.firstMaDate) {
            fmaEl.textContent = formatThaiDate(site.firstMaDate, {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        } else {
            fmaEl.textContent = "-";
        }
    }

    // Next MA Date
    const nextMaEl = document.getElementById("detail-next-ma");
    if (nextMaEl) {
        if (site.maintenanceCycle && site.firstMaDate) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            let nextMa = new Date(site.firstMaDate);

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

            // Format as YYYY-MM-DD string for formatThaiDate
            const yyyy = nextMa.getFullYear();
            const mm = String(nextMa.getMonth() + 1).padStart(2, '0');
            const dd = String(nextMa.getDate()).padStart(2, '0');
            const formattedDate = formatThaiDate(`${yyyy}-${mm}-${dd}`, { year: 'numeric', month: 'long', day: 'numeric' });
            const daysDiff = Math.ceil((nextMa - now) / (1000 * 60 * 60 * 24));
            const daysLabel =
                daysDiff <= 0
                    ? `เลยกำหนด ${Math.abs(daysDiff)} วัน`
                    : `อีก ${daysDiff} วัน`;

            nextMaEl.style.color = "";
            nextMaEl.innerHTML = `${formattedDate} <span style="color: var(--text-muted); font-size: 0.8rem;">(${daysLabel})</span>`;
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
        actionsContainer.style.position = "relative";
        actionsContainer.style.zIndex = "10";
        actionsContainer.innerHTML = `
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                ${site.locationUrl
                ? `
                <a href="${site.locationUrl}" target="_blank" class="card-btn-action card-btn-labeled card-btn-maps" title="เปิดใน Google Maps">
                    <i class="fa-solid fa-map-location-dot"></i> เส้นทาง
                </a>`
                : ""
            }
                ${site.contactPhone
                ? `
                <a href="tel:${site.contactPhone}" class="card-btn-action card-btn-labeled card-btn-call" title="โทร ${site.contactPhone}">
                    <i class="fa-solid fa-phone"></i> โทร
                </a>`
                : ""
            }
                <button class="card-btn-action card-btn-labeled card-btn-case"
                    onclick="viewSiteLogs('${site.id}');" title="ดูเคส">
                    <i class="fa-solid fa-clipboard-list"></i> ดูเคส
                </button>
                <button class="card-btn-action card-btn-labeled card-btn-edit"
                    onclick="editSite('${site.id}'); toggleModal('siteDetails', false);" title="แก้ไข">
                    <i class="fa-solid fa-pen"></i> แก้ไข
                </button>
                <button class="card-btn-action card-btn-labeled card-btn-delete"
                    onclick="deleteSite('${site.id}'); toggleModal('siteDetails', false);" title="ลบ">
                    <i class="fa-solid fa-trash"></i> ลบ
                </button>
            </div>
            <button type="button" class="btn-secondary close-modal-btn" onclick="toggleModal('siteDetails', false)">ปิด</button>
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

    if (!comments || comments.length === 0) {
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
            const systemLogBadge = c.isSystemLog ? `<span class="comment-badge-initial" style="background: rgba(100, 116, 139, 0.2); color: #94a3b8;"><i class="fa-solid fa-robot"></i> ระบบ</span>` : '';
            
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

function toggleCommentSection() {
    const content = document.getElementById("comment-collapsible");
    const icon = document.getElementById("comment-collapse-icon");
    if (!content) return;
    const isHidden = content.style.display === "none";
    content.style.display = isHidden ? "" : "none";
    if (icon) icon.style.transform = isHidden ? "" : "rotate(180deg)";
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

    // Enforce numeric-only on electrical fields
    document.querySelectorAll('input[name^="voltageL"], input[name^="currentL"], input[name="leakPressure"]').forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
        });
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
        { value: 'Planning', label: 'วางแผน', icon: 'fa-clipboard-list' },
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
    if (nameInput) nameInput.value = "";
    if (telInput) telInput.value = "";
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
    // Create white background JPG
    const canvas = document.getElementById("signature-canvas");
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);
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
    if (!isProfileMode) {
        signerName = (document.getElementById("signature-name")?.value || '').trim();
        signerTel = (document.getElementById("signature-tel")?.value || '').trim();
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
    await executeStatusUpdate(pending.logId, pending.newStatus, signatureData, signerName, signerTel);
}

window.openSignatureModal = openSignatureModal;
window.closeSignatureModal = closeSignatureModal;
window.clearSignatureCanvas = clearSignatureCanvas;
window.confirmSignature = confirmSignature;

async function updateLogStatus(logId, newStatus) {
    // Only require signature when changing to "Done"
    if (newStatus === 'Done') {
        openSignatureModal(logId, newStatus);
    } else {
        await executeStatusUpdate(logId, newStatus, null);
    }
}

async function executeStatusUpdate(logId, newStatus, signatureData, signerName = '', signerTel = '') {
    try {
        const log = state.logs.find(l => l.id === logId);
        if (!log) return;
        
        const oldStatus = log.status;
        
        // Initialize status history if it doesn't exist
        if (!log.statusHistory) {
            log.statusHistory = {};
        }
        
        // Define status order (excluding Cancel as it's a separate branch)
        const statusOrder = ['Open', 'Planning', 'On Process', 'Done', 'Case Closed'];
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
                signerTel: signerTel
            };
        }

        // Update in Firestore with status history and signature
        const updateData = { 
            status: newStatus,
            statusHistory: log.statusHistory
        };
        if (signatureData) {
            updateData.statusSignatures = log.statusSignatures;
        }
        await FirestoreService.updateLog(logId, updateData);
        
        log.status = newStatus;
        renderStatusTimeline(newStatus, logId, log.statusHistory);
        
        // Add change log comment for status change
        const statusLabels = {
            'Open': 'เปิดงาน',
            'Planning': 'วางแผน',
            'On Process': 'กำลังดำเนินการ',
            'Done': 'เสร็จสิ้น',
            'Case Closed': 'ปิดเคส',
            'Cancel': 'ยกเลิก'
        };
        
        const user = auth.currentUser;
        if (user && oldStatus !== newStatus) {
            const oldStatusLabel = statusLabels[oldStatus] || oldStatus;
            const newStatusLabel = statusLabels[newStatus] || newStatus;
            
            const changeLogComment = {
                text: `• สถานะ: ${oldStatusLabel} → ${newStatusLabel}`,
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
        
        // Auto-create replacement case if newly cancelled
        if (oldStatus !== 'Cancel' && newStatus === 'Cancel') {
            const site = state.sites.find((s) => s.id === log.siteId);
            if (site && site.maintenanceCycle && site.maintenanceCycle > 0) {
                // Check if there's already an active maintenance case for this site
                const hasActiveMaintenance = state.logs.some((l) => 
                    l.siteId === site.id && 
                    l.id !== logId && // Exclude current log
                    (isMaCategory(l.category)) &&
                    l.status !== "Cancel" && 
                    l.status !== "Done" && 
                    l.status !== "Completed" &&
                    l.status !== "Case Closed"
                );
                
                if (!hasActiveMaintenance) {
                    const currentDate = new Date(log.date);
                    if (!isNaN(currentDate.getTime())) {
                        currentDate.setDate(currentDate.getDate() + site.maintenanceCycle);
                        const nextDateStr = currentDate.toISOString().split("T")[0];

                        // Check if next maintenance date is beyond insurance end date
                        if (site.insuranceEndDate) {
                            const insuranceEndDate = new Date(site.insuranceEndDate);
                            if (currentDate > insuranceEndDate) {
                                console.log('[Auto-generate] Skipped - next maintenance date is beyond insurance end date');
                                return;
                            }
                        }

                        const siteMaLogs = state.logs.filter(
                            (l) => l.siteId === site.id && (isMaCategory(l.category) || l.objective?.includes("รอบซ่อมบำรุง"))
                        );
                        const nextCycleNum = siteMaLogs.length + 1;

                        const nextLogData = {
                            siteId: site.id,
                            date: nextDateStr,
                            category: log.category || "บำรุงรักษาตามรอบ",
                            status: "Open",
                            lineItems: [],
                            details: "-",
                            objective: log.objective || `รอบซ่อมบำรุงตามกำหนด (${site.maintenanceCycle} วัน)`,
                            cost: 0,
                            attachments: [],
                            attachmentsBefore: [],
                            attachmentsAfter: [],
                            recordedBy: "System",
                            timestamp: new Date().toISOString(),
                            comments: [{
                                text: `สร้างอัตโนมัติจากเคสที่ถูกยกเลิก (${log.caseId || 'N/A'}) - รอบที่ ${nextCycleNum}`,
                                author: "System",
                                authorId: "system",
                                photoURL: "",
                                timestamp: new Date().toISOString(),
                                attachments: []
                            }]
                        };
                        try {
                            await FirestoreService.addLog(nextLogData);
                            await refreshData();
                            renderCurrentView();
                            console.log('[Auto-generate] Created replacement case for cancelled case with cycle date');
                            showToast("สร้างเคสใหม่อัตโนมัติแล้ว", "info");
                        } catch (err) {
                            console.error("Failed to add replacement case:", err);
                        }
                    }
                } else {
                    console.log('[Auto-generate] Skipped - site already has active maintenance case');
                }
            }
        }
        
        // Auto-create next cycle if Maintenance & newly case closed
        if (
            (oldStatus !== 'Case Closed') &&
            (newStatus === 'Case Closed') &&
            (isMaCategory(log.category))
        ) {
            const site = state.sites.find((s) => s.id === log.siteId);
            if (site && site.maintenanceCycle && site.maintenanceCycle > 0) {
                // Check if there's already an active maintenance case for this site
                const hasActiveMaintenance = state.logs.some((l) => 
                    l.siteId === site.id && 
                    l.id !== logId && // Exclude current log
                    (isMaCategory(l.category)) &&
                    l.status !== "Cancel" && 
                    l.status !== "Done" && 
                    l.status !== "Completed" &&
                    l.status !== "Case Closed"
                );
                
                if (!hasActiveMaintenance) {
                    const currentDate = new Date(log.date);
                    if (!isNaN(currentDate.getTime())) {
                        currentDate.setDate(currentDate.getDate() + site.maintenanceCycle);
                        const nextDateStr = currentDate.toISOString().split("T")[0];

                        // Check if next maintenance date is beyond insurance end date
                        if (site.insuranceEndDate) {
                            const insuranceEndDate = new Date(site.insuranceEndDate);
                            if (currentDate > insuranceEndDate) {
                                console.log('[Auto-generate] Skipped - next maintenance date is beyond insurance end date');
                                return;
                            }
                        }

                    const siteMaLogs = state.logs.filter(
                        (l) => l.siteId === site.id && (isMaCategory(l.category) || l.objective?.includes("รอบซ่อมบำรุง"))
                    );
                    const nextCycleNum = siteMaLogs.length + 1;

                        const nextLogData = {
                            siteId: site.id,
                            date: nextDateStr,
                            category: log.category || "บำรุงรักษาตามรอบ",
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
                            await refreshData();
                            renderCurrentView();
                            console.log('[Auto-generate] Created next maintenance cycle for completed case');
                        } catch (cycleErr) {
                            console.error("Failed to add next MA cycle log:", cycleErr);
                        }
                    }
                } else {
                    console.log('[Auto-generate] Skipped - site already has active maintenance case');
                }
            }
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
    const log = state.logs.find((l) => l.id === id);
    if (!log) return;

    // Refresh users data to ensure we have latest profile info for comments
    FirestoreService.fetchUsers().then((users) => {
        state.users = users;
        console.log('[viewLogDetails] Refreshed users data:', Object.keys(users).length, 'users');
        // Re-render comments with updated user data
        renderLogComments(log.id, log.comments || []);
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

    const thaiDate = formatDateDDMMYYYY(log.date);

    const timestampStr = log.timestamp
        ? new Date(log.timestamp).toLocaleString(undefined)
        : "-";

    // Populate Modal
    const caseIdEl = document.getElementById("detail-log-case-id");
    if (caseIdEl) {
        caseIdEl.textContent = log.caseId || "-";
    }

    // Header: case ID + site info
    const headerCaseIdEl = document.getElementById("detail-log-header-case-id");
    if (headerCaseIdEl) {
        headerCaseIdEl.textContent = log.caseId || "";
    }
    const headerSiteEl = document.getElementById("detail-log-header-site");
    if (headerSiteEl) {
        headerSiteEl.textContent = thaiDate;
    }
    
    // Title with site name (clickable to open device detail)
    const dateEl = document.getElementById("detail-log-date");
    if (dateEl) {
        const siteCode = site.siteCode ? `${site.siteCode} · ` : "";
        dateEl.textContent = `${siteCode}${site.name}`;
        dateEl.style.cursor = "pointer";
        dateEl.style.textDecoration = "underline";
        dateEl.style.textDecorationColor = "rgba(0,0,0,0.2)";
        dateEl.style.textUnderlineOffset = "3px";
        dateEl.onclick = () => {
            viewSiteDetails(site.id);
        };
    }
    
    // Date field (if exists)
    const dateFieldEl = document.getElementById("detail-log-date-field");
    if (dateFieldEl) {
        dateFieldEl.textContent = thaiDate;
    }
    
    const siteEl = document.getElementById("detail-log-site");
    if (siteEl) {
        siteEl.textContent = site.name;
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

    const installLocEl = document.getElementById("detail-log-install-location");
    if (installLocEl) installLocEl.textContent = site.villageName || "-";
    
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
        log.lineItems && log.lineItems.length > 0
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
        if (log.lineItems && log.lineItems.length > 0) {
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

    // Electrical & Physical Inspection
    const inspSection = document.getElementById("detail-inspection-section");
    const inspContent = document.getElementById("detail-inspection-content");
    if (inspSection && inspContent) {
        const inspItems = [
            ['insp_exteriorCleaning', 'ความสะอาดภายนอก'],
            ['insp_interiorCleaning', 'ความสะอาดภายใน'],
            ['insp_doorSystem', 'การทำงานระบบประตู'],
            ['insp_footSwitch', 'การทำงาน Foot Switch'],
            ['insp_sensor', 'ระบบ Sensor'],
            ['insp_tempPoints', 'อุณหภูมิจุดที่ 1-4'],
            ['insp_workingPressure', 'ความดันขณะทำงาน'],
            ['insp_rfGenerator', 'RF Generator'],
            ['insp_chemicalAmount', 'ปริมาณน้ำยาที่ฉีด'],
            ['insp_airChargingValue', 'Air Charging Value'],
            ['insp_filter', 'Filter'],
            ['insp_decomposer', 'Decomposer'],
            ['insp_vacuumPumpOil', 'น้ำมันปั๊มสุญญากาศ'],
            ['insp_connectors', 'ระบบข้อต่อต่างๆ'],
            ['insp_drainTank', 'ถังเดรนน้ำ'],
            ['insp_gasDoor', 'ปริมาณแก๊สหน้าประตู'],
            ['insp_gas1m', 'ปริมาณแก๊สห่าง 1 ม.'],
            ['insp_gas2m', 'ปริมาณแก๊สห่าง 2 ม.'],
        ];

        inspSection.style.display = "block";

        const row = (label, value) => `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.85rem; color:#333;">${label}</span><span style="font-size:0.85rem; font-weight:500; color:#111;">${value}</span></div>`;

        const pillBadge = (val, passLabel = 'ผ่าน', failLabel = 'ไม่ผ่าน') => {
            if (!val) return `<span style="color:#ccc;">-</span>`;
            const isPass = val === 'pass';
            const bg = isPass ? '#22c55e' : '#ef4444';
            const text = isPass ? passLabel : failLabel;
            return `<span style="background:${bg}; color:#fff; padding:2px 10px; border-radius:4px; font-size:0.8rem; font-weight:500;">${text}</span>`;
        };

        const inspBadge = (val) => {
            if (!val) return `<span style="color:#ccc;">-</span>`;
            const config = { check: { label: 'Check', bg: '#22c55e' }, service: { label: 'Service', bg: '#f59e0b' }, replace: { label: 'Replace', bg: '#ef4444' } };
            const c = config[val] || { label: val, bg: '#111' };
            return `<span style="background:${c.bg}; color:#fff; padding:2px 10px; border-radius:4px; font-size:0.8rem; font-weight:500;">${c.label}</span>`;
        };

        let html = '';

        // Cycle Count
        html += row('จำนวนรอบขณะเช็ค (Cycle Count)', log.cycleCount ? `${log.cycleCount} รอบ` : '-');

        // Electrical section header
        html += `<div style="margin:0.75rem 0 0.25rem; font-weight:600; font-size:0.9rem; color:var(--text-muted); display:flex; align-items:center; gap:0.5rem;"><i class="fa-solid fa-bolt" style="color:#eab308;"></i> ข้อมูลไฟฟ้า (Electrical)</div>`;
        html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:0 1.5rem;">`;
        html += row('แรงดัน R (V)', log.voltageL1 || '-');
        html += row('แรงดัน S (V)', log.voltageL2 || '-');
        html += row('แรงดัน T (V)', log.voltageL3 || '-');
        html += row('กระแส R (A)', log.currentL1 || '-');
        html += row('กระแส S (A)', log.currentL2 || '-');
        html += row('กระแส T (A)', log.currentL3 || '-');
        html += `</div>`;

        // Physical Inspection
        html += `<div style="margin:0.75rem 0 0.25rem; font-weight:600; font-size:0.9rem; color:var(--text-muted); display:flex; align-items:center; gap:0.5rem;"><i class="fa-solid fa-clipboard-check"></i> ตรวจสอบทางกายภาพ (Physical Inspection)</div>`;
        html += `<div style="display:flex; flex-direction:column;">`;
        html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.85rem; color:#333; flex:1;">อุณหภูมิเฉลี่ยในการทำงาน</span><span style="font-size:0.85rem; margin-right:0.75rem;">${log.avgWorkTemp ? log.avgWorkTemp + ' °C' : '-'}</span>${pillBadge(log.avgWorkTempCheck)}</div>`;
        html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.85rem; color:#333; flex:1;">อุณหภูมิเฉลี่ยพื้นที่</span><span style="font-size:0.85rem; margin-right:0.75rem;">${log.avgAreaTemp ? log.avgAreaTemp + ' °C' : '-'}</span>${pillBadge(log.avgAreaTempCheck)}</div>`;
        html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.85rem; color:#333; flex:1;">ตรวจสอบการรั่วไหล</span><span style="font-size:0.85rem; margin-right:0.75rem;">${log.leakPressure ? log.leakPressure + ' PSI' : '-'}</span>${pillBadge(log.leakCheck)}</div>`;
        html += `</div>`;

        // Performance
        html += `<div style="margin:0.75rem 0 0.25rem; font-weight:600; font-size:0.9rem; color:var(--text-muted); display:flex; align-items:center; gap:0.5rem;"><i class="fa-solid fa-gauge-high"></i> ประสิทธิภาพการทำงาน (Performance)</div>`;
        html += `<div style="display:flex; flex-direction:column;">`;
        html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.85rem; color:#333;">Comply Type 5</span>${pillBadge(log.complyType5)}</div>`;
        html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.85rem; color:#333;">CI PCD Type 5</span>${pillBadge(log.ciPcdType5)}</div>`;
        html += `</div>`;

        // Inspection Checklist
        html += `<div style="margin:0.75rem 0 0.25rem; font-weight:600; font-size:0.9rem; color:var(--text-muted); display:flex; align-items:center; gap:0.5rem;"><i class="fa-solid fa-magnifying-glass-chart"></i> รายการตรวจสอบ (Inspection Checklist)</div>`;
        html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:0 1.5rem;">`;
        inspItems.forEach(([key, label]) => {
            html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:0.85rem; color:#333;">${label}</span>${inspBadge(log[key])}</div>`;
        });
        html += `</div>`;

        inspContent.innerHTML = html;
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

    // Inject Action Buttons - Move to record footer
    const actionsContainer = document.getElementById("log-detail-modal-actions");
    if (actionsContainer) {
        actionsContainer.innerHTML = ``;
    }
    
    // Check if user can edit (admin can always edit, regular users can't edit closed cases)
    const user = auth.currentUser;
    let canEdit = true;
    
    if (log.status === 'Case Closed' && user) {
        // For closed cases, check if user is admin
        FirestoreService.getUser(user.uid).then(userDoc => {
            const isAdmin = userDoc?.role === 'admin';
            if (!isAdmin) {
                // Hide edit button for non-admin users
                const editBtn = document.querySelector('.modal-record-footer .btn-icon[title="แก้ไข"]');
                if (editBtn) editBtn.style.display = 'none';
            }
        });
    }
    
    // Add action buttons to the record footer
    const recordFooter = document.querySelector('.modal-record-footer');
    if (recordFooter) {
        // Update the footer to include action buttons on the left
        recordFooter.innerHTML = `
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn-icon" onclick="exportCasePDF('${log.id}')" title="ส่งออก PDF" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 0.4rem 0.75rem; font-size: 0.85rem;">
                    <i class="fa-solid fa-file-pdf"></i> <span>PDF</span>
                </button>
                <button class="btn-icon" onclick="checkEditPermission('${log.id}', '${log.status}')" title="แก้ไข" style="background: rgba(56, 189, 248, 0.1); color: var(--primary-color); padding: 0.4rem 0.75rem; font-size: 0.85rem;">
                    <i class="fa-solid fa-pen"></i> <span>แก้ไข</span>
                </button>
            </div>
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

    toggleModal("logDetails", true);
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

    // 1. Site/Case ID/Description Search Filter (combined)
    if (filters.siteSearchQuery) {
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

            return (
                siteName.includes(q) ||
                siteCode.includes(q) ||
                caseId.includes(q) ||
                objective.includes(q) ||
                details.includes(q) ||
                firstComment.includes(q)
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

        return {
            "รหัสสถานที่": site.siteCode || "-",
            "ชื่อสถานที่": site.name || "-",
            "สถานที่ติดตั้ง": site.installLocation || site.villageName || "-",
            "หมู่ที่": site.moo || "-",
            "ตำบล": site.subdistrict || "-",
            "อำเภอ": site.district || "-",
            "จังหวัด": site.province || "-",
            "รหัสไปรษณีย์": site.zipcode || "-",
            "ที่อยู่เต็ม": address || "-",
            "เบอร์โทรศัพท์": site.contactPhone || "-",
            "ลิงก์ Google Maps": site.locationUrl || "-",
            "รอบ MA (วัน)": site.maintenanceCycle || "-",
            "วันเริ่มประกัน": startDate,
            "วันหมดประกัน": endDate,
            "วันเข้า MA ครั้งแรก": firstMaDate,
            "จำนวนบันทึก": logCount,
            "รายละเอียด": site.description || "-",
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

    const site = state.sites.find(s => s.id === log.siteId) || { name: '-' };
    const thaiDate = formatDateDDMMYYYY(log.date);
    const recorderName = log.updatedBy || (state.users && log.recorderId && state.users[log.recorderId]
        ? state.users[log.recorderId].displayName || state.users[log.recorderId].email || log.recordedBy
        : log.recordedBy || '-');
    const timestampStr = log.timestamp ? new Date(log.timestamp).toLocaleString('th-TH') : '-';

    // Get responder info (from user profile)
    const responderUser = log.responderId && state.users ? state.users[log.responderId] : null;
    const responderName = responderUser ? (responderUser.displayName || responderUser.email || '-') : '-';
    const responderSignature = responderUser?.signature || '';

    // Get Done signature (customer's drawn signature)
    let doneSignature = '';
    let doneName = '-';
    let customerTel = '-';
    if (log.statusSignatures && log.statusSignatures['Done']) {
        const sig = log.statusSignatures['Done'];
        doneSignature = sig.data || '';
        doneName = sig.signerName || sig.signedBy || '-';
        customerTel = sig.signerTel || '-';
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
        'Open': 'เปิดงาน', 'Planning': 'วางแผน', 'On Process': 'กำลังดำเนินการ',
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
        { value: 'Planning', label: 'วางแผน', icon: '●', color: '#3b82f6' },
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
            const ts = hasTimestamp ? new Date(log.statusHistory[s.value]).toLocaleString('th-TH', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-';
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
                <div style="font-size:11px; font-weight:${isActive ? '700' : '500'}; color:${textColor};">${s.label}</div>
                <div style="font-size:9px; color:${hasTimestamp ? '#333' : '#ccc'}; margin-top:3px;">${ts}</div>
            </div>`;
        }).join('');
    }

    // Build 3-column signature section
    const sigBoxStyle = 'flex:1; text-align:center; padding:12px 8px; min-width:0;';
    const sigImgStyle = 'max-width:180px; height:60px; object-fit:contain;';
    const sigLineStyle = 'border-top:1px solid #333; width:80%; margin:8px auto 4px;';
    const sigNameStyle = 'font-size:11px; font-weight:600;';
    const sigRoleStyle = 'font-size:10px; color:#333;';

    const buildSigBox = (signature, thaiLabel, engLabel, name = '') => {
        const imgHtml = signature
            ? `<img src="${signature}" style="${sigImgStyle}">`
            : `<div style="height:60px;"></div>`;
        const nameHtml = name ? `<div style="font-size:10px; color:#333; margin-top:2px;">${name}</div>` : '';
        return `<div style="${sigBoxStyle}">
            ${imgHtml}
            <div style="${sigLineStyle}"></div>
            ${nameHtml}
            <div style="font-size:12px; font-weight:700; margin-top:4px;">${thaiLabel}</div>
            <div style="font-size:9px; color:#333;">${engLabel}</div>
        </div>`;
    };

    const signatureHtml = `<div style="display:flex; gap:16px; margin-top:8px;">
        ${buildSigBox(responderSignature, 'ผู้รับผิดชอบ', 'Case Responder')}
        ${buildSigBox(doneSignature, 'ลูกค้า', 'Customer Authorized PIC')}
        ${buildSigBox(closerSignature, 'ผู้ปิดเคส', 'Case Closer')}
    </div>`;

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

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${log.caseId || 'MA Case'}</title>
<style>
    @page { size: A4 portrait; margin: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    body { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; font-size: 13px; color: #333; margin: 0; padding: 10mm 12mm; box-sizing: border-box; min-height: 100vh; display: flex; flex-direction: column; }
    .page-content { flex: 1; }
    .page-header { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; }
    .page-header img { height: 70px; width: auto; }
    .page-header .company-info { flex: 1; text-align: right; font-size: 11px; color: #333; line-height: 1.6; }
    .header-line { margin-bottom: 16px; position: relative; height: 2px; background: #ddd !important; }
    .header-line::before { content: ''; position: absolute; top: 50%; left: 0; transform: translateY(-50%); width: 25%; height: 5px; background: #8bc53f !important; border-radius: 2px; }
    .header-dots { text-align: right; margin-top: -2px; margin-bottom: 4px; }
    .header-dots span { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-left: 4px; }
    h2 { font-size: 14px; color: #333; margin: 20px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .info-grid { display: grid; grid-template-columns: 120px 1fr 120px 1fr; gap: 4px 12px; margin-bottom: 12px; }
    .label { color: #333; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 6px 8px; background: #f5f5f5 !important; border-bottom: 2px solid #ddd; font-size: 12px; }
    .page-footer { margin-top: auto; padding-top: 0; }
    .page-footer .footer-line { position: relative; height: 2px; background: #ddd !important; }
    .page-footer .footer-line::before { content: ''; position: absolute; top: 50%; right: 0; transform: translateY(-50%); width: 25%; height: 5px; background: #8bc53f !important; border-radius: 2px; }
    .page-footer .footer-text { text-align: center; font-size: 10px; color: #333; padding: 6px 0; }
</style>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
</head><body>

<div class="page-header">
    <img src="/bioinnotechgreenworld.svg" alt="Logo">
    <div class="company-info">
        <b>บริษัท ไบโอ อินโน เทค กรีน เวิลด์ จำกัด</b><br>
        36/6 หมู่ 13 ต.บึงคำพร้อย อ.ลำลูกกา จ.ปทุมธานี 12150<br>
        โทรศัพท์ 02-148-7366 เลขประจำตัวผู้เสียภาษี 0135563005631
        <div class="header-dots">
            <span style="background: #c5e1a5;"></span>
            <span style="background: #81c784;"></span>
            <span style="background: #4caf50;"></span>
        </div>
    </div>
</div>
<div class="header-line"></div>

<div class="page-content">
<h1 style="text-align:center; font-size:18px; margin:0 0 4px; color:#333;">ใบรายงานการซ่อมบำรุง</h1>

<h2 style="margin-top:8px;">ข้อมูลทั่วไป</h2>
<div class="info-grid">
    <span class="label">รหัสเคส:</span><span>${log.caseId || '-'}</span>
    <span class="label">สถานที่:</span><span>${site.name}</span>
    <span class="label">วันที่:</span><span>${thaiDate}</span>
    <span class="label">หมวดหมู่:</span><span>${log.category || '-'}</span>
    <span class="label">สถานะ:</span><span>${statusText}</span>
    <span class="label">ค่าใช้จ่ายรวม:</span><span style="font-weight:bold;">${fmtCost(totalCost)} บาท</span>
    <span class="label">ผู้รับผิดชอบ:</span><span>${responderName}</span>
    <span class="label">แก้ไขล่าสุด:</span><span>${recorderName}</span>
    <span class="label">บันทึกเมื่อ:</span><span>${timestampStr}</span>
    <span class="label">ระยะเวลาประกัน:</span><span>${site.insuranceStartDate || '-'} ถึง ${site.insuranceEndDate || '-'}</span>
    <span class="label">รอบซ่อมบำรุง (วัน):</span><span>${site.maintenanceCycle || '-'}</span>
</div>

<h2>รายละเอียดเริ่มต้น</h2>
<div style="padding:10px; background:#f9f9f9; border-radius:6px; white-space:pre-wrap;">${initialDetail}</div>
${initialAttachmentsHtml ? `<div style="margin-top:8px;">${initialAttachmentsHtml}</div>` : ''}

${lineItemsHtml ? `
<h2>รายการค่าใช้จ่าย</h2>
<table>
    <thead><tr><th style="width:40px;">#</th><th>รายการ</th><th style="text-align:right; width:120px;">ราคา (บาท)</th></tr></thead>
    <tbody>${lineItemsHtml}
        <tr style="font-weight:bold; border-top:2px solid #333;">
            <td colspan="2" style="padding:8px; text-align:right;">รวมทั้งหมด</td>
            <td style="padding:8px; text-align:right;">${fmtCost(totalCost)}</td>
        </tr>
    </tbody>
</table>` : `
<h2>รายการค่าใช้จ่าย</h2>
<div style="padding:10px; color:#333;">ไม่มีรายการค่าใช้จ่าย</div>`}

${statusTimelineHtml ? `
<h2>ประวัติการเปลี่ยนสถานะ</h2>
<div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px; padding:12px 0;">${statusTimelineHtml}</div>` : ''}

<h2>ข้อมูลลูกค้า</h2>
<div style="display:grid; grid-template-columns:120px 1fr; gap:4px 12px;">
    <span class="label">ชื่อผู้รับมอบงาน:</span><span>${doneName}</span>
    <span class="label">เบอร์โทร:</span><span>${customerTel}</span>
</div>

</div>

<div class="page-footer">
    <h2 style="margin-top:0;">ลายเซ็น</h2>
    ${signatureHtml}
    <div style="display:flex; align-items:center; gap:10px; margin-top:16px; margin-bottom:10px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`https://water-plant-maintenance.web.app?logId=${log.id}`)}" alt="QR Code" style="width:50px; height:50px;">
        <div>
            <div style="font-size:11px; font-weight:700; color:#333;">สแกนเพื่อดูรายละเอียดเคสฉบับเต็ม</div>
            <div style="font-size:9px; color:#333;">Scan to view full case detail — For staff only</div>
        </div>
    </div>
    <div class="footer-line"></div>
    <div class="footer-text">บริษัท ไบโอ อินโน เทค กรีน เวิลด์ จำกัด</div>
</div>

</body></html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    // Wait for fonts and images to load
    printWindow.onload = () => {
        setTimeout(() => { printWindow.print(); }, 500);
    };
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
            Planning: "วางแผน",
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
            Planning: "วางแผน",
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
        .catch((err) =>
            console.error("Error fetching global filtered stats:", err),
        );

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

    // Header
    table.innerHTML = `
        <thead>
            <tr>
                <th style="width: 5%;" class="desktop-only">ที่</th>
                <th style="width: 1%; white-space: nowrap;">รหัสเคส</th>
                <th style="width: 1%; white-space: nowrap;">วันที่</th>
                <th style="width: 30%;">สถานที่</th>
                <th style="width: 12%;">หมวดหมู่</th>
                <th style="width: 10%;">สถานะ</th>

                <th style="width: 12%;">แก้ไขล่าสุด</th>
                <th style="width: 12%; text-align: right;">ค่าใช้จ่าย</th>
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
        const logTime = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';
        const formattedCost = new Intl.NumberFormat('th-TH', {
            style: "currency",
            currency: "THB",
        }).format(log.cost).replace("฿", "").trim() + " บาท";
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
        let catColor = 'var(--text-muted)';
        let catBg = 'rgba(100,116,139,0.15)';
        
        if (isMaCategory(log.category)) {
            catIcon = '<i class="fa-solid fa-screwdriver-wrench" style="color: #111111; margin-right: 4px;"></i>';
            catColor = '#111111';
            catBg = 'rgba(0,0,0,0.08)';
        } else if (log.category === "ตามใบสั่งซื้อ") {
            catIcon = '<i class="fa-solid fa-cart-shopping" style="color: #111111; margin-right: 4px;"></i>';
            catColor = '#111111';
            catBg = 'rgba(0,0,0,0.08)';
        } else if (log.category === "Cleaning") {
            catIcon = '<i class="fa-solid fa-broom" style="color: var(--text-muted); margin-right: 4px;"></i>';
        } else if (log.category === "Installation") {
            catIcon = '<i class="fa-solid fa-plus-square" style="color: var(--text-muted); margin-right: 4px;"></i>';
        } else if (log.category === "Repair") {
            catIcon = '<i class="fa-solid fa-hammer" style="color: var(--text-muted); margin-right: 4px;"></i>';
        } else {
            catIcon = '<i class="fa-solid fa-wrench" style="color: var(--text-muted); margin-right: 4px;"></i>';
        }
        
        catBadge = `<span style="background:${catBg}; color:${catColor}; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:600; white-space:nowrap; display:inline-flex; align-items:center; gap:4px;">${catIcon}${log.category || "-"}</span>`;
        const catBadgeMobile = `<span style="background:${catBg}; color:${catColor}; padding:0.2rem 0.6rem; border-radius:6px; font-size:0.75rem; font-weight:700; white-space:nowrap;">${log.category || "-"}</span>`;

        // Render Status Badge
        const statusColors = {
            Open: { bg: "rgba(234,179,8,0.15)", color: "#ca8a04", label: "🟡 เปิดงาน" },
            Planning: {
                bg: "rgba(59,130,246,0.15)",
                color: "#3b82f6",
                label: "🔵 วางแผน",
            },
            "On Process": {
                bg: "rgba(249,115,22,0.15)",
                color: "#f97316",
                label: "🟠 กำลังดำเนินการ",
            },
            Cancel: {
                bg: "rgba(239,68,68,0.15)",
                color: "#ef4444",
                label: "🔴 ยกเลิก",
            },
            Done: { bg: "rgba(168,85,247,0.15)", color: "#a855f7", label: "🟣 เสร็จสิ้น" },
            "Case Closed": { bg: "rgba(34,197,94,0.15)", color: "#22c55e", label: "🟢 ปิดเคส" },
            Completed: {
                bg: "rgba(168,85,247,0.15)",
                color: "#a855f7",
                label: "🟣 เสร็จสิ้น",
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
            Open: 'เปิดงาน', Planning: 'วางแผน', 'On Process': 'ดำเนินการ',
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
            <td class="cell-site clickable-site" data-label="สถานที่" onclick="event.stopPropagation(); viewSiteLogs('${site.id}')" title="ดูประวัติทั้งหมดของสถานที่นี้" style="cursor: pointer; font-weight: 500;">
                <span class="value">${site.siteCode ? site.siteCode + ' - ' : ''}${site.name}</span>
                ${log.attachments && log.attachments.length > 0 ? '<i class="fa-solid fa-paperclip desktop-only" style="color: var(--text-muted); font-size: 0.8rem; margin-left: 4px;" title="มีไฟล์แนบ"></i>' : ""}
                ${initialDetail}
            </td>
            <td class="cell-category" data-label="หมวดหมู่"><span class="value">${catBadge}</span></td>
            <td class="cell-status" data-label="สถานะ">${statusBadge}</td>
            <td class="cell-user" data-label="แก้ไขล่าสุด"><span class="value">${recorderName}</span></td>
            <td class="cell-cost" data-label="ค่าใช้จ่าย"><span class="value">${formattedCost}</span></td>
            <td class="cell-mobile-card mobile-only" data-label="">
                <div class="mc-top">
                    <span><span class="mc-caseid">${log.caseId || '-'}</span> <span class="mc-siteid">${site.siteCode || '-'}</span> <span class="mc-catbadge" style="color:${catColor}; background:${catBg};">${log.category || '-'}</span></span>
                    <span class="mc-cost">${formattedCost}</span>
                </div>
                <div class="mc-site">${site.name}</div>
                <div class="mc-detail">
                    <div><span class="mc-label">วันที่:</span> ${thaiDate}${logTime ? ` ${logTime}` : ''}</div>
                    <div><span class="mc-label">รายละเอียด:</span> ${log.comments && log.comments.length > 0 && log.comments[0].text ? (log.comments[0].text.length > 60 ? log.comments[0].text.substring(0, 60) + '...' : log.comments[0].text) : (log.objective || '-')}</div>
                    <div><span class="mc-label">ผู้รับผิดชอบ:</span> ${log.responderId && state.users && state.users[log.responderId] ? (state.users[log.responderId].displayName || state.users[log.responderId].email) : '-'}</div>
                </div>
                <div class="mc-footer">
                    <span class="mc-status-big">${mobileStatusBadge}</span>
                    <span class="mc-footer-actions">
                        <button class="mc-btn" onclick="event.stopPropagation(); viewLogDetails('${log.id}')" title="ดู">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="mc-btn" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}')" title="แก้ไข">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="mc-btn" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}', true)" title="ลบ">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </span>
                </div>
            </td>
            <td class="cell-actions" data-label="">
                <div class="actions-wrapper">
                    <button class="btn-icon action-edit" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}')" title="แก้ไข">
                        <i class="fa-solid fa-pen" style="font-size: 0.9rem;"></i>
                    </button>
                    <button class="btn-icon action-delete" onclick="event.stopPropagation(); checkEditPermission('${log.id}', '${log.status}', true)" title="ลบ">
                        <i class="fa-solid fa-trash" style="font-size: 0.9rem;"></i>
                    </button>
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

function isLineInAppBrowser() {
    return /Line/i.test(navigator.userAgent);
}

// Duplicate function handleLineLogin removed here to avoid "already declared" error
// The active implementation is at the top of the file around line 1317
async function handleLogout() {
    if (await showDialog("คุณต้องการออกจากระบบหรือไม่?", { type: "confirm" })) {
        try {
            await FirestoreService.logAction("AUTH", "LOGOUT", `User logged out`); // Log before signout
            await signOut(auth);
            window.location.reload();
        } catch (error) {
            console.error("Logout Error:", error);
        }
    }
}

// --- Auth Observers & Listeners ---
const loginForm = document.getElementById("login-form");
if (loginForm) loginForm.addEventListener("submit", handleLogin);

const btnLineLogin = document.getElementById("btn-line-login");
if (btnLineLogin) btnLineLogin.addEventListener("click", handleLineLogin);

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

        // --- STRICT PHONE VALIDATION (Profile) ---
        const profilePhoneInput = document.getElementById("profile-phone");
        if (profilePhoneInput && profilePhoneInput.value) {
            if (!validateThaiPhone(profilePhoneInput, window.itiInstances.profile)) {
                await showDialog(
                    "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0 เท่านั้น",
                    { title: "รูปแบบไม่ถูกต้อง" },
                );
                return; // Stop
            }
        }
        // -------------------------------------

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
                line: {
                    enabled: document.getElementById("line-enabled")?.checked || false,
                    channelAccessToken: document.getElementById("line-channel-access-token")?.value.trim() || "",
                    channelSecret: document.getElementById("line-channel-secret")?.value || "",
                    userId: document.getElementById("line-user-id")?.value.trim() || ""
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
            
            document.getElementById("line-enabled").checked = false;
            document.getElementById("line-channel-access-token").value = "";
            document.getElementById("line-channel-secret").value = "";
            document.getElementById("line-user-id").value = "";
            
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
async function handleLinkLineAccount() {
    const user = auth.currentUser;
    if (!user) return;

    // Restriction for external mobile browsers
    if (isMobile() && !isLineInAppBrowser()) {
        await showDialog(
            "การเชื่อมต่อบัญชี LINE บนมือถือ\nรองรับเฉพาะการเปิดผ่านแอป LINE เท่านั้น\n\nกรุณาใช้งานผ่านแอป LINE หรือใช้งานผ่านคอมพิวเตอร์",
            { title: "Browser ไม่รองรับ" },
        );
        return;
    }

    try {
        const provider = new OAuthProvider("oidc.line");
        provider.addScope("openid");
        provider.addScope("profile");
        provider.addScope("email");

        await linkWithPopup(user, provider);
        await FirestoreService.logAction(
            "USER",
            "CONNECT_LINE",
            "Connected LINE account",
        );
        showToast("เชื่อมต่อบัญชี LINE สำเร็จ!", "success");
        renderProfile(); // Re-render to update UI
    } catch (error) {
        console.error("Link LINE Error:", error);
        if (error.code === "auth/credential-already-in-use") {
            await showDialog("บัญชี LINE นี้ถูกเชื่อมต่อกับผู้ใช้อื่นแล้ว");
        } else {
            await showDialog("เชื่อมต่อบัญชีไม่สำเร็จ: " + error.message);
        }
    }
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

async function handleSyncLinePhoto() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Find LINE provider data
        const lineProvider = user.providerData.find(
            (p) => p.providerId === "oidc.line",
        );
        if (!lineProvider || !lineProvider.photoURL) {
            await showDialog("ไม่พบรูปโปรไฟล์จาก LINE");
            return;
        }

        if (
            !(await showDialog("คุณต้องการใช้รูปโปรไฟล์จาก LINE ใช่หรือไม่?", {
                type: "confirm",
            }))
        )
            return;

        // Update Profile
        await updateProfile(user, { photoURL: lineProvider.photoURL });

        // Update Firestore (Consistency)
        await updateDoc(doc(db, "users", user.uid), {
            photoURL: lineProvider.photoURL,
        });

        await FirestoreService.logAction(
            "USER",
            "UPDATE_PHOTO",
            "Synced profile photo from LINE",
        );
        showToast("อัปเดตรูปโปรไฟล์เรียบร้อย", "success");
        renderProfile();
    } catch (error) {
        console.error("Sync Photo Error:", error);
        await showDialog("ไม่สามารถซิงค์รูปได้: " + error.message);
    }
}

async function handleUnlinkLineAccount() {
    const user = auth.currentUser;
    if (!user) return;

    // Safety Check: Don't unlink if it's the only provider
    if (user.providerData.length <= 1) {
        await showDialog(
            "ไม่สามารถยกเลิกการเชื่อมต่อได้ เนื่องจากเป็นบัญชีเดียวที่ใช้เข้าระบบ",
        );
        return;
    }

    if (
        !(await showDialog("คุณต้องการยกเลิกการเชื่อมต่อบัญชี LINE ใช่หรือไม่?", {
            type: "confirm",
        }))
    )
        return;

    try {
        // Find correct provider ID for LINE
        // Assuming 'oidc.line' based on setup, but checking providerData is safer if needed
        await unlink(user, "oidc.line");
        await FirestoreService.logAction(
            "USER",
            "DISCONNECT_LINE",
            "Disconnected LINE account",
        );
        showToast("ยกเลิกการเชื่อมต่อ LINE สำเร็จ", "success");
        renderProfile();
    } catch (error) {
        console.error("Unlink LINE Error:", error);
        await showDialog("ยกเลิกการเชื่อมต่อไม่สำเร็จ: " + error.message);
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

    // Linked Accounts Rendering
    const linkedContainer = document.getElementById("linked-accounts-container");
    console.log("Found linked container:", linkedContainer); // Debug
    if (linkedContainer) {
        const isLineLinked =
            user.providerData &&
            user.providerData.some((p) => p.providerId === "oidc.line");

        // Define UI based on status
        const statusHtml = isLineLinked
            ? `<div class="linked-status">
                 <strong style="color: #06C755;">เชื่อมต่อแล้ว (Linked)</strong>
                 <span>บัญชี LINE เชื่อมต่ออยู่</span>
               </div>`
            : `<div class="linked-status">
                 <strong style="color: var(--text-muted);">ยังไม่เชื่อมต่อ</strong>
                 <span>เชื่อมต่อ LINE เพื่อล็อกอินง่ายขึ้น</span>
               </div>`;

        const actionBtn = isLineLinked
            ? `<div style="display: flex; gap: 0.5rem;">
                 <button type="button" class="btn-link-action" id="btn-sync-line-photo-new" title="ใช้รูปโปรไฟล์จาก LINE">
                    <i class="fa-solid fa-image"></i> ใช้รูปไลน์
                 </button>
                 <button type="button" class="btn-link-action disconnect" id="btn-unlink-line">
                    <i class="fa-solid fa-link-slash"></i> ยกเลิก
                 </button>
               </div>`
            : `<button type="button" class="btn-link-action connect" id="btn-link-line">
                 <i class="fa-solid fa-link"></i> เชื่อมต่อ
               </button>`;

        linkedContainer.innerHTML = `
            <div class="linked-account-item">
                <div class="linked-account-info">
                   <i class="fa-brands fa-line linked-icon"></i>
                   ${statusHtml}
                </div>
                ${actionBtn}
            </div>
        `;

        // Attach Listeners
        if (isLineLinked) {
            const btnUnlink = document.getElementById("btn-unlink-line");
            if (btnUnlink) btnUnlink.onclick = handleUnlinkLineAccount;

            const btnSync = document.getElementById("btn-sync-line-photo-new");
            if (btnSync) btnSync.onclick = handleSyncLinePhoto;
        } else {
            const btn = document.getElementById("btn-link-line");
            if (btn) btn.onclick = handleLinkLineAccount;
        }
    }
    
    // Render User Roles Management (only if admin)
    if (isAdmin) {
        await renderUserRoles();
    }
}

function setupProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const tabContents = document.querySelectorAll('.profile-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Load notification settings when notification tab is opened
            if (targetTab === 'notification-settings') {
                await loadNotificationSettings();
            }
        });
    });
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
            
            // Load LINE settings
            if (settings.line) {
                document.getElementById("line-enabled").checked = settings.line.enabled || false;
                document.getElementById("line-channel-access-token").value = settings.line.channelAccessToken || "";
                document.getElementById("line-channel-secret").value = settings.line.channelSecret || "";
                document.getElementById("line-user-id").value = settings.line.userId || "";
            } else {
                // Default to OFF if no settings
                document.getElementById("line-enabled").checked = false;
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
            document.getElementById("line-enabled").checked = false;
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

// --- Recycle Bin UI Logic ---
async function renderRecycleBin() {
    const tbody = document.getElementById("recycle-bin-table-body");
    if (!tbody) return;

    tbody.innerHTML =
        '<tr><td colspan="9" style="text-align: center; padding: 2rem;">กำลังโหลด...</td></tr>';

    try {
        const deletedItems = await FirestoreService.fetchDeletedItems();
        state.deletedItems = deletedItems;

        // Populate "ลบโดย" filter dropdown
        const deletedBySelect = document.getElementById("recycle-filter-deletedby");
        if (deletedBySelect) {
            const currentVal = deletedBySelect.value;
            const users = [...new Set(deletedItems.map((i) => i.deletedBy || "ไม่ระบุ"))].sort();
            deletedBySelect.innerHTML = '<option value="all">ทั้งหมด</option>';
            users.forEach((u) => {
                deletedBySelect.innerHTML += `<option value="${u}">${u}</option>`;
            });
            deletedBySelect.value = currentVal || "all";
        }

        tbody.innerHTML = "";
        if (deletedItems.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">ถังขยะว่างเปล่า (Empty)</td></tr>';
            return;
        }

        const dateOptions = { year: "numeric", month: "short", day: "numeric" };
        const dateTimeOptions = {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        };

        deletedItems.forEach((item) => {
            const tr = document.createElement("tr");

            // Common Data
            const deletedBy = item.deletedBy || "ไม่ระบุ";
            const deletedAt = item.deletedAt
                ? new Date(item.deletedAt).toLocaleDateString(undefined, dateTimeOptions)
                : "-";
            const isSite = item.originalCollection === "sites";

            // 1. Type Column (Icon)
            let typeIconHtml = "";
            if (isSite) {
                typeIconHtml = `<div class="icon-type-site"><i class="fa-solid fa-house-chimney"></i></div>`;
            } else {
                typeIconHtml = `<div class="icon-type-log"><i class="fa-solid fa-clipboard-list"></i></div>`;
            }

            // 2. Item Column (Complex)
            let itemHtml = "";

            const dateBadge = `<span class="badge-info mobile-date-badge"><i class="fa-regular fa-calendar"></i> ${deletedAt}</span>`;

            if (isSite) {
                const data = item.data || {};
                const badgesHtml = `
                    ${dateBadge}
                    <span class="badge-info"><i class="fa-solid fa-map-pin"></i> ${data.subdistrict || "-"}</span>
                    <span class="badge-info"><i class="fa-solid fa-map"></i> ${data.district || "-"}</span>
                    <span class="badge-info"><i class="fa-solid fa-location-dot"></i> ${data.province || "-"}</span>
                `;
                itemHtml = `
                    <div class="item-cell-content">
                        <div class="item-header">${data.name || "ไม่ระบุชื่อ"}</div>
                        <div class="item-badges">${badgesHtml}</div>
                    </div>
                `;
            } else {
                const data = item.data || {};

                // Resolve Site Name
                let siteName = "ไม่ระบุสถานที่";
                if (data._cachedSiteName) siteName = data._cachedSiteName;
                else if (data.siteId) {
                    const s = state.sites.find((site) => site.id === data.siteId);
                    if (s) siteName = s.name;
                }

                // Format Cost
                const cost = data.cost
                    ? new Intl.NumberFormat('th-TH', {
                        style: "currency",
                        currency: "THB",
                    }).format(data.cost).replace("฿", "").trim() + " บาท"
                    : "-";

                // Check for attachments
                let attachmentBadge = "";
                if (data.attachments && data.attachments.length > 0) {
                    attachmentBadge = `<span class="badge-info" style="color: var(--primary-color); border: 1px solid var(--primary-light);"><i class="fa-solid fa-paperclip"></i> ${data.attachments.length}</span>`;
                }

                const badgesHtml = `
                    ${dateBadge}
                    <span class="badge-info" style="background: rgba(249, 115, 22, 0.1); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.2);">${data.category || "-"}</span>
                    <span class="badge-info" style="color: var(--success-color); border: 1px solid rgba(34, 197, 94, 0.2);">${cost}</span>
                    ${attachmentBadge}
                `;

                itemHtml = `
                    <div class="item-cell-content">
                        <div class="item-header">${siteName}</div>
                        <div class="item-badges">${badgesHtml}</div>
                        <div class="item-sub-header">
                            <div class="sub-info-line"><strong>รายละเอียด:</strong> ${data.details || "-"}</div>
                            <div class="sub-info-line"><strong>หมายเหตุ:</strong> ${data.objective || "-"}</div>
                        </div>
                    </div>
                `;
            }

            if (isSite) {
                tr.classList.add("recycle-row-site");
            } else {
                tr.classList.add("recycle-row-log");
            }
            tr.dataset.deletedby = deletedBy;
            tr.dataset.deletedat = item.deletedAt || "";

            // ... (HTML Generation Logic remains same, just wrapping it)

            tr.innerHTML = `
                <td class="cell-type" data-label="ประเภท" style="text-align: center;">${typeIconHtml}</td>
                <td class="cell-item" data-label="รายการ">${itemHtml}</td>
                <td class="cell-user" data-label="ลบโดย">${deletedBy}</td>
                <td class="cell-date" data-label="วันที่ลบ">${deletedAt}</td>
                <td class="cell-action" data-label="ตัวเลือก" style="text-align: center;">
                    <div style="display: inline-flex; gap: 0.5rem; justify-content: center; align-items: center;">
                        <button class="btn-icon action-restore" onclick="handleRestore('${item.id}')" title="กู้คืน">
                            <i class="fa-solid fa-rotate-left" style="color: var(--success-color);"></i>
                        </button>
                        <button class="btn-icon action-delete" onclick="handleDeleteForever('${item.id}')" title="ลบถาวร">
                            <i class="fa-solid fa-trash-can" style="color: var(--danger-color);"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading recycle bin:", error);
        tbody.innerHTML =
            '<tr><td colspan="5" style="text-align: center; color: var(--danger-color);">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
}

async function handleRestore(binId) {
    if (!state.deletedItems) return;
    const item = state.deletedItems.find((i) => i.id === binId);
    if (!item) return;

    // Check if restoring a log whose site is also deleted
    let siteToRestore = null;
    let logsToRestore = [];
    if (item.originalCollection === "logs" && item.data && item.data.siteId) {
        const siteExists = state.sites.some((s) => s.id === item.data.siteId);
        if (!siteExists) {
            siteToRestore = state.deletedItems.find(
                (i) => i.originalCollection === "sites" && i.originalId === item.data.siteId
            );
        }
    }

    // Check if restoring a site — offer to restore its logs too
    if (item.originalCollection === "sites") {
        logsToRestore = state.deletedItems.filter(
            (i) => i.originalCollection === "logs" && i.data && i.data.siteId === item.originalId
        );
    }

    let confirmMsg;
    if (siteToRestore) {
        confirmMsg = `เคสนี้อยู่ในสถานที่ "${siteToRestore.description}" ที่ถูกลบ\nต้องการกู้คืนทั้งสถานที่และเคสนี้ใช่หรือไม่?`;
    } else if (logsToRestore.length > 0) {
        confirmMsg = `ต้องการกู้คืน "${item.description}" พร้อมเคสที่เกี่ยวข้อง ${logsToRestore.length} รายการใช่หรือไม่?`;
    } else {
        confirmMsg = `ต้องการกู้คืน "${item.description}" ใช่หรือไม่?`;
    }

    if (
        !(await showDialog(confirmMsg, {
            type: "confirm",
        }))
    )
        return;

    try {
        // Restore the parent site first if needed
        if (siteToRestore) {
            await FirestoreService.restoreFromRecycleBin(
                siteToRestore.id,
                siteToRestore.originalCollection,
                siteToRestore.originalId,
                siteToRestore.data,
            );
            await FirestoreService.logAction(
                "BIN",
                "RESTORE",
                `Auto-restored site: ${siteToRestore.description}`,
            );
        }

        await FirestoreService.restoreFromRecycleBin(
            binId,
            item.originalCollection,
            item.originalId,
            item.data,
        );
        await FirestoreService.logAction(
            "BIN",
            "RESTORE",
            `Restored item: ${item.description}`,
        );

        // Restore associated logs when restoring a site
        for (const logItem of logsToRestore) {
            await FirestoreService.restoreFromRecycleBin(
                logItem.id,
                logItem.originalCollection,
                logItem.originalId,
                logItem.data,
            );
            await FirestoreService.logAction(
                "BIN",
                "RESTORE",
                `Auto-restored log: ${logItem.description}`,
            );
        }

        showToast("กู้คืนข้อมูลเรียบร้อยแล้ว", "success");

        await refreshData();
        renderRecycleBin();
    } catch (error) {
        console.error("Restore failed:", error);
        showToast("เกิดข้อผิดพลาดในการกู้คืน", "error");
    }
}

async function handleDeleteForever(binId) {
    if (!state.deletedItems) return;
    const item = state.deletedItems.find((i) => i.id === binId);
    if (!item) return;

    if (
        !(await showDialog(
            `ต้องการลบถาวร "${item.description}" ใช่หรือไม่?\n(ไม่สามารถกู้คืนได้)`,
            { type: "confirm", confirmText: "ลบถาวร", cancelText: "ยกเลิก" },
        ))
    )
        return;

    try {
        await FirestoreService.deletePermanently(binId);
        await FirestoreService.logAction(
            "BIN",
            "DELETE",
            `Permanently deleted: ${item.description}`,
        );
        showToast("ลบข้อมูลถาวรเรียบร้อยแล้ว", "success");

        await refreshData();
        renderRecycleBin();
    } catch (error) {
        console.error("Permanent delete failed:", error);
        showToast("เกิดข้อผิดพลาดในการลบข้อมูล", "error");
    }
}

// Expose Globally

window.renderRecycleBin = renderRecycleBin;
window.handleRestore = handleRestore;
window.handleDeleteForever = handleDeleteForever;
window.filterRecycleBin = filterRecycleBin;
window.handleEmptyRecycleBin = handleEmptyRecycleBin;
window.clearRecycleBinFilters = clearRecycleBinFilters;
window.handleClearActionLogs = handleClearActionLogs;

async function handleClearActionLogs() {
    if (!(await showDialog(
        "ต้องการล้าง Activity Log ทั้งหมดใช่หรือไม่?\n(ไม่สามารถกู้คืนได้)",
        { type: "confirm", confirmText: "ล้างทั้งหมด", cancelText: "ยกเลิก" }
    ))) return;

    try {
        await FirestoreService.deleteAllActionLogs();
        showToast("ล้าง Activity Log เรียบร้อยแล้ว", "success");
    } catch (error) {
        console.error("Clear action logs failed:", error);
        showToast("เกิดข้อผิดพลาดในการล้าง Activity Log", "error");
    }
}

function clearRecycleBinFilters() {
    const search = document.getElementById("recycle-search-input");
    const type = document.getElementById("recycle-filter-type");
    const deletedBy = document.getElementById("recycle-filter-deletedby");
    const date = document.getElementById("recycle-date-filter");
    if (search) search.value = "";
    if (type) type.value = "all";
    if (deletedBy) deletedBy.value = "all";
    if (date) date.value = "";
    filterRecycleBin();
}

function filterRecycleBin() {
    const search = (document.getElementById("recycle-search-input")?.value || "").toLowerCase();
    const typeFilter = document.getElementById("recycle-filter-type")?.value || "all";
    const deletedByFilter = document.getElementById("recycle-filter-deletedby")?.value || "all";
    const dateFilter = document.getElementById("recycle-date-filter")?.value || "";
    const rows = document.querySelectorAll("#recycle-bin-table-body tr");

    rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        const isSite = row.classList.contains("recycle-row-site");
        const isLog = row.classList.contains("recycle-row-log");
        const rowDeletedBy = row.dataset.deletedby || "";
        const rowDeletedAt = row.dataset.deletedat || "";

        const matchSearch = !search || text.includes(search);
        const matchType = typeFilter === "all" ||
            (typeFilter === "sites" && isSite) ||
            (typeFilter === "logs" && isLog);
        const matchDeletedBy = deletedByFilter === "all" || rowDeletedBy === deletedByFilter;
        const matchDate = !dateFilter || rowDeletedAt.substring(0, 10) === dateFilter;

        row.style.display = matchSearch && matchType && matchDeletedBy && matchDate ? "" : "none";
    });
}

async function handleEmptyRecycleBin() {
    if (!state.deletedItems || state.deletedItems.length === 0) {
        showToast("ถังขยะว่างเปล่า", "info");
        return;
    }

    if (!(await showDialog(
        `ต้องการลบข้อมูลทั้งหมด ${state.deletedItems.length} รายการในถังขยะถาวรใช่หรือไม่?\n(ไม่สามารถกู้คืนได้)`,
        { type: "confirm", confirmText: "ลบทั้งหมด", cancelText: "ยกเลิก" }
    ))) return;

    try {
        await FirestoreService.emptyRecycleBin();
        await FirestoreService.logAction("BIN", "EMPTY", "Emptied recycle bin");
        showToast("ล้างถังขยะเรียบร้อยแล้ว", "success");
        await refreshData();
        renderRecycleBin();
    } catch (error) {
        console.error("Empty recycle bin failed:", error);
        showToast("เกิดข้อผิดพลาดในการล้างถังขยะ", "error");
    }
}

// --- Global Event Listeners (Must be outside init() for Login) ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("Global Listeners Attached");

    // Login Form
    const loginForm = document.getElementById("login-form");
    if (loginForm) loginForm.addEventListener("submit", handleLogin);
});

window.FirestoreService = FirestoreService; // Exposed for debugging

function setupRecycleBinTabs() {
    const btnRecycle = document.getElementById("btn-rb-recycle");
    const btnActionLog = document.getElementById("btn-rb-actionlog");
    const contentRecycle = document.getElementById("content-rb-recycle");
    const contentActionLog = document.getElementById("content-rb-actionlog");

    if (!btnRecycle || !btnActionLog) return;

    btnRecycle.addEventListener("click", () => {
        btnRecycle.classList.add("active");
        btnActionLog.classList.remove("active");
        contentRecycle.classList.remove("hidden");
        contentActionLog.classList.add("hidden");
    });

    btnActionLog.addEventListener("click", () => {
        btnActionLog.classList.add("active");
        btnRecycle.classList.remove("active");
        contentActionLog.classList.remove("hidden");
        contentRecycle.classList.add("hidden");
        renderActionLogs(); // Load logs when tab is clicked
    });
}

async function renderActionLogs() {
    const container = document.getElementById("content-rb-actionlog");
    if (!container) return;

    // Reset or Initialize State Limit if not present
    if (!state.currentLogLimit) state.currentLogLimit = 50;

    // Prevent duplicate subscriptions if already active AND limit hasn't changed
    if (
        state.actionLogUnsubscribe &&
        state.lastRenderedLimit === state.currentLogLimit
    ) {
        return;
    }

    // Cleanup previous subscription if limit changed
    if (state.actionLogUnsubscribe) {
        state.actionLogUnsubscribe();
        state.actionLogUnsubscribe = null;
    }

    state.lastRenderedLimit = state.currentLogLimit;

    // Only set innerHTML on first load to preserve scroll
    if (!document.getElementById("terminal-container")) {
        // Check if user is admin for clear button
        const user = auth.currentUser;
        let clearBtnHtml = '';
        if (user) {
            const userDoc = await FirestoreService.getUser(user.uid);
            if (userDoc?.role === 'admin') {
                clearBtnHtml = `<div style="display: flex; justify-content: flex-end; margin-bottom: 0.75rem; position: relative; z-index: 1;">
                    <button class="btn-secondary btn-outline-danger" onclick="handleClearActionLogs()">
                        <i class="fa-solid fa-trash"></i> ล้าง Activity Log
                    </button>
                </div>`;
            }
        }

        container.innerHTML = `
            ${clearBtnHtml}
            <div id="terminal-container" style="background: #1e1e1e; border-radius: 8px; padding: 1.5rem; color: #d4d4d4; font-family: 'Courier New', monospace; height: 600px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1); box-shadow: inset 0 0 20px rgba(0,0,0,0.5);">
                <div style="margin-bottom: 1rem; border-bottom: 1px dashed #404040; padding-bottom: 0.5rem; opacity: 0.7;">
                    > System Action Log initialized...<br>
                    > Listening for real-time events... <span class="blink">_</span>
                </div>
                <div id="terminal-output" style="display: flex; flex-direction: column; gap: 6px;">
                    <span style="color: #9ca3af;">Connecting to stream...</span>
                </div>
                <div id="terminal-loading" style="display: none; color: #6b7280; font-style: italic; margin-top: 10px;">
                    > Loading more history...
                </div>
            </div>
        `;

        // Attach Scroll Listener
        const termContainer = document.getElementById("terminal-container");
        termContainer.addEventListener("scroll", () => {
            // Check if near bottom
            if (
                termContainer.scrollTop + termContainer.clientHeight >=
                termContainer.scrollHeight - 50
            ) {
                // Throttle?
                if (state.isLoadingMoreLogs) return;

                console.log("End of logs reached, loading more...");
                state.isLoadingMoreLogs = true;

                // Show loader
                const loader = document.getElementById("terminal-loading");
                if (loader) loader.style.display = "block";

                // Increase Limit
                state.currentLogLimit += 50;

                // Re-render (re-subscribe)
                renderActionLogs().then(() => {
                    state.isLoadingMoreLogs = false;
                    if (loader) loader.style.display = "none";
                });
            }
        });
    }

    const output = document.getElementById("terminal-output");

    // Subscribe
    state.actionLogUnsubscribe = FirestoreService.subscribeToActionLogs(
        (logs) => {
            if (!output) return; // safety
            output.innerHTML = ""; // Clear previous (re-render all)

            if (logs.length === 0) {
                output.innerHTML =
                    '<span style="color: #6b7280;">> No activity recorded yet.</span>';
                return;
            }

            const formatDate = (iso) => {
                const d = new Date(iso);
                return (
                    d.toLocaleTimeString("th-TH", {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                    }) +
                    " " +
                    d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })
                );
            };

            logs.forEach((log) => {
                // Color Coding
                let color = "#d4d4d4"; // Default
                let prefix = "[INFO]";

                switch (log.category) {
                    case "AUTH":
                        color = "#06b6d4"; // Cyan
                        prefix = "[AUTH]";
                        if (log.actionType === "LOGOUT") color = "#9ca3af"; // Gray
                        break;
                    case "SITE":
                    case "LOG":
                        if (log.actionType === "ADD")
                            color = "#10b981"; // Green
                        else if (log.actionType === "EDIT")
                            color = "#f59e0b"; // Orange
                        else if (log.actionType === "DELETE") color = "#ef4444"; // Red
                        prefix = `[${log.category}]`;
                        break;
                    case "BIN":
                        prefix = "[BIN]";
                        if (log.actionType === "DELETE")
                            color = "#ef4444"; // Red
                        else color = "#06b6d4"; // Restore (Cyan)
                        break;
                    case "USER":
                        color = "#3b82f6"; // Blue
                        prefix = "[USER]";
                        break;
                }

                const dateStr = log.timestamp
                    ? formatDate(
                        log.timestamp.toDate
                            ? log.timestamp.toDate()
                            : new Date(log.createdAt),
                    )
                    : "-";
                const userStr = (log.performerName || "system").toLowerCase();

                // Resolve Header Text (Action + Site Name)
                let headerText = log.description; // Fallback

                let siteName = "";
                if (log.category === "SITE") {
                    siteName = log.metadata?.data?.name || "Unknown Site";
                    headerText = `${log.actionType} Site: ${siteName}`;
                } else if (log.category === "LOG") {
                    const siteId = log.metadata?.data?.siteId;
                    // Try to find in state first
                    const site = siteId ? state.sites.find((s) => s.id === siteId) : null;
                    siteName = site
                        ? site.name
                        : log.metadata?.data?._cachedSiteName || "Unknown Site";
                    headerText = `${log.actionType} Log @ ${siteName}`;
                }

                // Apply Sort & Lowercase
                prefix = prefix.toLowerCase();
                headerText = headerText.toLowerCase();

                const lineWrapper = document.createElement("div");
                lineWrapper.style.marginBottom = "4px";

                const line = document.createElement("div");
                line.style.lineHeight = "1.4";
                line.style.fontSize = "0.9rem";
                line.style.cursor = "pointer"; // Make clickable
                line.innerHTML = `
                <span style="color: #555; margin-right: 8px;">${dateStr}</span>
                <span style="color: ${color}; font-weight: bold; margin-right: 8px;">${prefix}</span>
                <span style="color: #a3a3a3; margin-right: 8px;">@${userStr}:</span>
                <span style="color: #e5e5e5;">${headerText}</span>
                <span style="color: #666; font-size: 0.8em; margin-left: 8px;">[Click for details]</span>
            `;
                lineWrapper.appendChild(line);

                // Metadata Detail View
                if (log.metadata && log.metadata.data) {
                    const detailView = document.createElement("div"); // Changed to div for easier HTML handling
                    detailView.style.margin = "4px 0 8px 18px";
                    detailView.style.padding = "8px";
                    detailView.style.background = "rgba(0,0,0,0.3)";
                    detailView.style.borderLeft = `2px solid ${color}`;
                    detailView.style.color = "#a3a3a3";
                    detailView.style.fontFamily = "'Courier New', monospace";
                    detailView.style.fontSize = "0.8rem";
                    detailView.style.display = "none";
                    detailView.style.overflowX = "auto";

                    const cleanData = { ...log.metadata.data };
                    let htmlContent = "";

                    // Fields to skip in detail view (too noisy)
                    const skipFields = new Set([
                        'attachments', 'attachmentsBefore', 'attachmentsAfter',
                        'comments', 'lineItems', 'statusHistory', 'statusSignatures',
                        'createdAt', 'updatedAt', 'timestamp', 'updatedBy',
                        'recordedBy', 'recorderId', 'cost', 'details'
                    ]);

                    // Thai labels for readable display
                    const fieldNames = {
                        siteId: 'สถานที่ (ID)',
                        _cachedSiteName: 'สถานที่',
                        name: 'ชื่อ',
                        date: 'วันที่',
                        category: 'หมวดหมู่',
                        objective: 'คำอธิบายงาน',
                        status: 'สถานะ',
                        responderId: 'ผู้รับผิดชอบ (ID)',
                        caseId: 'รหัสเคส',
                        responsibleAgency: 'หน่วยงาน',
                        picName: 'ผู้ดูแล (PIC)',
                        contactPhone: 'เบอร์โทร',
                        province: 'จังหวัด',
                        district: 'อำเภอ',
                        subdistrict: 'ตำบล',
                        description: 'รายละเอียด',
                        locationUrl: 'Google Maps',
                        maintenanceCycle: 'รอบ MA (วัน)',
                        insuranceStartDate: 'ประกันเริ่ม',
                        insuranceEndDate: 'ประกันสิ้นสุด',
                        firstMaDate: 'MA ครั้งแรก',
                        fullAddress: 'ที่อยู่',
                        siteCode: 'รหัสสถานที่',
                    };

                    // Helper to format values
                    const formatVal = (v) => {
                        if (v === null || v === undefined || v === '') return '-';
                        if (typeof v === "object") {
                            if (Array.isArray(v)) return `${v.length} รายการ`;
                            return JSON.stringify(v).substring(0, 100);
                        }
                        const s = String(v);
                        return s.length > 80 ? s.substring(0, 77) + '...' : s;
                    };

                    const shouldShow = (key) => !skipFields.has(key) && !key.startsWith('_');
                    const getLabel = (key) => fieldNames[key] || key;

                    // Check if it's an EDIT action with Previous Data
                    if (
                        log.metadata.previousData &&
                        Object.keys(log.metadata.previousData).length > 0
                    ) {
                        const prevData = log.metadata.previousData;
                        const allKeys = new Set([
                            ...Object.keys(prevData),
                            ...Object.keys(cleanData),
                        ]);

                        htmlContent +=
                            '<div style="margin-bottom: 5px; color: #fff; font-weight: bold;">CHANGES DETECTED:</div>';

                        allKeys.forEach((key) => {
                            if (!shouldShow(key)) return;

                            const oldVal = prevData[key];
                            const newVal = cleanData[key];

                            if (!oldVal && !newVal) return;

                            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                                htmlContent += `
                                <div style="display: flex; gap: 8px; margin-bottom: 2px;">
                                    <span style="color: #9ca3af; min-width: 120px;">${getLabel(key)}:</span>
                                    <span style="text-decoration: line-through; color: #ef4444; opacity: 0.8;">${formatVal(oldVal)}</span>
                                    <span style="color: #10b981;">&rarr; ${formatVal(newVal)}</span>
                                </div>`;
                            }
                        });
                        // Fallback if no specific keys changed (e.g. only hidden fields changed)
                        if (
                            htmlContent ===
                            '<div style="margin-bottom: 5px; color: #fff; font-weight: bold;">CHANGES DETECTED:</div>'
                        ) {
                            htmlContent +=
                                '<div style="color: #6b7280; font-style: italic;">(No visible field changes detected)</div>';
                        }
                    } else {
                        // ADD or DELETE - Show only meaningful fields
                        htmlContent +=
                            '<div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px;">';
                        for (const [key, value] of Object.entries(cleanData)) {
                            if (!shouldShow(key)) continue;
                            if (!value && value !== 0) continue;
                            htmlContent += `<div style="color: #9ca3af;">${getLabel(key)}:</div>`;
                            htmlContent += `<div style="color: #d4d4d4;">${formatVal(value)}</div>`;
                        }
                        htmlContent += "</div>";
                    }

                    detailView.innerHTML = htmlContent;
                    lineWrapper.appendChild(detailView);

                    // Toggle Logic
                    line.onclick = () => {
                        const isHidden = detailView.style.display === "none";
                        detailView.style.display = isHidden ? "block" : "none";
                    };
                }

                output.appendChild(lineWrapper);
            });
        },
        state.currentLogLimit,
    );
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

// Initialize Password Toggles & PIN Validation
document.addEventListener("DOMContentLoaded", () => {
    setupPasswordToggles();
    setupPinValidation();
});
