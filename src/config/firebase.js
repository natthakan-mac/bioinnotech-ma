import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
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
    onSnapshot,
    limit,
    where,
    startAfter,
    getCountFromServer,
    getAggregateFromServer,
    sum,
    count,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getStorage,
    ref,
    getDownloadURL,
    uploadBytes,
    uploadBytesResumable,
    deleteObject,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithCustomToken,
    updateProfile,
    unlink,
    signOut,
    updatePassword,
    updateEmail,
    verifyBeforeUpdateEmail,
    reauthenticateWithCredential,
    EmailAuthProvider,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    getAdditionalUserInfo,
    deleteUser,
    OAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    linkWithPopup,
    signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFunctions,
    httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

const firebaseConfig = {
    apiKey: "AIzaSyDIgPA8WHnxP5X_JoRQtwdGDIqGYRdCZOI",
    authDomain: "casp-ma.firebaseapp.com",
    projectId: "casp-ma",
    storageBucket: "casp-ma.firebasestorage.app",
    messagingSenderId: "155537603365",
    appId: "1:155537603365:web:df993623c42b613b6278cc",
    measurementId: "G-SKXRYFVDHR",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const functions = getFunctions(app, "asia-southeast1");


export { app, db, storage, auth, functions };