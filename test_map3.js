const https = require('https'); https.get('https://maps.app.goo.gl/v6D7XqYXJ3W9T7YJ6', res => console.log(res.statusCode, res.headers.location));
