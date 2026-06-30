/**
 * App.js - Main UI Controller for Zack & Zoey's Wedding Portal
 * Controls page transition, countdown, RSVP submissions, guestbook posting, and ambient sound.
 */

document.addEventListener("DOMContentLoaded", function() {
    // UI Elements
    const introContainer = document.getElementById("intro-container");
    const mainPortal = document.getElementById("main-portal");
    const tapToOpenBtn = document.getElementById("tap-to-open-btn");
    
    const musicToggleBtn = document.getElementById("musicToggleBtn");
    const musicStatusText = document.getElementById("musicStatusText");
    
    const galleryPhotosContainer = document.getElementById("galleryPhotosContainer");
    const wishesContainer = document.getElementById("successStoriesContainer");
    
    const rsvpForm = document.getElementById("rsvpForm");
    const guestbookWishForm = document.getElementById("guestbookWishForm");

    // ==========================================================
    // 0. WEBSITE CONFIGURATION SETTINGS (CMS)
    // ==========================================================
    let weddingDate = new Date("Oct 24, 2026 19:00:00").getTime();
    let siteSettings = {};

    window.applyLoadedSettings = async function() {
        try {
            const settings = await dbService.getSettings();
            siteSettings = settings;
            
            // Update countdown target
            if (settings.weddingTime) {
                weddingDate = new Date(settings.weddingTime).getTime();
            }

            // Update Header and Hero details
            if (settings.groomName) {
                document.getElementById("ui-logo-groom").textContent = settings.groomName;
            }
            if (settings.brideName) {
                document.getElementById("ui-logo-bride").textContent = settings.brideName;
            }
            if (settings.groomName && settings.brideName) {
                document.getElementById("ui-hero-names").textContent = settings.groomName + " & " + settings.brideName;
                document.querySelector(".intro-hint").textContent = settings.groomName + " & " + settings.brideName + "'s Big Day";
                
                // Show dynamic initials of both names, e.g., "Z & Z" or "T & T"
                const initialsEl = document.getElementById("ui-intro-initials");
                if (initialsEl) {
                    initialsEl.textContent = settings.groomName.charAt(0).toUpperCase() + " & " + settings.brideName.charAt(0).toUpperCase();
                }
            }
            if (settings.tagline) {
                document.getElementById("ui-logo-tagline").textContent = settings.tagline;
            }
            if (settings.weddingDateText) {
                document.getElementById("ui-wedding-date").textContent = settings.weddingDateText;
            }
            if (settings.ceremonyVenue) {
                document.getElementById("ui-wedding-venue").textContent = settings.ceremonyVenue;
                document.getElementById("ui-map-link").href = "https://maps.google.com/?q=" + encodeURIComponent(settings.ceremonyVenue);
                document.getElementById("ui-map-desc").innerHTML = "All our wedding events are taking place at premier venues. Use the map to get directions directly to the main ceremony at <strong>" + settings.ceremonyVenue + "</strong>.";
            }

            // Update Gaye Holud Details
            if (settings.holudDateText) document.getElementById("ui-holud-date").textContent = settings.holudDateText;
            if (settings.holudTimeText) document.getElementById("ui-holud-time").textContent = settings.holudTimeText;
            if (settings.holudVenue) document.getElementById("ui-holud-venue").textContent = settings.holudVenue;

            // Update Ceremony Details
            if (settings.ceremonyDateText) document.getElementById("ui-ceremony-date").textContent = settings.ceremonyDateText;
            if (settings.ceremonyTimeText) document.getElementById("ui-ceremony-time").textContent = settings.ceremonyTimeText;
            if (settings.ceremonyVenue) document.getElementById("ui-ceremony-venue").textContent = settings.ceremonyVenue;

            // Update Reception Details
            if (settings.receptionDateText) document.getElementById("ui-reception-date").textContent = settings.receptionDateText;
            if (settings.receptionTimeText) document.getElementById("ui-reception-time").textContent = settings.receptionTimeText;
            if (settings.receptionVenue) document.getElementById("ui-reception-venue").textContent = settings.receptionVenue;

            // Update Map URL
            if (settings.mapUrl) {
                document.getElementById("ui-map-iframe").src = settings.mapUrl;
            }

            // Update Love Story Details
            if (settings.storyMetTitle) document.getElementById("ui-story-met-title").textContent = settings.storyMetTitle;
            if (settings.storyMetContent) document.getElementById("ui-story-met-content").textContent = settings.storyMetContent;
            if (settings.storyProposalTitle) document.getElementById("ui-story-proposal-title").textContent = settings.storyProposalTitle;
            if (settings.storyProposalContent) document.getElementById("ui-story-proposal-content").textContent = settings.storyProposalContent;

            // Update Music Track URL
            if (settings.musicUrl) {
                let playableUrl = settings.musicUrl;
                const driveRegex = /(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=)([^/?#&\s]+)/i;
                const match = settings.musicUrl.match(driveRegex);
                if (match && match[1]) {
                    playableUrl = `https://docs.google.com/uc?export=open&id=${match[1]}`;
                }

                if (bgAudio.src !== playableUrl) {
                    const wasPlaying = !bgAudio.paused;
                    bgAudio.src = playableUrl;
                    if (wasPlaying) {
                        bgAudio.play().catch(err => console.log("Audio play resume prevented", err));
                    }
                }
            }

            // Update Couple Images / Slideshow
            const heroContainer = document.querySelector(".hero-banner-image");
            const heroImgElement = document.getElementById("ui-hero-banner-img");
            
            // Clear any running slideshow interval
            if (window.heroIntervalId) {
                clearInterval(window.heroIntervalId);
                window.heroIntervalId = null;
            }
            
            // Remove any existing slideshow slide divs
            if (heroContainer) {
                const existingSlides = heroContainer.querySelectorAll(".hero-image-slide");
                existingSlides.forEach(slide => slide.remove());
            }
            
            const heroImages = settings.heroImages || [];
            if (heroContainer && heroImages.length > 0) {
                // Hide default single image
                if (heroImgElement) {
                    heroImgElement.style.display = "none";
                }
                
                // Create slideshow slide elements
                heroImages.forEach((imgUrl, idx) => {
                    const slide = document.createElement("div");
                    slide.className = "hero-image-slide" + (idx === 0 ? " active" : "");
                    slide.style.backgroundImage = `url(${imgUrl})`;
                    // Prepend to container so it sits behind badge and overlay
                    heroContainer.insertBefore(slide, heroContainer.firstChild);
                });
                
                // Start the loop rotation
                let currentSlideIdx = 0;
                const intervalSecs = settings.heroInterval || 5;
                
                window.heroIntervalId = setInterval(() => {
                    const slides = heroContainer.querySelectorAll(".hero-image-slide");
                    if (slides.length <= 1) return;
                    
                    slides[currentSlideIdx].classList.remove("active");
                    currentSlideIdx = (currentSlideIdx + 1) % slides.length;
                    slides[currentSlideIdx].classList.add("active");
                }, intervalSecs * 1000);
                
            } else {
                // Fallback to single static image mode
                if (heroImgElement) {
                    heroImgElement.style.display = "block";
                    if (settings.heroImage) {
                        heroImgElement.src = settings.heroImage;
                    } else {
                        heroImgElement.src = "assets/wedding_couple.jpg";
                    }
                }
            }
            // Update Intro Screen backgrounds
            const leftDoor = document.getElementById("left-door");
            const rightDoor = document.getElementById("right-door");
            if (leftDoor && rightDoor) {
                if (settings.introBgImage) {
                    leftDoor.style.backgroundImage = `url(${settings.introBgImage})`;
                    leftDoor.style.backgroundSize = "200vw 100vh";
                    leftDoor.style.backgroundPosition = "left center";
                    leftDoor.style.backgroundRepeat = "no-repeat";
                    
                    rightDoor.style.backgroundImage = `url(${settings.introBgImage})`;
                    rightDoor.style.backgroundSize = "200vw 100vh";
                    rightDoor.style.backgroundPosition = "right center";
                    rightDoor.style.backgroundRepeat = "no-repeat";
                    
                    leftDoor.style.backgroundColor = "transparent";
                    rightDoor.style.backgroundColor = "transparent";
                } else {
                    leftDoor.style.backgroundImage = "none";
                    rightDoor.style.backgroundImage = "none";
                    const bgColor = settings.introBgColor || "#0b1412";
                    leftDoor.style.backgroundColor = bgColor;
                    rightDoor.style.backgroundColor = bgColor;
                }

                // Hide spinner and show the main button content after DB resolves
                const introLoader = document.getElementById("intro-loader");
                if (introLoader) introLoader.style.display = "none";
                
                const introItems = document.querySelectorAll("#intro-container .hidden-intro-content");
                introItems.forEach(el => el.classList.add("visible-intro-content"));
            }

            // Update Dress Codes
            if (settings.holudDressCode) {
                document.getElementById("ui-holud-dress").textContent = "Dress Code: " + settings.holudDressCode;
            }
            if (settings.ceremonyDressCode) {
                document.getElementById("ui-ceremony-dress").textContent = "Dress Code: " + settings.ceremonyDressCode;
            }
            if (settings.receptionDressCode) {
                document.getElementById("ui-reception-dress").textContent = "Dress Code: " + settings.receptionDressCode;
            }

            // Update Subheadings
            if (settings.gallerySub) {
                document.getElementById("ui-gallery-sub").textContent = settings.gallerySub;
            }
            const rsvpSubEl = document.getElementById("ui-rsvp-sub");
            if (settings.rsvpSub && rsvpSubEl) {
                rsvpSubEl.textContent = settings.rsvpSub;
            }

            // Update Food Feasts Menu
            if (settings.menuSub) {
                document.getElementById("ui-menu-sub").textContent = settings.menuSub;
            }
            
            function renderMenuToList(menuStr, listId) {
                const listEl = document.getElementById(listId);
                if (!listEl) return;
                listEl.innerHTML = "";
                if (!menuStr) {
                    listEl.innerHTML = "<li>Menu details coming soon</li>";
                    return;
                }
                const items = menuStr.split(",").map(i => i.trim()).filter(i => i.length > 0);
                items.forEach(item => {
                    const li = document.createElement("li");
                    li.textContent = item;
                    listEl.appendChild(li);
                });
            }

            renderMenuToList(settings.holudMenu, "ui-holud-menu-list");
            renderMenuToList(settings.ceremonyMenu, "ui-ceremony-menu-list");
            renderMenuToList(settings.receptionMenu, "ui-reception-menu-list");

        } catch (err) {
            console.error("Failed to apply website settings", err);
        }
    };

    // Initialize and apply settings immediately
    applyLoadedSettings();

    // ==========================================================
    // 1. LIVE WEDDING COUNTDOWN TIMER
    // ==========================================================
    function updateCountdown() {
        const now = new Date().getTime();
        const diff = weddingDate - now;

        if (diff <= 0) {
            document.getElementById("days").textContent = "00";
            document.getElementById("hours").textContent = "00";
            document.getElementById("minutes").textContent = "00";
            document.getElementById("seconds").textContent = "00";
            const coupleNamesStr = (siteSettings.groomName && siteSettings.brideName) ? (siteSettings.groomName + " & " + siteSettings.brideName) : "Zack & Zoey";
            document.querySelector(".countdown-footer-msg").innerHTML = `<p>${coupleNamesStr} are happily married! <i class="fa-solid fa-heart accent-gold animate-beat"></i></p>`;
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById("days").textContent = String(days).padStart(2, '0');
        document.getElementById("hours").textContent = String(hours).padStart(2, '0');
        document.getElementById("minutes").textContent = String(minutes).padStart(2, '0');
        document.getElementById("seconds").textContent = String(seconds).padStart(2, '0');
    }

    // Run countdown immediately and then update every second
    updateCountdown();
    setInterval(updateCountdown, 1000);

    // ==========================================================
    // 2. AUDIO ENGINE (ROYALTY-FREE FILE + WEB AUDIO API SYNTH)
    // ==========================================================
    let audioContext = null;
    let synthInterval = null;
    let isPlaying = false;
    let bgAudio = new Audio();

    // Soft instrumental romantic piano/sitar background MP3
    bgAudio.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"; 
    bgAudio.loop = true;
    bgAudio.volume = 0.3;

    function startWebAudioSynth() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Fmaj9 -> G6 -> Am9 -> Cmaj9 (Golden Warm Chords progression)
        const progression = [
            [174.61, 220.00, 261.63, 329.63, 392.00], // F3, A3, C4, E4, G4
            [196.00, 246.94, 293.66, 392.00, 493.88], // G3, B3, D4, G4, B4
            [220.00, 261.63, 329.63, 392.00, 440.00], // A3, C4, E4, G4, A4
            [130.81, 164.81, 196.00, 246.94, 293.66]  // C3, E3, G3, B3, D4
        ];
        
        let chordIndex = 0;

        function playChord() {
            if (!isPlaying) return;
            const chords = progression[chordIndex];
            const now = audioContext.currentTime;

            const filterNode = audioContext.createBiquadFilter();
            filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(450, now);
            filterNode.connect(audioContext.destination);

            chords.forEach((freq, idx) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();

                osc.type = (idx % 2 === 0) ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                osc.detune.setValueAtTime((Math.random() - 0.5) * 6, now);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.04, now + 1.5 + Math.random() * 0.5); 
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5); 

                osc.connect(gain);
                gain.connect(filterNode);

                osc.start(now);
                osc.stop(now + 6.0);
            });

            chordIndex = (chordIndex + 1) % progression.length;
        }

        playChord();
        synthInterval = setInterval(playChord, 5000);
    }

    function stopWebAudioSynth() {
        if (synthInterval) {
            clearInterval(synthInterval);
            synthInterval = null;
        }
    }

    window.startMusic = function() {
        isPlaying = true;
        bgAudio.play().then(() => {
            console.log("Background MP3 playing.");
            updateMusicUI(true);
        }).catch(err => {
            console.warn("Autoplay blocked. Initializing Web Audio Synth.", err);
            startWebAudioSynth();
            updateMusicUI(true);
        });
    };

    window.stopMusic = function() {
        isPlaying = false;
        bgAudio.pause();
        stopWebAudioSynth();
        updateMusicUI(false);
    };

    function updateMusicUI(active) {
        if (active) {
            musicToggleBtn.classList.remove("paused");
            musicToggleBtn.classList.add("playing");
            musicStatusText.textContent = "Music On";
        } else {
            musicToggleBtn.classList.remove("playing");
            musicToggleBtn.classList.add("paused");
            musicStatusText.textContent = "Music Off";
        }
    }

    musicToggleBtn.addEventListener("click", function() {
        if (isPlaying) {
            stopMusic();
        } else {
            startMusic();
        }
    });

    // ==========================================================
    // 3. INTRO TO MAIN PAGE BOOK-SPLIT TRANSITION
    // ==========================================================
    tapToOpenBtn.addEventListener("click", function() {
        // Start Sound tracks
        startMusic();

        // Animate door slide
        introContainer.classList.add("open-doors");

        // Reveal website portal
        setTimeout(function() {
            introContainer.style.display = "none";
            mainPortal.classList.remove("hidden-portal");
            window.location.hash = "#hero-section";
        }, 2000);
    });

    // ==========================================================
    // 4. RENDERING DATA (BRIDESMAIDS & GUESTBOOK WISHES)
    // ==========================================================
    
    // Render Couple Gallery Photos & Lightbox Slider
    let galleryItems = [];
    let currentLightboxIndex = 0;

    const lightboxModal = document.getElementById("lightbox-modal");
    const lightboxImage = document.getElementById("lightboxImage");
    const lightboxCaption = document.getElementById("lightboxCaption");
    const lightboxCloseBtn = document.getElementById("lightboxCloseBtn");
    const lightboxPrevBtn = document.getElementById("lightboxPrevBtn");
    const lightboxNextBtn = document.getElementById("lightboxNextBtn");

    window.loadGallery = async function() {
        if (!galleryPhotosContainer) return;
        galleryPhotosContainer.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading gallery...</div>`;
        try {
            const list = await dbService.getGallery();
            galleryItems = list;
            galleryPhotosContainer.innerHTML = "";
            
            if (list.length === 0) {
                galleryPhotosContainer.innerHTML = `<p class="no-results-msg" style="grid-column: 1/-1; text-align: center;">No photos uploaded yet.</p>`;
                return;
            }

            list.forEach((p, index) => {
                const card = document.createElement("div");
                card.className = "gallery-card";
                card.innerHTML = `
                    <img src="${p.imageUrl}" alt="${p.caption || 'Wedding Photo'}">
                    <div class="gallery-caption-overlay">${p.caption || ''}</div>
                `;
                card.addEventListener("click", function() {
                    openLightbox(index, 'gallery');
                });
                galleryPhotosContainer.appendChild(card);
            });
        } catch (e) {
            console.error("Failed to load gallery photos", e);
            galleryPhotosContainer.innerHTML = `<p class="error-msg">Could not load gallery photos.</p>`;
        }
    };

    // Lightbox variables
    let currentLightboxSource = "gallery"; // "gallery" or "album"
    const lightboxDownloadBtn = document.getElementById("lightboxDownloadBtn");

    window.openLightbox = function(index, source = "gallery") {
        currentLightboxSource = source;
        const itemsList = (source === "gallery") ? galleryItems : albumItems;
        if (itemsList.length === 0) return;
        
        currentLightboxIndex = index;
        const item = itemsList[index];
        lightboxImage.src = item.imageUrl;
        lightboxCaption.textContent = item.caption || "";
        
        // Handle download button visibility inside lightbox
        if (source === "album" && lightboxDownloadBtn) {
            lightboxDownloadBtn.href = item.imageUrl;
            lightboxDownloadBtn.download = (item.caption ? item.caption.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'wedding_photo') + ".jpg";
            lightboxDownloadBtn.style.display = "inline-flex";
        } else if (lightboxDownloadBtn) {
            lightboxDownloadBtn.style.display = "none";
        }
        
        lightboxModal.classList.add("active");
    };

    function closeLightbox() {
        lightboxModal.classList.remove("active");
    }

    function showNextImage() {
        const itemsList = (currentLightboxSource === "gallery") ? galleryItems : albumItems;
        if (itemsList.length === 0) return;
        
        currentLightboxIndex = (currentLightboxIndex + 1) % itemsList.length;
        const item = itemsList[currentLightboxIndex];
        lightboxImage.src = item.imageUrl;
        lightboxCaption.textContent = item.caption || "";
        
        if (currentLightboxSource === "album" && lightboxDownloadBtn) {
            lightboxDownloadBtn.href = item.imageUrl;
            lightboxDownloadBtn.download = (item.caption ? item.caption.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'wedding_photo') + ".jpg";
        }
    }

    function showPrevImage() {
        const itemsList = (currentLightboxSource === "gallery") ? galleryItems : albumItems;
        if (itemsList.length === 0) return;
        
        currentLightboxIndex = (currentLightboxIndex - 1 + itemsList.length) % itemsList.length;
        const item = itemsList[currentLightboxIndex];
        lightboxImage.src = item.imageUrl;
        lightboxCaption.textContent = item.caption || "";
        
        if (currentLightboxSource === "album" && lightboxDownloadBtn) {
            lightboxDownloadBtn.href = item.imageUrl;
            lightboxDownloadBtn.download = (item.caption ? item.caption.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'wedding_photo') + ".jpg";
        }
    }

    if (lightboxCloseBtn) lightboxCloseBtn.addEventListener("click", closeLightbox);
    if (lightboxNextBtn) lightboxNextBtn.addEventListener("click", showNextImage);
    if (lightboxPrevBtn) lightboxPrevBtn.addEventListener("click", showPrevImage);

    // Close on overlay click
    if (lightboxModal) {
        lightboxModal.addEventListener("click", function(e) {
            if (e.target === lightboxModal) {
                closeLightbox();
            }
        });
    }

    // Keyboard support for Lightbox
    document.addEventListener("keydown", function(e) {
        if (lightboxModal && lightboxModal.classList.contains("active")) {
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowRight") showNextImage();
            if (e.key === "ArrowLeft") showPrevImage();
        }
    });

    // ==========================================================
    // GALLERY ALL PHOTOS ARCHIVES MODAL CONTROLS
    // ==========================================================
    const viewAllPhotosBtn = document.getElementById("viewAllPhotosBtn");
    const allPhotosModal = document.getElementById("all-photos-modal");
    const archivesCloseBtn = document.getElementById("archivesCloseBtn");
    const allPhotosGrid = document.getElementById("allPhotosGrid");

    if (viewAllPhotosBtn && allPhotosModal && archivesCloseBtn && allPhotosGrid) {
        viewAllPhotosBtn.addEventListener("click", function() {
            allPhotosGrid.innerHTML = "";
            
            if (galleryItems.length === 0) {
                allPhotosGrid.innerHTML = `<p style="text-align:center;grid-column:1/-1;">No photos available in the gallery.</p>`;
            } else {
                galleryItems.forEach((item, index) => {
                    const card = document.createElement("div");
                    card.className = "archive-card";
                    card.innerHTML = `
                        <img src="${item.imageUrl}" alt="${item.caption || ''}">
                        <div class="archive-caption-overlay">${item.caption || ''}</div>
                    `;
                    card.addEventListener("click", () => {
                        // Open this specific image in the existing lightbox
                        openLightbox(index);
                    });
                    allPhotosGrid.appendChild(card);
                });
            }
            allPhotosModal.classList.add("active");
        });

        archivesCloseBtn.addEventListener("click", function() {
            allPhotosModal.classList.remove("active");
        });

        allPhotosModal.addEventListener("click", function(e) {
            if (e.target === allPhotosModal) {
                allPhotosModal.classList.remove("active");
            }
        });
    }

    // ==========================================================
    // GALLERY CAROUSEL HORIZONTAL SCROLL & DRAG CONTROLS
    // ==========================================================
    const galleryViewport = document.getElementById("galleryViewport");
    const galleryPrevBtn = document.getElementById("galleryPrevBtn");
    const galleryNextBtn = document.getElementById("galleryNextBtn");

    if (galleryViewport && galleryPrevBtn && galleryNextBtn) {
        // Navigation button scrolling click triggers
        galleryPrevBtn.addEventListener("click", () => {
            galleryViewport.scrollBy({ left: -300, behavior: "smooth" });
        });

        galleryNextBtn.addEventListener("click", () => {
            galleryViewport.scrollBy({ left: 300, behavior: "smooth" });
        });

        // Mouse Drag to Scroll implementation
        let isDown = false;
        let startX;
        let scrollLeft;

        galleryViewport.addEventListener("mousedown", (e) => {
            isDown = true;
            galleryViewport.classList.add("active-drag");
            startX = e.pageX - galleryViewport.offsetLeft;
            scrollLeft = galleryViewport.scrollLeft;
        });

        galleryViewport.addEventListener("mouseleave", () => {
            isDown = false;
            galleryViewport.classList.remove("active-drag");
        });

        galleryViewport.addEventListener("mouseup", () => {
            isDown = false;
            galleryViewport.classList.remove("active-drag");
        });

        galleryViewport.addEventListener("mousemove", (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - galleryViewport.offsetLeft;
            const walk = (x - startX) * 2; // scroll speed multiplier
            galleryViewport.scrollLeft = scrollLeft - walk;
        });
    }

    // ==========================================================
    // WEDDING ALBUM ALL PHOTOS ARCHIVES MODAL CONTROLS
    // ==========================================================
    const viewAllAlbumBtn = document.getElementById("viewAllAlbumBtn");
    const albumPhotosModal = document.getElementById("album-photos-modal");
    const albumArchivesCloseBtn = document.getElementById("albumArchivesCloseBtn");
    const allAlbumPhotosGrid = document.getElementById("allAlbumPhotosGrid");

    if (viewAllAlbumBtn && albumPhotosModal && albumArchivesCloseBtn && allAlbumPhotosGrid) {
        viewAllAlbumBtn.addEventListener("click", function() {
            allAlbumPhotosGrid.innerHTML = "";
            
            if (albumItems.length === 0) {
                allAlbumPhotosGrid.innerHTML = `<p style="text-align:center;grid-column:1/-1;">No photos available in the album.</p>`;
            } else {
                albumItems.forEach((item, index) => {
                    const card = document.createElement("div");
                    card.className = "archive-card";
                    card.innerHTML = `
                        <img src="${item.imageUrl}" alt="${item.caption || ''}">
                        <div class="archive-caption-overlay" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                            <span style="font-weight:600;font-size:0.9rem;text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${item.caption || ''}</span>
                            <a href="${item.imageUrl}" download="${item.caption ? item.caption.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'wedding_photo'}.jpg" class="album-download-btn" style="pointer-events: auto; padding: 6px 12px; font-size: 0.75rem;">
                                <i class="fa-solid fa-download"></i> Download
                            </a>
                        </div>
                    `;
                    card.addEventListener("click", (e) => {
                        if (e.target.closest(".album-download-btn")) {
                            return; // Let the download link handle the click
                        }
                        // Open this specific image in the existing lightbox
                        openLightbox(index, 'album');
                    });
                    allAlbumPhotosGrid.appendChild(card);
                });
            }
            albumPhotosModal.classList.add("active");
        });

        albumArchivesCloseBtn.addEventListener("click", function() {
            albumPhotosModal.classList.remove("active");
        });

        albumPhotosModal.addEventListener("click", function(e) {
            if (e.target === albumPhotosModal) {
                albumPhotosModal.classList.remove("active");
            }
        });
    }

    // ==========================================================
    // WEDDING ALBUM CAROUSEL HORIZONTAL SCROLL & DRAG CONTROLS
    // ==========================================================
    const albumViewport = document.getElementById("albumViewport");
    const albumPrevBtn = document.getElementById("albumPrevBtn");
    const albumNextBtn = document.getElementById("albumNextBtn");

    if (albumViewport && albumPrevBtn && albumNextBtn) {
        albumPrevBtn.addEventListener("click", () => {
            albumViewport.scrollBy({ left: -300, behavior: "smooth" });
        });

        albumNextBtn.addEventListener("click", () => {
            albumViewport.scrollBy({ left: 300, behavior: "smooth" });
        });

        let isDown = false;
        let startX;
        let scrollLeft;

        albumViewport.addEventListener("mousedown", (e) => {
            isDown = true;
            albumViewport.classList.add("active-drag");
            startX = e.pageX - albumViewport.offsetLeft;
            scrollLeft = albumViewport.scrollLeft;
        });

        albumViewport.addEventListener("mouseleave", () => {
            isDown = false;
            albumViewport.classList.remove("active-drag");
        });

        albumViewport.addEventListener("mouseup", () => {
            isDown = false;
            albumViewport.classList.remove("active-drag");
        });

        albumViewport.addEventListener("mousemove", (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - albumViewport.offsetLeft;
            const walk = (x - startX) * 2;
            albumViewport.scrollLeft = scrollLeft - walk;
        });
    }

    // Render Guestbook Wishes
    window.loadStories = async function() {
        wishesContainer.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading wishes...</div>`;
        try {
            const list = await dbService.getStories();
            wishesContainer.innerHTML = "";
            
            if (list.length === 0) {
                wishesContainer.innerHTML = `<p class="no-results-msg">No wishes posted yet. Be the first to leave a message!</p>`;
                return;
            }

            list.forEach(w => {
                const card = document.createElement("div");
                card.className = "wish-bubble";
                card.innerHTML = `
                    <div class="wish-header">
                        <span class="wish-name"><i class="fa-solid fa-quote-left"></i> ${w.names}</span>
                        <span class="wish-date">${w.date}</span>
                    </div>
                    <p class="wish-text">"${w.content}"</p>
                `;
                wishesContainer.appendChild(card);
            });
        } catch (e) {
            console.error("Wishes board load failed", e);
            wishesContainer.innerHTML = `<p class="error-msg">Could not load wishes board.</p>`;
        }
    };

    // Render Album downloadable photos
    let albumItems = [];
    const albumPhotosContainer = document.getElementById("albumPhotosContainer");
    window.loadAlbum = async function() {
        if (!albumPhotosContainer) return;
        albumPhotosContainer.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading album...</div>`;
        try {
            const list = await dbService.getAlbum();
            albumItems = list;
            albumPhotosContainer.innerHTML = "";
            
            if (list.length === 0) {
                albumPhotosContainer.innerHTML = `<p class="no-results-msg" style="grid-column: 1/-1; text-align: center;">No photos added to the album yet.</p>`;
                return;
            }

            list.forEach((p, index) => {
                const card = document.createElement("div");
                card.className = "gallery-card";
                card.innerHTML = `
                    <img src="${p.imageUrl}" alt="${p.caption || 'Wedding Album Photo'}" loading="lazy">
                    <div class="gallery-caption-overlay" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                        <span style="font-weight: 600; font-size: 0.95rem; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${p.caption || ''}</span>
                        <a href="${p.imageUrl}" download="${p.caption ? p.caption.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'wedding_photo'}.jpg" class="album-download-btn" style="margin-top: 5px; pointer-events: auto;">
                            <i class="fa-solid fa-download"></i> Download
                        </a>
                    </div>
                `;
                card.addEventListener("click", function(e) {
                    if (e.target.closest(".album-download-btn")) {
                        return; // Let the download link handle the click
                    }
                    openLightbox(index, 'album');
                });
                albumPhotosContainer.appendChild(card);
            });
        } catch (e) {
            console.error("Album load failed", e);
            albumPhotosContainer.innerHTML = `<p class="error-msg">Could not load wedding album.</p>`;
        }
    };

    // Initialise rendering calls
    loadGallery();
    loadAlbum();
    loadStories();

    // ==========================================================
    // 5. INTERACTIVE FORMS PROVISIONS
    // ==========================================================
    
    // Guest RSVP Form Submit
    if (rsvpForm) {
        rsvpForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            
            const name = document.getElementById("rsvp-name").value.trim();
            const email = document.getElementById("rsvp-email").value.trim();
            const attending = document.getElementById("rsvp-attendance").value;
            const guestsCount = parseInt(document.getElementById("rsvp-guests").value) || 1;
            const message = document.getElementById("rsvp-message").value.trim();

            const rsvpData = {
                name,
                email,
                attending,
                guests: attending === "Yes" ? guestsCount : 0,
                message
            };

            try {
                await dbService.addRSVP(rsvpData);
                alert(`Thank you, ${name}!\nYour RSVP response has been successfully sent.`);
                rsvpForm.reset();
                // If admin dashboard is currently open, refresh its stats
                if (window.renderRsvpsList) window.renderRsvpsList();
            } catch (err) {
                console.error("RSVP saving failed", err);
                alert("Oops! There was an issue recording your response. Please try again.");
            }
        });
    }

    // Write Guest Wish Form Submit
    guestbookWishForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const name = document.getElementById("wish-name").value.trim();
        const message = document.getElementById("wish-message").value.trim();
        
        // Format Current Date String
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        const dateString = new Date().toLocaleDateString("en-US", options);

        const wishData = {
            names: name,
            content: message,
            date: dateString,
            imageUrl: "assets/success_couple_1.jpg"
        };

        try {
            await dbService.addStory(wishData);
            alert(`Thank you, ${name}!\nYour wish has been posted to our guestbook.`);
            guestbookWishForm.reset();
            
            // Reload wishes boards
            await loadStories();
            if (window.renderAdminStoriesList) window.renderAdminStoriesList();
        } catch (err) {
            console.error("Guestbook post failed", err);
            alert("Could not post wish. Please try again.");
        }
    });

    // Active Navigation Highlight on Scroll
    window.addEventListener("scroll", function() {
        const sections = document.querySelectorAll("section, footer");
        const navLinks = document.querySelectorAll(".nav-menu a");
        
        let current = "";
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - 150)) {
                current = section.getAttribute("id");
            }
        });

        navLinks.forEach(a => {
            a.classList.remove("active");
            if (a.getAttribute("href") === `#${current}`) {
                a.classList.add("active");
            }
        });
    });

    // ==========================================================
    // 7. LIVE GUEST VISITOR GEOLOCATION & LEAFLET MAP
    // ==========================================================
    window.vMap = null;

    async function initVisitorMap() {
        const mapDiv = document.getElementById("visitor-map");
        if (!mapDiv) return;

        // Retrieve visitor log records from the database
        const visitors = await dbService.getVisitors();

        // If map is already initialized, clear it to reload
        if (window.vMap) {
            window.vMap.remove();
        }

        // Initialize leaflet map
        // Default zoom out view to show world/regional guests
        window.vMap = L.map('visitor-map').setView([23.811, 90.412], 2);

        // Load premium dark-theme tile layer from CartoDB
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(window.vMap);

        // Define a gold custom pin icon to match theme aesthetics
        const goldIcon = L.divIcon({
            html: `<i class="fa-solid fa-location-pin" style="color: #D4AF37; font-size: 24px; text-shadow: 0 0 4px rgba(0,0,0,0.5);"></i>`,
            iconSize: [24, 24],
            iconAnchor: [12, 24],
            popupAnchor: [0, -24],
            className: 'custom-leaflet-pin'
        });

        // Add markers for all logged visitors
        visitors.forEach(v => {
            if (v.lat && v.lon) {
                L.marker([v.lat, v.lon], { icon: goldIcon })
                 .addTo(window.vMap)
                 .bindPopup(`
                     <div style="font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: #333; line-height: 1.4; padding: 4px;">
                         <strong style="color: #006D77;">📍 ${v.city}, ${v.country}</strong><br>
                         <span style="color: #666; font-size: 0.75rem;">Guest Visited Site</span>
                     </div>
                 `);
            }
        });
    }

    // Geolocation lookup by visitor's IP using free lookup service
    async function trackVisitorLocation() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                const data = await response.json();
                if (data.city && data.latitude && data.longitude) {
                    const visitorData = {
                        city: data.city,
                        country: data.country_name || data.country,
                        lat: parseFloat(data.latitude),
                        lon: parseFloat(data.longitude)
                    };
                    await dbService.addVisitor(visitorData);
                }
            }
        } catch (err) {
            console.warn("Visitor IP Geolocation tracking failed (possibly blocked by browser/adblocker).", err);
        } finally {
            // Load map and markers regardless of tracking outcome
            await initVisitorMap();
        }
    }

    // Start geolocation and map loading
    trackVisitorLocation();

});
