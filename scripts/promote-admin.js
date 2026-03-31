/**
 * Script to promote a user to admin role by email.
 * Usage: node scripts/promote-admin.js <email>
 * Requires: Firebase Admin SDK service account key at scripts/serviceAccountKey.json
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function promoteToAdmin(email) {
    try {
        // Get user by email from Firebase Auth
        const userRecord = await auth.getUserByEmail(email);
        const uid = userRecord.uid;
        console.log(`Found user: ${uid} (${email})`);

        // Update role in Firestore users collection
        const userRef = db.collection('users').doc(uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            // Create the document if it doesn't exist yet
            await userRef.set({
                uid,
                email,
                role: 'admin',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Created user document and set role to admin.`);
        } else {
            await userRef.update({
                role: 'admin',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Updated role to admin for ${email}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: node scripts/promote-admin.js <email>');
    process.exit(1);
}

promoteToAdmin(email);
