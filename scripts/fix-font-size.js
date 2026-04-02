const fs = require('fs');
const path = require('path');
let js = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

// Only target the inspection detail rendering area (lines ~8940-8970)
// Replace 0.85rem with 0.88rem in the physical/performance/checklist spans
const oldPhys = [
    'font-size:0.85rem; color:#333; flex:1;">อุณหภูมิเฉลี่ยในการทำงาน',
    'font-size:0.85rem; margin-right:0.75rem;">',
    'font-size:0.85rem; color:#333; flex:1;">อุณหภูมิเฉลี่ยพื้นที่',
    'font-size:0.85rem; color:#333; flex:1;">ตรวจสอบการรั่วไหล',
    'font-size:0.85rem; color:#333;">ตรวจสอบด้วย Comply Type 5',
    'font-size:0.85rem; color:#333;">ตรวจสอบการทะลุทะลวงด้วย CI PCD Type 5',
    'font-size:0.85rem; color:#333;">'
];

oldPhys.forEach(s => {
    js = js.split(s).join(s.replace('0.85rem', '0.88rem'));
});

fs.writeFileSync(path.join(__dirname, '../app.js'), js, 'utf8');
console.log('Font sizes unified to 0.88rem');
