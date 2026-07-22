import { auth } from '../config/firebase.js';
import { state } from '../store/state.js';
import { FirestoreService } from '../services/firestore.js';
import { showDialog, showToast } from '../utils/ui.js';
import { checkAdminAndUpdateStatus } from './attachments.js';
const refreshData = async (...args) => window.refreshData && await window.refreshData(...args);

let customerSignaturePad = null;
let signaturePad = null;
let pendingStatusChange = null;

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
                if (!window.pendingSignedDocs) window.pendingSignedDocs = [];
                if (!window.pendingSignedDocs.find(p => p.name === f.name && p.size === f.size)) {
                    window.pendingSignedDocs.push(f);
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
        
        const currentUser = auth.currentUser ? (auth.currentUser.displayName || auth.currentUser.email || "Unknown") : "System";
        const currentUid = auth.currentUser ? auth.currentUser.uid : "system";
        const currentPhoto = auth.currentUser ? (auth.currentUser.photoURL || "") : "";
        
        const statusLabels = {
            'Open': 'เปิดงาน',
            'On Process': 'กำลังดำเนินการ',
            'Done': 'เสร็จสิ้น',
            'Case Closed': 'ปิดเคส',
            'Cancel': 'ยกเลิก'
        };
        const oldStatusTH = statusLabels[oldStatus] || oldStatus;
        const newStatusTH = statusLabels[newStatus] || newStatus;

        const statusComment = {
            text: `เปลี่ยนสถานะจาก ${oldStatusTH} เป็น ${newStatusTH}`,
            author: currentUser,
            authorId: currentUid,
            photoURL: currentPhoto,
            timestamp: new Date().toISOString(),
            attachments: [],
            isSystemLog: true
        };
        const updatedComments = [...(log.comments || []), statusComment];
        updateData.comments = updatedComments;
        log.comments = updatedComments; // Update local state
        
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

        // Auto render comments if detail modal is open
        const detailsModal = document.getElementById('modal-log-details');
        if (detailsModal && !detailsModal.classList.contains('hidden')) {
            renderLogComments(logId, log.comments);
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
            // Delay 2500ms: ให้ Firestore propagate status ใหม่ก่อนที่จะ fetch
            // (800ms เดิมเกิด race condition ทำให้ fetchLogsForSite ยังเห็น status เก่า)
            setTimeout(async () => {
                try {
                    await refreshData(); // Sync state first
                    const created = await checkAndAutoCreateMaintenanceCase(log.siteId);
                    if (created) await refreshData(); // Reload to show new case
                } catch (autoMaErr) {
                    console.warn('[AutoMA] Check after status update failed:', autoMaErr);
                }
            }, 2500);
        }

    } catch (error) {
        console.error('Error updating status:', error);
        showToast('ไม่สามารถอัปเดตสถานะได้', 'error');
    }
}

window.checkAdminAndUpdateStatus = checkAdminAndUpdateStatus;
window.updateLogStatus = updateLogStatus;

// ─────────────────────────────────────────────────────────────────────────────


export { initCustomerSignaturePad, clearCustomerSignature, getCustomerSignatureDataUrl, initSignatureCanvas, clearSignatureCanvas, openSignatureModal, closeSignatureModal, getSignatureDataUrl, confirmSignature, updateLogStatus, executeStatusUpdate };
