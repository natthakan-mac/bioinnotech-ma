const fs = require('fs');
const iconv = require('iconv-lite');

const path = require('path');
const buf = fs.readFileSync(path.join(__dirname, '..', 'ha_aod_001-2.csv'));
const txt = iconv.decode(buf, 'tis620');
const lines = txt.split('\n');

const hospitalMap = new Map(); // name -> province (dedup by name, keep first province)
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    const province = cols[1] ? cols[1].trim().replace(/^"|"$/g, '') : '';
    const name = cols[2] ? cols[2].trim().replace(/^"|"$/g, '') : '';
    if (name && !hospitalMap.has(name)) {
        hospitalMap.set(name, province);
    }
}

// Build sorted array of objects
const result = Array.from(hospitalMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'th'))
    .map(([name, province]) => ({ name, province }));

const output = `// Auto-generated from ha_aod_001-2.csv\nconst HOSPITAL_LIST = ${JSON.stringify(result, null, 2)};\n`;

fs.writeFileSync(path.join(__dirname, '..', 'hospital-data.js'), output, 'utf8');
console.log(`Extracted ${result.length} hospitals with province -> hospital-data.js`);
// Show a few samples
result.slice(0, 5).forEach(h => console.log(`  ${h.name} -> ${h.province}`));
