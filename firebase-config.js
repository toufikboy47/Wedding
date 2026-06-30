/**
 * Firebase configuration and Unified Database Service wrapper for Zack & Zoey's Wedding.
 * 
 * If Firebase configuration is not updated with valid credentials,
 * the service automatically falls back to browser localStorage mode.
 * This guarantees the application runs immediately without configuration issues.
 */

// Replace the placeholder values with your actual Firebase project settings
const firebaseConfig = {
    apiKey: "AIzaSyAiT_mbGltrhHDIMSHu_kkFMVb1W8QRcfI",
    authDomain: "wedding-b4568.firebaseapp.com",
    projectId: "wedding-b4568",
    storageBucket: "wedding-b4568.firebasestorage.app",
    messagingSenderId: "922754039020",
    appId: "1:922754039020:web:9bc3ca8523be5789b6b9c9",
    measurementId: "G-M904GS6W77"
};

// Global state variables
let isFirebaseEnabled = false;
let db = null;
let auth = null;
let storage = null;

// Initialize Firebase if the config is valid and is not default placeholder
function tryInitializeFirebase() {
    const isConfigured = firebaseConfig.apiKey && 
                         firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && 
                         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
    
    if (isConfigured && typeof firebase !== 'undefined') {
        try {
            // Initialize Firebase App
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();
            storage = firebase.storage();
            isFirebaseEnabled = true;
            console.log("Firebase initialized successfully in Cloud Mode.");
        } catch (e) {
            console.warn("Failed to initialize Firebase. Falling back to LocalStorage.", e);
            isFirebaseEnabled = false;
        }
    } else {
        console.log("Firebase is not configured or SDK not loaded. Running in LocalStorage (Demo Mode).");
        isFirebaseEnabled = false;
    }
}

// Perform initialization immediately
tryInitializeFirebase();

// Default Mock Data for couple gallery
const DEFAULT_GALLERY = [];

// Default Mock Data for Guestbook Wishes
const DEFAULT_WISHES = [
    {
        id: "story_1",
        names: "Dan & Sarah Miller",
        date: "June 25, 2026",
        imageUrl: "assets/success_couple_1.jpg",
        content: "Wishing you both a lifetime of love, laughter, and endless adventure together! We are so thrilled to witness this beautiful day. Get ready to dance!"
    },
    {
        id: "story_2",
        names: "Uncle Robert",
        date: "June 27, 2026",
        imageUrl: "assets/success_couple_1.jpg",
        content: "Congratulations Zack and Zoey! Always remember to listen, laugh, and cherish the small moments together. Wishing you all the blessings."
    }
];

// Default Mock Data for RSVPs
const DEFAULT_RSVPS = [
    {
        id: "rsvp_1",
        name: "Alice Johnson",
        email: "alice@example.com",
        attending: "Yes",
        guests: 2,
        message: "Can't wait to see you guys walk down the aisle! Please note that we prefer vegetarian meals."
    },
    {
        id: "rsvp_2",
        name: "David Miller",
        email: "david.miller@example.com",
        attending: "No",
        guests: 0,
        message: "So sorry we cannot make it due to a business trip. Wishing you both a magical celebration!"
    }
];

const DEFAULT_ALBUM = [];

