const fs = require('fs');
const path = require('path');
let js = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

js = js.replace(/🟡 เปิดงาน/g, 'เปิดงาน');
js = js.replace(/🔵 วางแผน/g, 'วางแผน');
js = js.replace(/🟠 กำลังดำเนินการ/g, 'กำลังดำเนินการ');
js = js.replace(/🟣 เสร็จสิ้น/g, 'เสร็จสิ้น');
js = js.replace(/🟢 ปิดเคส/g, 'ปิดเคส');
js = js.replace(/🔴 ยกเลิก/g, 'ยกเลิก');

fs.writeFileSync(path.join(__dirname, '../app.js'), js, 'utf8');
console.log('Status emojis removed');
