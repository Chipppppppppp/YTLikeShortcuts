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

    if (!sessionStorage.getItem("yt-like-shortcuts-speed")) sessionStorage.setItem("yt-like-shortcuts-speed", "1");

    let speed = parseFloat(sessionStorage.getItem("yt-like-shortcuts-speed"));

    let videos = new Map;

    let pending = {}, hover = {};
    function showVideoStatus(str, video) {
        if (video) {
            let videoStatus = videos.get(video);
            videoStatus.innerText = str;
            videoStatus.style.display = "block";
            if (pending[video]) clearTimeout(pending[video]);
            pending[video] = setTimeout(() => {
                videoStatus.innerText = `Speed: ${speed}`;
                if (!hover[video]) videoStatus.style.display = "none";
            }, 2000);
            return;
        }
        for (let video of videos.keys()) {
            showVideoStatus(str, video);
        }
    }

    function apply(video) {
        if (videos.has(video)) return;
        video.parentElement.style.position = "relative";
        video.playbackRate = speed;

        let videoStatus = document.createElement("div");
        videoStatus.style.position = "absolute";
        videoStatus.style.zIndex = "2147483647";
        videoStatus.style.fontSize = "12px";
        videoStatus.style.padding = "5px 10px";
        videoStatus.style.background = "rgba(0, 0, 0, 0.4)";
        videoStatus.style.color = "white";
        videoStatus.style.top = "0";
        videoStatus.style.left = "0";
        videoStatus.style.borderBottomRightRadius = "5px";
        videoStatus.style.display = "none";
        video.before(videoStatus);

        videos.set(video, videoStatus);

        video.addEventListener("mouseenter", e => {
            hover[video] = true;
            videoStatus.innerText = `Speed: ${speed}`;
            videoStatus.style.display = "block";
        });

        video.addEventListener("mouseleave", e => {
            hover[video] = false;
            videoStatus.style.display = "none";
        });

        video.addEventListener("ratechange", e => {
            if (video.playbackRate != speed) video.playbackRate = speed;
        });

        video.addEventListener("play", e => {
            if (video.playbackRate != speed) video.playbackRate = speed;
        });
    }

    const observer = new MutationObserver(mutations => {
        for (let mutation of mutations) {
            for (let node of mutation.addedNodes) {
                if (node.tagName === "VIDEO") apply(node);
            }
        }
    });

    observer.observe(document, { childList: true, subtree: true });

    for (let video of document.getElementsByTagName("video")) apply(video);

    window.addEventListener("keydown", e => {
        let target = e.composedPath ? e.composedPath()[0] || e.target : e.target;
        if (/INPUT|TEXTAREA|SELECT|LABEL/.test(target.tagName) || target.getAttribute && target.getAttribute("contenteditable") === "true") return;

        function changeVideoStatus(type, value) {
            e.preventDefault();
            e.stopPropagation();
            switch (type) {
                case "togglePlay":
                    for (let video of videos.keys()) {
                        try {
                            if (video.paused) {
                                video.play();
                                showVideoStatus("Play", video);
                            } else {
                                video.pause();
                                showVideoStatus("Pause", video);
                            }
                        } catch (e) { }
                    }
                    return;
                case "toggleFullscreen":
                    for (let video of videos.keys()) {
                        try {
                            if (document.fullscreenElement) {
                                document.exitFullscreen();
                            } else {
                                video.requestFullscreen();
                            }
                        } catch (e) { }
                    }
                    return;
                case "setProgress":
                    for (let video of videos.keys()) {
                        try {
                            video.currentTime = video.duration * value / 10;
                        } catch (e) { }
                    }
                    showVideoStatus(`Progress: ${value} / 10`);
                    return;
                case "forward":
                    for (let video of videos.keys()) {
                        try {
                            video.currentTime = Math.min(video.duration, video.currentTime + value);
                        } catch (e) { }
                    }
                    showVideoStatus(`Forward: ${value}s`);
                    return;
                case "backward":
                    for (let video of videos.keys()) {
                        try {
                            video.currentTime = Math.max(0, video.currentTime - value);
                        } catch (e) { }
                    }
                    showVideoStatus(`Backward: ${value}s`);
                    return;
                case "nextFrame":
                    for (let video of videos.keys()) {
                        try {
                            if (video.paused) {
                                video.currentTime = Math.min(video.duration, video.currentTime + oneFrame);
                                showVideoStatus("Next Frame", video);
                            }
                        } catch (e) { }
                    }
                    return;
                case "previousFrame":
                    for (let video of videos.keys()) {
                        try {
                            if (video.paused) {
                                video.currentTime = Math.max(0, video.currentTime - oneFrame);
                                showVideoStatus("Previous Frame", video);
                            }
                        } catch (e) { }
                    }
                    return;
                case "volumeUp":
                    for (let video of videos.keys()) {
                        try {
                            video.volume = Math.min(1, video.volume + value / 100);
                            showVideoStatus(`Volume: ${Math.round(video.volume * 100)}%`, video);
                        } catch (e) { }
                    }
                    return;
                case "volumeDown":
                    for (let video of videos.keys()) {
                        try {
                            video.volume = Math.max(0, video.volume - value / 100);
                            showVideoStatus(`Volume: ${Math.round(video.volume * 100)}%`, video);
                        } catch (e) { }
                    }
                    return;
                case "toggleMute":
                    for (let video of videos.keys()) {
                        try {
                            if (video.muted) {
                                video.muted = false;
                                showVideoStatus("Unmute", video);
                            } else {
                                video.muted = true;
                                showVideoStatus("Mute", video);
                            }
                        } catch (e) { }
                    }
                    return;
                case "resetPlaybackRate":
                    speed = 1;
                    for (let video of videos.keys()) {
                        try {
                            video.playbackRate = 1;
                        } catch (e) { }
                    }
                    sessionStorage.setItem("yt-like-shortcuts-speed", String(speed));
                    showVideoStatus("Speed: 1");
                    return;
                case "increasePlaybackRate":
                    speed += 0.25;
                    for (let video of videos.keys()) {
                        try {
                            video.playbackRate = speed;
                        } catch (e) { }
                    }
                    sessionStorage.setItem("yt-like-shortcuts-speed", String(speed));
                    showVideoStatus(`Speed: ${speed}`);
                    return;
                case "decreasePlaybackRate":
                    speed = Math.max(0.25, speed - 0.25);
                    for (let video of videos.keys()) {
                        try {
                            video.playbackRate = speed;
                        } catch (e) { }
                    }
                    sessionStorage.setItem("yt-like-shortcuts-speed", String(speed));
                    showVideoStatus(`Speed: ${speed}`);
                    return;
                default:
                    return;
            }
        }

        if (e.ctrlKey || e.altKey || e.metaKey) return;

        if (e.shiftKey) {
            switch (e.key) {
                case "ArrowRight":
                    changeVideoStatus("forward", 30);
                    return;
                case "ArrowLeft":
                    changeVideoStatus("backward", 30);
                    return;
                case "ArrowUp":
                    changeVideoStatus("volumeUp", 20);
                    return;
                case "ArrowDown":
                    changeVideoStatus("volumeDown", 20);
                    return;
                case "_":
                    changeVideoStatus("resetPlaybackRate");
                    return;
                case ">":
                    changeVideoStatus("increasePlaybackRate");
                    return;
                case "<":
                    changeVideoStatus("decreasePlaybackRate");
                    return;
                default:
                    return;
            }
        }

        if (/^[0-9]$/.test(e.key)) {
            changeVideoStatus("setProgress", parseInt(e.key));
        }

        switch (e.key) {
            case "k":
                changeVideoStatus("togglePlay");
                return;
            case "f":
                changeVideoStatus("toggleFullscreen");
                return;
            case "ArrowRight":
                changeVideoStatus("forward", 5);
                return;
            case "ArrowLeft":
                changeVideoStatus("backward", 5);
                return;
            case "l":
                changeVideoStatus("forward", 10);
                return;
            case "j":
                changeVideoStatus("backward", 10);
                return;
            case ".":
                changeVideoStatus("nextFrame");
                return;
            case ",":
                changeVideoStatus("previousFrame");
                return;
            case "ArrowUp":
                changeVideoStatus("volumeUp", 5);
                return;
            case "ArrowDown":
                changeVideoStatus("volumeDown", 5);
                return;
            case "m":
                changeVideoStatus("toggleMute");
                return;
            default:
                return;
        }
    }, true);
});
