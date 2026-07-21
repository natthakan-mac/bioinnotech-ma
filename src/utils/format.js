

function formatCurrency(value) {
    if (value === "" || value === null || value === undefined) return "";
    const formatted = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
    return formatted + ' บาท';
}

function parseCurrency(str) {
    if (typeof str === "number") return str;
    if (!str) return 0;
    // Remove anything that isn't a digit, dot, or minus
    const cleanStr = str.replace(/[^0-9.-]/g, "");
    return parseFloat(cleanStr) || 0;
}

// Helper for consistent site colors
const getSiteColor = (name) => {
    const colors = [
        "#3b82f6", // blue-500
        "#10b981", // emerald-500
        "#8b5cf6", // violet-500
        "#f59e0b", // amber-500
        "#f43f5e", // rose-500
        "#06b6d4", // cyan-500
        "#6366f1", // indigo-500
        "#14b8a6", // teal-500
        "#d946ef", // fuchsia-500
        "#f97316", // orange-500
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};


function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}


export { formatCurrency, parseCurrency, formatFileSize, getSiteColor };