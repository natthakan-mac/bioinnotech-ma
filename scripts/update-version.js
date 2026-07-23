const fs = require('fs');
const path = require('path');

function getVersionString() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bangkok',
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type)?.value || '';

    const day = parseInt(getPart('day'), 10);
    const month = parseInt(getPart('month'), 10);
    const year = getPart('year');
    let hour = getPart('hour');
    if (hour === '24') hour = '00';
    const minute = getPart('minute');

    return `${day}.${month}.${year}-${hour}.${minute}`;
}

function updateIndexHtml() {
    const indexPath = path.join(__dirname, '..', 'index.html');
    if (!fs.existsSync(indexPath)) {
        console.error('index.html not found at', indexPath);
        process.exit(1);
    }

    let html = fs.readFileSync(indexPath, 'utf8');
    const version = getVersionString();
    const versionSpan = `<span id="app-version" class="app-version">v${version}</span>`;

    if (html.includes('id="app-version"')) {
        html = html.replace(/<span id="app-version" class="app-version">[^<]*<\/span>/g, versionSpan);
    } else {
        html = html.replace(
            /<span class="brand-sub">Maintenance System<\/span>/g,
            `<span class="brand-sub">Maintenance System ${versionSpan}</span>`
        );
    }

    fs.writeFileSync(indexPath, html, 'utf8');
    console.log(`[Version Update] Updated app version to v${version} in index.html`);
}

updateIndexHtml();
