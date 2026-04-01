const fs = require('fs');
const path = require('path');
let js = fs.readFileSync(path.join(__dirname, '../functions/index.js'), 'utf8');
js = js.replace(/water-plant-maintenance\.web\.app/g, 'casp-ma.web.app');
js = js.replace(/Water Plant Maintenance System/g, 'Maintenance System');
fs.writeFileSync(path.join(__dirname, '../functions/index.js'), js, 'utf8');
console.log('Functions URLs updated.');
