chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle the message
    switch (message.action) {
        case 'tabUpdated':
            break;
        case 'tabRemoved':
            break;
        case 'tabCreated':
            break;
        case 'windowCreated':
            break;
        case 'windowRemoved':
            break;
        default:
            break;
    }

    sendResponse({ status: "received" });
});