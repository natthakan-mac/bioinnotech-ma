const https = require('https'); https.get('https://maps.app.goo.gl/v6D7XqYXJ3W9T7YJ6', res => console.log('Status:', res.statusCode, 'Location:', res.headers.location));
