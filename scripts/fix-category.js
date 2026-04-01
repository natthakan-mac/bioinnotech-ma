const fs = require('fs');
const path = require('path');

let js = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

// Helper: match category checks for maintenance-type
// Old: "Maintenance" or category === "อื่นๆ"
// New: "บำรุงรักษาตามรอบ" or "ตามสัญญาจ้าง" or "ตามใบสั่งซื้อ"

// The auto-open logic checks if a case is "Maintenance" type.
// With new categories, all 3 are maintenance-type, so we replace:
// category === "Maintenance" → isMaCategory(category)
// We'll also replace the default "Maintenance" string with "บำรุงรักษาตามรอบ"

// 1. Replace all standalone "Maintenance" category values used as defaults
js = js.replace(/category: "Maintenance"/g, 'category: "บำรุงรักษาตามรอบ"');
js = js.replace(/category: logData\.category \|\| "Maintenance"/g, 'category: logData.category || "บำรุงรักษาตามรอบ"');
js = js.replace(/category: log\.category \|\| "Maintenance"/g, 'category: log.category || "บำรุงรักษาตามรอบ"');

// 2. Replace category comparisons in conditions
// l.category === "Maintenance" || l.category === "อื่นๆ"  →  isMaCategory(l.category)
js = js.replace(/l\.category === "Maintenance" \|\| l\.category === "อื่นๆ"/g, 'isMaCategory(l.category)');
js = js.replace(/\(l\.category === "Maintenance" \|\| l\.category === "อื่นๆ" \|\| l\.objective\?\.includes\("รอบซ่อมบำรุง"\)\)/g, 'isMaCategory(l.category)');

// existingLog.category === "Maintenance" || existingLog.category === "อื่นๆ"
js = js.replace(/existingLog\.category === "Maintenance" \|\| existingLog\.category === "อื่นๆ"/g, 'isMaCategory(existingLog.category)');

// logData.category === "Maintenance"
js = js.replace(/logData\.category === "Maintenance"/g, 'isMaCategory(logData.category)');
js = js.replace(/logData\.category !== "Maintenance"/g, '!isMaCategory(logData.category)');

// log.category === "Maintenance"  (standalone, not part of ||)
js = js.replace(/log\.category === "Maintenance" \|\| log\.category === "อื่นๆ" \|\| log\.objective\?\.includes\("รอบซ่อมบำรุง"\)/g, 'isMaCategory(log.category)');
js = js.replace(/log\.category === "Maintenance"/g, 'isMaCategory(log.category)');

// l.category === "Maintenance" standalone (for site card MA cycle calc)
js = js.replace(/l\.category === "Maintenance"/g, 'isMaCategory(l.category)');

// 3. Replace category display icons
js = js.replace(/if \(log\.category === "Maintenance"\)/g, 'if (isMaCategory(log.category))');
js = js.replace(/else if \(log\.category === "Incident"\)/g, 'else if (log.category === "ตามใบสั่งซื้อ")');

// 4. Default category in edit form
js = js.replace(/categorySelect\.value = log\.category \|\| "Maintenance"/g, 'categorySelect.value = log.category || "บำรุงรักษาตามรอบ"');

// 5. Add isMaCategory helper function near the top (after first function declaration)
const helperFn = `
// Helper: check if category is a maintenance-type category
function isMaCategory(cat) {
    return cat === "บำรุงรักษาตามรอบ" || cat === "ตามสัญญาจ้าง" || cat === "ตามใบสั่งซื้อ" || cat === "Maintenance" || cat === "อื่นๆ";
}

`;

// Insert after the first "use strict" or at the very beginning of meaningful code
const insertPoint = js.indexOf('// --- Firebase Configuration ---');
if (insertPoint !== -1) {
    js = js.substring(0, insertPoint) + helperFn + js.substring(insertPoint);
}

fs.writeFileSync(path.join(__dirname, '../app.js'), js, 'utf8');
console.log('Category references updated.');
