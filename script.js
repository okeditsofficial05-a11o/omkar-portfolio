// ================================================
// OMKAR KALSHETTI: PORTFOLIO INTERACTIONS
// Scroll timeline, hero scrubber, video gallery,
// popup player, process timeline, cursor, welcome note
// ================================================

(() => {
    "use strict";

    // ---------- helpers ----------

    const $ = (selector, scope = document) => scope.querySelector(selector);
    const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const pad = (n) => String(n).padStart(2, "0");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // mm:ss:ff, like an editor's timecode
    function timecode(seconds, fps = 24) {
        const s = Math.max(0, seconds || 0);
        const minutes = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        const frames = Math.floor((s % 1) * fps);
        return `${pad(minutes)}:${pad(secs)}:${pad(frames)}`;
    }

    // m:ss for the player and the process timeline
    function clock(seconds) {
        if (!Number.isFinite(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${pad(secs)}`;
    }

    // ============================================
    // 1. NAVIGATION, SCROLL TIMELINE, MOBILE MENU
    // ============================================

    const navbar = $("#navbar");
    const menuToggle = $("#menuToggle");
    const progressBar = $("#scrollProgress");
    const scrollTimecode = $("#scrollTimecode");
    const PAGE_DURATION = 90; // seconds shown at the bottom of the page

    let scrollTicking = false;

    function updateScroll() {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;

        if (progressBar) {
            progressBar.style.transform = `scaleX(${progress})`;
        }

        if (scrollTimecode) {
            scrollTimecode.textContent = timecode(progress * PAGE_DURATION);
        }

        if (navbar) {
            navbar.classList.toggle("is-scrolled", window.scrollY > 8);
        }

        scrollTicking = false;
    }

    window.addEventListener("scroll", () => {
        if (!scrollTicking) {
            scrollTicking = true;
            requestAnimationFrame(updateScroll);
        }
    }, { passive: true });

    window.addEventListener("resize", updateScroll);
    updateScroll();

    function setMenu(open) {
        if (!navbar || !menuToggle) return;
        navbar.classList.toggle("menu-open", open);
        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            setMenu(!navbar.classList.contains("menu-open"));
        });

        $$("#mainNav a").forEach((link) => {
            link.addEventListener("click", () => setMenu(false));
        });
    }

    // Highlight the nav link for the section on screen
    const navLinks = $$("#mainNav a");

    if ("IntersectionObserver" in window && navLinks.length) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                navLinks.forEach((link) => {
                    link.classList.toggle(
                        "is-active",
                        link.getAttribute("href") === `#${entry.target.id}`
                    );
                });
            });
        }, { rootMargin: "-45% 0px -50% 0px" });

        $$("main > section").forEach((section) => sectionObserver.observe(section));
    }

    // ============================================
    // 2. CUSTOM CURSOR (dot + trailing ring)
    // ============================================

    if (canHover && !reduceMotion) {
        const dot = document.createElement("div");
        const ring = document.createElement("div");

        dot.className = "cursor-dot";
        ring.className = "cursor-ring";
        ring.innerHTML = '<div class="ring-body"></div>';

        document.body.append(dot, ring);
        document.body.classList.add("has-cursor");

        let x = -100;
        let y = -100;
        let rx = x;
        let ry = y;

        document.addEventListener("pointermove", (event) => {
            x = event.clientX;
            y = event.clientY;
            dot.style.transform = `translate(${x}px, ${y}px)`;
        });

        (function follow() {
            rx += (x - rx) * 0.18;
            ry += (y - ry) * 0.18;
            ring.style.transform = `translate(${rx}px, ${ry}px)`;
            requestAnimationFrame(follow);
        })();

        // The ring simply grows over anything clickable. No labels or big icons.
        document.addEventListener("pointerover", (event) => {
            const interactive = event.target.closest("a, button, input, [role='button']");
            ring.classList.toggle("is-link", Boolean(interactive));
        });

        document.addEventListener("pointerleave", () => {
            dot.style.opacity = "0";
            ring.style.opacity = "0";
        });

        document.addEventListener("pointerenter", () => {
            dot.style.opacity = "1";
            ring.style.opacity = "1";
        });
    }

    // ============================================
    // 3. MAGNETIC BUTTONS
    // ============================================

    if (canHover && !reduceMotion) {
        $$(".magnetic").forEach((element) => {
            element.addEventListener("pointermove", (event) => {
                const rect = element.getBoundingClientRect();
                const dx = event.clientX - (rect.left + rect.width / 2);
                const dy = event.clientY - (rect.top + rect.height / 2);

                element.style.transform = `translate(${dx * 0.22}px, ${dy * 0.32}px)`;
            });

            element.addEventListener("pointerleave", () => {
                element.style.transform = "";
            });
        });
    }

    // ============================================
    // 4. SCROLL REVEAL (cards and rows only)
    // ============================================

    const revealElements = $$(
        ".showreel-card, .project-card, .service-row, .clip, .contact-row, .tools span"
    );

    if ("IntersectionObserver" in window && !reduceMotion) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("active");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        revealElements.forEach((element) => {
            const siblings = [...element.parentElement.children];
            const index = siblings.indexOf(element);

            element.style.setProperty("--d", `${index * 0.08}s`);
            element.classList.add("reveal");
            revealObserver.observe(element);
        });
    }

    // ============================================
    // 5. HERO: TILT, SOUND, SCRUBBER
    // ============================================

    const hero = $("#home");
    const heroVisual = $("#heroVisual");
    const heroVideo = $("#heroVideo");

    // Gentle 3D tilt that follows the pointer
    if (hero && heroVisual && canHover && !reduceMotion) {
        hero.addEventListener("pointermove", (event) => {
            const rect = hero.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width - 0.5;
            const py = (event.clientY - rect.top) / rect.height - 0.5;

            heroVisual.style.transform =
                `rotateY(${px * -9}deg) rotateX(${py * 7}deg)`;
        });

        hero.addEventListener("pointerleave", () => {
            heroVisual.style.transform = "";
        });
    }

    // Sound toggle
    const audioButton = $("#heroAudioToggle");
    const audioText = $("#heroAudioText");

    if (heroVideo && audioButton) {
        heroVideo.muted = true;

        audioButton.addEventListener("click", () => {
            heroVideo.muted = !heroVideo.muted;

            const on = !heroVideo.muted;

            audioText.textContent = on ? "Sound on" : "Sound off";
            audioButton.title = on ? "Mute sound" : "Turn sound on";
            audioButton.setAttribute("aria-label", on ? "Mute sound" : "Turn sound on");
            audioButton.setAttribute("aria-pressed", String(on));

            if (on) {
                heroVideo.play().catch(() => {});
            }
        });
    }

    // Ruler that mirrors the video, and scrubs it when dragged
    const ruler = $("#heroRuler");
    const playhead = $("#heroPlayhead");
    const heroTimecode = $("#heroTimecode");

    if (heroVideo && ruler && playhead) {
        let heroVisible = true;
        let loopRunning = false;
        let scrubbing = false;

        function paintHero() {
            const duration = heroVideo.duration;

            if (Number.isFinite(duration) && duration > 0) {
                playhead.style.left = `${(heroVideo.currentTime / duration) * 100}%`;
            }

            if (heroTimecode) {
                heroTimecode.textContent = timecode(heroVideo.currentTime);
            }
        }

        function heroLoop() {
            paintHero();

            if (heroVisible) {
                requestAnimationFrame(heroLoop);
            } else {
                loopRunning = false;
            }
        }

        function seekFromPointer(event) {
            const rect = ruler.getBoundingClientRect();
            const pct = clamp((event.clientX - rect.left) / rect.width, 0, 1);

            if (Number.isFinite(heroVideo.duration)) {
                heroVideo.currentTime = pct * heroVideo.duration;
                paintHero();
            }
        }

        ruler.addEventListener("pointerdown", (event) => {
            scrubbing = true;
            ruler.setPointerCapture(event.pointerId);
            seekFromPointer(event);
        });

        ruler.addEventListener("pointermove", (event) => {
            if (scrubbing) seekFromPointer(event);
        });

        ["pointerup", "pointercancel"].forEach((name) => {
            ruler.addEventListener(name, () => {
                scrubbing = false;
            });
        });

        // Only run the hero video and the painting loop while it is on screen
        if ("IntersectionObserver" in window) {
            new IntersectionObserver((entries) => {
                heroVisible = entries[0].isIntersecting;

                if (heroVisible) {
                    heroVideo.play().catch(() => {});

                    if (!loopRunning) {
                        loopRunning = true;
                        requestAnimationFrame(heroLoop);
                    }
                } else {
                    heroVideo.pause();
                }
            }, { threshold: 0.1 }).observe(hero);
        } else {
            loopRunning = true;
            requestAnimationFrame(heroLoop);
        }
    }

    // ============================================
    // 6. VIDEO POPUP
    // ============================================

    const modal = $("#videoModal");
    const modalPlayer = $("#modalPlayer");
    const modalVideo = $("#modalVideo");
    const closeModalButton = $("#closeModal");

    const playButton = $("#modalPlayPause");
    const muteButton = $("#modalMute");
    const seekBar = $("#modalSeek");
    const currentTimeLabel = $("#modalCurrentTime");
    const durationLabel = $("#modalDuration");

    let lastFocusedElement = null;

    function isModalOpen() {
        return Boolean(modal && modal.classList.contains("open"));
    }

    function openVideoModal(source, trigger, rotated) {
        if (!modal || !modalVideo || !source) return;

        lastFocusedElement = trigger || document.activeElement;

        // Reset the previous video
        modalVideo.pause();
        seekBar.value = 0;
        seekBar.style.setProperty("--pct", "0%");
        currentTimeLabel.textContent = "0:00";
        durationLabel.textContent = "0:00";

        // Sideways footage gets a portrait player and a rotated video
        modalVideo.classList.toggle("rotate-ccw", rotated);
        modalPlayer.classList.toggle("is-portrait", rotated);

        modalVideo.src = source;
        modalVideo.muted = false;
        syncMuteButton();

        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");

        modalVideo.load();

        const playPromise = modalVideo.play();

        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {
                // If the browser blocks autoplay with sound, start muted.
                modalVideo.muted = true;
                syncMuteButton();
                modalVideo.play().catch(() => {});
            });
        }

        modalPlayer.focus({ preventScroll: true });
    }

    function closeVideoModal() {
        if (!isModalOpen()) return;

        modalVideo.pause();
        modalVideo.removeAttribute("src");
        modalVideo.load();

        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");

        if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
            lastFocusedElement.focus({ preventScroll: true });
        }
    }

    // ----- custom controls -----

    function syncMuteButton() {
        if (!muteButton) return;
        muteButton.dataset.muted = String(modalVideo.muted);
        muteButton.setAttribute(
            "aria-label",
            modalVideo.muted ? "Unmute video" : "Mute video"
        );
    }

    function togglePlay() {
        if (modalVideo.paused) {
            modalVideo.play().catch(() => {});
        } else {
            modalVideo.pause();
        }
    }

    if (modalVideo && playButton && muteButton && seekBar) {
        playButton.addEventListener("click", togglePlay);
        modalVideo.addEventListener("click", togglePlay);

        modalVideo.addEventListener("play", () => {
            playButton.dataset.state = "playing";
            playButton.setAttribute("aria-label", "Pause video");
        });

        modalVideo.addEventListener("pause", () => {
            playButton.dataset.state = "paused";
            playButton.setAttribute("aria-label", "Play video");
        });

        muteButton.addEventListener("click", () => {
            modalVideo.muted = !modalVideo.muted;
            syncMuteButton();
        });

        modalVideo.addEventListener("loadedmetadata", () => {
            seekBar.max = modalVideo.duration || 100;
            durationLabel.textContent = clock(modalVideo.duration);
            currentTimeLabel.textContent = "0:00";
        });

        modalVideo.addEventListener("timeupdate", () => {
            const duration = modalVideo.duration || 0;

            seekBar.value = modalVideo.currentTime;
            seekBar.style.setProperty(
                "--pct",
                duration ? `${(modalVideo.currentTime / duration) * 100}%` : "0%"
            );
            currentTimeLabel.textContent = clock(modalVideo.currentTime);
        });

        seekBar.addEventListener("input", () => {
            modalVideo.currentTime = Number(seekBar.value);
        });
    }

    if (closeModalButton) {
        closeModalButton.addEventListener("click", closeVideoModal);
    }

    // Close when clicking the dark area outside the player
    if (modal) {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) closeVideoModal();
        });
    }

    // ============================================
    // 7. VIDEO CARDS
    // ============================================

    function makeCardInteractive(card, label, onOpen) {
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", label);

        card.addEventListener("click", onOpen);

        card.addEventListener("keydown", (event) => {
            if (event.target !== card) return;

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen();
            }
        });
    }

    // Selected work: hover preview, click to open
    $$(".project-card").forEach((card) => {
        const preview = $("video", card);
        const source = preview?.querySelector("source")?.getAttribute("src");

        if (!preview || !source) return;

        card.addEventListener("mouseenter", () => {
            if (canHover && !isModalOpen()) {
                preview.play().catch(() => {});
            }
        });

        card.addEventListener("mouseleave", () => {
            preview.pause();

            try {
                preview.currentTime = 0;
            } catch (error) {
                // Video not loaded yet.
            }
        });

        makeCardInteractive(
            card,
            `Play ${card.dataset.title || "video project"}`,
            () => openVideoModal(source, card, false)
        );
    });

    // Featured edits: sideways footage, so the popup rotates it upright
    $$(".showreel-card").forEach((card, index) => {
        const video = $("video", card);
        const source = video?.querySelector("source")?.getAttribute("src");

        if (!source) return;

        makeCardInteractive(
            card,
            `Play featured edit ${index + 1}`,
            () => openVideoModal(source, card, video.classList.contains("rotate-ccw"))
        );

        // Silent preview on hover, so no play button is needed
        card.addEventListener("mouseenter", () => {
            if (canHover && !isModalOpen()) {
                video.muted = true;
                video.play().catch(() => {});
            }
        });

        card.addEventListener("mouseleave", () => {
            video.pause();

            try {
                video.currentTime = 0;
            } catch (error) {
                // Video not loaded yet.
            }
        });
    });

    // ============================================
    // 8. PROCESS TIMELINE (scrub with the cursor)
    // ============================================

    const timelineBody = $("#timelineBody");
    const timelinePlayhead = $("#playhead");
    const timelineTime = $("#playheadTime");
    const waveform = $("#waveform");
    const clips = $$(".clip");

    if (timelineBody && timelinePlayhead && waveform && clips.length) {
        const TIMELINE_SECONDS = 60;
        const BAR_COUNT = 140;

        // Deterministic waveform so it looks the same on every visit
        for (let i = 0; i < BAR_COUNT; i += 1) {
            const wave = Math.abs(Math.sin(i * 0.33) * Math.cos(i * 0.071));
            const jitter = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
            const bar = document.createElement("i");

            bar.style.height = `${14 + wave * 56 + jitter * 26}%`;
            waveform.appendChild(bar);
        }

        const bars = [...waveform.children];

        function setTimeline(pct) {
            timelinePlayhead.style.left = `${pct * 100}%`;
            timelineTime.textContent = clock(pct * TIMELINE_SECONDS);

            const playheadX = timelineBody.getBoundingClientRect().left +
                pct * timelineBody.clientWidth;

            clips.forEach((clip) => {
                const rect = clip.getBoundingClientRect();
                clip.classList.toggle(
                    "is-active",
                    playheadX >= rect.left && playheadX <= rect.right
                );
            });

            const lit = Math.round(pct * bars.length);
            bars.forEach((bar, i) => bar.classList.toggle("played", i < lit));
        }

        timelineBody.addEventListener("pointermove", (event) => {
            const rect = timelineBody.getBoundingClientRect();
            setTimeline(clamp((event.clientX - rect.left) / rect.width, 0, 1));
        });

        window.addEventListener("resize", () => {
            setTimeline(parseFloat(timelinePlayhead.style.left) / 100 || 0.1);
        });

        // Starting position
        setTimeline(0.1);
    }

    // ============================================
    // 8b. SERVICES SPOTLIGHT (follows the pointer)
    // ============================================

    $$(".service-row").forEach((row) => {
        row.addEventListener("pointermove", (event) => {
            const rect = row.getBoundingClientRect();
            row.style.setProperty("--mx", `${event.clientX - rect.left}px`);
            row.style.setProperty("--my", `${event.clientY - rect.top}px`);
        });
    });

    // ============================================
    // 8c. COPY BUTTONS IN CONTACT
    // ============================================

    $$(".copy-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const value = button.dataset.copy || "";

            try {
                await navigator.clipboard.writeText(value);
            } catch (error) {
                const field = document.createElement("textarea");
                field.value = value;
                field.style.position = "fixed";
                field.style.opacity = "0";
                document.body.appendChild(field);
                field.select();
                document.execCommand("copy");
                field.remove();
            }

            button.textContent = "Copied";
            button.classList.add("is-copied");

            window.setTimeout(() => {
                button.textContent = "Copy";
                button.classList.remove("is-copied");
            }, 1600);
        });
    });

    // ============================================
    // 9. WELCOME POPUP (once per visit)
    // ============================================

    const welcomePopup = $("#welcomePopup");
    const closeWelcome = $("#closeWelcome");
    const explorePortfolio = $("#explorePortfolio");

    function welcomeSeen() {
        try {
            return sessionStorage.getItem("welcomeSeen") === "1";
        } catch (error) {
            return false;
        }
    }

    function showWelcome() {
        if (!welcomePopup) return;

        welcomePopup.classList.add("show");
        document.body.classList.add("modal-open");

        window.setTimeout(() => {
            if (explorePortfolio) explorePortfolio.focus({ preventScroll: true });
        }, 400);
    }

    function hideWelcome() {
        if (!welcomePopup || !welcomePopup.classList.contains("show")) return;

        welcomePopup.classList.remove("show");

        if (!isModalOpen()) {
            document.body.classList.remove("modal-open");
        }

        try {
            sessionStorage.setItem("welcomeSeen", "1");
        } catch (error) {
            // Storage unavailable; the note will simply show again next load.
        }
    }

    if (welcomePopup && !welcomeSeen()) {
        window.addEventListener("load", () => {
            window.setTimeout(showWelcome, 900);
        });

        welcomePopup.addEventListener("click", (event) => {
            if (event.target === welcomePopup) hideWelcome();
        });
    }

    if (closeWelcome) closeWelcome.addEventListener("click", hideWelcome);

    if (explorePortfolio) {
    explorePortfolio.addEventListener("click", () => {
        hideWelcome();
        const about = document.getElementById("about");
        if (about) about.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
}
    // ============================================
    // 10. KEYBOARD
    // ============================================

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            hideWelcome();
            closeVideoModal();
            setMenu(false);
            return;
        }

        if (isModalOpen()) {
            const onControl = event.target.closest("button, input");

            if (event.key === "Tab") {
                // Keep focus inside the popup
                const focusable = $$("button, input, [tabindex='0']", modal)
                    .filter((el) => !el.disabled);

                if (!focusable.length) return;

                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            } else if (event.key === " " && !onControl) {
                event.preventDefault();
                togglePlay();
            } else if (event.key === "ArrowRight" && event.target !== seekBar) {
                modalVideo.currentTime = Math.min(
                    modalVideo.duration || 0, modalVideo.currentTime + 5
                );
            } else if (event.key === "ArrowLeft" && event.target !== seekBar) {
                modalVideo.currentTime = Math.max(0, modalVideo.currentTime - 5);
            } else if ((event.key === "m" || event.key === "M") && !onControl) {
                modalVideo.muted = !modalVideo.muted;
                syncMuteButton();
            }
        }
    });

    console.log("Omkar Kalshetti portfolio ready.");


