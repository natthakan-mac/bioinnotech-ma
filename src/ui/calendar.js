import { state } from '../store/state.js';
import { FirestoreService } from '../services/firestore.js';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/date.js';
import { isMaCategory, showToast } from '../utils/ui.js';
import { getSiteColor } from '../utils/format.js';

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

    // Reset Province Filter (engineer view)
    const logProvinceSelect = document.getElementById("filter-log-province");
    if (logProvinceSelect) logProvinceSelect.value = "all";

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
                        <span style="font-size:0.7rem; font-weight:600; color:var(--text-color);">${site ? site.siteCode || "-" : "-"}</span>
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


export { resetFilters, switchLogView, fetchAndRenderCalendar, changeCalendarMonth, renderCalendar, showDayDetails, getPlanMonthData, migratePlanToObjectFormat, renderMaintenancePlan, showPlanCellMenu, hidePlanCellMenu, updateStaffCyclePreview, initStaffCycleUpload, deleteCycleRecord, parseDateToTimelineCoords, isBeforeTimeline, isAfterTimeline, getLatestCycleCountFromPlans, getPreviousCycleCount, getNextCycleCount, openCycleCountModal, closeCycleCountModal, saveCycleCount, clearCycleCount, deletePlanEntry, openPlanDateModal, closePlanDateModal, savePlanDate, initPlanDateModal, togglePlanStatus, initCycleCountModal };
