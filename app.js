/**
 * BioInnotech Maintenance System
 * Core Application Launcher (Thai Localized) - Firebase Integrated
 */

window.onerror = function (msg, url, line, col, error) {
    var extra = !col ? "" : "\ncolumn: " + col;
    extra += !error ? "" : "\nerror: " + error;
    console.error("Error: " + msg + "\nurl: " + url + "\nline: " + line + extra);
};

console.log("--- App.js Module Evaluating ---");

// --- Imports ---
import { app, db, storage, auth, functions } from './src/config/firebase.js';
import { state, calendarState } from './src/store/state.js';
import { FirestoreService } from './src/services/firestore.js';
import { initLiff, getLiffAccessToken, handleLineLogin, handleLinkLine, handleSyncLinePhoto, handleUnlinkLine, renderLineStatus, checkLiffRedirectCallback } from './src/services/line.js?v=1.1.9';

import { isMaCategory, createDeviceBannerHTML, imageViewer, createLoaderImage, showDialog, showCancelReasonDialog, showToast, removeToast } from './src/utils/ui.js';
import { sanitizeDate, formatThaiDate, formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from './src/utils/date.js';
import { setupStrictPhoneFormat, setupPhoneInputs, validateEmail, validateThaiPhone } from './src/utils/validation.js';
import { formatCurrency, parseCurrency, formatFileSize, getSiteColor } from './src/utils/format.js';
import { calculateDuration, setupAutocomplete, handleProvinceSelect, handleAmphoeSelect, handleTambonSelect, getProvinces, getAmphoes, getTambons, initAddressAutocompletes, initSiteAutocompletes, loadAddressData, getApiAgencies, renderAgencyDropdown, initAgencyAutocomplete, setupAgencySelect, loadAllAgencies, filterAgenciesByLocation, updateSiteFieldDataLists, updateLogDetailsDatalist } from './src/utils/autocomplete.js';

import { initCustomerSignaturePad, clearCustomerSignature, getCustomerSignatureDataUrl, initSignatureCanvas, clearSignatureCanvas, openSignatureModal, closeSignatureModal, getSignatureDataUrl, confirmSignature, updateLogStatus, executeStatusUpdate } from './src/ui/signature.js';
import { initSiteMap, updateLocationUrlInput, parseLocationUrl, provinceTranslationMap, cleanProvinceName, renderDeviceMap } from './src/ui/map.js';
import { resetFilters, switchLogView, fetchAndRenderCalendar, changeCalendarMonth, renderCalendar, showDayDetails, getPlanMonthData, migratePlanToObjectFormat, renderMaintenancePlan, showPlanCellMenu, hidePlanCellMenu, updateStaffCyclePreview, initStaffCycleUpload, deleteCycleRecord, parseDateToTimelineCoords, isBeforeTimeline, isAfterTimeline, getLatestCycleCountFromPlans, getPreviousCycleCount, getNextCycleCount, openCycleCountModal, closeCycleCountModal, saveCycleCount, clearCycleCount, deletePlanEntry, openPlanDateModal, closePlanDateModal, savePlanDate, initPlanDateModal, togglePlanStatus, initCycleCountModal } from './src/ui/calendar.js';
import { fetchInventory, renderInventory } from './src/ui/inventory.js';
import { isMobile, handleLogout, saveProfileSignature, renderProfile, setupProfileTabs, setupPasswordToggles, setupPinValidation, loadNotificationSettings } from './src/ui/profile.js';
import { renderUserRoles, handleRoleChange, renderUsersList, setupUserSearch, openUserDetailsModal } from './src/ui/users.js';
import { exportSitesToExcel, exportCasePDF, exportLogsToExcel, getAppBaseUrl, showDeviceQR, closeDeviceQRModal, printDeviceQR, showPdfPreview, exportAnnualPlanPDF, exportCaseHistoryPDF, setupCompanySettingsForm, exportDevicesPDF } from './src/ui/export.js';
import { renderPendingSitePreviews, renderPreInstallPhotoPreview, uploadPhotoArray, renderInstallPhotoPreview, renderRepairPhotoPreview, renderSignedDocPreview, renderAttachments, refreshAttachmentBeforePreviews, refreshAttachmentAfterPreviews, refreshSiteAttachmentPreviews, renderPendingPreviews, showUploadingState, updateUploadProgress, updateAttachmentPreview, removeAttachment, updateMaFormAttachmentPreview, removeMaFormAttachment, initMaFormCommentAttachments, updateDescriptionAttachmentPreview, removeDescriptionAttachment, initDescriptionAttachments, renderStatusTimeline, checkAdminAndUpdateStatus } from './src/ui/attachments.js';
import { toggleMaRoundSections, renderRepairChecklist, renderReturnProductList, renderDoorSizeFields, updateDoorCount, getRdpbRegionCode, handleSiteSubmit, editSite, buildInspectionSummary, handleLogMaintenance, checkAndAutoCreateMaintenanceCase, runAutoMaintenanceCheckForAllSites, deleteSite, confirmDelete, resetLogForm, openLogModalForDate, populateResponderDropdown, checkEditPermission, editLog, getFieldValue, isFilled, parseRepairChecklist, currentUserHasProfileSignature, requireAdminManagerProfileSignature, getCategorySpecificDoneFields, getIncompleteDoneFields, getIncompleteDoneFieldKeys, highlightIncompleteFields, canMarkDone, quickUpdateStatus, deleteLog, viewSiteHistory, addLineItemRow, recalcLineItemTotal, getLineItems, updatePublicReportMediaPreview, updatePublicCycleMediaPreview, showPortalMode, uploadMediaFiles, initPublicReportPage } from './src/ui/forms.js';
import { switchView, toggleModal, resetSiteForm, renderAll, renderCurrentView, setupSiteManagerFilters, populateSiteFilters, renderSites, setupCustomNameLogic, viewSiteDetails, renderLogComments, expandCommentsIfCollapsed, scrollToInitialComment, scrollToLatestComment, toggleCommentSection, toggleCostSection, toggleFormCostSection, postLogComment, viewLogDetails, viewSiteLogs, filterLogsClientSide, getFilteredLogs, updateLogStats, updateCaseDashboard, renderLogs, handleLoadMoreLogs, appendLogRows, generateMockLogs } from './src/ui/views.js';
import { setupEventListeners } from './src/ui/listeners.js';

// --- Session Timeout Logic ---
let idleTimer;
let currentSessionTimeoutMs = 120 * 60 * 1000; // default 2 hours (120 minutes)
let lastIdleStorageUpdate = 0;

function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (!auth.currentUser) return;

    const now = Date.now();
    if (now - lastIdleStorageUpdate > 10000) {
        localStorage.setItem("sessionLastActive", now.toString());
        lastIdleStorageUpdate = now;
    }
    idleTimer = setTimeout(handleSessionTimeout, currentSessionTimeoutMs);
}

