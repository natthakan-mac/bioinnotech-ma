import { auth, db, storage } from '../config/firebase.js';
import { state } from '../store/state.js';
import { FirestoreService } from '../services/firestore.js';
import { showDialog, showCancelReasonDialog, showToast } from '../utils/ui.js';
import { validateThaiPhone } from '../utils/validation.js';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/date.js';
import { getProvinces, getAmphoes, getTambons, setupAutocomplete } from '../utils/autocomplete.js';
import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
            await refreshData();
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

            await refreshData();

            // Auto MA: trigger ทันทีหลัง addSite + refreshData()
            // ใช้ newSiteId ที่ได้มาโดยตรงจาก Firestore ไม่ต้องค้นหาใน state
            if (siteData.maintenanceCycle && siteData.maintenanceCycle > 0) {
                try {
                    await checkAndAutoCreateMaintenanceCase(newSiteId);
                } catch (autoMaErr) {
                    console.warn('[AutoMA] Check after addSite failed:', autoMaErr);
                }
            }
        }

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
            installType: formData.get("installType") || formData.get("category") || "",
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
                    const oldDateFormatted = formatDate(existingLog.date);
                    const newDateFormatted = formatDate(logData.date);
                    if (oldDateFormatted !== newDateFormatted) {
                        changes.push(`${fieldLabels.date}: ${oldDateFormatted} → ${newDateFormatted}`);
                    }
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
                    const oldV = existingLog[f] || '';
                    const newV = logData[f] || '';
                    if (oldV !== newV && !(oldV === '' && newV === 'pending')) {
                        changes.push(`ตรวจสอบ ${precheckLabels[f]}: ${oldV || '-'} → ${newV || '-'}`);
                    }
                    const oldNote = existingLog[f + '_note'] || '';
                    const newNote = logData[f + '_note'] || '';
                    if (oldNote !== newNote) {
                        changes.push(`หมายเหตุ ${precheckLabels[f]}: ${oldNote || '-'} → ${newNote || '-'}`);
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

                    if (changes.length > 0) {
                        updatedComments.push({
                            text: `แก้ไขข้อมูล:\n- ` + changes.join('\n- '),
                            author: paramUser,
                            authorId: user.uid,
                            photoURL: user.photoURL || "",
                            timestamp: new Date().toISOString(),
                            attachments: [],
                            isSystemLog: true
                        });
                    }

                    await FirestoreService.updateLog(logId, { comments: updatedComments });

                    // Clear description attachments
                    descriptionAttachments = [];
                    updateDescriptionAttachmentPreview();
                } else if (updatedComments.length > 0 && updatedComments[0]) {
                    // If description is empty, remove first comment
                    updatedComments.shift();
                    
                    if (changes.length > 0) {
                        updatedComments.push({
                            text: `แก้ไขข้อมูล:\n- ` + changes.join('\n- '),
                            author: paramUser,
                            authorId: user.uid,
                            photoURL: user.photoURL || "",
                            timestamp: new Date().toISOString(),
                            attachments: [],
                            isSystemLog: true
                        });
                    }
                    await FirestoreService.updateLog(logId, { comments: updatedComments });
                } else if (changes.length > 0) {
                    updatedComments.push({
                        text: `แก้ไขข้อมูล:\n- ` + changes.join('\n- '),
                        author: paramUser,
                        authorId: user.uid,
                        photoURL: user.photoURL || "",
                        timestamp: new Date().toISOString(),
                        attachments: [],
                        isSystemLog: true
                    });
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
                    await FirestoreService.updateLog(newLogId, { comments });
                    descriptionAttachments = [];
                    updateDescriptionAttachmentPreview();
                } catch (commentErr) {
                    console.error("Failed to add initial comment:", commentErr);
                }
            } else {
                // Not adding inspection summary to comments anymore
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

        // Find last closed OR cancelled MA case (for base-date calculation)
        // การรวม Cancel เข้าไปด้วย ทำให้พอยกเลิกรอบนี้ ระบบจะก้าวไปสร้างรอบถัดไปให้เลย
        const lastClosedMA = maLogs.find(l =>
            l.status === 'Case Closed' ||
            l.status === 'Done' ||
            l.status === 'Completed' ||
            l.status === 'Cancel'
        );

        let baseDate;
        let useImmediateDate = false;

        if (lastClosedMA) {
            // Count forward from the last closed/cancelled MA case
            baseDate = new Date(lastClosedMA.date);
            console.log(`[AutoMA] ${site.name}: baseDate from lastClosedMA/Cancel = ${lastClosedMA.date}`);
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

        const year = nextDate.getFullYear();
        const month = String(nextDate.getMonth() + 1).padStart(2, '0');
        const day = String(nextDate.getDate()).padStart(2, '0');
        const nextDateStr = `${year}-${month}-${day}`;

        console.log(`[AutoMA] ${site.name}: nextDate = ${nextDateStr} (Local), cycle = ${site.maintenanceCycle} days`);

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
                text: `[ระบบ] เคสซ่อมบำรุงอัตโนมัติถูกสร้างขึ้นสำหรับรอบ ${site.maintenanceCycle} วัน`,
                author: "System",
                authorId: "system",
                photoURL: "",
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
    let val;
    if (data instanceof FormData) {
        val = data.get(key);
        if (!isFilled(val) && key === 'installType') {
            val = data.get('category');
        }
    } else {
        val = data[key];
        if (!isFilled(val) && key === 'installType') {
            val = data.category;
        }
        if (!isFilled(val) && typeof key === 'string' && key.startsWith('doorWidth_')) {
            const idx = parseInt(key.replace('doorWidth_', '')) - 1;
            if (Array.isArray(data.doorSizes) && data.doorSizes[idx]) {
                val = data.doorSizes[idx].width;
            }
        }
        if (!isFilled(val) && typeof key === 'string' && key.startsWith('doorHeight_')) {
            const idx = parseInt(key.replace('doorHeight_', '')) - 1;
            if (Array.isArray(data.doorSizes) && data.doorSizes[idx]) {
                val = data.doorSizes[idx].height;
            }
        }
    }
    return val;
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
                const pendInst = (typeof installPhotoPending !== 'undefined' ? installPhotoPending : window.installPhotoPending) || [];
                const pendPre = (typeof preInstallPhotoPending !== 'undefined' ? preInstallPhotoPending : window.preInstallPhotoPending) || [];
                installPhotos = Array.isArray(pendInst) ? pendInst.slice() : [];
                preInstallPhotos = Array.isArray(pendPre) ? pendPre.slice() : [];

                const existingPreJSON = data.get("existingPreInstallPhotosJSON");
                if (existingPreJSON) {
                    try { preInstallPhotos = preInstallPhotos.concat(JSON.parse(existingPreJSON)); } catch (e) { }
                }
                const existingInstJSON = data.get("existingInstallPhotosJSON");
                if (existingInstJSON) {
                    try { installPhotos = installPhotos.concat(JSON.parse(existingInstJSON)); } catch (e) { }
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
            const pendRep = (typeof repairPhotoPending !== 'undefined' ? repairPhotoPending : window.repairPhotoPending) || [];
            repairPhotos = Array.isArray(pendRep) ? pendRep.slice() : [];
            const existingRepJSON = data.get("existingRepairPhotosJSON");
            if (existingRepJSON) {
                try { repairPhotos = repairPhotos.concat(JSON.parse(existingRepJSON)); } catch (e) { }
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

    const useESignature = log instanceof FormData
        ? (log.get('useESignature') === 'on' || log.get('useESignature') === 'true' || document.getElementById("use-esignature-toggle")?.checked || false)
        : (log.useESignature ?? false);

    if (!useESignature) {
        let signedDocs = [];
        if (log instanceof FormData) {
            const existingJSON = log.get("existingSignedDocsJSON");
            if (existingJSON) {
                try { signedDocs = JSON.parse(existingJSON); } catch (e) { }
            }
            const pendDocs = (typeof pendingSignedDocs !== 'undefined' ? pendingSignedDocs : window.pendingSignedDocs) || [];
            if (Array.isArray(pendDocs)) {
                signedDocs = signedDocs.concat(pendDocs);
            }
        } else {
            signedDocs = log.signedDocAttachments || [];
        }
        if (signedDocs.length === 0) {
            missing.push('สำเนาเอกสารที่เซ็นแล้ว (Signed Document Copy)');
        }
    } else {
        if (log.customerSignature || !(log instanceof FormData)) {
            if (log.customerSignature && !isFilled(getFieldValue(log, 'customerName'))) {
                missing.push('ชื่อลูกค้าผู้จบงาน');
            }
            if (log.customerSignature && !isFilled(getFieldValue(log, 'customerPhone'))) {
                missing.push('เบอร์โทรลูกค้าผู้จบงาน');
            }
        }
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

    const useESignature = data instanceof FormData
        ? (data.get('useESignature') === 'on' || data.get('useESignature') === 'true' || document.getElementById("use-esignature-toggle")?.checked || false)
        : (data.useESignature ?? false);

    if (!useESignature) {
        let signedDocs = [];
        if (data instanceof FormData) {
            const existingJSON = data.get("existingSignedDocsJSON");
            if (existingJSON) {
                try { signedDocs = JSON.parse(existingJSON); } catch (e) { }
            }
            const pendDocs = (typeof pendingSignedDocs !== 'undefined' ? pendingSignedDocs : window.pendingSignedDocs) || [];
            if (Array.isArray(pendDocs)) {
                signedDocs = signedDocs.concat(pendDocs);
            }
        } else {
            signedDocs = data.signedDocAttachments || [];
        }
        if (signedDocs.length === 0) {
            missingKeys.push('signed-doc-upload-section');
        }
    } else {
        if (data.customerSignature || !(data instanceof FormData)) {
            if (data.customerSignature && !isFilled(getFieldValue(data, 'customerName'))) {
                missingKeys.push('customerName');
            }
            if (data.customerSignature && !isFilled(getFieldValue(data, 'customerPhone'))) {
                missingKeys.push('customerPhone');
            }
        }
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
                if (getFieldValue(data, key) !== 'pass') {
                    missingKeys.push(key);
                }
            });
        }

        let installPhotos = [];
        let preInstallPhotos = [];
        if (data instanceof FormData) {
            const pendInst = (typeof installPhotoPending !== 'undefined' ? installPhotoPending : window.installPhotoPending) || [];
            const pendPre = (typeof preInstallPhotoPending !== 'undefined' ? preInstallPhotoPending : window.preInstallPhotoPending) || [];
            installPhotos = Array.isArray(pendInst) ? pendInst.slice() : [];
            preInstallPhotos = Array.isArray(pendPre) ? pendPre.slice() : [];

            const existingPreJSON = data.get("existingPreInstallPhotosJSON");
            if (existingPreJSON) {
                try { preInstallPhotos = preInstallPhotos.concat(JSON.parse(existingPreJSON)); } catch (e) { }
            }
            const existingInstJSON = data.get("existingInstallPhotosJSON");
            if (existingInstJSON) {
                try { installPhotos = installPhotos.concat(JSON.parse(existingInstJSON)); } catch (e) { }
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
            const pendRep = (typeof repairPhotoPending !== 'undefined' ? repairPhotoPending : window.repairPhotoPending) || [];
            repairPhotos = Array.isArray(pendRep) ? pendRep.slice() : [];
            const existingRepJSON = data.get("existingRepairPhotosJSON");
            if (existingRepJSON) {
                try { repairPhotos = repairPhotos.concat(JSON.parse(existingRepJSON)); } catch (e) { }
            }
        } else {
            repairPhotos = Array.isArray(data.repairPhotos) ? data.repairPhotos : [];
        }
        if (repairPhotos.length === 0) {
            missingKeys.push('repairPhotos');
        }
    }

    return missingKeys;
}

function highlightIncompleteFields(form, missingKeys) {
    if (!form) return;

    // Clear previous highlights
    const elements = form.querySelectorAll('input, select, textarea, .autocomplete-wrapper, .check-pill-group, #pre-install-photo-preview, #install-photo-preview, #repair-photo-preview, #signed-doc-preview, #btn-pre-install-photo, #btn-install-photo, #btn-repair-photo, #btn-attach-signed-doc, #precheck-section, #repair-checklist-rows');
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

        // Custom Highlight: Precheck Section
        const precheckKeys = [
            'precheckDate', 'precheck_electrical', 'precheck_wiring', 'precheck_grounding', 'precheck_doorMotor',
            'precheck_connectors', 'precheck_vacuumPump', 'precheck_leakTest', 'precheck_chemical',
            'precheck_sensors', 'precheck_sterilize', 'precheck_gasResidual', 'precheck_interior',
            'precheck_exterior'
        ];
        if (precheckKeys.includes(key)) {
            const precheckSection = document.getElementById('precheck-section');
            if (precheckSection) {
                precheckSection.classList.add('is-invalid');
                
                const removeHighlight = () => {
                    precheckSection.classList.remove('is-invalid');
                    // Remove listeners once cleared
                    const elements = precheckSection.querySelectorAll('input');
                    elements.forEach(el => {
                        el.removeEventListener('change', removeHighlight);
                        el.removeEventListener('input', removeHighlight);
                    });
                };
                
                const elements = precheckSection.querySelectorAll('input');
                elements.forEach(el => {
                    el.addEventListener('change', removeHighlight);
                    el.addEventListener('input', removeHighlight);
                });
            }
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

const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function getRecordedCycleCountForCurrentMonth(site) {
    if (!site || !site.maintenancePlans) return null;
    const now = new Date();
    const yearBE = String(now.getFullYear() + 543);
    const monthKey = String(now.getMonth() + 1);

    const yearPlans = site.maintenancePlans[yearBE];
    if (!yearPlans) return null;

    const monthData = yearPlans[monthKey];
    if (!monthData) return null;

    if (monthData.cycleCount != null && monthData.cycleCount !== '') {
        return monthData.cycleCount;
    }
    if (Array.isArray(monthData.history)) {
        const item = monthData.history.find(h => h.cycleCount != null && h.cycleCount !== '');
        if (item) return item.cycleCount;
    }
    return null;
}

let isPublicReportPageInitialized = false;

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

    if (isPublicReportPageInitialized) {
        if (!auth.currentUser) {
            signInAnonymously(auth).catch(e => console.warn('Anonymous auth failed:', e));
        }
        return;
    }
    isPublicReportPageInitialized = true;

    // Show mode selector by default
    showPortalMode('selector');

    let loadedSite = null;

    // Mode selector buttons
    const btnReport = document.getElementById('btn-mode-report');
    const btnCycle = document.getElementById('btn-mode-cycle');
    if (btnReport) btnReport.onclick = () => showPortalMode('report');
    if (btnCycle) {
        btnCycle.onclick = () => {
            if (loadedSite) {
                const existingCurrentCycle = getRecordedCycleCountForCurrentMonth(loadedSite);
                if (existingCurrentCycle !== null) {
                    const now = new Date();
                    const currentYearBE = String(now.getFullYear() + 543);
                    const currentMonthName = monthNamesThai[now.getMonth()];
                    alert(`ในเดือน${currentMonthName} ${currentYearBE} ได้มีการบันทึก Cycle Count ไปแล้ว (${Number(existingCurrentCycle).toLocaleString()} รอบ)\nไม่สามารถบันทึก Cycle Count ซ้ำในเดือนเดียวกันได้`);
                }
            }
            showPortalMode('cycle');
        };
    }

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
                    loadedSite = site;

                    // Check if Cycle Count has already been recorded for the current month
                    const existingCurrentCycle = getRecordedCycleCountForCurrentMonth(site);
                    const now = new Date();
                    const currentYearBE = String(now.getFullYear() + 543);
                    const currentMonthName = monthNamesThai[now.getMonth()];

                    const portalBadgeEl = document.getElementById('portal-cycle-status-badge');
                    const alertBox = document.getElementById('cycle-already-recorded-alert');
                    const alertText = document.getElementById('cycle-already-recorded-text');
                    const cycleSubmitBtn = document.getElementById('btn-public-cycle-submit');

                    if (existingCurrentCycle !== null) {
                        if (portalBadgeEl) {
                            portalBadgeEl.textContent = `(บันทึกแล้วเดือน${currentMonthName}: ${Number(existingCurrentCycle).toLocaleString()} รอบ)`;
                            portalBadgeEl.style.display = 'block';
                        }
                        if (alertText) {
                            alertText.innerHTML = `ในเดือน<strong>${currentMonthName} ${currentYearBE}</strong> ได้มีการบันทึก Cycle Count ไปแล้ว (<strong>${Number(existingCurrentCycle).toLocaleString()}</strong> รอบ) ไม่สามารถบันทึกซ้ำในเดือนเดียวกันได้`;
                        }
                        if (alertBox) {
                            alertBox.style.display = 'block';
                        }
                        const nameInput = document.getElementById('cycle-reporter-name');
                        const telInput = document.getElementById('cycle-reporter-tel');
                        const valInput = document.getElementById('cycle-count-value');
                        const addMediaBtn = document.getElementById('btn-add-cycle-media');

                        if (nameInput) nameInput.disabled = true;
                        if (telInput) telInput.disabled = true;
                        if (valInput) valInput.disabled = true;
                        if (addMediaBtn) addMediaBtn.disabled = true;
                        if (cycleSubmitBtn) {
                            cycleSubmitBtn.disabled = true;
                            const btnText = cycleSubmitBtn.querySelector('span');
                            if (btnText) btnText.textContent = 'บันทึกไปแล้วในเดือนนี้';
                        }
                    } else {
                        if (portalBadgeEl) portalBadgeEl.style.display = 'none';
                        if (alertBox) alertBox.style.display = 'none';
                        const nameInput = document.getElementById('cycle-reporter-name');
                        const telInput = document.getElementById('cycle-reporter-tel');
                        const valInput = document.getElementById('cycle-count-value');
                        const addMediaBtn = document.getElementById('btn-add-cycle-media');

                        if (nameInput) nameInput.disabled = false;
                        if (telInput) telInput.disabled = false;
                        if (valInput) valInput.disabled = false;
                        if (addMediaBtn) addMediaBtn.disabled = false;
                        if (cycleSubmitBtn) {
                            cycleSubmitBtn.disabled = false;
                            const btnText = cycleSubmitBtn.querySelector('span');
                            if (btnText) btnText.textContent = 'บันทึก Cycle Count';
                        }
                    }

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
                    if (form.dataset.submitting === 'true') {
                        console.warn('Report submission already in progress');
                        return;
                    }
                    form.dataset.submitting = 'true';

                    const name = document.getElementById('report-name')?.value.trim();
                    const tel = document.getElementById('report-tel')?.value.trim();
                    const position = document.getElementById('report-position')?.value.trim();
                    const description = document.getElementById('report-description')?.value.trim();
                    const cycleCountVal = document.getElementById('report-cycle-count')?.value.trim();

                    if (!name || !tel || !description) {
                        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
                        form.dataset.submitting = 'false';
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
                                    form.dataset.submitting = 'false';
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

                        await FirestoreService.addLog(logData);
                        showSuccessMessage(
                            'ส่งคำร้องสำเร็จ!',
                            'ทีมงานได้รับคำร้องของคุณแล้ว<br>และจะติดต่อกลับโดยเร็วที่สุด',
                            caseId
                        );
                    } catch (err) {
                        console.error('Public report submission failed:', err);
                        form.dataset.submitting = 'false';
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
                    if (cycleForm.dataset.submitting === 'true') {
                        console.warn('Cycle submission already in progress');
                        return;
                    }
                    cycleForm.dataset.submitting = 'true';

                    const name = document.getElementById('cycle-reporter-name')?.value.trim();
                    const tel = document.getElementById('cycle-reporter-tel')?.value.trim();
                    const cycleVal = document.getElementById('cycle-count-value')?.value.trim();
                    const note = document.getElementById('cycle-note')?.value.trim();

                    if (!name || !tel || !cycleVal) {
                        alert('กรุณากรอกชื่อ เบอร์โทร และจำนวนรอบเครื่องให้ครบถ้วน');
                        cycleForm.dataset.submitting = 'false';
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

                        const existingCurrentCycle = getRecordedCycleCountForCurrentMonth(site);
                        if (existingCurrentCycle !== null) {
                            const now = new Date();
                            const currentYearBE = String(now.getFullYear() + 543);
                            const currentMonthName = monthNamesThai[now.getMonth()];
                            alert(`ในเดือน${currentMonthName} ${currentYearBE} ได้มีการบันทึก Cycle Count ไปแล้ว (${Number(existingCurrentCycle).toLocaleString()} รอบ)\nไม่สามารถบันทึก Cycle Count ซ้ำในเดือนเดียวกันได้`);
                            cycleForm.dataset.submitting = 'false';
                            cycleSubmitBtn.disabled = true;
                            if (btnIcon) btnIcon.className = 'fa-solid fa-ban';
                            if (btnText) btnText.textContent = 'บันทึกไปแล้วในเดือนนี้';
                            return;
                        }

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
                        cycleForm.dataset.submitting = 'false';
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


export { toggleMaRoundSections, renderRepairChecklist, renderReturnProductList, renderDoorSizeFields, updateDoorCount, getRdpbRegionCode, handleSiteSubmit, editSite, buildInspectionSummary, handleLogMaintenance, checkAndAutoCreateMaintenanceCase, runAutoMaintenanceCheckForAllSites, deleteSite, confirmDelete, resetLogForm, openLogModalForDate, populateResponderDropdown, checkEditPermission, editLog, getFieldValue, isFilled, parseRepairChecklist, currentUserHasProfileSignature, requireAdminManagerProfileSignature, getCategorySpecificDoneFields, getIncompleteDoneFields, getIncompleteDoneFieldKeys, highlightIncompleteFields, canMarkDone, quickUpdateStatus, deleteLog, viewSiteHistory, addLineItemRow, recalcLineItemTotal, getLineItems, updatePublicReportMediaPreview, updatePublicCycleMediaPreview, showPortalMode, uploadMediaFiles, initPublicReportPage };
