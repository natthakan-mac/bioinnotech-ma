/**
 * Apply CORS config to Firebase Storage bucket.
 * Usage: node set-cors.js
 */
const { Storage } = require('@google-cloud/storage');
const path = require('path');

const storage = new Storage({
    keyFilename: path.join(__dirname, 'serviceAccountKey.json'),
});

const corsConfig = [
    {
        origin: [
            'https://casp-ma.web.app',
            'https://casp-ma.firebaseapp.com',
            'http://localhost:5000',
            'http://localhost:8080',
            'http://127.0.0.1:5000',
            'http://127.0.0.1:8080',
        ],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
        maxAgeSeconds: 3600,
        responseHeader: [
            'Content-Type',
            'Authorization',
            'Content-Length',
            'User-Agent',
            'x-goog-resumable',
        ],
    },
];

async function setCors() {
    const [buckets] = await storage.getBuckets();
    if (buckets.length === 0) {
        console.error('No buckets found. Please enable Firebase Storage at:');
        console.error('https://console.firebase.google.com/project/casp-ma/storage');
        process.exit(1);
    }

    for (const bucket of buckets) {
        await bucket.setCorsConfiguration(corsConfig);
        console.log(`CORS applied to: ${bucket.name}`);
    }
}

setCors().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