async function handleSessionTimeout() {
    console.log("Session Timeout detected.");
    try {
        localStorage.removeItem("sessionLastActive");
        await FirestoreService.logAction(
            "AUTH",
            "TIMEOUT",
            "Session timed out due to inactivity"
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
            { title: "Session Expired" }
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

    const lastActive = parseInt(
        localStorage.getItem("sessionLastActive") || "0",
        10
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

// --- DOM Elements ---
const views = {
    admin: document.getElementById("admin-view"),
    engineer: document.getElementById("engineer-view"),
    plan: document.getElementById("plan-view"),
    login: document.getElementById("login-view"),
    profile: document.getElementById("profile-view"),
    inventory: document.getElementById("inventory-view"),
};

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
    filterHidden: document.getElementById("site-filter"),
    logSiteInput: document.getElementById("log-site-input"),
    logSiteHidden: document.getElementById("log-site-select"),

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
    provinceDropdown: document.getElementById("dropdown-province"),
    amphoeDropdown: document.getElementById("dropdown-amphoe"),
    tambonDropdown: document.getElementById("dropdown-tambon"),
};

// --- Real-time Listeners ---
let _unsubscribeSites = null;
let _unsubscribeLogs = null;
let _realtimeRenderDebounce = null;

function _scheduleRealtimeRender() {
    clearTimeout(_realtimeRenderDebounce);
    _realtimeRenderDebounce = setTimeout(() => {
        try {
            populateSiteFilters();
            updateLogDetailsDatalist();
            renderAll();
            if (calendarState && calendarState.view === 'calendar') {
                fetchAndRenderCalendar();
            }
        } catch (e) {
            console.warn('[RealtimeListener] render error:', e);
        }
    }, 300);
}

function setupRealtimeListeners() {
    teardownRealtimeListeners();
    console.log('[RealtimeListener] Setting up real-time listeners...');

    let sitesReady = false;
    let logsReady = false;

    // --- Sites Listener ---
    const sitesQuery = query(collection(db, 'sites'), orderBy('updatedAt', 'desc'));
    _unsubscribeSites = onSnapshot(sitesQuery, (snapshot) => {
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
        if (!logsReady) {
            logsReady = true;
            return;
        }
        console.log('[RealtimeListener] Logs updated, re-rendering...');
        state.logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        _scheduleRealtimeRender();
    }, (error) => {
        console.warn('[RealtimeListener] Logs listener error:', error);
    });
}

function teardownRealtimeListeners() {
    if (_unsubscribeSites) {
        _unsubscribeSites();
        _unsubscribeSites = null;
    }
    if (_unsubscribeLogs) {
        _unsubscribeLogs();
        _unsubscribeLogs = null;
    }
}

// Import dynamic firestore dependencies
import { collection, query, orderBy, onSnapshot, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- Global variables for compatibility ---
let currentUserRole = "user";
window.state = state;
window.calendarState = calendarState;
window.currentUserRole = currentUserRole;
window.views = views;
window.modals = modals;
window.grids = grids;
window.selects = selects;
window.addressInputs = addressInputs;
window.itiInstances = {};

// Expose all functions to global scope
const globalBindings = {
    isMaCategory, createDeviceBannerHTML, imageViewer, createLoaderImage, showDialog, showCancelReasonDialog, showToast, removeToast,
    sanitizeDate, formatThaiDate, formatDateDDMMYYYY, formatDateTimeDDMMYYYY,
    setupStrictPhoneFormat, setupPhoneInputs, validateEmail, validateThaiPhone,
    formatCurrency, parseCurrency, formatFileSize, getSiteColor,
    calculateDuration, setupAutocomplete, handleProvinceSelect, handleAmphoeSelect, handleTambonSelect,
    getProvinces, getAmphoes, getTambons, initAddressAutocompletes, initSiteAutocompletes, loadAddressData,
    getApiAgencies, renderAgencyDropdown, initAgencyAutocomplete, setupAgencySelect, loadAllAgencies, filterAgenciesByLocation,
    initCustomerSignaturePad, clearCustomerSignature, getCustomerSignatureDataUrl, initSignatureCanvas, clearSignatureCanvas,
    openSignatureModal, closeSignatureModal, getSignatureDataUrl, confirmSignature, updateLogStatus, executeStatusUpdate,
    initSiteMap, updateLocationUrlInput, parseLocationUrl, provinceTranslationMap, cleanProvinceName, renderDeviceMap,
    resetFilters, switchLogView, fetchAndRenderCalendar, changeCalendarMonth, renderCalendar, showDayDetails,
    getPlanMonthData, migratePlanToObjectFormat, renderMaintenancePlan, showPlanCellMenu, hidePlanCellMenu,
    updateStaffCyclePreview, initStaffCycleUpload, deleteCycleRecord, parseDateToTimelineCoords, isBeforeTimeline, isAfterTimeline,
    getLatestCycleCountFromPlans, getPreviousCycleCount, getNextCycleCount, openCycleCountModal, closeCycleCountModal,
    saveCycleCount, clearCycleCount, deletePlanEntry, openPlanDateModal, closePlanDateModal, savePlanDate, initPlanDateModal,
    togglePlanStatus, initCycleCountModal, fetchInventory, renderInventory, isMobile, handleLogout, saveProfileSignature,
    renderProfile, setupProfileTabs, setupPasswordToggles, setupPinValidation, loadNotificationSettings,
    renderUserRoles, handleRoleChange, renderUsersList, setupUserSearch, openUserDetailsModal,
    exportSitesToExcel, exportCasePDF, exportLogsToExcel, getAppBaseUrl, showDeviceQR, closeDeviceQRModal, printDeviceQR,
    showPdfPreview, exportAnnualPlanPDF, exportCaseHistoryPDF, setupCompanySettingsForm, exportDevicesPDF,
    renderPendingSitePreviews, renderPreInstallPhotoPreview, uploadPhotoArray, renderInstallPhotoPreview, renderRepairPhotoPreview,
    renderSignedDocPreview, renderAttachments, refreshAttachmentBeforePreviews, refreshAttachmentAfterPreviews,
    refreshSiteAttachmentPreviews, renderPendingPreviews, showUploadingState, updateUploadProgress, updateAttachmentPreview,
    removeAttachment, updateMaFormAttachmentPreview, removeMaFormAttachment, initMaFormCommentAttachments,
    updateDescriptionAttachmentPreview, removeDescriptionAttachment, initDescriptionAttachments, renderStatusTimeline,
    checkAdminAndUpdateStatus, toggleMaRoundSections, renderRepairChecklist, renderReturnProductList, renderDoorSizeFields,
    updateDoorCount, getRdpbRegionCode, handleSiteSubmit, editSite, buildInspectionSummary, handleLogMaintenance,
    checkAndAutoCreateMaintenanceCase, runAutoMaintenanceCheckForAllSites, deleteSite, confirmDelete, resetLogForm,
    openLogModalForDate, populateResponderDropdown, checkEditPermission, editLog, getFieldValue, isFilled,
    parseRepairChecklist, currentUserHasProfileSignature, requireAdminManagerProfileSignature, getCategorySpecificDoneFields,
    getIncompleteDoneFields, getIncompleteDoneFieldKeys, highlightIncompleteFields, canMarkDone, quickUpdateStatus,
    deleteLog, viewSiteHistory, addLineItemRow, recalcLineItemTotal, getLineItems, updatePublicReportMediaPreview,
    updatePublicCycleMediaPreview, showPortalMode, uploadMediaFiles, initPublicReportPage, switchView, toggleModal,
    resetSiteForm, renderAll, renderCurrentView, setupSiteManagerFilters, populateSiteFilters, renderSites,
    setupCustomNameLogic, viewSiteDetails, renderLogComments, expandCommentsIfCollapsed,
    scrollToInitialComment, scrollToLatestComment, toggleCommentSection, toggleCostSection, toggleFormCostSection,
    postLogComment, viewLogDetails, viewSiteLogs, filterLogsClientSide, getFilteredLogs, updateLogStats,
    updateCaseDashboard, renderLogs, handleLoadMoreLogs, appendLogRows, generateMockLogs, refreshData,
    setupEventListeners, initLiff, getLiffAccessToken, handleLineLogin, handleLinkLine, handleSyncLinePhoto,
    handleUnlinkLine, renderLineStatus, FirestoreService, updateSiteFieldDataLists, updateLogDetailsDatalist,
    setupRealtimeListeners, teardownRealtimeListeners
};

Object.entries(globalBindings).forEach(([key, fn]) => {
    window[key] = fn;
});

// --- Global helper to wipe all data ---
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

// --- Auth Workflow Initialization ---
const initAuthWorkflow = async () => {
    try {
        setupPhoneInputs();
        setupPasswordToggles();
        setupPinValidation();
        setupEventListeners();

        try {
            await setPersistence(auth, browserLocalPersistence);
            console.log("Persistence Established: LocalStorage");
        } catch (pErr) {
            console.warn("Persistence setup issue:", pErr);
        }

        if (isMobile()) {
            console.log("Mobile detected: Delaying redirect processing...");
            await new Promise((r) => setTimeout(r, 800));
        }

        await checkLiffRedirectCallback();

        setupAuthStateListener();
    } catch (err) {
        console.error("Auth Workflow Init Error:", err);
        const splash = document.getElementById("loading-splash");
        if (splash) {
            const p = splash.querySelector("p");
            if (p) p.innerHTML = "Init Error: " + err.message;
            setTimeout(() => splash.classList.add("hidden"), 3000);
        }
    }
};

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

                if (userDoc && userDoc.role === 'deleted') {
                    console.log("Deleted user tried to log in.");
                    await signOut(auth);
                    showToast('บัญชีนี้ถูกระงับหรือลบออกจากระบบแล้ว', 'error');
                    
                    const splash = document.getElementById("loading-splash");
                    if (splash) splash.classList.add("hidden");
                    return;
                }

                currentUserRole = userDoc?.role || 'user';
                window.currentUserRole = currentUserRole;

                if (!userDoc) {
                    console.log("New user detected, registering...");
                    await FirestoreService.addUser(user);
                    userDoc = await FirestoreService.getUser(user.uid);
                    currentUserRole = userDoc?.role || 'user';
                    window.currentUserRole = currentUserRole;
                } else {
                    const freshPhotoURL = auth.currentUser?.photoURL || user.photoURL;
                    const updates = {};
                    if (user.displayName && userDoc.displayName !== user.displayName)
                        updates.displayName = user.displayName;
                    if (freshPhotoURL && userDoc.photoURL !== freshPhotoURL)
                        updates.photoURL = freshPhotoURL;

                    updates.lastLogin = new Date().toISOString();

                    if (Object.keys(updates).length > 0) {
                        console.log("Syncing user profile...", updates);
                        await updateDoc(doc(db, "users", user.uid), updates);
                        userDoc = { ...userDoc, ...updates };

                        FirestoreService.fetchUsers().then((users) => {
                            state.users = users;
                            renderLogs();
                        });
                    }
                }

                if (views.login) views.login.classList.add("hidden");

                const appContainer = document.querySelector(".app-container");
                if (appContainer) appContainer.classList.remove("hidden");

                const navSites = document.getElementById("nav-sites");
                if (navSites) navSites.classList.remove("hidden");

                const splash = document.getElementById("loading-splash");
                if (splash) {
                    splash.classList.remove("hidden");
                    const splashText = splash.querySelector("p");
                    if (splashText) splashText.textContent = "กำลังโหลดข้อมูล...";
                }

                await init();
                renderProfile(user);
                await setupSessionTimeout();

                if (splash) {
                    setTimeout(() => splash.classList.add("hidden"), 300);
                }
            } else {
                console.log("Auth State Changed: No User");
                currentUserRole = "user";
                window.currentUserRole = currentUserRole;
                if (views.login) views.login.classList.remove("hidden");
                const appContainer = document.querySelector(".app-container");
                if (appContainer) appContainer.classList.add("hidden");
                clearSessionTimeout();
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
                err.message
            );
            const splash = document.getElementById("loading-splash");
            if (splash) splash.classList.add("hidden");
        }
    });
}

