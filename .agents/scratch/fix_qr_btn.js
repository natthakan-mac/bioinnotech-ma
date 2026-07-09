const fs = require('fs');

const filePath = 'C:/Users/Administrator/Documents/GitHub/bioinnotech-ma/app.js';
let code = fs.readFileSync(filePath, 'utf8');

console.log('Original code length:', code.length);

const regex = /function showDeviceQR\(siteId\)[\s\S]*?modal\.style\.display\s*=\s*'flex';/;

if (regex.test(code)) {
    code = code.replace(regex, `function showDeviceQR(siteId) {
    alert('[debug 1] showDeviceQR start: ' + siteId);
    try {
        const site = state.sites.find(s => s.id === siteId);
        if (!site) {
            alert('[debug 2] Site not found! siteId=' + siteId);
            showToast('ไม่พบข้อมูลเครื่อง', 'error');
            return;
        }
        alert('[debug 3] Site found: ' + site.name);
        const modal = document.getElementById('modal-device-qr');
        if (!modal) {
            alert('[debug 4] Modal element not found!');
            return;
        }
        alert('[debug 5] Modal element found.');

        // Show modal and register close handlers immediately so the UI always pops up instantly
        const btnClose = document.getElementById('btn-close-qr-modal');
        if (btnClose) btnClose.onclick = () => closeDeviceQRModal();
        modal.onclick = (e) => { if (e.target === modal) closeDeviceQRModal(); };
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        alert('[debug 6] Modal display set to flex.');`);
    console.log('Successfully replaced and cleaned up showDeviceQR');
} else {
    console.log('Regex did not match!');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Done');
