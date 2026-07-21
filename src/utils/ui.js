import { auth } from '../config/firebase.js';
import { FirestoreService } from '../services/firestore.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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


export { isMaCategory, createDeviceBannerHTML, imageViewer, createLoaderImage, showDialog, showCancelReasonDialog, showToast, removeToast };