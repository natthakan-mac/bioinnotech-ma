const fs = require('fs');
const path = require('path');

function fix(filePath) {
    let css = fs.readFileSync(filePath, 'utf8');

    // All blue/cyan/slate hex colors → black or grey
    css = css.replace(/#38bdf8/gi, '#111111');
    css = css.replace(/#0ea5e9/gi, '#333333');
    css = css.replace(/#0284c7/gi, '#333333');
    css = css.replace(/#06b6d4/gi, '#111111');
    css = css.replace(/#3b82f6/gi, '#111111');
    css = css.replace(/#2563eb/gi, '#333333');
    css = css.replace(/#818cf8/gi, '#333333');
    css = css.replace(/#475569/gi, '#555555');
    css = css.replace(/#64748b/gi, '#666666');
    css = css.replace(/#94a3b8/gi, '#888888');
    css = css.replace(/#cbd5e1/gi, '#cccccc');
    css = css.replace(/#e2e8f0/gi, '#eeeeee');
    css = css.replace(/#1e293b/gi, '#ffffff');
    css = css.replace(/#0f172a/gi, '#f5f5f5');
    css = css.replace(/#334155/gi, '#e0e0e0');

    // Blue/cyan rgba → neutral
    css = css.replace(/rgba\(\s*56\s*,\s*189\s*,\s*248\s*,\s*([\d.]+)\s*\)/gi, (_, a) => `rgba(0,0,0,${Math.min(parseFloat(a)*0.6,0.12).toFixed(2)})`);
    css = css.replace(/rgba\(\s*14\s*,\s*165\s*,\s*233\s*,\s*([\d.]+)\s*\)/gi, (_, a) => `rgba(0,0,0,${Math.min(parseFloat(a)*0.5,0.1).toFixed(2)})`);
    css = css.replace(/rgba\(\s*6\s*,\s*182\s*,\s*212\s*,\s*([\d.]+)\s*\)/gi, (_, a) => `rgba(0,0,0,${Math.min(parseFloat(a)*0.5,0.1).toFixed(2)})`);
    css = css.replace(/rgba\(\s*59\s*,\s*130\s*,\s*246\s*,\s*([\d.]+)\s*\)/gi, (_, a) => `rgba(0,0,0,${Math.min(parseFloat(a)*0.5,0.1).toFixed(2)})`);
    css = css.replace(/rgba\(\s*37\s*,\s*99\s*,\s*235\s*,\s*([\d.]+)\s*\)/gi, (_, a) => `rgba(0,0,0,${Math.min(parseFloat(a)*0.5,0.1).toFixed(2)})`);

    // Dark slate rgba → white or light
    css = css.replace(/rgba\(\s*15\s*,\s*23\s*,\s*42\s*,\s*([\d.]+)\s*\)/gi, (_, a) => {
        const alpha = parseFloat(a);
        return alpha >= 0.7 ? '#ffffff' : `rgba(255,255,255,${alpha})`;
    });
    css = css.replace(/rgba\(\s*30\s*,\s*41\s*,\s*59\s*,\s*([\d.]+)\s*\)/gi, (_, a) => {
        const alpha = parseFloat(a);
        return alpha >= 0.7 ? '#ffffff' : `rgba(255,255,255,${alpha})`;
    });

    // White text on dark → dark text
    css = css.replace(/color:\s*#f8fafc/gi, 'color: #111111');
    css = css.replace(/color:\s*white(?!\s*!)/gi, 'color: #111111');
    css = css.replace(/color:\s*#ffffff(?!\s*!important)/gi, 'color: #111111');

    // White borders/dividers → light grey
    css = css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.1\s*\)/gi, 'rgba(0,0,0,0.08)');
    css = css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.08\s*\)/gi, 'rgba(0,0,0,0.06)');
    css = css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.15\s*\)/gi, 'rgba(0,0,0,0.1)');
    css = css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.2\s*\)/gi, 'rgba(0,0,0,0.12)');
    css = css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.05\s*\)/gi, 'rgba(0,0,0,0.04)');
    css = css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.02\s*\)/gi, 'rgba(0,0,0,0.02)');
    css = css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.3\s*\)/gi, 'rgba(0,0,0,0.15)');
    css = css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.4\s*\)/gi, 'rgba(0,0,0,0.2)');
    css = css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.5\s*\)/gi, 'rgba(0,0,0,0.3)');
    css = css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.7\s*\)/gi, 'rgba(0,0,0,0.5)');

    // text-shadow with blue glow → none
    css = css.replace(/text-shadow:\s*0 0 \d+px rgba\(0,0,0,[^)]+\)/gi, 'text-shadow: none');

    // box-shadow with blue glow → subtle grey
    css = css.replace(/box-shadow:\s*0 0 \d+px rgba\(0,0,0,[^)]+\)/gi, 'box-shadow: 0 0 8px rgba(0,0,0,0.1)');

    // Gradients with blue → plain white/grey
    css = css.replace(/linear-gradient\(to right,\s*#111111\s*,\s*#333333\s*\)/gi, '#111111');
    css = css.replace(/linear-gradient\(180deg,\s*#111111\s*0%,\s*#333333\s*100%\)/gi, '#111111');

    // backdrop-filter blur → none (not needed on white)
    css = css.replace(/backdrop-filter:\s*blur\(\d+px\)\s*;/gi, 'backdrop-filter: none;');
    css = css.replace(/-webkit-backdrop-filter:\s*blur\(\d+px\)\s*;/gi, '-webkit-backdrop-filter: none;');

    fs.writeFileSync(filePath, css, 'utf8');
    console.log('Fixed:', filePath);
}

fix(path.join(__dirname, '../style.css'));
fix(path.join(__dirname, '../ma-form-modern.css'));
fix(path.join(__dirname, '../menu.css'));
fix(path.join(__dirname, '../toast-polished.css'));
fix(path.join(__dirname, '../toast.css'));
console.log('All done.');
