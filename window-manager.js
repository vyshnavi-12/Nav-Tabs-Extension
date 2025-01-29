class WindowManager {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.initializeElements();
        this.initializeEventListeners();
        this.updateCounts();
    }

    initializeElements() {
        this.windowCount = document.getElementById('window-count');
        this.tabCount = document.getElementById('tab-count');
        this.allWindowsBtn = document.getElementById('all-windows');
        this.currentWindowBtn = document.getElementById('current-window');
        this.newWindowBtn = document.getElementById('new-window');
        this.mergeWindowsBtn = document.getElementById('merge-windows');
        this.confirmMergeBtn = document.getElementById('confirm-merge');
        this.closeMergeModalBtn = document.getElementById('close-merge-modal');
        this.mergeWindowList = document.getElementById('merge-window-list');
    }

    initializeEventListeners() {
        this.allWindowsBtn.addEventListener('click', () => this.showAllWindows());
        this.currentWindowBtn.addEventListener('click', () => this.showCurrentWindow());
        this.newWindowBtn.addEventListener('click', () => this.createNewWindow());
        this.mergeWindowsBtn.addEventListener('click', () => this.showMergeModal());
        this.confirmMergeBtn.addEventListener('click', () => this.mergeSelectedWindows());
        this.closeMergeModalBtn.addEventListener('click', () => this.closeMergeModal());

        chrome.windows.onCreated.addListener(() => this.updateCounts());
        chrome.windows.onRemoved.addListener(() => this.updateCounts());
    }

    updateCounts() {
        chrome.windows.getAll({ populate: true }, (windows) => {
            this.windowCount.textContent = `${windows.length} windows`;
            const totalTabs = windows.reduce((sum, win) => sum + win.tabs.length, 0);
            this.tabCount.textContent = `${totalTabs} tabs`;
        });
    }

    showAllWindows() {
        this.allWindowsBtn.classList.add('active');
        this.currentWindowBtn.classList.remove('active');
        this.tabManager.displayAllWindows();
    }

    showCurrentWindow() {
        this.currentWindowBtn.classList.add('active');
        this.allWindowsBtn.classList.remove('active');
        this.tabManager.displayCurrentWindow();
    }

    createNewWindow() {
        chrome.windows.create({ state: 'maximized' });
    }

    showMergeModal() {
        this.mergeWindowList.innerHTML = '';
        chrome.windows.getAll({ populate: true }, (windows) => {
            windows.forEach((window, index) => {
                const windowItem = document.createElement('div');
                windowItem.className = 'merge-window-item';
                windowItem.innerHTML = `
                    <input type="checkbox" id="window-${window.id}" value="${window.id}">
                    <label for="window-${window.id}">Window ${index + 1}</label>
                `;
                this.mergeWindowList.appendChild(windowItem);
            });
        });
        document.getElementById('merge-modal').style.display = 'block';
    }

    closeMergeModal() {
        document.getElementById('merge-modal').style.display = 'none';
    }

    mergeSelectedWindows() {
        const selectedWindows = Array.from(this.mergeWindowList.querySelectorAll('input:checked')).map(input => parseInt(input.value));
        if (selectedWindows.length < 2) {
            alert('Please select at least two windows to merge.');
            return;
        }

        chrome.windows.getAll({ populate: true }, (windows) => {
            const targetWindow = selectedWindows[0];
            const tabsToMove = [];

            windows.forEach(window => {
                if (selectedWindows.includes(window.id)) {
                    window.tabs.forEach(tab => {
                        if (!this.tabManager.tabOrigins.has(tab.id)) {
                            this.tabManager.tabOrigins.set(tab.id, window.id);
                        }
                        if (window.id !== targetWindow) {
                            tabsToMove.push(tab.id);
                        }
                    });
                }
            });

            chrome.tabs.move(tabsToMove, { windowId: targetWindow, index: -1 }, () => {
                this.closeMergeModal();
                this.updateCounts();
            });
        });
    }
}