// =========================================
// CLIENT REVIEWS FUNCTIONALITY
// =========================================

const reviewForm = document.getElementById("reviewForm");
const reviewList = document.getElementById("reviewList");

const reviewAverage = document.getElementById("reviewAverage");
const reviewAverageStars = document.getElementById("reviewAverageStars");
const reviewCount = document.getElementById("reviewCount");
const reviewListCount = document.getElementById("reviewListCount");
const reviewNotice = document.getElementById("reviewNotice");


// Get saved reviews
function getReviews() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(REVIEW_STORAGE_KEY) || "[]"
        );

        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        return [];
    }
}

// Display reviews
function renderReviews() {
    if (!reviewList) return;

    const reviews = getReviews();
    const total = reviews.length;

    const average = total
        ? reviews.reduce((sum, item) => sum + Number(item.rating), 0) / total
        : 0;

    if (reviewAverage) {
        reviewAverage.textContent = total ? average.toFixed(1) : "—";
    }

    if (reviewAverageStars) {
        const rounded = Math.round(average);

        reviewAverageStars.textContent = total
            ? "★".repeat(rounded) + "☆".repeat(5 - rounded)
            : "☆☆☆☆☆";
    }

    if (reviewCount) {
        reviewCount.textContent = total
            ? `${total} ${total === 1 ? "review" : "reviews"}`
            : "Be the first to leave a review";
    }

    if (reviewListCount) {
        reviewListCount.textContent =
            `${total} ${total === 1 ? "review" : "reviews"}`;
    }

    reviewList.replaceChildren();

    if (!total) {
        const empty = document.createElement("div");
        empty.className = "review-empty";
        empty.textContent =
            "No reviews yet. Your feedback could be the first.";

        reviewList.append(empty);
        return;
    }

    reviews.slice().reverse().forEach((item) => {
        const card = document.createElement("article");
        card.className = "review-card";

        const top = document.createElement("div");
        top.className = "review-card-top";

        const person = document.createElement("div");

        const name = document.createElement("div");
        name.className = "review-card-name";
        name.textContent = item.name;

        const date = document.createElement("small");
        date.className = "review-card-date";
        date.textContent = item.date || "";

        person.append(name, date);

        const stars = document.createElement("span");
        stars.className = "review-card-stars";
        stars.textContent =
            "★".repeat(item.rating) + "☆".repeat(5 - item.rating);

        top.append(person, stars);

        const message = document.createElement("p");
        message.textContent = item.review;

        card.append(top, message);
        reviewList.append(card);
    });
}

// Submit a review
if (reviewForm) {
    renderReviews();

    reviewForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(reviewForm);

        const name = String(formData.get("name") || "").trim();
        const review = String(formData.get("review") || "").trim();
        const rating = Number(formData.get("rating"));

        if (
            !name ||
            !review ||
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            if (reviewNotice) {
                reviewNotice.textContent =
                    "Please enter your name, select a star rating and write a review.";
            }
            return;
        }

        const reviews = getReviews();

        reviews.push({
            name,
            review,
            rating,
            date: new Date().toLocaleDateString()
        });

        try {
            localStorage.setItem(
                REVIEW_STORAGE_KEY,
                JSON.stringify(reviews)
            );

            reviewForm.reset();

            if (reviewNotice) {
                reviewNotice.textContent =
                    "Thank you! Your review has been added on this browser.";
            }

            renderReviews();

        } catch (error) {
            if (reviewNotice) {
                reviewNotice.textContent =
                    "Could not save your review. Please try again.";
            }
        }
    });
}


})();
