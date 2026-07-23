import { state } from '../store/state.js';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/date.js';
import { isMaCategory, showDialog } from '../utils/ui.js';
import { selects } from './selectors.js';
import { parseCurrency, formatCurrency, getSiteColor } from '../utils/format.js';

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

    const appBaseUrl = getAppBaseUrl();
    const caseOrigin = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:') && !window.location.origin.startsWith('about:'))
        ? appBaseUrl
        : 'https://casp-ma.web.app/';
    const caseQrUrl = `${caseOrigin}${caseOrigin.endsWith('/') ? '' : '/'}?logId=${encodeURIComponent(log.id)}`;

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
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(caseQrUrl)}" alt="QR" style="width:45px; height:45px;">
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
    const appBaseUrl = getAppBaseUrl();
    const caseOrigin = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:') && !window.location.origin.startsWith('about:'))
        ? appBaseUrl
        : 'https://casp-ma.web.app/';
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
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(caseOrigin)}" alt="QR" style="width:45px; height:45px;">
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


export { exportSitesToExcel, exportCasePDF, exportLogsToExcel, getAppBaseUrl, showDeviceQR, closeDeviceQRModal, printDeviceQR, showPdfPreview, exportAnnualPlanPDF, exportCaseHistoryPDF, setupCompanySettingsForm, exportDevicesPDF };
