import { state } from '../store/state.js';
import { FirestoreService } from '../services/firestore.js';
import { showToast, showDialog } from '../utils/ui.js';
import { initCustomerSignaturePad } from './signature.js';

function renderPendingSitePreviews() {
    refreshSiteAttachmentPreviews();
}


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


export { renderPendingSitePreviews, renderPreInstallPhotoPreview, uploadPhotoArray, renderInstallPhotoPreview, renderRepairPhotoPreview, renderSignedDocPreview, renderAttachments, refreshAttachmentBeforePreviews, refreshAttachmentAfterPreviews, refreshSiteAttachmentPreviews, renderPendingPreviews, showUploadingState, updateUploadProgress, updateAttachmentPreview, removeAttachment, updateMaFormAttachmentPreview, removeMaFormAttachment, initMaFormCommentAttachments, updateDescriptionAttachmentPreview, removeDescriptionAttachment, initDescriptionAttachments, renderStatusTimeline, checkAdminAndUpdateStatus };