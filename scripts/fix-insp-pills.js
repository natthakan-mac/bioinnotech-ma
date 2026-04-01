const fs = require('fs');
const path = require('path');
let html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

// Replace pill labels in inspection checklist rows only
// Pattern: class="check-pill neutral"...value="check"><span>ตรวจ</span>
// Change to: class="check-pill insp-check"...value="check"><span>Check</span>
// Same for service and replace

html = html.replace(/class="check-pill neutral"(.*?)value="check"><span>ตรวจ<\/span>/g,
    'class="check-pill insp-check"$1value="check"><span>Check</span>');
html = html.replace(/class="check-pill neutral"(.*?)value="service"><span>ซ่อม<\/span>/g,
    'class="check-pill insp-service"$1value="service"><span>Service</span>');
html = html.replace(/class="check-pill neutral"(.*?)value="replace"><span>เปลี่ยน<\/span>/g,
    'class="check-pill insp-replace"$1value="replace"><span>Replace</span>');

fs.writeFileSync(path.join(__dirname, '../index.html'), html, 'utf8');
console.log('Inspection pill labels updated');
