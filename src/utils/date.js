

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

function formatDateTimeDDMMYYYY(dateInput) {
    if (!dateInput) return "-";
    const d = new Date(dateInput);
    if (isNaN(d)) return "-";

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    if (hours === '00' && minutes === '00') return `${day}/${month}/${year}`;
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}


export { sanitizeDate, formatThaiDate, formatDateDDMMYYYY, formatDateTimeDDMMYYYY };