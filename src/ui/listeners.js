import { state } from '../store/state.js';
import { handleLogin, isMobile } from '../ui/profile.js';
import { handleLineLogin } from '../services/line.js?v=1.1.8';
import { views, modals, grids, selects, addressInputs } from './selectors.js';
import { switchView, toggleModal, resetSiteForm, renderSites, renderCurrentView, viewSiteDetails, viewSiteLogs, viewLogDetails, generateMockLogs } from './views.js';
import { initCycleCountModal, initPlanDateModal, switchLogView, changeCalendarMonth, resetFilters } from './calendar.js';
import { resetLogForm, editSite, deleteSite, viewSiteHistory, editLog, deleteLog, openLogModalForDate, handleLogMaintenance } from './forms.js';
import { initSiteMap, updateLocationUrlInput } from './map.js';
import { showDialog, showToast } from '../utils/ui.js';
import { parseCurrency, formatCurrency } from '../utils/format.js';
import { FirestoreService } from '../services/firestore.js';
import { initMaFormCommentAttachments } from './attachments.js';
import { exportLogsToExcel, exportSitesToExcel, exportDevicesPDF, exportAnnualPlanPDF, exportCasePDF } from './export.js';

function setupEventListeners() {
    // Auth & Login Form Event Listeners
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    const btnLineLogin = document.getElementById("btn-line-login");
    if (btnLineLogin) {
        btnLineLogin.addEventListener("click", (e) => {
            e.preventDefault();
            handleLineLogin();
        });
    }

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

    const btnAddSite = document.getElementById("btn-add-site");
    if (btnAddSite) {
        btnAddSite.addEventListener("click", () => {
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
    }

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

    // Province Filter (engineer view)
    const logProvinceFilter = document.getElementById("filter-log-province");
    if (logProvinceFilter)
        logProvinceFilter.addEventListener("change", renderCurrentView);

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

}
export { setupEventListeners };
