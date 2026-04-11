const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');

const start = c.indexOf('function renderReturnProductList()');
const end = c.indexOf('window.returnProductData');

if (start === -1 || end === -1) { console.log('Not found'); process.exit(1); }

const replacement = [
    "function renderReturnProductList() {",
    "    var container = document.getElementById('return-product-rows');",
    "    var jsonInput = document.getElementById('return-product-json');",
    "    if (!container) return;",
    "    container.innerHTML = '';",
    "    returnProductData.forEach(function(item, idx) {",
    "        var row = document.createElement('div');",
    "        row.style.cssText = 'display:grid; grid-template-columns:24px 1fr 1fr 28px; gap:8px; align-items:center; padding:4px 0;';",
    "",
    "        var num = document.createElement('span');",
    "        num.style.cssText = 'font-size:0.82rem; font-weight:600; color:#555; text-align:center;';",
    "        num.textContent = (idx + 1) + '.';",
    "        row.appendChild(num);",
    "",
    "        var nameInput = document.createElement('input');",
    "        nameInput.type = 'text';",
    "        nameInput.dataset.returnIdx = idx;",
    "        nameInput.dataset.field = 'name';",
    "        nameInput.value = item.name || '';",
    "        nameInput.placeholder = 'รายการสินค้า';",
    "        nameInput.style.cssText = 'height:34px; padding:0 10px; font-size:0.82rem; border:1px solid rgba(0,0,0,0.12); border-radius:6px; box-sizing:border-box; width:100%;';",
    "        row.appendChild(nameInput);",
    "",
    "        var noteInput = document.createElement('input');",
    "        noteInput.type = 'text';",
    "        noteInput.dataset.returnIdx = idx;",
    "        noteInput.dataset.field = 'note';",
    "        noteInput.value = item.note || '';",
    "        noteInput.placeholder = 'หมายเหตุ';",
    "        noteInput.style.cssText = 'height:34px; padding:0 10px; font-size:0.82rem; border:1px solid rgba(0,0,0,0.12); border-radius:6px; box-sizing:border-box; width:100%;';",
    "        row.appendChild(noteInput);",
    "",
    "        var delBtn = document.createElement('button');",
    "        delBtn.type = 'button';",
    "        delBtn.dataset.removeReturn = idx;",
    "        delBtn.innerHTML = '<i class=\"fa-solid fa-trash-can\"></i>';",
    "        delBtn.style.cssText = 'background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.9rem; padding:0; display:flex; align-items:center; justify-content:center;';",
    "        row.appendChild(delBtn);",
    "",
    "        container.appendChild(row);",
    "    });",
    "    if (jsonInput) jsonInput.value = JSON.stringify(returnProductData);",
    "}",
    ""
].join('\n');

c = c.substring(0, start) + replacement + c.substring(end);
fs.writeFileSync('app.js', c);
console.log('Done');
