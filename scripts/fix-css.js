const fs = require('fs');
const path = require('path');

let css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');

const replacements = [
    // Solid dark backgrounds
    [/#1e293b/g, '#ffffff'],
    [/#0f172a/g, '#f5f5f5'],
    [/#334155/g, '#e0e0e0'],
    // Dark rgba backgrounds
    [/rgba\(30,\s*41,\s*59,\s*[\d.]+\)/g, (m) => {
        const a = parseFloat(m.match(/[\d.]+\)$/)[0]);
        return a >= 0.8 ? '#ffffff' : `rgba(255,255,255,${a})`;
    }],
    [/rgba\(15,\s*23,\s*42,\s*[\d.]+\)/g, (m) => {
        const a = parseFloat(m.match(/[\d.]+\)$/)[0]);
        return a === 0 ? 'rgba(255,255,255,0)' : (a >= 0.8 ? '#f5f5f5' : `rgba(0,0,0,${(a * 0.15).toFixed(2)})`);
    }],
    // White text on dark → dark text
    [/color:\s*#f8fafc/g, 'color: #111111'],
    [/color:\s*#e2e8f0/g, 'color: #222222'],
    [/color:\s*#cbd5e1/g, 'color: #444444'],
    [/color:\s*#94a3b8/g, 'color: #666666'],
    [/color:\s*rgba\(255,\s*255,\s*255,\s*0\.7\)/g, 'color: rgba(0,0,0,0.5)'],
    [/color:\s*rgba\(255,\s*255,\s*255,\s*0\.5\)/g, 'color: rgba(0,0,0,0.4)'],
    [/color:\s*rgba\(255,\s*255,\s*255,\s*0\.3\)/g, 'color: rgba(0,0,0,0.3)'],
    [/color:\s*white/g, 'color: #111111'],
    // White borders → light grey
    [/rgba\(255,\s*255,\s*255,\s*0\.1\)/g, 'rgba(0,0,0,0.08)'],
    [/rgba\(255,\s*255,\s*255,\s*0\.08\)/g, 'rgba(0,0,0,0.06)'],
    [/rgba\(255,\s*255,\s*255,\s*0\.15\)/g, 'rgba(0,0,0,0.1)'],
    [/rgba\(255,\s*255,\s*255,\s*0\.2\)/g, 'rgba(0,0,0,0.12)'],
    [/rgba\(255,\s*255,\s*255,\s*0\.05\)/g, 'rgba(0,0,0,0.04)'],
    [/rgba\(255,\s*255,\s*255,\s*0\.02\)/g, 'rgba(0,0,0,0.02)'],
    // Primary blue → black
    [/#38bdf8/g, '#111111'],
    [/#0ea5e9/g, '#333333'],
    [/#06b6d4/g, '#111111'],
    [/#3b82f6/g, '#333333'],
    [/rgba\(56,\s*189,\s*248,[\s\d.,]+\)/g, (m) => {
        const a = parseFloat(m.match(/[\d.]+\)$/)[0]);
        return `rgba(0,0,0,${(a * 0.8).toFixed(2)})`;
    }],
    [/rgba\(14,\s*165,\s*233,[\s\d.,]+\)/g, (m) => {
        const a = parseFloat(m.match(/[\d.]+\)$/)[0]);
        return `rgba(0,0,0,${(a * 0.6).toFixed(2)})`;
    }],
    // Flatpickr dark
    [/background: #1e293b !important/g, 'background: #ffffff !important'],
    [/background: #ffffff !important;\s*\n(\s*)background: #ffffff !important/g, 'background: #ffffff !important'],
];

for (const [pattern, replacement] of replacements) {
    css = css.replace(pattern, replacement);
}

fs.writeFileSync(path.join(__dirname, '../style.css'), css, 'utf8');
console.log('CSS theme updated to white/black.');
