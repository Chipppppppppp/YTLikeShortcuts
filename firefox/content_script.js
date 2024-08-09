const defaultDomains = [
    "https://www.youtube.com",
    "https://m.youtube.com"
];

const oneFrame = 1 / 30;

chrome.storage.sync.get("domains", async result => {
    let domains = result.domains || defaultDomains.slice();

    let tab = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "getCurrentTab" }, response => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
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

        let medias = new Set;

        let allow = false;

        const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "playbackRate");

        Object.defineProperty(HTMLMediaElement.prototype, "playbackRate", {
            get: function() {
                return originalDescriptor.get.call(this);
            },
            set: function(value) {
                if (allow) originalDescriptor.set.call(this, value);
            }
        });

        function setPlaybackRate(media, value) {
            allow = true;
            try {
                media.playbackRate = value;
            } finally {
                allow = false;
            }
        };

        function createMediaStatus(media) {
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

            media.parentElement.style.position = "relative";
            media.before(mediaStatus);
            media.mediaStatus = mediaStatus;
        }

        const originalPlay = HTMLMediaElement.prototype.play;

        HTMLMediaElement.prototype.play = function() {
            if (medias.has(this)) return originalPlay.apply(this, arguments);
            medias.add(this);

            this.addEventListener("mouseenter", e => {
                this.hover = true;

                this.mediaStatus.style.display = "block";
            });

            this.addEventListener("mouseleave", e => {
                this.hover = false;

                this.mediaStatus.style.display = "none";
            });

            setPlaybackRate(this, speed);

            createMediaStatus(this);

            return originalPlay.apply(this, arguments);
        };

        function showMediaStatus(str, media) {
            if (media) {
                media.mediaStatus.innerText = str;
                media.mediaStatus.style.display = "block";

                if (media.pending) clearTimeout(media.pending);
                media.pending = setTimeout(() => {
                    if (!media.hover) media.mediaStatus.style.display = "none";
                    media.mediaStatus.innerText = `Speed: ${speed}`;
                }, 2000);
                return;
            }

            for (let media of medias) {
                showMediaStatus(str, media);
            }
        }

        window.addEventListener("keydown", e => {
            let target = e.composedPath ? e.composedPath()[0] || e.target : e.target;
            if (/INPUT|TEXTAREA|SELECT|LABEL/.test(target.tagName) || target.getAttribute && target.getAttribute("contenteditable") === "true") return;

            function changeMediaStatus(type, value) {
                e.preventDefault();
                e.stopPropagation();

                switch (type) {
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
                    case "forward":
                        for (let media of medias) {
                            try {
                                media.currentTime = Math.min(media.duration, media.currentTime + value);
                            } catch (e) { }
                        }
                        showMediaStatus(`Forward: ${value}s`);
                        return;
                    case "backward":
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
                        for (let media of medias) {
                            try {
                                media.volume = Math.min(1, media.volume + value / 100);
                                showMediaStatus(`Volume: ${Math.round(media.volume * 100)}%`, media);
                            } catch (e) { }
                        }
                        return;
                    case "volumeDown":
                        for (let media of medias) {
                            try {
                                media.volume = Math.max(0, media.volume - value / 100);
                                showMediaStatus(`Volume: ${Math.round(media.volume * 100)}%`, media);
                            } catch (e) { }
                        }
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
            }

            if (e.ctrlKey || e.altKey || e.metaKey) return;

            if (e.shiftKey) {
                switch (e.key) {
                    case "ArrowRight":
                        changeMediaStatus("forward", 30);
                        return;
                    case "ArrowLeft":
                        changeMediaStatus("backward", 30);
                        return;
                    case "L":
                        changeMediaStatus("forward", 60);
                        return;
                    case "J":
                        changeMediaStatus("backward", 60);
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
                    changeMediaStatus("forward", 5);
                    return;
                case "ArrowLeft":
                    changeMediaStatus("backward", 5);
                    return;
                case "l":
                    changeMediaStatus("forward", 10);
                    return;
                case "j":
                    changeMediaStatus("backward", 10);
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
                default:
                    return;
            }
        }, true);
    }

    const script = document.createElement("script");
        script.textContent = `(${overrideHTMLMediaElement})();`;
        (document.head || document.documentElement).appendChild(script);
        script.remove();
});
