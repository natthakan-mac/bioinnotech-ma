// Final cleanup: remove all remaining recycle bin / action log code from app.js
const fs = require('fs');

let content = fs.readFileSync('app.js', 'utf8');

// ── 1. Fix deleteSite: remove moveToRecycleBin call ──────────────────────────
content = content.replace(
    /async deleteSite\(id\) \{[\s\S]*?await deleteDoc\(docRef\);\s*\},/,
    `async deleteSite(id) {
        const docRef = doc(db, "sites", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            await this.logAction("SITE", "DELETE", \`Deleted site\`, {
                siteId: id,
                data: data,
            });
        }
        await deleteDoc(docRef);
    },`
);

// ── 2. Fix deleteLog: remove moveToRecycleBin call ───────────────────────────
content = content.replace(
    /async deleteLog\(id\) \{[\s\S]*?await deleteDoc\(docRef\);\s*\},/,
    `async deleteLog(id) {
        const docRef = doc(db, "logs", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            await this.logAction("LOG", "DELETE", \`Deleted log\`, {
                logId: id,
                data: data,
            });
        }
        await deleteDoc(docRef);
    },`
);

// ── 3. Remove recycleLogsBySiteId method ─────────────────────────────────────
content = content.replace(
    /\s*async recycleLogsBySiteId\(siteId\) \{[\s\S]*?\},\s*(?=\/\/ --- Recycle Bin ---)/,
    '\n'
);

// ── 4. Remove the entire Recycle Bin section in FirestoreService ─────────────
content = content.replace(
    /\s*\/\/ --- Recycle Bin ---\s*async moveToRecycleBin[\s\S]*?async emptyRecycleBin[\s\S]*?console\.log\("Recycle bin emptied\."\);\s*\},/,
    ''
);

// ── 5. Remove fetchActionLogs, subscribeToActionLogs, deleteAllActionLogs ────
content = content.replace(
    /\s*async fetchActionLogs\(limitCount = 500\) \{[\s\S]*?\},\s*\/\/ Real-time Subscription for Action Logs\s*subscribeToActionLogs[\s\S]*?\},\s*async deleteAllActionLogs\(\) \{[\s\S]*?console\.log\("All action logs deleted\."\);\s*\},/,
    ''
);

// ── 6. Fix the site delete confirm handler: replace recycleLogsBySiteId ──────
content = content.replace(
    /await FirestoreService\.deleteSite\(id\);\s*await FirestoreService\.recycleLogsBySiteId\(id\);\s*showToast\("ลบสถานที่สำเร็จ \(ย้ายไปถังขยะ\)", "success"\);/,
    `await FirestoreService.deleteSite(id);
            await FirestoreService.deleteLogsBySiteId(id);
            showToast("ลบสถานที่สำเร็จ", "success");`
);

// ── 7. Remove emptyRecycleBin call from data wipe function ───────────────────
content = content.replace(
    /console\.log\("2\. Emptying Recycle Bin\.\.\."\);\s*await FirestoreService\.emptyRecycleBin\(\);\s*/g,
    ''
);
content = content.replace(
    /await FirestoreService\.emptyRecycleBin\(\);\s*/g,
    ''
);

// ── 8. Remove deleteAllActionLogs call from data wipe ────────────────────────
content = content.replace(
    /console\.log\("3\. Deleting Action Logs\.\.\."\);\s*await FirestoreService\.deleteAllActionLogs\(\);\s*/g,
    ''
);

// ── 9. Remove the entire orphaned recycle bin UI block (renderRecycleBin etc) ─
// Find the second "// --- Recycle Bin UI Logic ---" block if it still exists
const recycleBinUIStart = content.indexOf('// --- Recycle Bin UI Logic ---');
if (recycleBinUIStart !== -1) {
    // Find the next major section after it
    const profilePhotoStart = content.indexOf('// --- Profile Photo Upload', recycleBinUIStart);
    if (profilePhotoStart !== -1) {
        content = content.slice(0, recycleBinUIStart) + content.slice(profilePhotoStart);
        console.log('Removed orphaned Recycle Bin UI block');
    }
}

// ── 10. Remove window.renderRecycleBin etc global exposures ──────────────────
content = content.replace(/window\.renderRecycleBin\s*=\s*renderRecycleBin;\s*/g, '');
content = content.replace(/window\.handleRestore\s*=\s*handleRestore;\s*/g, '');
content = content.replace(/window\.handleDeleteForever\s*=\s*handleDeleteForever;\s*/g, '');
content = content.replace(/window\.filterRecycleBin\s*=\s*filterRecycleBin;\s*/g, '');
content = content.replace(/window\.handleEmptyRecycleBin\s*=\s*handleEmptyRecycleBin;\s*/g, '');
content = content.replace(/window\.clearRecycleBinFilters\s*=\s*clearRecycleBinFilters;\s*/g, '');
content = content.replace(/window\.handleClearActionLogs\s*=\s*handleClearActionLogs;\s*/g, '');

// ── 11. Remove setupRecycleBinTabs call in init ───────────────────────────────
content = content.replace(/\s*setupRecycleBinTabs\(\);\s*\/\/ New Tab Logic\s*/g, '\n');
content = content.replace(/\s*setupRecycleBinTabs\(\);\s*/g, '\n');

fs.writeFileSync('app.js', content, 'utf8');
console.log('Cleanup complete.');

// Verify
const remaining = [
    'moveToRecycleBin', 'recycleLogsBySiteId', 'fetchDeletedItems',
    'emptyRecycleBin', 'renderRecycleBin', 'handleRestore', 'handleDeleteForever',
    'filterRecycleBin', 'handleEmptyRecycleBin', 'clearRecycleBinFilters',
    'setupRecycleBinTabs', 'renderActionLogs', 'handleClearActionLogs',
    'deleteAllActionLogs', 'subscribeToActionLogs', 'fetchActionLogs'
].filter(term => content.includes(term));

if (remaining.length === 0) {
    console.log('✓ All recycle bin / action log code removed successfully.');
} else {
    console.log('⚠ Still found:', remaining);
}
