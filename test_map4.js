const html = require('fs').readFileSync('maps_test.html', 'utf8'); const match = html.match(/htt[^\"]+maps\/[^\"]+/ig); console.log(match ? match.slice(0, 5) : 'no url');
