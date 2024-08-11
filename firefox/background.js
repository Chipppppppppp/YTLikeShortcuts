browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getCurrentTab") {
        browser.tabs.query({ active: true, currentWindow: true }, tabs => {
            sendResponse(tabs[0]);
        });
        return true;
    } else if (message.type === "changeMediaStatus") {
        browser.tabs.executeScript(sender.tabId, {
            code: `window.postMessage(${JSON.stringify(message)}, '*');`,
            allFrames: true
        });
    }
});
