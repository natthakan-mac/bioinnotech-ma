const fs = require('fs');
const path = require('path');

['../index.html', '../app.js'].forEach(file => {
    const fp = path.join(__dirname, file);
    let content = fs.readFileSync(fp, 'utf8');
    content = content.replace(/ผู้รับผิดชอบ/g, 'เจ้าหน้าที่ช่างบริการ');
    fs.writeFileSync(fp, content, 'utf8');
    console.log('Updated:', file);
});
