const fs = require('fs');
const path = require('path');

let html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

// Find and replace the entire inspection checklist section
const startMarker = '<!-- Inspection Checklist -->';
const endMarker = '<!-- Line Items (Cost) -->';

const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
    console.error('Markers not found');
    process.exit(1);
}

function pill(name) {
    return `<div class="check-pill-group insp-pills"><label class="check-pill neutral"><input type="radio" name="${name}" value="check"><span>ตรวจ</span></label><label class="check-pill neutral"><input type="radio" name="${name}" value="service"><span>ซ่อม</span></label><label class="check-pill neutral"><input type="radio" name="${name}" value="replace"><span>เปลี่ยน</span></label></div>`;
}

function row(num, label, name) {
    return `                        <div class="insp-row"><span class="insp-label">${num}. ${label}</span>${pill(name)}</div>`;
}

const leftItems = [
    [1, 'ความสะอาดภายนอก', 'insp_exteriorCleaning'],
    [2, 'ความสะอาดภายใน', 'insp_interiorCleaning'],
    [3, 'การทำงานระบบประตู', 'insp_doorSystem'],
    [4, 'การทำงาน Foot Switch', 'insp_footSwitch'],
    [5, 'ระบบ Sensor', 'insp_sensor'],
    [6, 'อุณหภูมิจุดที่ 1-4', 'insp_tempPoints'],
    [7, 'ความดันขณะทำงาน', 'insp_workingPressure'],
    [8, 'RF Generator', 'insp_rfGenerator'],
    [9, 'ปริมาณน้ำยาที่ฉีด', 'insp_chemicalAmount'],
];

const rightItems = [
    [10, 'Air Charging Value', 'insp_airChargingValue'],
    [11, 'Filter', 'insp_filter'],
    [12, 'Decomposer', 'insp_decomposer'],
    [13, 'น้ำมันปั๊มสุญญากาศ', 'insp_vacuumPumpOil'],
    [14, 'ระบบข้อต่อต่างๆ', 'insp_connectors'],
    [15, 'ถังเดรนน้ำ', 'insp_drainTank'],
    [16, 'ปริมาณแก๊สหน้าประตู', 'insp_gasDoor'],
    [17, 'ปริมาณแก๊สห่าง 1 ม.', 'insp_gas1m'],
    [18, 'ปริมาณแก๊สห่าง 2 ม.', 'insp_gas2m'],
];

const newSection = `<!-- Inspection Checklist -->
            <div class="ma-section" style="background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.06); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
                <h4 style="margin: 0 0 0.75rem 0; font-size: 0.9rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-magnifying-glass-chart" style="color: #111111;"></i> รายการตรวจสอบ (Inspection Checklist)
                </h4>
                <div class="ma-2col-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                    <div class="insp-col">
${leftItems.map(i => row(...i)).join('\n')}
                    </div>
                    <div class="insp-col">
${rightItems.map(i => row(...i)).join('\n')}
                    </div>
                </div>
            </div>

            `;

html = html.substring(0, startIdx) + newSection + html.substring(endIdx);
fs.writeFileSync(path.join(__dirname, '../index.html'), html, 'utf8');
console.log('Inspection checklist replaced');
