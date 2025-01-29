chrome.runtime.onInstalled.addListener(() => {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete') {
            chrome.runtime.sendMessage({ action: 'tabUpdated', tab }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError);
                }
            });
        }
    });

    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
        chrome.runtime.sendMessage({ action: 'tabRemoved', tabId }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
            }
        });
    });

    chrome.tabs.onCreated.addListener((tab) => {
        chrome.runtime.sendMessage({ action: 'tabCreated', tab }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
            }
        });
    });

    chrome.windows.onCreated.addListener((window) => {
        chrome.runtime.sendMessage({ action: 'windowCreated', window }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
            }
        });
    });

    chrome.windows.onRemoved.addListener((windowId) => {
        chrome.runtime.sendMessage({ action: 'windowRemoved', windowId }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
            }
        });
    });
});