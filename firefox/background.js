chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getCurrentTab") {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            sendResponse(tabs[0]);
        });
        return true;
    }
});
