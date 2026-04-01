const fs = require('fs');
const path = require('path');
let js = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

// Fix category icon colors (blue → black) and ตามใบสั่งซื้อ icon
js = js.replace(/catIcon = '<i class="fa-solid fa-screwdriver-wrench" style="color: #3b82f6/g,
    'catIcon = \'<i class="fa-solid fa-screwdriver-wrench" style="color: #111111');
js = js.replace(/catColor = '#3b82f6'/g, "catColor = '#111111'");
js = js.replace(/catBg = 'rgba\(59,130,246,0\.15\)'/g, "catBg = 'rgba(0,0,0,0.08)'");

js = js.replace(/catIcon = '<i class="fa-solid fa-triangle-exclamation" style="color: #f97316/g,
    'catIcon = \'<i class="fa-solid fa-cart-shopping" style="color: #111111');
js = js.replace(/catColor = '#f97316'/g, "catColor = '#111111'");
js = js.replace(/catBg = 'rgba\(249,115,22,0\.15\)'/g, "catBg = 'rgba(0,0,0,0.08)'");

// Fix the small icon in log card
js = js.replace(/color: #3b82f6; font-size: 0\.6rem;"><\/i>'/g, 'color: #111111; font-size: 0.6rem;"></i>\'');

// Fix detail view category icon
js = js.replace(/isMaCategory\(log\.category\) \? "🔧 " : log\.category === "Incident" \? "⚠️ " : ""/g,
    'isMaCategory(log.category) ? "🔧 " : log.category === "ตามใบสั่งซื้อ" ? "🛒 " : ""');

fs.writeFileSync(path.join(__dirname, '../app.js'), js, 'utf8');
console.log('Category icons fixed.');
