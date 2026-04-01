const fs = require('fs');
const path = require('path');
let h = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
h = h.replace(/type="checkbox" name="insp_(\w+)_(check|service|replace)"/g, (m, item, action) => {
    return `type="radio" name="insp_${item}" value="${action}"`;
});
fs.writeFileSync(path.join(__dirname, '../index.html'), h, 'utf8');
console.log('Checkboxes converted to radios');
