const defaultDomains = [
    "https://www.youtube.com",
    "https://m.youtube.com"
];

const oneFrame = 1 / 30;

browser.storage.local.get("domains", async result => {
    let domains = result.domains || defaultDomains.slice();

    let tab = await new Promise((resolve, reject) => {
        browser.runtime.sendMessage({ type: "getCurrentTab" }, response => {
            if (browser.runtime.lastError) {
                reject(new Error(browser.runtime.lastError));
            } else {
                resolve(response);
            }
        });
    });

    let origin = new URL(tab.url).origin;

    if (!domains.some(domain => location.origin === domain) && !domains.some(domain => origin === domain)) return;

    console.log("YT-Like Shortcuts Enabled");

    function overrideHTMLMediaElement() {
        if (!sessionStorage.getItem("yt-like-shortcuts-speed")) sessionStorage.setItem("yt-like-shortcuts-speed", "1");
        let speed = parseFloat(sessionStorage.getItem("yt-like-shortcuts-speed"));

        if (!sessionStorage.getItem("yt-like-shortcuts-volume")) sessionStorage.setItem("yt-like-shortcuts-volume", "1");
        let volume = parseFloat(sessionStorage.getItem("yt-like-shortcuts-volume"));

        if (!sessionStorage.getItem("yt-like-shortcuts-muted")) sessionStorage.setItem("yt-like-shortcuts-muted", "false");
        let muted = sessionStorage.getItem("yt-like-shortcuts-muted") === "true";

        let medias = new Set;

        let allowPlaybackRateChange = false;

        const originalPlaybackRateDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "playbackRate");

        Object.defineProperty(HTMLMediaElement.prototype, "playbackRate", {
            get: function () {
                return originalPlaybackRateDescriptor.get.call(this);
            },
            set: function (value) {
                if (allowPlaybackRateChange) originalPlaybackRateDescriptor.set.call(this, value);
            },
            configurable: true,
            enumerable: true
        });

        function setPlaybackRate(media, value) {
            allowPlaybackRateChange = true;
            try {
                media.playbackRate = value;
            } finally {
                allowPlaybackRateChange = false;
            }
        };

        let allowVolumeChange = false;

        const originalVolumeDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");

        Object.defineProperty(HTMLMediaElement.prototype, "volume", {
            get: function () {
                return originalVolumeDescriptor.get.call(this);
            },
            set: function (value) {
                if (allowVolumeChange) originalVolumeDescriptor.set.call(this, value);
            },
            configurable: true,
            enumerable: true
        });

        function setVolume(media, value) {
            allowVolumeChange = true;
            try {
                media.volume = value;
            } finally {
                allowVolumeChange = false;
            }
        };

        let allowMutedChange = false;

        const originalMutedDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "muted");

        Object.defineProperty(HTMLMediaElement.prototype, "muted", {
            get: function () {
                return originalMutedDescriptor.get.call(this);
            },
            set: function (value) {
                if (allowMutedChange) originalMutedDescriptor.set.call(this, value);
            },
            configurable: true,
            enumerable: true
        });

        function setMuted(media, value) {
            allowMutedChange = true;
            try {
                media.muted = value;
            } finally {
                allowMutedChange = false;
            }
        };

        function createMediaStatus(media) {
            if (media.mediaStatus) return;
            let mediaStatus = document.createElement("div");
            mediaStatus.style.display = "none";
            mediaStatus.style.position = "absolute";
            mediaStatus.style.zIndex = "2147483647";
            mediaStatus.style.fontSize = "12px";
            mediaStatus.style.padding = "5px 10px";
            mediaStatus.style.background = "rgba(0, 0, 0, 0.4)";
            mediaStatus.style.color = "white";
            mediaStatus.style.top = "0";
            mediaStatus.style.left = "0";
            mediaStatus.style.borderBottomRightRadius = "5px";
            mediaStatus.innerText = `Speed: ${speed}`;
            media.before(mediaStatus);
            media.mediaStatus = mediaStatus;
        }

        const originalPlay = HTMLMediaElement.prototype.play;

        HTMLMediaElement.prototype.play = function () {
            setPlaybackRate(this, speed);
            setVolume(this, volume);
            setMuted(this, muted);

            if (medias.has(this)) return originalPlay.apply(this, arguments);
            medias.add(this);

            this.addEventListener("mouseenter", () => {
                createMediaStatus(this);
                this.hover = true;
                this.mediaStatus.style.display = "block";
            });

            this.addEventListener("mouseleave", () => {
                createMediaStatus(this);
                this.hover = false;
                if (!this.pending) this.mediaStatus.style.display = "none";
            });

            return originalPlay.apply(this, arguments);
        };

        function showMediaStatus(str, media) {
            if (media) {
                createMediaStatus(media);
                media.mediaStatus.innerText = str;
                media.mediaStatus.style.display = "block";
                if (media.pending) clearTimeout(media.pending);
                media.pending = setTimeout(() => {
                    media.mediaStatus.innerText = `Speed: ${speed}`;
                    if (!media.hover) media.mediaStatus.style.display = "none";
                    media.pending = null;
                }, 2000);
                return;
            }

            for (let media of medias) {
                showMediaStatus(str, media);
            }
        }

        window.addEventListener("message", e => {
            if (!e.data) return;
            let value = e.data.value;
            switch (e.data.action) {
                case "toggleFullscreen":
                    for (let media of medias) {
                        try {
                            if (document.fullscreenElement) {
                                document.exitFullscreen();
                            } else {
                                media.requestFullscreen();
                            }
                        } catch (e) { }
                    }
                    return;
                case "setProgress":
                    for (let media of medias) {
                        try {
                            media.currentTime = media.duration * value / 10;
                        } catch (e) { }
                    }
                    showMediaStatus(`Progress: ${value} / 10`);
                    return;
                case "goForward":
                    for (let media of medias) {
                        try {
                            media.currentTime = Math.min(media.duration, media.currentTime + value);
                        } catch (e) { }
                    }
                    showMediaStatus(`Forward: ${value}s`);
                    return;
                case "goBackward":
                    for (let media of medias) {
                        try {
                            media.currentTime = Math.max(0, media.currentTime - value);
                        } catch (e) { }
                    }
                    showMediaStatus(`Backward: ${value}s`);
                    return;
                case "nextFrame":
                    for (let media of medias) {
                        try {
                            media.currentTime = Math.min(media.duration, media.currentTime + oneFrame);
                            showMediaStatus("Next Frame", media);
                        } catch (e) { }
                    }
                    return;
                case "previousFrame":
                    for (let media of medias) {
                        try {
                            media.currentTime = Math.max(0, media.currentTime - oneFrame);
                            showMediaStatus("Previous Frame", media);
                        } catch (e) { }
                    }
                    return;
                case "volumeUp":
                    volume = Math.min(1, volume + value / 100);
                    for (let media of medias) {
                        try {
                            setVolume(media, volume);
                        } catch (e) { }
                    }
                    sessionStorage.setItem("yt-like-shortcuts-volume", String(volume));
                    showMediaStatus(`Volume: ${Math.round(volume * 100)}%`);
                    return;
                case "volumeDown":
                    volume = Math.max(0, volume - value / 100);
                    for (let media of medias) {
                        try {
                            setVolume(media, volume);
                        } catch (e) { }
                    }
                    sessionStorage.setItem("yt-like-shortcuts-volume", String(volume));
                    showMediaStatus(`Volume: ${Math.round(volume * 100)}%`);
                    return;
                case "toggleMuted":
                    muted = !muted;
                    for (let media of medias) {
                        try {
                            setMuted(media, muted);
                        } catch (e) { }
                    }
                    sessionStorage.setItem("yt-like-shortcuts-muted", String(muted));
                    showMediaStatus(muted ? "Muted" : "Unmuted");
                    return;
                case "resetPlaybackRate":
                    speed = 1;
                    for (let media of medias) {
                        try {
                            setPlaybackRate(media, 1);
                        } catch (e) { }
                    }
                    sessionStorage.setItem("yt-like-shortcuts-speed", String(speed));
                    showMediaStatus("Speed: 1");
                    return;
                case "increasePlaybackRate":
                    speed += 0.25;
                    for (let media of medias) {
                        try {
                            setPlaybackRate(media, speed);
                        } catch (e) { }
                    }
                    sessionStorage.setItem("yt-like-shortcuts-speed", String(speed));
                    showMediaStatus(`Speed: ${speed}`);
                    return;
                case "decreasePlaybackRate":
                    speed = Math.max(0.25, speed - 0.25);
                    for (let media of medias) {
                        try {
                            setPlaybackRate(media, speed);
                        } catch (e) { }
                    }
                    sessionStorage.setItem("yt-like-shortcuts-speed", String(speed));
                    showMediaStatus(`Speed: ${speed}`);
                    return;
                default:
                    return;
            }
        });
    }

    window.addEventListener("keydown", e => {
        let target = e.composedPath ? e.composedPath()[0] || e.target : e.target;
        if (/INPUT|TEXTAREA|SELECT|LABEL/.test(target.tagName) || target.getAttribute && target.getAttribute("contenteditable") === "true") return;

        function changeMediaStatus(action, value) {
            e.preventDefault();
            e.stopPropagation();
            browser.runtime.sendMessage({ type: "changeMediaStatus", action: action, value: value });
        }

        if (e.ctrlKey || e.altKey || e.metaKey) return;

        if (e.shiftKey) {
            switch (e.key) {
                case "ArrowRight":
                    changeMediaStatus("goForward", 30);
                    return;
                case "ArrowLeft":
                    changeMediaStatus("goBackward", 30);
                    return;
                case "L":
                    changeMediaStatus("goForward", 60);
                    return;
                case "J":
                    changeMediaStatus("goBackward", 60);
                    return;
                case "ArrowUp":
                    changeMediaStatus("volumeUp", 20);
                    return;
                case "ArrowDown":
                    changeMediaStatus("volumeDown", 20);
                    return;
                case "_":
                    changeMediaStatus("resetPlaybackRate");
                    return;
                case ">":
                    changeMediaStatus("increasePlaybackRate");
                    return;
                case "<":
                    changeMediaStatus("decreasePlaybackRate");
                    return;
                default:
                    return;
            }
        }

        if (/^[0-9]$/.test(e.key)) {
            changeMediaStatus("setProgress", parseInt(e.key));
        }

        switch (e.key) {
            case "f":
                changeMediaStatus("toggleFullscreen");
                return;
            case "ArrowRight":
                changeMediaStatus("goForward", 5);
                return;
            case "ArrowLeft":
                changeMediaStatus("goBackward", 5);
                return;
            case "l":
                changeMediaStatus("goForward", 10);
                return;
            case "j":
                changeMediaStatus("goBackward", 10);
                return;
            case ".":
                changeMediaStatus("nextFrame");
                return;
            case ",":
                changeMediaStatus("previousFrame");
                return;
            case "ArrowUp":
                changeMediaStatus("volumeUp", 5);
                return;
            case "ArrowDown":
                changeMediaStatus("volumeDown", 5);
                return;
            case "m":
                changeMediaStatus("toggleMuted");
                return;
            default:
                return;
        }
    }, true);

    const script = document.createElement("script");
    script.textContent = `(${overrideHTMLMediaElement})();`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
});