// Imports for Auth Persistence and Update
import { setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- Initialization ---
let isAppInitialized = false;

async function init() {
    setupPhoneInputs();
    setupPasswordToggles();
    setupPinValidation();
    initPublicReportPage();
    initStaffCycleUpload();
    
    if (isAppInitialized) {
        console.log("init() already called, skipping");
        return;
    }
    console.log("init() called");
    isAppInitialized = true;

    try {
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

        loadAddressData();
        setupEventListeners();
        setupCustomNameLogic();
        setupSiteManagerFilters();

        const savedLogView = localStorage.getItem("activeLogView");
        if (
            savedLogView &&
            (savedLogView === "list" || savedLogView === "calendar")
        ) {
            switchLogView(savedLogView);
        }

        initSiteAutocompletes();
        updateSiteFieldDataLists();
        initCalendarControls();
        setupAgencySelect();
        await refreshData();
        setupRealtimeListeners();
        console.log("init() complete");

        handleUrlParameters();
    } catch (err) {
        console.error("Error in init():", err);
        isAppInitialized = false;
    }
}

function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const siteId = urlParams.get('siteId');
    if (siteId) {
        console.log('Opening site detail from URL parameter:', siteId);
        let siteRetries = 0;
        const checkAndOpenSite = () => {
            if (Array.isArray(state.sites) && (state.sites.length > 0 || siteRetries >= 20)) {
                const site = state.sites.find(s => s.id === siteId);
                if (site) {
                    viewSiteDetails(siteId);
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    console.warn('Site not found:', siteId);
                    showToast('ไม่พบข้อมูลสถานที่ที่ระบุ', 'error');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } else {
                siteRetries++;
                setTimeout(checkAndOpenSite, 200);
            }
        };
        checkAndOpenSite();
    }

    const logId = urlParams.get('logId');
    if (logId) {
        console.log('Opening MA case detail from URL parameter:', logId);
        let logRetries = 0;
        const checkAndOpenLog = () => {
            if (Array.isArray(state.logs) && (state.logs.length > 0 || logRetries >= 20)) {
                const log = state.logs.find(l => l.id === logId);
                if (log) {
                    viewLogDetails(logId);
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    console.warn('Log not found:', logId);
                    showToast('ไม่พบข้อมูลเคสที่ระบุ', 'error');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } else {
                logRetries++;
                setTimeout(checkAndOpenLog, 200);
            }
        };
        checkAndOpenLog();
    }
}

function initCalendarControls() {
    const monthSelect = document.getElementById("filter-cal-month");
    monthSelect.innerHTML = "";
    for (let i = 0; i < 12; i++) {
        const date = new Date(2000, i, 1);
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = date.toLocaleDateString(undefined, { month: 'long' });
        monthSelect.appendChild(opt);
    }

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

    const today = new Date();
    yearSelect.value = today.getFullYear();
    monthSelect.value = today.getMonth();

    yearSelect.addEventListener("change", updateCalendarFromControls);
    monthSelect.addEventListener("change", updateCalendarFromControls);
}

function updateCalendarFromControls() {
    const year = parseInt(document.getElementById("filter-cal-year").value);
    const month = parseInt(document.getElementById("filter-cal-month").value);
    calendarState.currentDate = new Date(year, month, 1);
    renderCalendar();
}

async function refreshData() {
    try {
        const [sites, logs, users] = await Promise.all([
            FirestoreService.fetchSites(),
            FirestoreService.fetchLogs(),
            FirestoreService.fetchUsers(),
        ]);
        state.sites = sites;
        state.logs = logs;
        state.users = users;

        populateSiteFilters();
        updateLogDetailsDatalist();

        state.isInitialLoading = false;
        renderAll();
    } catch (error) {
        console.error("Error fetching data:", error);
        await showDialog("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + error.message);
    }
}
window.refreshData = refreshData;

// --- Console Debug Helpers ---
window.wipeAllDataExceptSites = async function () {
    const check = confirm("WARNING: This will delete ALL maintenance logs and action logs permanently! Site data will NOT be deleted. Are you sure?");
    if (!check) return;
    const pwd = prompt("Enter DB_WIPE passkey to proceed:");
    if (pwd !== 'bioinnotech99') {
        alert("Incorrect passkey. Aborted.");
        return;
    }
    console.log("Starting DB wipe...");
    try {
        await FirestoreService.deleteAllLogs();
        console.log("All logs deleted from Firestore.");
        alert("Database successfully wiped (Except Sites). Refreshing...");
        window.location.reload();
    } catch (err) {
        console.error("Wipe failed:", err);
        alert("Wipe failed: " + err.message);
    }
};

window.cleanupDuplicateMACases = async function (dryRun = false) {
    console.log("1. Fetching all logs...");
    const allLogs = await FirestoreService.fetchLogs();
    const groups = {};

    allLogs.forEach(log => {
        if (!log.siteId || !log.date || !log.category || !log.isAutoCreated) return;
        const key = `${log.siteId}_${log.date}_${log.category}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(log);
    });

    console.log("Analyzing groups...");
    let dupCount = 0;
    const toDelete = [];

    for (const key in groups) {
        const list = groups[key];
        if (list.length > 1) {
            list.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
            const keep = list[0];
            const dups = list.slice(1);
            console.log(`Group ${key} has ${list.length} items. Keeping logId: ${keep.id} (caseId: ${keep.caseId || '-'}). Flagged ${dups.length} duplicates for deletion.`);
            dups.forEach(d => toDelete.push(d));
            dupCount += dups.length;
        }
    }

    console.log(`Analysis complete. Found ${dupCount} duplicate auto-created cases.`);
    if (dryRun) {
        console.log("[DRY RUN] No records were modified.");
        return;
    }
    if (toDelete.length === 0) {
        console.log("Nothing to delete.");
        return;
    }

    const check = confirm(`Are you sure you want to delete ${toDelete.length} duplicate auto-created logs permanently?`);
    if (!check) return;

    console.log("Deleting...");
    for (const dup of toDelete) {
        try {
            await FirestoreService.deleteLog(dup.id);
            console.log(`Deleted duplicate logId: ${dup.id}`);
        } catch (err) {
            console.warn(`Failed to delete duplicate logId: ${dup.id}`, err);
        }
    }
    console.log("Cleanup complete!");
    alert("ลบข้อมูลเคสซ้ำซ้อนเรียบร้อยแล้ว!");
};

// Start the Application
initAuthWorkflow();
