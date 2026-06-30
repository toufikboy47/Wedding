/**
 * Admin.js - Administrative Dashboard Controller for Zack & Zoey's Wedding Portal
 * Manages RSVPs tracking, guest statistics calculation, and guestbook moderation.
 */

document.addEventListener("DOMContentLoaded", function() {
    // Image compressor utility (resizes to max 1920px width/height & compresses to 82% JPEG quality)
    async function compressImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.82) {
        let activeFile = file;
        const isHEIC = file.type === "image/heic" || 
                       file.type === "image/heif" || 
                       file.name.toLowerCase().endsWith(".heic") || 
                       file.name.toLowerCase().endsWith(".heif");
                       
        if (isHEIC && typeof heic2any !== "undefined") {
            try {
                console.log("Converting HEIC image to JPEG...");
                const conversionResult = await heic2any({
                    blob: file,
                    toType: "image/jpeg",
                    quality: 0.8
                });
                const blob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
                activeFile = new File([blob], file.name.substring(0, file.name.lastIndexOf('.')) + ".jpg", {
                    type: "image/jpeg",
                    lastModified: Date.now()
                });
            } catch (heicError) {
                console.error("HEIC conversion failed, using normal reader", heicError);
            }
        }

        if (!activeFile.type.startsWith("image/")) {
            return activeFile;
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(activeFile);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }
                    
                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const compressedFile = new File([blob], activeFile.name.substring(0, activeFile.name.lastIndexOf('.')) + ".jpg", {
                                    type: "image/jpeg",
                                    lastModified: Date.now()
                                });
                                resolve(compressedFile);
                            } else {
                                resolve(activeFile);
                            }
                        },
                        "image/jpeg",
                        quality
                    );
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    }

    // Elements
    const adminEllipsisBtn = document.getElementById("adminEllipsisBtn");
    const adminPanelModal = document.getElementById("adminPanelModal");
    const closeAdminModalBtn = document.getElementById("closeAdminModalBtn");
    
    const adminLoginFormArea = document.getElementById("adminLoginFormArea");
    const adminDashboardArea = document.getElementById("adminDashboardArea");
    
    const adminLoginForm = document.getElementById("adminLoginForm");
    const adminLogoutBtn = document.getElementById("adminLogoutBtn");
    const adminForgotPassBtn = document.getElementById("adminForgotPassBtn");
    const dbModeBadge = document.getElementById("dbModeBadge");

    // Dashboard Statistics Counters
    const totalRSVPsCount = document.getElementById("totalRSVPs");
    const totalAttendingCount = document.getElementById("totalAttending");
    const totalDeclinedCount = document.getElementById("totalDeclined");
    const rsvpTableBody = document.getElementById("rsvpTableBody");

    // Guestbook Wishes Tab Elements
    const adminStoryForm = document.getElementById("adminStoryForm");
    const editStoryId = document.getElementById("edit-story-id");
    const storyFormTitle = document.getElementById("storyFormTitle");
    const saveStoryBtn = document.getElementById("saveStoryBtn");
    const cancelStoryEditBtn = document.getElementById("cancelStoryEditBtn");
    const adminStoriesList = document.getElementById("adminStoriesList");

    // ==========================================================
    // 1. OPEN / CLOSE ADMIN PANEL MODAL
    // ==========================================================
    adminEllipsisBtn.addEventListener("click", function() {
        adminPanelModal.classList.remove("hidden-modal");
        checkAdminSession();
    });

    closeAdminModalBtn.addEventListener("click", function() {
        adminPanelModal.classList.add("hidden-modal");
    });

    // Close on click outside modal container
    adminPanelModal.addEventListener("click", function(e) {
        if (e.target === adminPanelModal) {
            adminPanelModal.classList.add("hidden-modal");
        }
    });

    // ==========================================================
    // 2. TAB TRANSITIONS INSIDE DASHBOARD
    // ==========================================================
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", function() {
            tabButtons.forEach(b => b.classList.remove("active"));
            this.classList.add("active");

            tabContents.forEach(content => content.classList.remove("active-content"));
            const targetTab = this.getAttribute("data-tab");
            document.getElementById(targetTab).classList.add("active-content");
        });
    });

    // ==========================================================
    // 2B. CLEAN DEMO DATA FROM FIREBASE / LOCAL STORAGE
    // ==========================================================
    const cleanDbBtn = document.getElementById("cleanDbBtn");
    if (cleanDbBtn) {
        cleanDbBtn.addEventListener("click", async () => {
            const confirmed = confirm("Are you sure you want to permanently delete all default placeholder images and messages from the database? This will NOT delete your own uploaded photos.");
            if (!confirmed) return;
            
            cleanDbBtn.disabled = true;
            cleanDbBtn.textContent = "Cleaning database...";
            
            try {
                let deletedCount = 0;
                
                // 1. Clean Gallery
                const galleryList = await dbService.getGallery();
                for (const p of galleryList) {
                    if (p.imageUrl && (p.imageUrl.startsWith("assets/") || p.imageUrl.includes("wedding_couple") || p.imageUrl.includes("success_couple") || p.imageUrl.includes("profile_woman"))) {
                        await dbService.deleteGalleryItem(p.id);
                        deletedCount++;
                    }
                }
                
                // 2. Clean Album
                const albumList = await dbService.getAlbum();
                for (const p of albumList) {
                    if (p.imageUrl && (p.imageUrl.startsWith("assets/") || p.imageUrl.includes("wedding_couple") || p.imageUrl.includes("success_couple") || p.imageUrl.includes("profile_woman"))) {
                        await dbService.deleteAlbumItem(p.id);
                        deletedCount++;
                    }
                }
                
                // 3. Clean Wishes (Guestbook)
                const wishesList = await dbService.getStories();
                for (const w of wishesList) {
                    if (w.names === "Dan & Sarah Miller" || w.names === "Uncle Robert" || w.names === "Alice Johnson" || w.names === "David Miller" || (w.imageUrl && w.imageUrl.startsWith("assets/"))) {
                        await dbService.deleteStory(w.id);
                        deletedCount++;
                    }
                }
                
                alert(`Successfully cleaned up the database! Deleted ${deletedCount} placeholder items permanently.`);
                location.reload();
            } catch (err) {
                console.error("Clean database failed", err);
                alert("Failed to clean database: " + err.message);
            } finally {
                cleanDbBtn.disabled = false;
                cleanDbBtn.textContent = "Clean Database";
            }
        });
    }

    // ==========================================================
    // 3. ADMIN SESSION LOGIC (LOGIN / LOGOUT / SESSION PRESERVE)
    // ==========================================================
    async function checkAdminSession() {
        if (dbService.isAdminLoggedIn()) {
            showDashboard();
        } else {
            showLoginForm();
        }
    }

    function showDashboard() {
        adminLoginFormArea.style.display = "none";
        adminDashboardArea.classList.remove("hidden-dashboard");
        
        // Update Firebase status badge
        if (dbService.isFirebaseEnabled()) {
            dbModeBadge.textContent = "Cloud Mode: Firebase Active";
            dbModeBadge.className = "badge-mode db-firebase";
        } else {
            dbModeBadge.textContent = "Demo Mode: LocalStorage";
            dbModeBadge.className = "badge-mode db-local";
        }

        renderAdminStoriesList();
        loadAdminSettings();
        renderAdminGalleryList();
        renderAdminAlbumList();
    }

    function showLoginForm() {
        adminDashboardArea.classList.add("hidden-dashboard");
        adminLoginFormArea.style.display = "block";
        adminLoginForm.reset();
    }

    // Login Submission Handler
    adminLoginForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        const user = document.getElementById("admin-username").value.trim();
        const pass = document.getElementById("admin-password").value;

        const result = await dbService.adminLogin(user, pass);
        if (result.success) {
            showDashboard();
        } else {
            alert("Login failed: " + result.error);
        }
    });

    // Forgot Password Handler
    adminForgotPassBtn.addEventListener("click", async function(e) {
        e.preventDefault();
        const email = prompt("Enter admin email address:");
        if (email) {
            const result = await dbService.sendAdminPasswordReset(email);
            alert(result.message || result.error);
        }
    });

    // Logout Handler
    adminLogoutBtn.addEventListener("click", async function() {
        await dbService.adminLogout();
        showLoginForm();
    });

    // ==========================================================
    // 4. RSVP RESPONSES TRACKING TABLE
    // ==========================================================
    window.renderRsvpsList = async function() {
        if (!rsvpTableBody) return;
        rsvpTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading RSVPs...</td></tr>`;
        
        try {
            const rsvps = await dbService.getRSVPs();
            rsvpTableBody.innerHTML = "";

            if (rsvps.length === 0) {
                rsvpTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No RSVP responses received yet.</td></tr>`;
                totalRSVPsCount.textContent = "0";
                totalAttendingCount.textContent = "0";
                totalDeclinedCount.textContent = "0";
                return;
            }

            let totalResponses = rsvps.length;
            let attendingCount = 0;
            let declinedCount = 0;

            rsvps.forEach(r => {
                const tr = document.createElement("tr");
                const isAttending = r.attending === "Yes";
                
                if (isAttending) {
                    attendingCount += parseInt(r.guests) || 1;
                } else {
                    declinedCount++;
                }

                tr.innerHTML = `
                    <td><strong>${r.name}</strong></td>
                    <td>${r.email}</td>
                    <td>
                        <span class="${isAttending ? 'badge-attending' : 'badge-declined'}">
                            ${isAttending ? 'Attending' : 'Declined'}
                        </span>
                    </td>
                    <td>${isAttending ? (r.guests || 1) : '-'}</td>
                    <td style="max-width: 250px; overflow-wrap: break-word;">${r.message || '<i>No message</i>'}</td>
                    <td>
                        <button class="btn-icon btn-delete" title="Delete Response" data-id="${r.id}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                `;
                rsvpTableBody.appendChild(tr);
            });

            // Set stats values
            totalRSVPsCount.textContent = totalResponses;
            totalAttendingCount.textContent = attendingCount;
            totalDeclinedCount.textContent = declinedCount;

            // Attach Delete RSVP buttons event listeners
            document.querySelectorAll("#rsvpTableBody .btn-delete").forEach(btn => {
                btn.addEventListener("click", function() {
                    const id = this.getAttribute("data-id");
                    deleteRsvpResponse(id);
                });
            });

        } catch (e) {
            console.error("Failed to fetch RSVPs table", e);
            rsvpTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error loading RSVP responses.</td></tr>`;
        }
    };

    async function deleteRsvpResponse(id) {
        if (confirm("Are you sure you want to delete this RSVP response?")) {
            await dbService.deleteRSVP(id);
            await renderRsvpsList();
        }
    }

    // ==========================================================
    // 5. GUESTBOOK WISHES MODERATION
    // ==========================================================
    window.renderAdminStoriesList = async function() {
        adminStoriesList.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`;
        const wishes = await dbService.getStories();
        adminStoriesList.innerHTML = "";

        if (wishes.length === 0) {
            adminStoriesList.innerHTML = `<p class="no-results-msg">No guestbook wishes posted.</p>`;
            return;
        }

        wishes.forEach(w => {
            const item = document.createElement("div");
            item.className = "admin-list-item";
            item.innerHTML = `
                <div class="item-info">
                    <span class="item-title">${w.names}</span>
                    <span class="item-subtitle">${w.date}</span>
                </div>
                <div class="item-actions">
                    <button class="btn-icon btn-edit" title="Edit Entry" data-id="${w.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-delete" title="Delete Entry" data-id="${w.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            adminStoriesList.appendChild(item);
        });

        // Edit/Delete button event bindings
        document.querySelectorAll("#adminStoriesList .btn-edit").forEach(btn => {
            btn.addEventListener("click", function() {
                const id = this.getAttribute("data-id");
                editWishEntry(id, wishes);
            });
        });

        document.querySelectorAll("#adminStoriesList .btn-delete").forEach(btn => {
            btn.addEventListener("click", function() {
                const id = this.getAttribute("data-id");
                deleteWishEntry(id);
            });
        });
    };

    // Submit Wish Editor
    adminStoryForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        saveStoryBtn.disabled = true;
        saveStoryBtn.textContent = "Saving...";

        const id = editStoryId.value;
        const names = document.getElementById("story-names").value;
        const date = document.getElementById("story-date").value;
        const content = document.getElementById("story-content").value;

        const wishData = {
            names, date, content, imageUrl: "assets/success_couple_1.jpg"
        };

        if (id) {
            await dbService.updateStory(id, wishData);
            alert("Guestbook wish entry updated successfully!");
        } else {
            await dbService.addStory(wishData);
            alert("New guestbook entry added successfully!");
        }

        resetStoryForm();
        await renderAdminStoriesList();
        
        // Reload wishes boards
        if (window.loadStories) window.loadStories();

        saveStoryBtn.disabled = false;
    });

    function editWishEntry(id, wishes) {
        const w = wishes.find(item => item.id === id);
        if (w) {
            editStoryId.value = w.id;
            document.getElementById("story-names").value = w.names;
            document.getElementById("story-date").value = w.date;
            document.getElementById("story-content").value = w.content;

            storyFormTitle.textContent = "Edit Guestbook Entry";
            saveStoryBtn.textContent = "Update Entry";
            cancelStoryEditBtn.style.display = "inline-flex";
            
            document.querySelector("#guestbook-tab .tab-form-side").scrollTop = 0;
        }
    }

    async function deleteWishEntry(id) {
        if (confirm("Are you sure you want to delete this guestbook wish entry?")) {
            await dbService.deleteStory(id);
            await renderAdminStoriesList();
            if (window.loadStories) window.loadStories();
            alert("Guestbook wish entry deleted successfully.");
        }
    }

    function resetStoryForm() {
        adminStoryForm.reset();
        editStoryId.value = "";
        storyFormTitle.textContent = "Edit Guestbook Entry";
        saveStoryBtn.textContent = "Save Changes";
        cancelStoryEditBtn.style.display = "none";
    }

    cancelStoryEditBtn.addEventListener("click", resetStoryForm);

    // ==========================================================
    // 6. WEBSITE CMS SETTINGS FORM
    // ==========================================================
    let currentHeroSlideshowImages = [];

    async function saveUpdatedSlideshowImages() {
        try {
            const settings = await dbService.getSettings();
            settings.heroImages = currentHeroSlideshowImages;
            await dbService.updateSettings(settings);
            if (window.applyLoadedSettings) {
                await window.applyLoadedSettings();
            }
        } catch (err) {
            console.error("Failed to save updated slideshow list", err);
        }
    }

    function renderAdminHeroSlideshowList() {
        const container = document.getElementById("adminSlideshowManagerList");
        if (!container) return;
        container.innerHTML = "";
        if (currentHeroSlideshowImages.length === 0) {
            container.innerHTML = `<span style="color: #888; font-size: 0.85rem;">No slideshow photos uploaded. Using backup single image URL.</span>`;
            return;
        }
        currentHeroSlideshowImages.forEach((imgUrl, index) => {
            const item = document.createElement("div");
            item.className = "slideshow-photo-item";
            const img = document.createElement("img");
            img.src = imgUrl;
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "slideshow-photo-delete";
            deleteBtn.innerHTML = "&times;";
            deleteBtn.type = "button";
            deleteBtn.addEventListener("click", async () => {
                currentHeroSlideshowImages.splice(index, 1);
                renderAdminHeroSlideshowList();
                await saveUpdatedSlideshowImages();
            });
            item.appendChild(img);
            item.appendChild(deleteBtn);
            container.appendChild(item);
        });
    }

    async function loadAdminSettings() {
        try {
            const settings = await dbService.getSettings();
            if (settings) {
                document.getElementById("cfg-groom-name").value = settings.groomName || "";
                document.getElementById("cfg-bride-name").value = settings.brideName || "";
                document.getElementById("cfg-tagline").value = settings.tagline || "";
                document.getElementById("cfg-wedding-time").value = settings.weddingTime || "";
                document.getElementById("cfg-wedding-date-text").value = settings.weddingDateText || "";
                document.getElementById("cfg-wedding-venue-text").value = settings.ceremonyVenue || "";
                
                currentHeroSlideshowImages = settings.heroImages || [];
                const rotationInterval = document.getElementById("slide-rotation-interval");
                if (rotationInterval) {
                    rotationInterval.value = settings.heroInterval || 5;
                }
                const backupUrlInput = document.getElementById("slide-backup-url");
                if (backupUrlInput) {
                    backupUrlInput.value = settings.heroImage || "";
                }
                renderAdminHeroSlideshowList();

                document.getElementById("cfg-intro-bgcolor").value = settings.introBgColor || "#0b1412";
                document.getElementById("cfg-intro-bgimg-url").value = settings.introBgImage || "";

                document.getElementById("cfg-gallery-sub").value = settings.gallerySub || "";
                document.getElementById("cfg-menu-sub").value = settings.menuSub || "";
                document.getElementById("cfg-holud-menu").value = settings.holudMenu || "";
                document.getElementById("cfg-ceremony-menu").value = settings.ceremonyMenu || "";
                document.getElementById("cfg-reception-menu").value = settings.receptionMenu || "";

                document.getElementById("cfg-holud-date").value = settings.holudDateText || "";
                document.getElementById("cfg-holud-time").value = settings.holudTimeText || "";
                document.getElementById("cfg-holud-venue").value = settings.holudVenue || "";
                document.getElementById("cfg-holud-dress-code").value = settings.holudDressCode || "";
                
                document.getElementById("cfg-ceremony-date").value = settings.ceremonyDateText || "";
                document.getElementById("cfg-ceremony-time").value = settings.ceremonyTimeText || "";
                document.getElementById("cfg-ceremony-dress-code").value = settings.ceremonyDressCode || "";
                
                document.getElementById("cfg-reception-date").value = settings.receptionDateText || "";
                document.getElementById("cfg-reception-time").value = settings.receptionTimeText || "";
                document.getElementById("cfg-reception-venue").value = settings.receptionVenue || "";
                document.getElementById("cfg-reception-dress-code").value = settings.receptionDressCode || "";
                
                document.getElementById("cfg-map-url").value = settings.mapUrl || "";
                document.getElementById("cfg-music-url").value = settings.musicUrl || "";
                
                document.getElementById("cfg-story-met-title").value = settings.storyMetTitle || "";
                document.getElementById("cfg-story-met-content").value = settings.storyMetContent || "";
                document.getElementById("cfg-story-proposal-title").value = settings.storyProposalTitle || "";
                document.getElementById("cfg-story-proposal-content").value = settings.storyProposalContent || "";
            }
        } catch (e) {
            console.error("Failed to load admin settings form data", e);
        }
    }

    const adminSettingsForm = document.getElementById("adminSettingsForm");
    adminSettingsForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const saveBtn = this.querySelector('button[type="submit"]');
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving Configurations...";

        const musicFile = document.getElementById("cfg-music-file").files[0];
        const introBgimgFile = document.getElementById("cfg-intro-bgimg-file").files[0];
        
        let musicUrl = document.getElementById("cfg-music-url").value.trim();
        let introBgImage = document.getElementById("cfg-intro-bgimg-url").value.trim();

        // Helper to timeout a promise
        function promiseTimeout(promise, ms, errorMsg) {
            let timeout = new Promise((resolve, reject) => {
                let id = setTimeout(() => {
                    clearTimeout(id);
                    reject(new Error(errorMsg));
                }, ms);
            });
            return Promise.race([promise, timeout]);
        }

        try {
            if (musicFile) {
                if (!dbService.isFirebaseEnabled()) {
                    alert("Audio file upload is only supported in Firebase Cloud Mode. In Local Demo Mode, please use a direct MP3 URL link instead.");
                    saveBtn.disabled = false;
                    saveBtn.textContent = "Save Website Configurations";
                    return;
                }
                
                // Limit music file size to 15MB to support larger songs
                if (musicFile.size > 15 * 1024 * 1024) {
                    alert("Audio file size is too large (Max limit: 15MB). Please use a compressed MP3 file or a shorter loop to ensure fast page loads for guests.");
                    saveBtn.disabled = false;
                    saveBtn.textContent = "Save Website Configurations";
                    return;
                }

                saveBtn.textContent = "Uploading Audio File (this may take a moment)...";
                const uploadedUrl = await promiseTimeout(
                    dbService.uploadImage(musicFile, "gallery"),
                    90000,
                    "Audio upload timed out. Please try a smaller file or copy a direct MP3 URL."
                );
                
                if (uploadedUrl && uploadedUrl.startsWith("data:")) {
                    alert("Failed to upload audio to Cloud Storage. Please make sure Firebase Storage is enabled in your Firebase Console and has appropriate security rules.");
                    saveBtn.disabled = false;
                    saveBtn.textContent = "Save Website Configurations";
                    return;
                }
                musicUrl = uploadedUrl;
            }
            if (introBgimgFile) {
                saveBtn.textContent = "Processing Intro Background...";
                const compressed = await compressImage(introBgimgFile);
                saveBtn.textContent = "Uploading Intro Background...";
                introBgImage = await promiseTimeout(
                    dbService.uploadImage(compressed, "gallery"),
                    20000,
                    "Intro background upload timed out."
                );
            }
            saveBtn.textContent = "Saving configurations...";
        } catch (e) {
            console.error("Failed to upload settings files", e);
            alert("Upload failed: " + e.message);
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Website Configurations";
            return;
        }

        try {
            const currentSettings = await dbService.getSettings() || {};
            const newSettings = {
                ...currentSettings,
                groomName: document.getElementById("cfg-groom-name").value.trim(),
                brideName: document.getElementById("cfg-bride-name").value.trim(),
                tagline: document.getElementById("cfg-tagline").value.trim(),
                weddingTime: document.getElementById("cfg-wedding-time").value.trim(),
                weddingDateText: document.getElementById("cfg-wedding-date-text").value.trim(),
                ceremonyVenue: document.getElementById("cfg-wedding-venue-text").value.trim(),
                introBgColor: document.getElementById("cfg-intro-bgcolor").value,
                introBgImage: introBgImage,

                gallerySub: document.getElementById("cfg-gallery-sub").value.trim(),
                menuSub: document.getElementById("cfg-menu-sub").value.trim(),
                holudMenu: document.getElementById("cfg-holud-menu").value.trim(),
                ceremonyMenu: document.getElementById("cfg-ceremony-menu").value.trim(),
                receptionMenu: document.getElementById("cfg-reception-menu").value.trim(),

                holudDateText: document.getElementById("cfg-holud-date").value.trim(),
                holudTimeText: document.getElementById("cfg-holud-time").value.trim(),
                holudVenue: document.getElementById("cfg-holud-venue").value.trim(),
                holudDressCode: document.getElementById("cfg-holud-dress-code").value.trim(),
                
                ceremonyDateText: document.getElementById("cfg-ceremony-date").value.trim(),
                ceremonyTimeText: document.getElementById("cfg-ceremony-time").value.trim(),
                ceremonyDressCode: document.getElementById("cfg-ceremony-dress-code").value.trim(),
                
                receptionDateText: document.getElementById("cfg-reception-date").value.trim(),
                receptionTimeText: document.getElementById("cfg-reception-time").value.trim(),
                receptionVenue: document.getElementById("cfg-reception-venue").value.trim(),
                receptionDressCode: document.getElementById("cfg-reception-dress-code").value.trim(),
                
                mapUrl: document.getElementById("cfg-map-url").value.trim(),
                musicUrl: musicUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
                
                storyMetTitle: document.getElementById("cfg-story-met-title").value.trim(),
                storyMetContent: document.getElementById("cfg-story-met-content").value.trim(),
                storyProposalTitle: document.getElementById("cfg-story-proposal-title").value.trim(),
                storyProposalContent: document.getElementById("cfg-story-proposal-content").value.trim()
            };

            await dbService.updateSettings(newSettings);
            
            if (window.applyLoadedSettings) {
                await window.applyLoadedSettings();
            }
            
            alert("Website configurations updated successfully!");
        } catch (err) {
            console.error("Failed to save settings", err);
            alert("Error saving configurations.");
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Website Configurations";
        }
    });

    // ==========================================================
    // 6B. HERO SLIDESHOW MANAGER FORM HANDLERS
    // ==========================================================
    const adminSlideshowForm = document.getElementById("adminSlideshowForm");
    if (adminSlideshowForm) {
        adminSlideshowForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const submitBtn = this.querySelector('button[type="submit"]');
            
            const files = document.getElementById("slide-photo-files").files;
            const photoUrl = document.getElementById("slide-photo-url").value.trim();
            const intervalInput = document.getElementById("slide-rotation-interval");
            const interval = parseInt(intervalInput.value) || 5;

            if (files.length === 0 && !photoUrl) {
                alert("Please select one or more image files to upload OR enter a photo URL.");
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Uploading Photos...";

            // Helper to timeout a promise
            function promiseTimeout(promise, ms, errorMsg) {
                let timeout = new Promise((resolve, reject) => {
                    let id = setTimeout(() => {
                        clearTimeout(id);
                        reject(new Error(errorMsg));
                    }, ms);
                });
                return Promise.race([promise, timeout]);
            }

            try {
                if (files && files.length > 0) {
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        submitBtn.textContent = `Processing Photo ${i + 1}/${files.length}...`;
                        const compressed = await compressImage(file);
                        submitBtn.textContent = `Uploading Photo ${i + 1}/${files.length}...`;
                        const uploadedUrl = await promiseTimeout(
                            dbService.uploadImage(compressed, "gallery"),
                            25000,
                            `Slideshow photo ${i + 1} upload timed out.`
                        );
                        if (uploadedUrl) {
                            currentHeroSlideshowImages.push(uploadedUrl);
                        }
                    }
                }

                if (photoUrl) {
                    currentHeroSlideshowImages.push(photoUrl);
                }

                // Update settings
                const settings = await dbService.getSettings() || {};
                settings.heroImages = currentHeroSlideshowImages;
                settings.heroInterval = interval;

                await dbService.updateSettings(settings);

                if (window.applyLoadedSettings) {
                    await window.applyLoadedSettings();
                }

                document.getElementById("slide-photo-files").value = "";
                document.getElementById("slide-photo-url").value = "";
                renderAdminHeroSlideshowList();
                alert("Slideshow updated successfully!");
            } catch (err) {
                console.error("Failed to update slideshow photos", err);
                alert("Failed to update slideshow: " + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Upload Photos";
            }
        });
    }

    const adminBackupImageForm = document.getElementById("adminBackupImageForm");
    if (adminBackupImageForm) {
        adminBackupImageForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = "Saving...";

            const backupUrl = document.getElementById("slide-backup-url").value.trim();

            try {
                const settings = await dbService.getSettings() || {};
                settings.heroImage = backupUrl || "assets/wedding_couple.jpg";

                await dbService.updateSettings(settings);

                if (window.applyLoadedSettings) {
                    await window.applyLoadedSettings();
                }

                alert("Backup single image URL saved successfully!");
            } catch (err) {
                console.error("Failed to save backup image", err);
                alert("Failed to save backup image: " + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Save Backup Image";
            }
        });
    }

    // ==========================================================
    // 7. COUPLE GALLERY CRUD MANAGEMENT
    // ==========================================================
    const adminGalleryList = document.getElementById("adminGalleryList");
    const adminGalleryForm = document.getElementById("adminGalleryForm");
    const editGalleryId = document.getElementById("edit-gallery-id");
    const galleryFormTitle = document.getElementById("galleryFormTitle");
    const saveGalleryBtn = document.getElementById("saveGalleryBtn");
    const cancelGalleryEditBtn = document.getElementById("cancelGalleryEditBtn");

    window.renderAdminGalleryList = async function() {
        if (!adminGalleryList) return;
        adminGalleryList.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`;
        
        try {
            const list = await dbService.getGallery();
            adminGalleryList.innerHTML = "";
            
            if (list.length === 0) {
                adminGalleryList.innerHTML = `<p class="no-results-msg">No photos registered.</p>`;
                return;
            }

            list.forEach(p => {
                const item = document.createElement("div");
                item.className = "admin-list-item";
                item.innerHTML = `
                    <div class="item-info" style="display: flex; align-items: center; gap: 10px;">
                        <img src="${p.imageUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid var(--grey-light);">
                        <div>
                            <span class="item-title">${p.caption || 'No Caption'}</span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon btn-edit" title="Edit Photo" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon btn-delete" title="Delete Photo" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
                adminGalleryList.appendChild(item);
            });

            // Bind events for edit/delete
            document.querySelectorAll("#adminGalleryList .btn-edit").forEach(btn => {
                btn.addEventListener("click", function() {
                    const id = this.getAttribute("data-id");
                    editGalleryItem(id, list);
                });
            });

            document.querySelectorAll("#adminGalleryList .btn-delete").forEach(btn => {
                btn.addEventListener("click", function() {
                    const id = this.getAttribute("data-id");
                    deleteGalleryItem(id);
                });
            });

        } catch (e) {
            console.error("Failed to render admin gallery list", e);
            adminGalleryList.innerHTML = `<p style="color:red; text-align:center;">Failed to load gallery.</p>`;
        }
    };

    // Submit handler for gallery photo (add/edit)
    adminGalleryForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        saveGalleryBtn.disabled = true;
        saveGalleryBtn.textContent = "Saving Photo...";

        const id = editGalleryId.value;
        const caption = document.getElementById("bm-caption").value.trim();
        const photoFile = document.getElementById("bm-photo-file").files[0];
        let imageUrl = document.getElementById("bm-photo-url").value.trim();

        try {
            if (photoFile) {
                const compressed = await compressImage(photoFile);
                imageUrl = await dbService.uploadImage(compressed, "gallery");
            }
        } catch (err) {
            console.error("Failed to upload gallery photo", err);
        }

        const galleryData = {
            caption,
            imageUrl: imageUrl || "assets/wedding_couple.jpg"
        };

        try {
            if (id) {
                await dbService.updateGalleryItem(id, galleryData);
                alert("Gallery photo updated successfully!");
            } else {
                await dbService.addGalleryItem(galleryData);
                alert("New photo added to gallery successfully!");
            }

            resetGalleryForm();
            await renderAdminGalleryList();
            
            // Reload home page gallery
            if (window.loadGallery) {
                await window.loadGallery();
            }

        } catch (err) {
            console.error("Failed to save gallery photo", err);
            alert("Error saving photo.");
        } finally {
            saveGalleryBtn.disabled = false;
            saveGalleryBtn.textContent = "Save Photo";
        }
    });

    function editGalleryItem(id, list) {
        const p = list.find(item => item.id === id);
        if (p) {
            editGalleryId.value = p.id;
            document.getElementById("bm-caption").value = p.caption || "";
            document.getElementById("bm-photo-url").value = p.imageUrl || "";

            galleryFormTitle.textContent = "Edit Photo Details";
            saveGalleryBtn.textContent = "Update Photo";
            cancelGalleryEditBtn.style.display = "inline-flex";

            // Scroll form to top
            document.querySelector("#gallery-tab .tab-form-side").scrollTop = 0;
        }
    }

    async function deleteGalleryItem(id) {
        if (confirm("Are you sure you want to delete this photo from the gallery?")) {
            try {
                await dbService.deleteGalleryItem(id);
                await renderAdminGalleryList();
                
                // Reload home page gallery
                if (window.loadGallery) {
                    await window.loadGallery();
                }
                
                alert("Photo deleted successfully.");
            } catch (err) {
                console.error("Failed to delete gallery photo", err);
                alert("Error deleting photo.");
            }
        }
    }

    function resetGalleryForm() {
        adminGalleryForm.reset();
        editGalleryId.value = "";
        galleryFormTitle.textContent = "Add New Photo";
        saveGalleryBtn.textContent = "Save Photo";
        cancelGalleryEditBtn.style.display = "none";
    }

    cancelGalleryEditBtn.addEventListener("click", resetGalleryForm);

    // ==========================================================
    // 7B. WEDDING ALBUM CRUD MANAGEMENT
    // ==========================================================
    const adminAlbumList = document.getElementById("adminAlbumList");
    const adminAlbumForm = document.getElementById("adminAlbumForm");
    const editAlbumId = document.getElementById("edit-album-id");
    const albumFormTitle = document.getElementById("albumFormTitle");
    const saveAlbumBtn = document.getElementById("saveAlbumBtn");
    const cancelAlbumEditBtn = document.getElementById("cancelAlbumEditBtn");

    window.renderAdminAlbumList = async function() {
        if (!adminAlbumList) return;
        adminAlbumList.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`;
        
        try {
            const list = await dbService.getAlbum();
            adminAlbumList.innerHTML = "";
            
            if (list.length === 0) {
                adminAlbumList.innerHTML = `<p class="no-results-msg">No downloadable album photos registered.</p>`;
                return;
            }

            list.forEach(p => {
                const item = document.createElement("div");
                item.className = "admin-list-item";
                item.innerHTML = `
                    <div class="item-info" style="display: flex; align-items: center; gap: 10px;">
                        <img src="${p.imageUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid var(--grey-light);">
                        <div>
                            <span class="item-title">${p.caption || 'No Caption'}</span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon btn-edit" title="Edit Photo" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon btn-delete" title="Delete Photo" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
                adminAlbumList.appendChild(item);
            });

            // Bind Album Actions
            adminAlbumList.querySelectorAll(".btn-edit").forEach(btn => {
                btn.addEventListener("click", function() {
                    const id = this.getAttribute("data-id");
                    const found = list.find(x => x.id === id);
                    if (found) {
                        editAlbumId.value = found.id;
                        document.getElementById("alb-caption").value = found.caption || "";
                        document.getElementById("alb-photo-url").value = found.imageUrl || "";
                        albumFormTitle.textContent = "Edit Album Photo Details";
                        saveAlbumBtn.textContent = "Update Photo";
                        cancelAlbumEditBtn.style.display = "inline-flex";
                        document.querySelector("#album-tab .tab-form-side").scrollTop = 0;
                    }
                });
            });

            adminAlbumList.querySelectorAll(".btn-delete").forEach(btn => {
                btn.addEventListener("click", function() {
                    const id = this.getAttribute("data-id");
                    deleteAlbumItem(id);
                });
            });

        } catch (e) {
            console.error("Failed to render admin album list", e);
            adminAlbumList.innerHTML = `<p class="error-msg">Error loading album photos.</p>`;
        }
    };

    if (adminAlbumForm) {
        adminAlbumForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            
            saveAlbumBtn.disabled = true;
            saveAlbumBtn.textContent = "Saving Photo...";

            const caption = document.getElementById("alb-caption").value.trim();
            const urlInput = document.getElementById("alb-photo-url").value.trim();
            const fileInput = document.getElementById("alb-photo-file").files[0];
            const editId = editAlbumId.value;

            let imageUrl = urlInput || "assets/success_couple_1.jpg";

            try {
                if (fileInput) {
                    const compressed = await compressImage(fileInput);
                    imageUrl = await dbService.uploadImage(compressed, "album");
                }

                const itemData = { caption, imageUrl };

                if (editId) {
                    await dbService.updateAlbumItem(editId, itemData);
                    alert("Album photo updated successfully.");
                } else {
                    await dbService.addAlbumItem(itemData);
                    alert("Album photo added successfully.");
                }

                resetAlbumForm();
                await renderAdminAlbumList();
                
                if (window.loadAlbum) {
                    await window.loadAlbum();
                }
            } catch (err) {
                console.error("Failed to save album photo", err);
                alert("Error saving photo: " + err.message);
            } finally {
                saveAlbumBtn.disabled = false;
                saveAlbumBtn.textContent = editId ? "Update Photo" : "Save Photo";
            }
        });
    }

    async function deleteAlbumItem(id) {
        if (confirm("Are you sure you want to delete this photo from the downloadable album?")) {
            try {
                await dbService.deleteAlbumItem(id);
                await renderAdminAlbumList();
                
                if (window.loadAlbum) {
                    await window.loadAlbum();
                }
                
                alert("Album photo deleted successfully.");
            } catch (err) {
                console.error("Failed to delete album photo", err);
                alert("Error deleting photo.");
            }
        }
    }

    function resetAlbumForm() {
        if (adminAlbumForm) {
            adminAlbumForm.reset();
            editAlbumId.value = "";
            albumFormTitle.textContent = "Add New Album Photo";
            saveAlbumBtn.textContent = "Save Photo";
            cancelAlbumEditBtn.style.display = "none";
        }
    }

    if (cancelAlbumEditBtn) {
        cancelAlbumEditBtn.addEventListener("click", resetAlbumForm);
    }

    // Change Admin Password Click Handler
    const changePasswordBtn = document.getElementById("changePasswordBtn");
    const cfgNewPassword = document.getElementById("cfg-new-password");
    const cfgConfirmPassword = document.getElementById("cfg-confirm-password");

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener("click", async function() {
            const newPassword = cfgNewPassword.value;
            const confirmPassword = cfgConfirmPassword.value;

            if (!newPassword || newPassword.trim().length === 0) {
                alert("Please enter a valid new password.");
                return;
            }

            if (newPassword.length < 6) {
                alert("Password must be at least 6 characters long.");
                return;
            }

            if (newPassword !== confirmPassword) {
                alert("Passwords do not match. Please verify.");
                return;
            }

            changePasswordBtn.disabled = true;
            changePasswordBtn.textContent = "Updating Password...";

            const result = await dbService.changeAdminPassword(newPassword);
            if (result.success) {
                alert("Success! Admin password has been updated.");
                cfgNewPassword.value = "";
                cfgConfirmPassword.value = "";
            } else {
                if (result.error && result.error.includes("recent")) {
                    alert("Security Check: This operation requires you to have logged in recently. Please log out, log back in, and try changing the password again.");
                } else {
                    alert("Failed to update password: " + result.error);
                }
            }

            changePasswordBtn.disabled = false;
            changePasswordBtn.textContent = "Update Password";
        });
    }

});
