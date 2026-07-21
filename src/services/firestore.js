import { db, storage, auth, functions } from '../config/firebase.js';
import { state } from '../store/state.js';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    setDoc,
    getDoc,
    query,
    orderBy,
    serverTimestamp,
    limit,
    where,
    startAfter,
    getCountFromServer,
    getAggregateFromServer,
    sum,
    count,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    ref,
    getDownloadURL,
    uploadBytesResumable,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

const FirestoreService = {
    async fetchSites() {
        const q = query(collection(db, "sites"), orderBy("updatedAt", "desc")); // Simplified sort
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },

    async fetchFilteredLogs(filters) {
        try {
            let q = query(collection(db, "logs"));
            const constraints = [];

            if (filters.siteId && filters.siteId !== "all") {
                constraints.push(where("siteId", "==", filters.siteId));
            }

            if (filters.startDate) {
                const startStr = filters.startDate.toISOString().split("T")[0];
                constraints.push(where("date", ">=", startStr));
            }
            if (filters.endDate) {
                const endStr = filters.endDate.toISOString().split("T")[0];
                constraints.push(where("date", "<=", endStr));
            }

            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error("fetchFilteredLogs failed:", e);
            throw e;
        }
    },

    async fetchLogsByMonth(year, month) {
        // month is 0-indexed (0 = Jan)
        const startStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const endStr = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;
        console.log(`[DEBUG] Fetching logs for calendar: ${startStr} to ${endStr}`);
        const q = query(
            collection(db, "logs"),
            where("date", ">=", startStr),
            where("date", "<=", endStr),
            orderBy("date", "asc"),
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },

    async fetchLogs() {
        // Reset state on fresh fetch
        state.hasMoreLogs = false;
        state.lastLogSnapshot = null;
        state.isLoadingLogs = false;

        const q = query(collection(db, "logs"), orderBy("date", "desc"), limit(20));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.docs.length > 0) {
            state.lastLogSnapshot = querySnapshot.docs[querySnapshot.docs.length - 1];
        }
        state.hasMoreLogs = querySnapshot.docs.length === 20;

        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },

    async fetchLogsForSite(siteId) {
        const q = query(collection(db, "logs"), where("siteId", "==", siteId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },

    async fetchGlobalLogCount() {
        const q = query(collection(db, "logs"));
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    },

    async fetchFilteredStats(filters) {
        try {
            let q = query(collection(db, "logs"));
            const constraints = [];

            if (filters.siteId && filters.siteId !== "all") {
                constraints.push(where("siteId", "==", filters.siteId));
            }

            if (filters.startDate) {
                const startStr = filters.startDate.toISOString().split("T")[0];
                constraints.push(where("date", ">=", startStr));
            }
            if (filters.endDate) {
                const endStr = filters.endDate.toISOString().split("T")[0];
                constraints.push(where("date", "<=", endStr));
            }

            // Note: Category and Search aren't easily aggregateable via simple where clauses
            // without complex indexing. For now, we'll prioritize Site and Date.

            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const snapshot = await getAggregateFromServer(q, {
                totalCost: sum("cost"),
                totalCount: count(),
            });

            const summary = snapshot.data();
            return {
                totalCost: summary.totalCost || 0,
                count: summary.totalCount || 0,
            };
        } catch (e) {
            console.warn("[FirestoreService] fetchFilteredStats failed (likely missing index). Falling back to client-side stats calculation.", e);
            return null;
        }
    },

    async fetchMoreLogs() {
        if (!state.lastLogSnapshot || state.isLoadingLogs) return [];
        state.isLoadingLogs = true;

        try {
            const q = query(
                collection(db, "logs"),
                orderBy("date", "desc"),
                startAfter(state.lastLogSnapshot),
                limit(20),
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.docs.length > 0) {
                state.lastLogSnapshot =
                    querySnapshot.docs[querySnapshot.docs.length - 1];
            }
            state.hasMoreLogs = querySnapshot.docs.length === 20;
            state.isLoadingLogs = false;

            return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            state.isLoadingLogs = false;
            throw e;
        }
    },
    // fetchMoreLogs removed

    async addSite(siteData) {
        siteData.updatedAt = serverTimestamp();
        siteData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, "sites"), siteData);
        const siteId = docRef.id;
        await this.logAction("SITE", "ADD", `Added new site: ${siteData.name}`, {
            siteId: siteId,
            data: siteData,
        });
        // Fire notification asynchronously (non-blocking)
        try {
            const notifyNewSite = httpsCallable(functions, 'notifyNewSite');
            notifyNewSite({ siteId: siteId, siteData: siteData }).catch(e => console.warn('notifyNewSite error:', e));
        } catch (e) { console.warn('notifyNewSite init error:', e); }
        return siteId;
    },

    async updateSite(id, siteData) {
        siteData.updatedAt = serverTimestamp();
        const siteRef = doc(db, "sites", id);

        // Fetch previous data for diffing
        let previousData = null;
        try {
            const docSnap = await getDoc(siteRef);
            if (docSnap.exists()) previousData = docSnap.data();
        } catch (e) {
            console.warn("Could not fetch previous site data", e);
        }

        await updateDoc(siteRef, siteData);

        // Write change history to subcollection
        try {
            await this.logSiteHistory(id, siteData, previousData);
        } catch (e) {
            console.warn("Could not write site history:", e);
        }

        await this.logAction("SITE", "EDIT", `Updated site: ${siteData.name}`, {
            siteId: id,
            data: siteData,
            previousData: previousData,
        });
    },

    async logSiteHistory(siteId, newData, oldData) {
        const user = auth.currentUser;
        const SKIP_FIELDS = new Set([
            'updatedAt', 'createdAt', 'maintenancePlans', 'attachments',
            '_cachedSiteName', 'statusHistory'
        ]);

        const FIELD_LABELS = {
            name: 'ชื่อโรงพยาบาล',
            siteCode: 'รหัสสถานที่',
            deviceType: 'ประเภทสัญญา',
            brand: 'ยี่ห้อ',
            model: 'รุ่น',
            serialNumber: 'Serial No.',
            installLocation: 'หน่วยงาน',
            villageName: 'ชื่อหมู่บ้าน',
            subdistrict: 'ตำบล',
            district: 'อำเภอ',
            province: 'จังหวัด',
            picName: 'ผู้ดูแล',
            contactPhone: 'เบอร์โทร',
            maintenanceCycle: 'รอบซ่อมบำรุง (วัน)',
            insuranceStartDate: 'วันเริ่มประกัน',
            insuranceEndDate: 'วันสิ้นสุดประกัน',
            warrantyNumber: 'เลขที่ใบรับประกัน',
            description: 'รายละเอียด',
            latitude: 'Latitude',
            longitude: 'Longitude',
        };

        const changes = [];
        const allKeys = new Set([
            ...Object.keys(newData || {}),
            ...Object.keys(oldData || {})
        ]);

        for (const key of allKeys) {
            if (SKIP_FIELDS.has(key)) continue;
            const oldVal = oldData ? (oldData[key] ?? '') : '';
            const newVal = newData ? (newData[key] ?? '') : '';
            if (String(oldVal) !== String(newVal)) {
                changes.push({
                    field: key,
                    label: FIELD_LABELS[key] || key,
                    from: oldVal || '-',
                    to: newVal || '-',
                });
            }
        }

        if (changes.length === 0) return; // Nothing changed

        const historyRef = collection(db, 'sites', siteId, 'history');
        await addDoc(historyRef, {
            changedBy: user ? (user.displayName || user.email || 'Unknown') : 'Unknown',
            changedById: user ? user.uid : null,
            changedAt: serverTimestamp(),
            changedAtISO: new Date().toISOString(),
            changes,
        });
    },

    async fetchSiteHistory(siteId, limitCount = 20) {
        try {
            const q = query(
                collection(db, 'sites', siteId, 'history'),
                orderBy('changedAt', 'desc'),
                limit(limitCount)
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn('Could not fetch site history:', e);
            return [];
        }
    },

    async deleteSite(id) {
        const docRef = doc(db, "sites", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            await this.logAction("SITE", "DELETE", `Deleted site`, {
                siteId: id,
                data: data,
            });
        }
        await deleteDoc(docRef);
    },

    async deleteLogsBySiteId(siteId) {
        const q = query(collection(db, "logs"), where("siteId", "==", siteId));
        const snap = await getDocs(q);
        const deletions = snap.docs.map(d => deleteDoc(doc(db, "logs", d.id)));
        await Promise.all(deletions);
    },

    // --- User Methods ---
    async addUser(user) {
        try {
            // Safely extract email from user or providerData
            const email =
                user.email ||
                (user.providerData && user.providerData[0]
                    ? user.providerData[0].email
                    : null);

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: email || null,
                displayName: user.displayName || "",
                photoURL: user.photoURL || "",
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                role: 'user', // Default role for new users
            });
        } catch (e) {
            console.error("Error adding user: ", e);
            throw e;
        }
    },

    async getUser(uid) {
        try {
            const docRef = doc(db, "users", uid);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data() : null;
        } catch (e) {
            console.error("Error fetching user: ", e);
            return null;
        }
    },

    async fetchUsers() {
        try {
            const q = query(collection(db, "users"));
            const querySnapshot = await getDocs(q);
            const map = {};
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.role !== 'deleted') {
                    map[doc.id] = data;
                }
            });
            return map;
        } catch (e) {
            console.warn("fetchUsers error:", e);
            return {};
        }
    },

    async getAllUsers() {
        try {
            // First, get all users without ordering to see what we have
            const q = query(collection(db, "users"));
            const querySnapshot = await getDocs(q);
            const allUsers = querySnapshot.docs
                .map(doc => ({ uid: doc.id, ...doc.data() }))
                .filter(user => user.role !== 'deleted');

            console.log('=== FIRESTORE USERS DEBUG ===');
            console.log('Total documents in users collection:', allUsers.length);
            allUsers.forEach((user, index) => {
                console.log(`Document ${index + 1}:`, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    role: user.role
                });
            });

            // Filter out invalid users (users without email or with clearly invalid data)
            const validUsers = allUsers.filter(user => {
                // Must have a valid email
                if (!user.email || user.email === 'null' || user.email.trim() === '') {
                    console.log('Filtered out (no email):', user.uid, user.displayName);
                    return false;
                }

                // Filter out obvious test/dummy users
                if (user.displayName && user.displayName.includes('แพคอะกินแซบนอน')) {
                    console.log('Filtered out (test user):', user.email);
                    return false;
                }

                return true;
            });

            // Deduplicate by email address
            const uniqueUsersMap = new Map();
            validUsers.forEach(user => {
                const existing = uniqueUsersMap.get(user.email);
                if (!existing) {
                    uniqueUsersMap.set(user.email, user);
                } else {
                    const currentUid = auth.currentUser?.uid;
                    // Keep the one matching current user UID, or the one with displayName, or the higher role
                    const keepNew =
                        (user.uid === currentUid) ||
                        (!existing.displayName && user.displayName) ||
                        (existing.role === 'user' && (user.role === 'admin' || user.role === 'manager'));

                    if (keepNew) {
                        uniqueUsersMap.set(user.email, user);
                    }
                }
            });
            const uniqueUsers = Array.from(uniqueUsersMap.values());

            // Sort by displayName
            uniqueUsers.sort((a, b) => {
                const nameA = (a.displayName || a.email || '').toLowerCase();
                const nameB = (b.displayName || b.email || '').toLowerCase();
                return nameA.localeCompare(nameB, 'th');
            });

            console.log('Unique valid users:', uniqueUsers.length);
            console.log('Unique valid users:', uniqueUsers.map(u => ({ email: u.email, name: u.displayName })));
            console.log('=== END FIRESTORE DEBUG ===');

            return uniqueUsers;
        } catch (e) {
            console.error("Error fetching all users:", e);
            return [];
        }
    },

    async cleanupInvalidUsers() {
        try {
            const q = query(collection(db, "users"));
            const querySnapshot = await getDocs(q);
            const invalidUsers = [];

            querySnapshot.docs.forEach(doc => {
                const data = doc.data();
                // Identify invalid users
                if (!data.email ||
                    data.email === 'null' ||
                    data.email.trim() === '' ||
                    (data.displayName && data.displayName.includes('แพคอะกินแซบนอน'))) {
                    invalidUsers.push({
                        id: doc.id,
                        data: data
                    });
                }
            });

            console.log('Invalid users found:', invalidUsers.length);
            console.log('Invalid users:', invalidUsers.map(u => ({ id: u.id, email: u.data.email, name: u.data.displayName })));

            return invalidUsers;
        } catch (e) {
            console.error("Error checking invalid users:", e);
            return [];
        }
    },

    async deleteInvalidUser(userId) {
        try {
            await deleteDoc(doc(db, "users", userId));
            console.log("Deleted invalid user:", userId);
        } catch (e) {
            console.error("Error deleting invalid user:", e);
            throw e;
        }
    },

    async updateUserDetails(userId, data) {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (e) {
            console.error("Error updating user details:", e);
            throw e;
        }
    },

    async deleteUser(userId) {
        try {
            const deleteFn = httpsCallable(functions, 'deleteAuthUser');
            const result = await deleteFn({ targetUid: userId });
            
            if (result.data.success) {
                return true;
            } else {
                throw new Error(result.data.message || 'Unknown error');
            }
        } catch (e) {
            console.error("Error deleting user:", e);
            throw e;
        }
    },
    async updateUserRole(userId, role) {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                role: role,
                updatedAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Error updating user role:", e);
            throw e;
        }
    },

    async fetchLogsByMonth(year, month) {
        // month is 0-indexed (0 = Jan)
        // Create range: 1st day of month to last day of month
        // Store dates as YYYY-MM-DD string for lexicographical string comparison in Firestore
        // (Assuming current data model uses YYYY-MM-DD string for 'date' field)

        const startStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;

        // Calculate last day
        const lastDay = new Date(year, month + 1, 0).getDate();
        const endStr = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;

        console.log(`[DEBUG] Fetching logs for calendar: ${startStr} to ${endStr}`);

        const q = query(
            collection(db, "logs"),
            where("date", ">=", startStr),
            where("date", "<=", endStr),
            orderBy("date", "asc"), // Ordered by date for calendar
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },

    async fetchLogsInRange(startDate, endDate) {
        let q = query(collection(db, "logs"), orderBy("date", "desc"));

        // If dates are provided, add filters
        if (startDate || endDate) {
            // Basic date string comparison YYYY-MM-DD
            const constraints = [];
            constraints.push(orderBy("date", "desc"));

            if (startDate) {
                // Assuming startDate is Date object
                const startStr = startDate.toISOString().split("T")[0];
                constraints.push(where("date", ">=", startStr));
            }
            if (endDate) {
                const endStr = endDate.toISOString().split("T")[0];
                constraints.push(where("date", "<=", endStr));
            }
            q = query(collection(db, "logs"), ...constraints);
        } else {
            // No date filter = All logs?
            // Warning: high read cost. Maybe limit to last 1000 or require date?
            // For now, let's allow it but we might want a safety limit if DB is huge.
            // q = query(collection(db, "logs"), orderBy("date", "desc"), limit(2000));
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },

    // Generate unique case ID (CASE-XXXXX format with random alphanumeric)
    generateCaseId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let caseId = 'CASE-';
        for (let i = 0; i < 5; i++) {
            caseId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return caseId;
    },

    async addLog(logData) {
        // Generate case ID if not provided
        if (!logData.caseId) {
            logData.caseId = this.generateCaseId();
        }
        const docRef = await addDoc(collection(db, "logs"), logData);
        const logId = docRef.id;
        await this.logAction("LOG", "ADD", `Added logs: ${logData.objective}`, {
            logId: logId,
            caseId: logData.caseId,
            data: { ...logData, _cachedSiteName: (state.sites.find(s => s.id === logData.siteId) || {}).name || '-' },
        });
        // Fire notification asynchronously (non-blocking)
        try {
            const notifyNewMARecord = httpsCallable(functions, 'notifyNewMARecord');
            notifyNewMARecord({ logId: logId, logData: logData }).catch(e => console.warn('notifyNewMARecord error:', e));
        } catch (e) { console.warn('notifyNewMARecord init error:', e); }
        return logId;
    },

    async updateLog(id, logData) {
        const logRef = doc(db, "logs", id);

        // Fetch previous data for logging and status-change notification
        let previousData = null;
        try {
            const docSnap = await getDoc(logRef);
            if (docSnap.exists()) previousData = docSnap.data();
        } catch (e) {
            console.warn("Could not fetch previous log data", e);
        }
        const beforeStatus = previousData ? previousData.status : undefined;

        // Overwrite Recorder with Current User
        if (auth.currentUser) {
            logData.recordedBy =
                auth.currentUser.displayName || auth.currentUser.email;
            logData.recorderId = auth.currentUser.uid;
        }

        await updateDoc(logRef, logData);
        await this.logAction("LOG", "EDIT", `Updated log: ${logData.objective}`, {
            logId: id,
            data: { ...logData, _cachedSiteName: (state.sites.find(s => s.id === logData.siteId) || {}).name || '-' },
            previousData: previousData,
        });
        // Fire status-change notification asynchronously (non-blocking)
        try {
            const notifyMAStatusUpdate = httpsCallable(functions, 'notifyMAStatusUpdate');
            notifyMAStatusUpdate({ logId: id, beforeStatus: beforeStatus, afterData: logData }).catch(e => console.warn('notifyMAStatusUpdate error:', e));
        } catch (e) { console.warn('notifyMAStatusUpdate init error:', e); }
    },

    async deleteLog(id) {
        const docRef = doc(db, "logs", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            await this.logAction("LOG", "DELETE", `Deleted log`, {
                logId: id,
                data: data,
            });
        }
        await deleteDoc(docRef);
    },

    async deleteAllLogs() {
        const logsRef = collection(db, "logs");
        const snapshot = await getDocs(logsRef);
        console.log(`Deleting ${snapshot.size} logs...`);
        const batchPromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(batchPromises);
        console.log("All logs deleted.");
    },

    // --- Action Logging ---
    async logAction(category, actionType, description, metadata = {}) {
        try {
            const user = auth.currentUser;
            const logEntry = {
                category: category, // SITE, LOG, AUTH, BIN, USER
                actionType: actionType,
                description: description,
                performedBy: user ? user.uid : "anonymous",
                performerName: user ? user.displayName || user.email : "System",
                timestamp: serverTimestamp(), // Use Server Time for ordering
                createdAt: new Date().toISOString(), // Local backup
                metadata: metadata,
            };
            // Fire and forget (don't await strictly if not needed, but good to ensure write)
            await addDoc(collection(db, "action_logs"), logEntry);
        } catch (e) {
            console.warn("Failed to log action:", e);
        }
    },

    async uploadFile(file, path, onProgress) {
        try {
            const storageRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(storageRef, file);

            return new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        if (onProgress) {
                            onProgress(progress);
                        }
                    },
                    (error) => {
                        console.error("Failed to upload file:", error);
                        reject(error);
                    },
                    async () => {
                        try {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(downloadURL);
                        } catch (e) {
                            reject(e);
                        }
                    }
                );
            });
        } catch (e) {
            console.error("Failed to upload file:", e);
            throw e;
        }
    },

    // --- Notification Settings Methods ---
    async updateNotificationSettings(settings) {
        try {
            const settingsRef = doc(db, "settings", "notifications");
            await setDoc(settingsRef, settings, { merge: true });
            console.log("Notification settings updated successfully");
        } catch (e) {
            console.error("Error updating notification settings:", e);
            throw e;
        }
    },

    async getNotificationSettings() {
        try {
            const settingsRef = doc(db, "settings", "notifications");
            const docSnap = await getDoc(settingsRef);
            return docSnap.exists() ? docSnap.data() : null;
        } catch (e) {
            console.error("Error fetching notification settings:", e);
            return null;
        }
    },

    // --- Company Settings Methods ---
    async updateCompanySettings(settings) {
        try {
            const ref = doc(db, "settings", "company");
            await setDoc(ref, settings, { merge: true });
        } catch (e) {
            console.error("Error updating company settings:", e);
            throw e;
        }
    },

    async getCompanySettings() {
        try {
            const ref = doc(db, "settings", "company");
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() : {
                name: 'บริษัท ไบโอ อินโน เทค จำกัด',
                hotline: '02-152-5405',
                address: '36/41 หมู่ 13 ต.บึงคำพร้อย อ.ลำลูกกา จ.ปทุมธานี 12150'
            };
        } catch (e) {
            console.error("Error fetching company settings:", e);
            return { name: 'บริษัท ไบโอ อินโน เทค จำกัด', hotline: '', address: '' };
        }
    },

    async deleteNotificationSettings() {
        try {
            const settingsRef = doc(db, "settings", "notifications");
            await deleteDoc(settingsRef);
            console.log("Notification settings deleted successfully");
        } catch (e) {
            console.error("Error deleting notification settings:", e);
            throw e;
        }
    },
};

export { FirestoreService };