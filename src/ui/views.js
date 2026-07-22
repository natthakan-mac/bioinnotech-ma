import { auth, functions } from '../config/firebase.js';
import { state } from '../store/state.js';
import { FirestoreService } from '../services/firestore.js';
import { showDialog, showToast } from '../utils/ui.js';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/date.js';
import { formatCurrency, formatFileSize, getSiteColor } from '../utils/format.js';
import { setupSiteNameAutoGeneration } from '../utils/autocomplete.js';

let generateMockLogs;

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

    // Populate log-view province filter (engineer view)
    const logProvinceSelect = document.getElementById("filter-log-province");
    if (logProvinceSelect) {
        const currentLogProvince = logProvinceSelect.value;
        logProvinceSelect.innerHTML = '<option value="all">ทั้งหมด</option>';
        provinces.forEach((p) => {
            logProvinceSelect.appendChild(Object.assign(document.createElement("option"), { value: p, textContent: p }));
        });
        if (provinces.includes(currentLogProvince)) {
            logProvinceSelect.value = currentLogProvince;
        }
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
    updateCaseDashboard();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ... initialization and other code ...

// ...

// Helper: Pure Client-Side Filtering
function filterLogsClientSide(logsToFilter, filters) {
    let result = logsToFilter;

    // 0. Province Filter (filter by site's province before anything else)
    if (filters.province && filters.province !== "all") {
        result = result.filter((l) => {
            const site = state.sites.find((s) => s.id === l.siteId);
            return site && site.province === filters.province;
        });
    }

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
    const provinceFilter = document.getElementById("filter-log-province")
        ? document.getElementById("filter-log-province").value
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
        province: provinceFilter,
        minPrice: 0,
        maxPrice: Infinity,
        searchQuery,
    });
}


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

        // Show immediately with cached logs (fast feedback), then update with full Firestore data
        dashboard.style.display = 'flex';
        processDashboardLogs(state.logs || []);

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
        const provinceFilter = document.getElementById("filter-log-province")
            ? document.getElementById("filter-log-province").value
            : "all";

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
            province: provinceFilter,
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
            province: provinceFilter,
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
        entries.forEach((entry) => {
            if (entry.isIntersecting && !state.isLoadingLogs) {
                handleLoadMoreLogs();
            }
        });
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
                const targetTbody = document.getElementById("logs-table-body");
                const tableContainer = targetTbody ? targetTbody.closest(".table-container") : document.querySelector(".table-container");
                if (tableContainer) {
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


generateMockLogs = window.generateMockLogs = async function (count = 50) {
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


export { switchView, toggleModal, resetSiteForm, renderAll, renderCurrentView, setupSiteManagerFilters, populateSiteFilters, renderSites, setupCustomNameLogic, viewSiteDetails, renderLogComments, expandCommentsIfCollapsed, scrollToInitialComment, scrollToLatestComment, toggleCommentSection, toggleCostSection, toggleFormCostSection, postLogComment, viewLogDetails, viewSiteLogs, filterLogsClientSide, getFilteredLogs, updateLogStats, updateCaseDashboard, renderLogs, handleLoadMoreLogs, appendLogRows, generateMockLogs };
