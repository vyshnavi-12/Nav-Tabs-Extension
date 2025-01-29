class TabManager {
    constructor(windowManager) {
        this.windowManager = windowManager;
        this.currentMode = 'current'; // Track the current mode ('current' or 'all')
        this.tabOrigins = new Map(); // Store original window IDs of tabs
        this.draggedTabId = null; // Store the ID of the dragged tab
        this.initializeElements();
        this.initializeEventListeners();
        this.updateTabList();
    }

    initializeElements() {
        this.searchInput = document.getElementById('search');
        this.tabList = document.getElementById('tab-list');
        this.sortTabsBtn = document.getElementById('sort-tabs');

        // Add clear search button
        const searchBar = document.querySelector('.search-bar');
        const clearSearchBtn = document.createElement('i');
        clearSearchBtn.className = 'fas fa-times';
        clearSearchBtn.id = 'clear-search';
        searchBar.appendChild(clearSearchBtn);
    }

    initializeEventListeners() {
        this.searchInput.addEventListener('input', () => this.handleSearch());
        this.sortTabsBtn.addEventListener('click', () => this.sortTabs());

        // Add clear search functionality
        document.getElementById('clear-search').addEventListener('click', () => {
            this.searchInput.value = '';
            this.handleSearch();
        });

        // Store original window ID when tabs are moved
        chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
            if (!this.tabOrigins.has(tabId)) {
                this.tabOrigins.set(tabId, moveInfo.windowId);
            }
        });
    }

    handleSearch() {
        const query = this.searchInput.value.toLowerCase();
        this.updateTabList(query);
    }

    updateTabList(query = '') {
        if (this.currentMode === 'current') {
            chrome.windows.getCurrent({ populate: true }, (window) => {
                const filteredTabs = window.tabs.filter(tab =>
                    tab.title.toLowerCase().includes(query) ||
                    tab.url.toLowerCase().includes(query)
                );
                this.renderTabs(filteredTabs);
            });
        } else {
            chrome.windows.getAll({ populate: true }, (windows) => {
                const categorizedTabs = this.categorizeTabsByWindow(windows, query);
                this.renderCategorizedTabs(categorizedTabs);
            });
        }
    }

    categorizeTabsByWindow(windows, query) {
        const categorizedTabs = {};
        windows.forEach((window, index) => {
            const windowName = `Window ${index + 1}`;
            const filteredTabs = window.tabs.filter(tab =>
                tab.title.toLowerCase().includes(query) ||
                tab.url.toLowerCase().includes(query)
            );
            if (filteredTabs.length > 0) {
                categorizedTabs[windowName] = filteredTabs;
            }
        });
        return categorizedTabs;
    }

    renderCategorizedTabs(categorizedTabs) {
        this.tabList.innerHTML = '';

        if (Object.keys(categorizedTabs).length === 0) {
            const noTabElement = document.createElement('div');
            noTabElement.className = 'no-tab';
            noTabElement.textContent = 'No tab';
            this.tabList.appendChild(noTabElement);
            return;
        }

        Object.keys(categorizedTabs).forEach(windowName => {
            const windowTitleContainer = document.createElement('div');
            windowTitleContainer.className = 'window-title-container';

            const windowTitle = document.createElement('h2');
            windowTitle.textContent = windowName;
            windowTitleContainer.appendChild(windowTitle);

            const deleteIcon = document.createElement('i');
            deleteIcon.className = 'fas fa-trash window-delete-icon';
            deleteIcon.title = 'Delete Window';
            deleteIcon.addEventListener('click', () => {
                this.deleteWindow(windowName);
                windowTitleContainer.remove();  // Remove the window title container from the DOM
                const tabItems = this.tabList.querySelectorAll(`[data-window-name='${windowName}']`);
                tabItems.forEach(item => item.remove());  // Remove all tabs under the window from the DOM
            });
            windowTitleContainer.appendChild(deleteIcon);

            this.tabList.appendChild(windowTitleContainer);

            categorizedTabs[windowName].forEach(tab => {
                this.tabList.appendChild(this.renderTabItem(tab, windowName));
            });
        });
    }

    deleteWindow(windowName) {
        const windowIndex = parseInt(windowName.split(' ')[1]) - 1;
        chrome.windows.getAll({ populate: true }, (windows) => {
            if (windowIndex < windows.length) {
                const windowId = windows[windowIndex].id;
                chrome.windows.remove(windowId, () => {
                    this.updateTabList();
                    this.windowManager.updateCounts();
                });
            }
        });
    }

    renderTabs(tabs) {
        this.tabList.innerHTML = '';

        if (tabs.length === 0) {
            const noTabElement = document.createElement('div');
            noTabElement.className = 'no-tab';
            noTabElement.textContent = 'No tab';
            this.tabList.appendChild(noTabElement);
            return;
        }

        tabs.forEach(tab => this.tabList.appendChild(this.renderTabItem(tab)));
    }

    renderTabItem(tab, windowName = '') {
        const tabElement = document.createElement('div');
        tabElement.className = 'tab-item';
        tabElement.draggable = true; // Enable dragging
        tabElement.dataset.tabId = tab.id; // Store tab ID in a data attribute
        if (windowName) {
            tabElement.dataset.windowName = windowName; // Store window name for easy removal
        }
        tabElement.innerHTML = `
            <img class="tab-icon" src="${tab.favIconUrl || 'default-icon.png'}" alt="favicon">
            <div class="tab-content">
                <div class="tab-title">${tab.title}</div>
                <div class="tab-url">${tab.url}</div>
            </div>
            <div class="tab-actions">
                <i class="fas fa-thumbtack ${tab.pinned ? 'pinned' : ''}" title="Pin Tab"></i>
                <i class="fas fa-trash" title="Close Tab"></i>
            </div>
        `;

        // Add click event to switch to tab
        tabElement.addEventListener('click', () => {
            chrome.tabs.update(tab.id, { active: true });
            chrome.windows.update(tab.windowId, { focused: true });
        });

        // Pin tab functionality (thumbtack icon)
        const pinIcon = tabElement.querySelector('.fa-thumbtack');
        pinIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            const newPinnedState = !tab.pinned;
            chrome.tabs.update(tab.id, { pinned: newPinnedState }, (updatedTab) => {
                tab.pinned = updatedTab.pinned;
                pinIcon.classList.toggle('pinned', updatedTab.pinned); // Toggle pin state
                this.updateTabList(this.searchInput.value.toLowerCase()); // Refresh the tab list to reflect the change
            });
        });

        // Close tab functionality (trash icon)
        const trashIcon = tabElement.querySelector('.fa-trash');
        trashIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            chrome.tabs.remove(tab.id, () => {
                tabElement.remove();
                this.windowManager.updateCounts();
                this.cleanupEmptyWindows();
            });
        });

        // Handle drag events
        tabElement.addEventListener('dragstart', (e) => this.handleDragStart(e, tab.id));
        tabElement.addEventListener('dragover', (e) => this.handleDragOver(e));
        tabElement.addEventListener('drop', (e) => this.handleDrop(e, tab.id));

        return tabElement;
    }

    handleDragStart(event, tabId) {
        this.draggedTabId = tabId;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', tabId);
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    handleDrop(event, targetTabId) {
        event.preventDefault();
        const draggedTabId = this.draggedTabId;
        if (draggedTabId === targetTabId) return; // No action if dropped on the same tab

        chrome.tabs.get(draggedTabId, (draggedTab) => {
            chrome.tabs.get(targetTabId, (targetTab) => {
                if (draggedTab.windowId === targetTab.windowId) {
                    const tabElements = Array.from(this.tabList.querySelectorAll('.tab-item'));
                    const targetIndex = tabElements.findIndex(el => parseInt(el.dataset.tabId) === targetTabId);
                    const newIndex = event.clientY > tabElements[targetIndex].getBoundingClientRect().top ? targetIndex + 1 : targetIndex;
                    
                    chrome.tabs.move(draggedTabId, { index: newIndex }, () => {
                        this.updateTabList(this.searchInput.value.toLowerCase());
                    });
                }
            });
        });
    }

    cleanupEmptyWindows() {
        chrome.windows.getAll({ populate: true }, (windows) => {
            windows.forEach(window => {
                if (window.tabs.length === 0) {
                    chrome.windows.remove(window.id, () => {
                        this.updateTabList();
                        this.windowManager.updateCounts();
                    });
                }
            });
        });
    }

    displayAllWindows() {
        this.currentMode = 'all';
        this.updateTabList();
    }

    displayCurrentWindow() {
        this.currentMode = 'current';
        this.updateTabList();
    }

    sortTabs() {
        chrome.tabs.query({}, (tabs) => {
            const sortedTabs = tabs.sort((a, b) => a.title.localeCompare(b.title));
            sortedTabs.forEach((tab, index) => {
                chrome.tabs.move(tab.id, { index });
            });
            this.updateTabList(this.searchInput.value.toLowerCase());
        });
    }

    quickSwitch() {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
            if (tabs.length < 2) return;

            const currentTab = tabs.find(tab => tab.active);
            const lastTabIndex = (tabs.indexOf(currentTab) - 1 + tabs.length) % tabs.length;

            chrome.tabs.update(tabs[lastTabIndex].id, { active: true });
        });
    }
}