const DEFAULT_SETTINGS = {
    groomName: "Zack",
    brideName: "Zoey",
    tagline: "Are Getting Married!",
    weddingTime: "Oct 24, 2026 19:00:00",
    weddingDateText: "Saturday, October 24, 2026",
    ceremonyVenue: "The Grand Ballroom, Royal Hotel, Dhaka",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14766.430940750317!2d88.7012639!3d22.2928443!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a02190034d7e733%3A0xab35ca345a8aa089!2sDr.%20Aftabuddin%20Laskar!5e0!3m2!1sen!2sin!4v1782793918409!5m2!1sen!2sin",
    
    holudDateText: "Thursday, October 22, 2026",
    holudTimeText: "6:30 PM - 10:00 PM",
    holudVenue: "Pearl Hall, Gardenia Banquet, Dhaka",
    
    ceremonyDateText: "Saturday, October 24, 2026",
    ceremonyTimeText: "7:00 PM onwards",
    
    receptionDateText: "Sunday, October 25, 2026",
    receptionTimeText: "7:30 PM - 11:30 PM",
    receptionVenue: "Orchid Lounge, Royal Hotel, Dhaka",
    
    storyMetTitle: "How We Met",
    storyMetContent: "It all started on a rainy autumn afternoon. Both seeking shelter from the downpour at a quiet coffee house, we ended up sharing the last vacant table. What started as a polite conversation about coffee blends turned into hours of shared laughter, dreams, and a deep connection that changed our lives forever.",
    storyProposalTitle: "The Proposal",
    storyProposalContent: "Three years later, Zack planned a surprise trip back to the exact same mountain trail they hiked on their first anniversary. As the sunset turned the skies gold, Zack knelt down and asked Zoey to spend the rest of her life with him. Amidst happy tears, she said a thousand times, 'Yes!'",
    
    musicUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    heroImage: "assets/wedding_couple.jpg",
    heroImages: [],
    heroInterval: 5,
    rsvpImage: "assets/success_couple_1.jpg",
    introBgColor: "#0b1412",
    introBgImage: "",
    
    holudDressCode: "Festive Yellow/Orange",
    ceremonyDressCode: "Formal/Traditional Royal",
    receptionDressCode: "Tuxedo & Evening Gown",
    gallerySub: "A glimpse of our most precious moments together",
    rsvpSub: "Please RSVP to let us know if you can make it to our wedding celebrations.",
    
    menuSub: "A curated culinary journey featuring traditional delicacies and royal desserts.",
    holudMenu: "Fuchka & Chotpoti, Doi Fuchka, Assorted Pitha, Kashmiri Chai, Sweet Lassi",
    ceremonyMenu: "Kacchi Biryani (Premium Basmati), Shahi Mutton Rezala, Chicken Roast, Beef Boti Kebab, Borhani, Shahi Jorda",
    receptionMenu: "Butter Naan, Tandoori Chicken Kebab, Mutton Rogan Josh, Paneer Makhani, Cold Drinks, Shahi Tukda"
};

// Initialize localStorage if empty
function initializeLocalStorageDB() {
    if (!localStorage.getItem("gm_settings")) {
        localStorage.setItem("gm_settings", JSON.stringify(DEFAULT_SETTINGS));
    } else {
        try {
            const current = JSON.parse(localStorage.getItem("gm_settings"));
            const oldDefault = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3650.0982928509825!2d90.40744631543224!3d23.792476993561917!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755c711d9f8c63f%3A0xe7a505b0d0dc070c!2sThe%20Westin%20Dhaka!5e0!3m2!1sen!2sbd!4v1656461048039!5m2!1sen!2sbd";
            if (current.mapUrl === oldDefault) {
                current.mapUrl = DEFAULT_SETTINGS.mapUrl;
                localStorage.setItem("gm_settings", JSON.stringify(current));
            }
        } catch (e) {
            console.error("Failed to run local storage migration patch", e);
        }
    }
    if (!localStorage.getItem("gm_gallery")) {
        localStorage.setItem("gm_gallery", JSON.stringify(DEFAULT_GALLERY));
    }
    if (!localStorage.getItem("gm_album")) {
        localStorage.setItem("gm_album", JSON.stringify(DEFAULT_ALBUM));
    }
    if (!localStorage.getItem("gm_stories")) {
        localStorage.setItem("gm_stories", JSON.stringify(DEFAULT_WISHES));
    }
    if (!localStorage.getItem("gm_rsvps")) {
        localStorage.setItem("gm_rsvps", JSON.stringify(DEFAULT_RSVPS));
    }
    if (!localStorage.getItem("gm_visitors")) {
        localStorage.setItem("gm_visitors", JSON.stringify([]));
    }
    // Default admin credentials hashed (Toufik@12345)
    if (!localStorage.getItem("gm_admin_hash") || localStorage.getItem("gm_admin_user") === "admin") {
        localStorage.setItem("gm_admin_hash", "0e4d62d1b8ca9e042e3ed50c8f7cac6e8c6cb902e2b58bbd9b08a7d1a1761116");
        localStorage.setItem("gm_admin_user", "Toufik");
    }
    // Overwrite old wrong cached hash if present
    if (localStorage.getItem("gm_admin_hash") === "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918") {
        localStorage.setItem("gm_admin_hash", "008c70392e3abfbd0fa47bbc2ed96aa99bd49e159727fcba0f2e6abeb3a9d601");
    }
}
initializeLocalStorageDB();

