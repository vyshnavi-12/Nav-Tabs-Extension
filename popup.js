document.addEventListener('DOMContentLoaded', () => {
    const initializeApp = () => {
        const windowManager = new WindowManager(null);
        const tabManager = new TabManager(windowManager);
        windowManager.tabManager = tabManager;

        // Set the default view to "Current" window tabs
        windowManager.showCurrentWindow();

        // Enhanced message listener with actual handlers
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'tabUpdated':
                    tabManager.updateTabList();
                    windowManager.updateCounts();
                    break;
                case 'tabRemoved':
                    tabManager.updateTabList();
                    windowManager.updateCounts();
                    tabManager.cleanupEmptyWindows();
                    break;
                case 'tabCreated':
                    tabManager.updateTabList();
                    windowManager.updateCounts();
                    break;
                case 'windowCreated':
                    windowManager.updateCounts();
                    tabManager.updateTabList();
                    break;
                case 'windowRemoved':
                    windowManager.updateCounts();
                    tabManager.updateTabList();
                    break;
            }

            sendResponse({ status: "received" });
            return true;
        });

        // Add event listeners for search functionality
        const searchInput = document.getElementById('search');
        const clearSearchButton = document.getElementById('clear-search');

        searchInput.addEventListener('input', () => {
            clearSearchButton.style.display = searchInput.value ? 'block' : 'none';
        });

        clearSearchButton.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchButton.style.display = 'none';
            tabManager.updateTabList();
        });
    };

    // Defer non-critical operations to improve initial load performance
    setTimeout(initializeApp, 0);
});