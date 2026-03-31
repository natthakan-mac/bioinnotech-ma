const fs = require('fs');
const iconv = require('iconv-lite');

const buf = fs.readFileSync('../ha_aod_001-2.csv');
const txt = iconv.decode(buf, 'tis620');
const lines = txt.split('\n');

const hospitals = [];
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // CSV parse: split by comma but respect quoted fields
    const cols = line.split(',');
    const name = cols[2] ? cols[2].trim().replace(/^"|"$/g, '') : '';
    if (name) hospitals.push(name);
}

// Deduplicate and sort
const unique = [...new Set(hospitals)].sort((a, b) => a.localeCompare(b, 'th'));

const output = `// Auto-generated from ha_aod_001-2.csv
const HOSPITAL_LIST = ${JSON.stringify(unique, null, 2)};
`;

fs.writeFileSync('../hospital-data.js', output, 'utf8');
console.log(`Extracted ${unique.length} hospitals -> hospital-data.js`);