// SHA-256 Hashing function (client-side for secure password comparison in local mode)
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Unified Database Service API
const dbService = {
    // Check if Firebase cloud mode is active
    isFirebaseEnabled: function() {
        return isFirebaseEnabled;
    },

    // 1. DYNAMIC GALLERY (MOMENTS) MANAGEMENT
    getGallery: async function() {
        if (isFirebaseEnabled) {
            try {
                const snapshot = await db.collection("gallery").get();
                const list = [];
                snapshot.forEach(doc => {
                    list.push({ id: doc.id, ...doc.data() });
                });
                return list;
            } catch (e) {
                console.error("Firestore getGallery failed. Falling back to local storage.", e);
            }
        }
        return JSON.parse(localStorage.getItem("gm_gallery")) || DEFAULT_GALLERY;
    },

    addGalleryItem: async function(item) {
        if (isFirebaseEnabled) {
            const docRef = await db.collection("gallery").add(item);
            return docRef.id;
        }
        const gallery = JSON.parse(localStorage.getItem("gm_gallery")) || DEFAULT_GALLERY;
        const newId = "gal_" + Date.now();
        const newItem = { id: newId, ...item };
        gallery.push(newItem);
        localStorage.setItem("gm_gallery", JSON.stringify(gallery));
        return newId;
    },

    updateGalleryItem: async function(id, updatedFields) {
        if (isFirebaseEnabled) {
            await db.collection("gallery").doc(id).update(updatedFields);
            return true;
        }
        const gallery = JSON.parse(localStorage.getItem("gm_gallery")) || DEFAULT_GALLERY;
        const idx = gallery.findIndex(g => g.id === id);
        if (idx !== -1) {
            gallery[idx] = { ...gallery[idx], ...updatedFields };
            localStorage.setItem("gm_gallery", JSON.stringify(gallery));
            return true;
        }
        return false;
    },

    deleteGalleryItem: async function(id) {
        if (isFirebaseEnabled) {
            await db.collection("gallery").doc(id).delete();
            return true;
        }
        let gallery = JSON.parse(localStorage.getItem("gm_gallery")) || DEFAULT_GALLERY;
        gallery = gallery.filter(g => g.id !== id);
        localStorage.setItem("gm_gallery", JSON.stringify(gallery));
        return true;
    },

    // 1B. WEDDING ALBUM (DOWNLOADABLE PHOTOS) MANAGEMENT
    getAlbum: async function() {
        if (isFirebaseEnabled) {
            try {
                const snapshot = await db.collection("album").get();
                const list = [];
                snapshot.forEach(doc => {
                    list.push({ id: doc.id, ...doc.data() });
                });
                return list;
            } catch (e) {
                console.error("Firestore getAlbum failed. Falling back to local storage.", e);
            }
        }
        return JSON.parse(localStorage.getItem("gm_album")) || DEFAULT_ALBUM;
    },

    addAlbumItem: async function(item) {
        if (isFirebaseEnabled) {
            const docRef = await db.collection("album").add(item);
            return docRef.id;
        }
        const album = JSON.parse(localStorage.getItem("gm_album")) || DEFAULT_ALBUM;
        const newId = "alb_" + Date.now();
        const newItem = { id: newId, ...item };
        album.push(newItem);
        localStorage.setItem("gm_album", JSON.stringify(album));
        return newId;
    },

    updateAlbumItem: async function(id, updatedFields) {
        if (isFirebaseEnabled) {
            await db.collection("album").doc(id).update(updatedFields);
            return true;
        }
        const album = JSON.parse(localStorage.getItem("gm_album")) || DEFAULT_ALBUM;
        const idx = album.findIndex(g => g.id === id);
        if (idx !== -1) {
            album[idx] = { ...album[idx], ...updatedFields };
            localStorage.setItem("gm_album", JSON.stringify(album));
            return true;
        }
        return false;
    },

    deleteAlbumItem: async function(id) {
        if (isFirebaseEnabled) {
            await db.collection("album").doc(id).delete();
            return true;
        }
        let album = JSON.parse(localStorage.getItem("gm_album")) || DEFAULT_ALBUM;
        album = album.filter(g => g.id !== id);
        localStorage.setItem("gm_album", JSON.stringify(album));
        return true;
    },

    // 2. GUESTBOOK WISHES (STORIES) MANAGEMENT
    getStories: async function() {
        if (isFirebaseEnabled) {
            try {
                const snapshot = await db.collection("wishes").get();
                const list = [];
                snapshot.forEach(doc => {
                    list.push({ id: doc.id, ...doc.data() });
                });
                return list;
            } catch (e) {
                console.error("Firestore getStories failed. Falling back to local storage.", e);
            }
        }
        return JSON.parse(localStorage.getItem("gm_stories"));
    },

    addStory: async function(wish) {
        if (isFirebaseEnabled) {
            const docRef = await db.collection("wishes").add(wish);
            return docRef.id;
        }
        const wishes = JSON.parse(localStorage.getItem("gm_stories"));
        const newId = "wish_" + Date.now();
        const newWish = { id: newId, ...wish };
        wishes.push(newWish);
        localStorage.setItem("gm_stories", JSON.stringify(wishes));
        return newId;
    },

    updateStory: async function(id, updatedFields) {
        if (isFirebaseEnabled) {
            await db.collection("wishes").doc(id).update(updatedFields);
            return true;
        }
        const wishes = JSON.parse(localStorage.getItem("gm_stories"));
        const idx = wishes.findIndex(s => s.id === id);
        if (idx !== -1) {
            wishes[idx] = { ...wishes[idx], ...updatedFields };
            localStorage.setItem("gm_stories", JSON.stringify(wishes));
            return true;
        }
        return false;
    },

    deleteStory: async function(id) {
        if (isFirebaseEnabled) {
            await db.collection("wishes").doc(id).delete();
            return true;
        }
        let wishes = JSON.parse(localStorage.getItem("gm_stories"));
        wishes = wishes.filter(s => s.id !== id);
        localStorage.setItem("gm_stories", JSON.stringify(wishes));
        return true;
    },

    // 3. RSVP MANAGEMENT
    getRSVPs: async function() {
        if (isFirebaseEnabled) {
            try {
                const snapshot = await db.collection("rsvps").get();
                const list = [];
                snapshot.forEach(doc => {
                    list.push({ id: doc.id, ...doc.data() });
                });
                return list.length > 0 ? list : DEFAULT_RSVPS;
            } catch (e) {
                console.error("Firestore getRSVPs failed.", e);
            }
        }
        return JSON.parse(localStorage.getItem("gm_rsvps"));
    },

    addRSVP: async function(rsvp) {
        if (isFirebaseEnabled) {
            try {
                const docRef = await db.collection("rsvps").add(rsvp);
                return docRef.id;
            } catch (e) {
                console.error("Firestore addRSVP failed.", e);
            }
        }
        const rsvps = JSON.parse(localStorage.getItem("gm_rsvps"));
        const newId = "rsvp_" + Date.now();
        const newRsvp = { id: newId, ...rsvp };
        rsvps.push(newRsvp);
        localStorage.setItem("gm_rsvps", JSON.stringify(rsvps));
        return newId;
    },

    deleteRSVP: async function(id) {
        if (isFirebaseEnabled) {
            try {
                await db.collection("rsvps").doc(id).delete();
                return true;
            } catch (e) {
                console.error("Firestore deleteRSVP failed.", e);
            }
        }
        let rsvps = JSON.parse(localStorage.getItem("gm_rsvps"));
        rsvps = rsvps.filter(r => r.id !== id);
        localStorage.setItem("gm_rsvps", JSON.stringify(rsvps));
        return true;
    },

    // 4. IMAGE UPLOAD HANDLER
    uploadImage: async function(file, customPath = "images") {
        if (isFirebaseEnabled && file) {
            try {
                const fileRef = storage.ref().child(`${customPath}/${Date.now()}_${file.name}`);
                
                // Map audio file extensions to their correct MIME contentTypes
                const metadata = {};
                const name = file.name.toLowerCase();
                if (file.type) {
                    metadata.contentType = file.type;
                } else if (name.endsWith(".mp3")) {
                    metadata.contentType = "audio/mpeg";
                } else if (name.endsWith(".m4a")) {
                    metadata.contentType = "audio/mp4";
                } else if (name.endsWith(".wav")) {
                    metadata.contentType = "audio/wav";
                } else if (name.endsWith(".aac")) {
                    metadata.contentType = "audio/aac";
                } else if (name.endsWith(".ogg")) {
                    metadata.contentType = "audio/ogg";
                } else if (name.endsWith(".caf")) {
                    metadata.contentType = "audio/x-caf";
                }
                
                const uploadTask = await fileRef.put(file, metadata);
                const downloadUrl = await uploadTask.ref.getDownloadURL();
                return downloadUrl;
            } catch (e) {
                console.error("Firebase Image upload failed.", e);
                throw e;
            }
        }
        
        if (file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    resolve(e.target.result); // Base64 data string
                };
                reader.onerror = function(e) {
                    reject(e);
                };
                reader.readAsDataURL(file);
            });
        }
        return null;
    },

    // 5. ADMIN AUTHENTICATION
    adminLogin: async function(username, password) {
        if (isFirebaseEnabled) {
            try {
                const email = username.includes("@") ? username : ((username.toLowerCase() === "toufik" || username.toLowerCase() === "admin") ? "laskartoufik47@gmail.com" : `${username}@getmarry-admin.com`);
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                return { success: true, user: userCredential.user };
            } catch (e) {
                console.error("Firebase Login failed.", e);
                return { success: false, error: e.message };
            }
        }
        
        const expectedUser = localStorage.getItem("gm_admin_user");
        const expectedHash = localStorage.getItem("gm_admin_hash");
        
        const inputHash = await sha256(password);
        const isUserValid = (username.toLowerCase() === "toufik" || username.toLowerCase() === "admin" || username === expectedUser);
        if (isUserValid && inputHash === expectedHash) {
            localStorage.setItem("gm_admin_session", "logged_in_" + Date.now());
            return { success: true, user: { email: `${username}@getmarry.com`, isLocal: true } };
        } else {
            return { success: false, error: "Incorrect admin credentials." };
        }
    },

    adminLogout: async function() {
        if (isFirebaseEnabled) {
            try {
                await auth.signOut();
            } catch (e) {
                console.error("Firebase signout failed.", e);
            }
        }
        localStorage.removeItem("gm_admin_session");
        return true;
    },

    isAdminLoggedIn: function() {
        if (isFirebaseEnabled) {
            return auth.currentUser !== null;
        }
        return localStorage.getItem("gm_admin_session") !== null;
    },

    sendAdminPasswordReset: async function(email) {
        if (isFirebaseEnabled) {
            try {
                await auth.sendPasswordResetEmail(email);
                return { success: true, message: "Password reset link sent to your email." };
            } catch (e) {
                console.error("Firebase sendPasswordResetEmail failed.", e);
                return { success: false, error: e.message };
            }
        }
        console.log(`Mock reset link sent to: ${email}`);
        return { 
            success: true, 
            message: `(Local Demo Mode) Password reset link has been mock sent to ${email}.` 
        };
    },

    getSettings: async function() {
        if (isFirebaseEnabled) {
            try {
                const doc = await db.collection("settings").doc("website_config").get();
                if (doc.exists) {
                    return doc.data();
                } else {
                    const localData = JSON.parse(localStorage.getItem("gm_settings")) || DEFAULT_SETTINGS;
                    await db.collection("settings").doc("website_config").set(localData);
                    console.log("Firestore settings seeded with default configurations.");
                    return localData;
                }
            } catch (e) {
                console.error("Firestore getSettings failed. Falling back to local storage.", e);
            }
        }
        return JSON.parse(localStorage.getItem("gm_settings")) || DEFAULT_SETTINGS;
    },

    updateSettings: async function(settings) {
        if (isFirebaseEnabled) {
            await db.collection("settings").doc("website_config").set(settings);
            return true;
        }
        localStorage.setItem("gm_settings", JSON.stringify(settings));
        return true;
    },

    getVisitors: async function() {
        if (isFirebaseEnabled) {
            try {
                const snapshot = await db.collection("visitors").orderBy("timestamp", "desc").get();
                return snapshot.docs.map(doc => doc.data());
            } catch (e) {
                console.error("Firestore getVisitors failed. Falling back to local storage.", e);
            }
        }
        const visitorsStr = localStorage.getItem("gm_visitors");
        return visitorsStr ? JSON.parse(visitorsStr) : [];
    },

    addVisitor: async function(visitor) {
        visitor.timestamp = Date.now();
        if (isFirebaseEnabled) {
            try {
                const snapshot = await db.collection("visitors")
                    .where("city", "==", visitor.city)
                    .where("country", "==", visitor.country)
                    .get();
                if (snapshot.empty) {
                    await db.collection("visitors").add(visitor);
                }
                return true;
            } catch (e) {
                console.error("Firestore addVisitor failed.", e);
            }
        }
        
        let visitors = JSON.parse(localStorage.getItem("gm_visitors")) || [];
        const exists = visitors.some(v => v.city === visitor.city && v.country === visitor.country);
        if (!exists) {
            visitors.push(visitor);
            localStorage.setItem("gm_visitors", JSON.stringify(visitors));
        }
        return true;
    },

    changeAdminPassword: async function(newPassword) {
        if (isFirebaseEnabled) {
            try {
                const user = auth.currentUser;
                if (user) {
                    await user.updatePassword(newPassword);
                    return { success: true };
                } else {
                    return { success: false, error: "No active admin session found. Please log in again." };
                }
            } catch (e) {
                console.error("Firebase updatePassword failed.", e);
                return { success: false, error: e.message };
            }
        } else {
            try {
                const newHash = await sha256(newPassword);
                localStorage.setItem("gm_admin_hash", newHash);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
    }
};
