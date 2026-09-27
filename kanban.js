class FreeKanban {
    constructor() {
        this.tasks = [];
        this.columns = [
            { id: 'backlog', title: 'Backlog', order: 0 },
            { id: 'todo', title: 'To Do', order: 1 },
            { id: 'in-progress', title: 'In Progress', order: 2 },
            { id: 'review', title: 'Review', order: 3 },
            { id: 'done', title: 'Done', order: 4 }
        ];
        this.currentTaskId = null;
        this.currentColumn = 'todo';
        this.draggedElement = null;
        this.searchTerm = '';
        this.currentDensity = 'comfortable';
        this.currentBoardId = null; // Track current board ID
        this.currentBoardName = 'My Projects';
        this.savedBoards = {};
        this.currentColumnLayout = 3;
        
        this.init();
    }

    init() {
        // Load theme preference
        const savedTheme = localStorage.getItem('kanban-theme') || 'black';
        this.currentTheme = savedTheme;
        this.changeTheme(savedTheme);
        this.updateThemeButton();

        // Load density preference
        const savedDensity = localStorage.getItem('kanban-density') || 'comfortable';
        this.currentDensity = savedDensity;
        this.changeDensity(savedDensity);
        this.updateDensityButton();

        // Load column layout preference
        const savedLayout = parseInt(localStorage.getItem('kanban-column-layout')) || 5;
        this.currentColumnLayout = savedLayout;
        this.changeColumnLayout(savedLayout);
        this.updateLayoutButton();

        // Load board data
        this.loadSavedBoards();
        
        // Load the current board or create default
        this.loadCurrentBoard();
        
        // Check if there's a URL override (this will override the loaded data)
        this.loadFromUrl();
        
        this.initializeBoardName();
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Auto-save every 5 minutes
        setInterval(() => this.saveToStorage(), 300000);
        
        // Initialize search
        this.initializeSearch();
        
        // Initial render
        this.renderBoard();
    }

    initializeEventListeners() {
        // Range input displays with smooth updates
        document.getElementById('task-difficulty').addEventListener('input', (e) => {
            const value = e.target.value;
            const display = e.target.nextElementSibling;
            display.textContent = `${value} / 5`;
        });

        document.getElementById('task-progress').addEventListener('input', (e) => {
            const value = e.target.value;
            const display = e.target.nextElementSibling;
            display.textContent = `${value}%`;
        });

        document.getElementById('task-fun').addEventListener('input', (e) => {
            const value = e.target.value;
            const display = e.target.nextElementSibling;
            display.textContent = `${value} / 5`;
        });

        document.getElementById('task-monetization').addEventListener('input', (e) => {
            const value = e.target.value;
            const display = e.target.nextElementSibling;
            display.textContent = `${value} / 5`;
        });

        // Touch support for mobile
        if ('ontouchstart' in window) {
            this.initializeTouchSupport();
        }

        // Close modals on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });

        // Close column menus when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.column-menu-container')) {
                document.querySelectorAll('.column-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
    }

    initializeSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterTasks();
            });
        }
    }

    filterTasks() {
        const taskCards = document.querySelectorAll('.task-card');
        taskCards.forEach(card => {
            const title = card.querySelector('.task-title').textContent.toLowerCase();
            const description = card.querySelector('.task-description')?.textContent.toLowerCase() || '';
            const tags = Array.from(card.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase()).join(' ');
            
            const matches = title.includes(this.searchTerm) || 
                          description.includes(this.searchTerm) || 
                          tags.includes(this.searchTerm);
            
            card.style.display = matches ? 'block' : 'none';
        });
    }

    initializeTouchSupport() {
        let touchItem = null;
        let touchOffset = { x: 0, y: 0 };

        document.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('touchstart', (e) => {
                touchItem = e.target.closest('.task-card');
                const touch = e.touches[0];
                const rect = touchItem.getBoundingClientRect();
                touchOffset.x = touch.clientX - rect.left;
                touchOffset.y = touch.clientY - rect.top;
                touchItem.style.opacity = '0.5';
            }, { passive: true });

            card.addEventListener('touchmove', (e) => {
                if (!touchItem) return;
                e.preventDefault();
                const touch = e.touches[0];
                touchItem.style.position = 'fixed';
                touchItem.style.left = `${touch.clientX - touchOffset.x}px`;
                touchItem.style.top = `${touch.clientY - touchOffset.y}px`;
                touchItem.style.zIndex = '1000';
            });

            card.addEventListener('touchend', (e) => {
                if (!touchItem) return;
                const touch = e.changedTouches[0];
                const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
                const column = dropTarget?.closest('.column');
                
                if (column) {
                    const taskId = touchItem.dataset.taskId;
                    const newColumn = column.dataset.column;
                    this.moveTask(taskId, newColumn);
                }

                touchItem.style.position = '';
                touchItem.style.opacity = '';
                touchItem.style.zIndex = '';
                touchItem = null;
            });
        });
    }

    // Theme Management
    changeTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('kanban-theme', theme);
        this.currentTheme = theme;
    }

    cycleTheme() {
        const themes = ['white', 'grey', 'black'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        this.changeTheme(nextTheme);
        this.updateThemeButton();
    }

    updateThemeButton() {
        const button = document.getElementById('theme-button');
        const themeEmojis = {
            'white': '☀️',  // Sun for light theme
            'grey': '🌓',   // Half moon for warm/grey theme  
            'black': '🌙'   // Moon for dark theme
        };
        
        const themeNames = {
            'white': 'Light Theme',
            'grey': 'Warm Theme',
            'black': 'Dark Theme'
        };
        
        if (button) {
            button.textContent = themeEmojis[this.currentTheme];
            button.title = `Current: ${themeNames[this.currentTheme]} - Click to change`;
        }
    }

    // Density Management
    changeDensity(density) {
        document.body.setAttribute('data-density', density);
        localStorage.setItem('kanban-density', density);
        this.currentDensity = density;
    }

    cycleDensity() {
        const densities = ['comfortable', 'compact', 'dense'];
        const currentIndex = densities.indexOf(this.currentDensity);
        const nextIndex = (currentIndex + 1) % densities.length;
        const nextDensity = densities[nextIndex];
        
        this.changeDensity(nextDensity);
        this.updateDensityButton();
    }

    updateDensityButton() {
        const button = document.getElementById('density-button');
        const densityEmojis = {
            'comfortable': '📋',  // Clipboard for comfortable (full details)
            'compact': '📄',      // Page for compact (some details)
            'dense': '📝'         // Memo for dense (minimal details)
        };
        
        const densityNames = {
            'comfortable': 'Comfortable View',
            'compact': 'Compact View', 
            'dense': 'Dense View'
        };
        
        if (button) {
            button.textContent = densityEmojis[this.currentDensity];
            button.title = `Current: ${densityNames[this.currentDensity]} - Click to change`;
        }
    }

    // Column Layout Management
    changeColumnLayout(layout) {
        document.body.setAttribute('data-columns', layout);
        localStorage.setItem('kanban-column-layout', layout);
        this.currentColumnLayout = layout;
    }

    cycleColumnLayout() {
        const layouts = [3, 4, 5];
        const currentIndex = layouts.indexOf(this.currentColumnLayout);
        const nextIndex = (currentIndex + 1) % layouts.length;
        const nextLayout = layouts[nextIndex];
        
        this.changeColumnLayout(nextLayout);
        this.updateLayoutButton();
    }

    updateLayoutButton() {
        const button = document.getElementById('layout-button');
        const layoutDisplay = {
            3: '3⚏',    // 3 with grid icon
            4: '4⚏',    // 4 with grid icon  
            5: '5⚏'     // 5 with grid icon
        };
        
        const layoutNames = {
            3: '3 Columns',
            4: '4 Columns',
            5: '5 Columns'
        };
        
        if (button) {
            button.textContent = layoutDisplay[this.currentColumnLayout];
            button.title = `Current: ${layoutNames[this.currentColumnLayout]} - Click to change`;
        }
    }

    // Column Movement
    moveColumnLeft(columnId) {
        const sortedColumns = [...this.columns].sort((a, b) => a.order - b.order);
        const sortedIndex = sortedColumns.findIndex(c => c.id === columnId);
        
        if (sortedIndex > 0) {
            // Swap order values with the previous column in sorted order
            const currentColumn = sortedColumns[sortedIndex];
            const previousColumn = sortedColumns[sortedIndex - 1];
            
            const temp = currentColumn.order;
            currentColumn.order = previousColumn.order;
            previousColumn.order = temp;
            
            this.saveColumnsToStorage();
            this.renderBoard();
            this.showToast('Column moved left', 'success');
        }
    }

    moveColumnRight(columnId) {
        const sortedColumns = [...this.columns].sort((a, b) => a.order - b.order);
        const sortedIndex = sortedColumns.findIndex(c => c.id === columnId);
        
        if (sortedIndex < sortedColumns.length - 1) {
            // Swap order values with the next column in sorted order
            const currentColumn = sortedColumns[sortedIndex];
            const nextColumn = sortedColumns[sortedIndex + 1];
            
            const temp = currentColumn.order;
            currentColumn.order = nextColumn.order;
            nextColumn.order = temp;
            
            this.saveColumnsToStorage();
            this.renderBoard();
            this.showToast('Column moved right', 'success');
        }
    }

    toggleColumnMenu(columnId) {
        const menu = document.getElementById(`menu-${columnId}`);
        const isVisible = menu.classList.contains('show');
        
        // Close all open menus first
        this.closeColumnMenus();
        
        // Toggle the clicked menu
        if (!isVisible) {
            menu.classList.add('show');
        }
    }

    closeColumnMenus() {
        document.querySelectorAll('.column-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }

    // Board Management
    initializeBoardName() {
        const boardNameInput = document.getElementById('board-name');
        if (boardNameInput) {
            boardNameInput.value = this.currentBoardName;
            
            // Update name in memory as user types, but don't save yet
            boardNameInput.addEventListener('input', (e) => {
                this.currentBoardName = e.target.value || 'My Board';
            });

            // Save only when user finishes editing (loses focus)
            boardNameInput.addEventListener('blur', () => {
                this.saveCurrentBoard();
            });

            // Also save on Enter key
            boardNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    boardNameInput.blur(); // This will trigger the blur event and save
                }
            });
        }
    }

    loadSavedBoards() {
        const saved = localStorage.getItem('kanban-saved-boards');
        if (saved) {
            try {
                this.savedBoards = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load saved boards:', e);
                this.savedBoards = {};
            }
        }
        
        // Migrate old data if it exists
        this.migrateOldData();
        
        // Ensure we always have at least a default board
        if (Object.keys(this.savedBoards).length === 0) {
            const defaultBoardId = this.generateBoardId('My Projects');
            const now = new Date().toISOString();
            this.savedBoards[defaultBoardId] = {
                id: defaultBoardId,
                name: 'My Projects',
                tasks: [
                    {
                        id: 'demo-1',
                        title: 'Brainstorm new ideas',
                        description: 'Take 15 minutes to write down any ideas that come to mind. No filtering!',
                        column: 'backlog',
                        difficulty: 1,
                        progress: 0,
                        priority: 'low',
                        funFactor: 5,
                        monetization: 2,
                        timeEstimate: '15 min',
                        categories: ['creativity'],
                        color: '#a855f7',
                        createdAt: now,
                        updatedAt: now
                    },
                    {
                        id: 'demo-2',
                        title: 'Learn something new',
                        description: 'Pick a tutorial, article, or video. Spend 30 min learning.',
                        column: 'backlog',
                        difficulty: 2,
                        progress: 0,
                        priority: 'low',
                        funFactor: 4,
                        monetization: 3,
                        timeEstimate: '30 min',
                        categories: ['learning'],
                        color: '#3b82f6',
                        createdAt: now,
                        updatedAt: now
                    },
                    {
                        id: 'demo-3',
                        title: 'Review weekly goals',
                        description: 'Check progress on this week\'s priorities. Adjust if needed.',
                        column: 'todo',
                        difficulty: 1,
                        progress: 0,
                        priority: 'medium',
                        funFactor: 2,
                        monetization: 3,
                        timeEstimate: '10 min',
                        categories: ['planning'],
                        color: '#eab308',
                        createdAt: now,
                        updatedAt: now
                    },
                    {
                        id: 'demo-4',
                        title: 'Fix that annoying bug',
                        description: 'You know the one. Time to squash it.',
                        column: 'in-progress',
                        difficulty: 3,
                        progress: 40,
                        priority: 'high',
                        funFactor: 2,
                        monetization: 4,
                        timeEstimate: '1 hour',
                        categories: ['bugfix'],
                        color: '#ef4444',
                        createdAt: now,
                        updatedAt: now
                    },
                    {
                        id: 'demo-5',
                        title: 'Update documentation',
                        description: 'Keep docs in sync with recent changes.',
                        column: 'review',
                        difficulty: 2,
                        progress: 80,
                        priority: 'medium',
                        funFactor: 2,
                        monetization: 2,
                        timeEstimate: '30 min',
                        categories: ['docs'],
                        color: '#6b7280',
                        createdAt: now,
                        updatedAt: now
                    },
                    {
                        id: 'demo-6',
                        title: 'Ship first feature',
                        description: 'Deployed to production. Celebrate!',
                        column: 'done',
                        difficulty: 4,
                        progress: 100,
                        priority: 'high',
                        funFactor: 5,
                        monetization: 5,
                        timeEstimate: '2 days',
                        categories: ['milestone'],
                        color: '#22c55e',
                        createdAt: now,
                        updatedAt: now
                    }
                ],
                columns: [
                    { id: 'backlog', title: 'Backlog', order: 0 },
                    { id: 'todo', title: 'To Do', order: 1 },
                    { id: 'in-progress', title: 'In Progress', order: 2 },
                    { id: 'review', title: 'Review', order: 3 },
                    { id: 'done', title: 'Done', order: 4 }
                ],
                lastModified: now,
                createdAt: now
            };
            this.saveBoardsToStorage();
        }
    }
    
    migrateOldData() {
        // Check if there's old data in kanban-board
        const oldData = localStorage.getItem('kanban-board');
        if (oldData) {
            try {
                const data = JSON.parse(oldData);
                const boardName = data.name || 'My Board';
                
                // Check if we need to migrate this data
                let needsMigration = true;
                for (const boardId in this.savedBoards) {
                    if (this.savedBoards[boardId].name === boardName) {
                        needsMigration = false;
                        break;
                    }
                }
                
                if (needsMigration && data.tasks && data.tasks.length > 0) {
                    // Create a new board with the old data
                    const migratedBoardId = this.generateBoardId(boardName);
                    
                    // Try to get columns from old storage
                    let columns = [
                        { id: 'todo', title: 'To Do', order: 0 },
                        { id: 'in-progress', title: 'In Progress', order: 1 },
                        { id: 'done', title: 'Done', order: 2 }
                    ];
                    const oldColumns = localStorage.getItem('kanban-columns');
                    if (oldColumns) {
                        try {
                            columns = JSON.parse(oldColumns);
                        } catch (e) {
                            // Use default columns
                        }
                    }
                    
                    this.savedBoards[migratedBoardId] = {
                        id: migratedBoardId,
                        name: boardName,
                        tasks: data.tasks,
                        columns: columns,
                        lastModified: data.lastUpdated || new Date().toISOString(),
                        createdAt: new Date().toISOString()
                    };
                    this.saveBoardsToStorage();
                    
                    // Set as current board
                    localStorage.setItem('kanban-current-board-id', migratedBoardId);
                }
                
                // Clean up old storage
                localStorage.removeItem('kanban-board');
                localStorage.removeItem('kanban-columns');
                localStorage.removeItem('kanban-last-save');
            } catch (e) {
                console.error('Failed to migrate old data:', e);
            }
        }
    }
    
    generateBoardId(name) {
        // Generate a unique ID based on name and timestamp
        return `board_${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}_${Date.now()}`;
    }
    
    loadCurrentBoard() {
        // Get the current board ID or use the first available board
        this.currentBoardId = localStorage.getItem('kanban-current-board-id');
        
        if (!this.currentBoardId || !this.savedBoards[this.currentBoardId]) {
            // Use the first board or create default
            this.currentBoardId = Object.keys(this.savedBoards)[0];
            localStorage.setItem('kanban-current-board-id', this.currentBoardId);
        }
        
        const board = this.savedBoards[this.currentBoardId];
        if (board) {
            this.currentBoardName = board.name;
            this.tasks = board.tasks || [];
            this.columns = board.columns || [
                { id: 'todo', title: 'To Do', order: 0 },
                { id: 'in-progress', title: 'In Progress', order: 1 },
                { id: 'done', title: 'Done', order: 2 }
            ];
        }
    }

    saveBoardsToStorage() {
        localStorage.setItem('kanban-saved-boards', JSON.stringify(this.savedBoards));
    }

    saveCurrentBoard() {
        if (!this.currentBoardId) {
            // Create a new board ID if we don't have one
            this.currentBoardId = this.generateBoardId(this.currentBoardName);
            localStorage.setItem('kanban-current-board-id', this.currentBoardId);
        }
        
        // Check if name changed and we need a new ID
        const currentBoard = this.savedBoards[this.currentBoardId];
        if (currentBoard && currentBoard.name !== this.currentBoardName) {
            // Board name changed, update the board data
            currentBoard.name = this.currentBoardName;
        }
        
        const boardData = {
            id: this.currentBoardId,
            name: this.currentBoardName,
            tasks: this.tasks,
            columns: this.columns,
            lastModified: new Date().toISOString(),
            createdAt: currentBoard?.createdAt || new Date().toISOString()
        };
        
        this.savedBoards[this.currentBoardId] = boardData;
        this.saveBoardsToStorage();
    }

    loadBoard(boardId) {
        const board = this.savedBoards[boardId];
        if (board) {
            this.currentBoardId = boardId;
            this.currentBoardName = board.name;
            this.tasks = board.tasks || [];
            this.columns = board.columns || [
                { id: 'todo', title: 'To Do', order: 0 },
                { id: 'in-progress', title: 'In Progress', order: 1 },
                { id: 'done', title: 'Done', order: 2 }
            ];
            
            // Update current board ID in storage
            localStorage.setItem('kanban-current-board-id', boardId);
            
            // Update UI
            document.getElementById('board-name').value = this.currentBoardName;
            this.renderBoard();
            this.showToast(`Loaded board: ${board.name}`, 'success');
        }
    }

    openBoardManager() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('board-manager-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'board-manager-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content modal-compact">
                    <div class="modal-header">
                        <h2 class="modal-title">My Boards</h2>
                        <button class="modal-close" onclick="kanban.closeBoardManager()">×</button>
                    </div>
                    <div class="board-manager-compact">
                        <div class="board-actions-row">
                            <button class="btn btn-sm" onclick="kanban.createNewBoard()">➕ New Board</button>
                            <button class="btn btn-sm btn-secondary" onclick="kanban.duplicateCurrentBoard()">📑 Duplicate</button>
                        </div>
                        
                        <div class="boards-list-compact">
                            <div class="board-item-compact current-board">
                                <div class="board-item-left">
                                    <span class="board-status">●</span>
                                    <span class="board-name">${this.escapeHtml(this.currentBoardName)}</span>
                                    <span class="board-badge">Current</span>
                                </div>
                                <div class="board-item-right">
                                    <span class="board-stats">${this.tasks.length}T/${this.columns.length}C</span>
                                    <span class="board-save-status">${this.getCompactSaveInfo()}</span>
                                </div>
                            </div>
                            
                            <div class="boards-divider"></div>
                            
                            <div id="saved-boards-list-compact">
                                ${this.renderCompactBoardsList()}
                            </div>
                        </div>
                        
                        <div class="board-manager-footer">
                            <small class="footer-note">💡 Auto-saves every 5 minutes</small>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            // Update existing modal content
            const currentBoardName = modal.querySelector('.current-board .board-name');
            const currentBoardStats = modal.querySelector('.current-board .board-stats');
            const currentBoardSaveStatus = modal.querySelector('.current-board .board-save-status');
            const savedBoardsList = modal.querySelector('#saved-boards-list-compact');
            
            if (currentBoardName) currentBoardName.textContent = this.currentBoardName;
            if (currentBoardStats) currentBoardStats.textContent = `${this.tasks.length}T/${this.columns.length}C`;
            if (currentBoardSaveStatus) currentBoardSaveStatus.textContent = this.getCompactSaveInfo();
            if (savedBoardsList) savedBoardsList.innerHTML = this.renderCompactBoardsList();
        }

        modal.classList.add('show');
    }

    renderSavedBoardsList() {
        const boardIds = Object.keys(this.savedBoards).filter(id => id !== this.currentBoardId);
        
        if (boardIds.length === 0) {
            return '<div class="empty-state">No other boards saved yet</div>';
        }

        return boardIds.map(boardId => {
            const board = this.savedBoards[boardId];
            const taskCount = board.tasks ? board.tasks.length : 0;
            const columnCount = board.columns ? board.columns.length : 3;
            const lastModified = board.lastModified ? new Date(board.lastModified).toLocaleDateString() : 'Unknown';
            
            return `
                <div class="board-item">
                    <div class="board-main">
                        <span class="board-name">${this.escapeHtml(board.name)}</span>
                        <span class="board-info">${taskCount} tasks, ${columnCount} columns</span>
                        <span class="board-date">Modified: ${lastModified}</span>
                    </div>
                    <div class="board-actions">
                        <button class="btn btn-secondary" onclick="kanban.switchToBoard('${boardId}')" title="Load Board">📂</button>
                        <button class="btn btn-secondary" onclick="kanban.deleteBoard('${boardId}')" title="Delete Board">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderCompactBoardsList() {
        const boardIds = Object.keys(this.savedBoards).filter(id => id !== this.currentBoardId);
        
        if (boardIds.length === 0) {
            return '<div class="empty-state-compact">No other boards saved</div>';
        }

        return boardIds.map(boardId => {
            const board = this.savedBoards[boardId];
            const taskCount = board.tasks ? board.tasks.length : 0;
            const columnCount = board.columns ? board.columns.length : 3;
            
            return `
                <div class="board-item-compact">
                    <div class="board-item-left">
                        <span class="board-name">${this.escapeHtml(board.name)}</span>
                    </div>
                    <div class="board-item-right">
                        <span class="board-stats">${taskCount}T/${columnCount}C</span>
                        <button class="btn-compact" onclick="kanban.switchToBoard('${boardId}')" title="Load">📂</button>
                        <button class="btn-compact btn-danger" onclick="kanban.deleteBoard('${boardId}')" title="Delete">×</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getCompactSaveInfo() {
        const board = this.savedBoards[this.currentBoardId];
        if (!board || !board.lastModified) return 'Not saved';
        
        const now = new Date();
        const lastSave = new Date(board.lastModified);
        const diffMs = now - lastSave;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return '✓ Saved';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    }

    closeBoardManager() {
        const modal = document.getElementById('board-manager-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    createNewBoard() {
        this.showInputDialog('New Board', 'Enter a name for the new board:', 'Untitled Board', (newName) => {
            if (newName && newName.trim()) {
                const boardName = newName.trim();
            
            // Save current board first
            this.saveCurrentBoard();
            
            // Create new board with unique ID
            const newBoardId = this.generateBoardId(boardName);
            this.currentBoardId = newBoardId;
            this.currentBoardName = boardName;
            this.tasks = [];
            this.columns = [
                { id: 'todo', title: 'To Do', order: 0 },
                { id: 'in-progress', title: 'In Progress', order: 1 },
                { id: 'done', title: 'Done', order: 2 }
            ];
            
            // Save the new board
            this.saveCurrentBoard();
            localStorage.setItem('kanban-current-board-id', newBoardId);
            
                // Update UI
                document.getElementById('board-name').value = this.currentBoardName;
                this.renderBoard();
                this.closeBoardManager();
                this.showToast(`Created new board: ${boardName}`, 'success');
            }
        });
    }

    duplicateCurrentBoard() {
        this.showInputDialog('Duplicate Board', 'Enter a name for the duplicated board:', this.currentBoardName + ' Copy', (newName) => {
            if (newName && newName.trim()) {
                const boardName = newName.trim();
                const newBoardId = this.generateBoardId(boardName);
            
                const duplicatedBoard = {
                    id: newBoardId,
                    name: boardName,
                    tasks: JSON.parse(JSON.stringify(this.tasks)),
                    columns: JSON.parse(JSON.stringify(this.columns)),
                    lastModified: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                };
                
                this.savedBoards[newBoardId] = duplicatedBoard;
                this.saveBoardsToStorage();
                this.closeBoardManager();
                this.showToast(`Duplicated board: ${boardName}`, 'success');
            }
        });
    }

    switchToBoard(boardId) {
        const targetBoard = this.savedBoards[boardId];
        if (!targetBoard) return;
        
        if (this.tasks.length > 0) {
            this.showConfirmDialog('Switch Board', `Switch to "${targetBoard.name}"?\n\nYour current board will be saved automatically.`, (confirmed) => {
                if (confirmed) {
                    this.performBoardSwitch(boardId);
                }
            });
        } else {
            this.performBoardSwitch(boardId);
        }
    }

    performBoardSwitch(boardId) {
        const targetBoard = this.savedBoards[boardId];
        if (!targetBoard) return;
        
        // Save current board
        this.saveCurrentBoard();
        
        // Load new board
        this.loadBoard(boardId);
        this.closeBoardManager();
    }

    deleteBoard(boardId) {
        const board = this.savedBoards[boardId];
        if (!board) return;
        
        // Don't delete the current board
        if (boardId === this.currentBoardId) {
            this.showToast('Cannot delete the current board', 'error');
            return;
        }
        
        this.showConfirmDialog('Delete Board', `Are you sure you want to delete the board "${board.name}"?\n\nThis action cannot be undone.`, (confirmed) => {
            if (confirmed) {
                delete this.savedBoards[boardId];
                this.saveBoardsToStorage();
                
                // Refresh the modal
                const modal = document.getElementById('board-manager-modal');
                if (modal && modal.classList.contains('show')) {
                    this.openBoardManager();
                }
                
                this.showToast(`Deleted board: ${board.name}`, 'info');
            }
        });
    }

    // Column Management
    // Columns are now saved with boards, these are deprecated
    loadColumnsFromStorage() {
        // Deprecated - columns are loaded with boards
    }

    saveColumnsToStorage() {
        // Deprecated - columns are saved with boards
        // Just save the current board instead
        this.saveCurrentBoard();
    }

    openColumnModal(columnId = null) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('column-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'column-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title" id="column-modal-title">New Column</h2>
                    </div>
                    <form id="column-form" onsubmit="kanban.saveColumn(event)">
                        <div class="form-group">
                            <label class="form-label" for="column-title">Column Title</label>
                            <input type="text" class="form-input" id="column-title" required maxlength="50" placeholder="e.g., In Review">
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="kanban.closeColumnModal()">Cancel</button>
                            <button type="submit" class="btn">Save Column</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
        }

        this.currentColumnId = columnId;
        const title = document.getElementById('column-modal-title');
        const form = document.getElementById('column-form');

        if (columnId) {
            const column = this.columns.find(c => c.id === columnId);
            if (column) {
                title.textContent = 'Edit Column';
                document.getElementById('column-title').value = column.title;
            }
        } else {
            title.textContent = 'New Column';
            form.reset();
        }

        modal.classList.add('show');
    }

    closeColumnModal() {
        const modal = document.getElementById('column-modal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.currentColumnId = null;
    }

    saveColumn(event) {
        event.preventDefault();
        
        const title = document.getElementById('column-title').value.trim();
        if (!title) return;

        if (this.currentColumnId) {
            // Edit existing column
            const column = this.columns.find(c => c.id === this.currentColumnId);
            if (column) {
                column.title = title;
            }
        } else {
            // Add new column
            const newColumn = {
                id: 'col-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                title: title,
                order: this.columns.length
            };
            this.columns.push(newColumn);
        }

        this.saveColumnsToStorage();
        this.renderBoard();
        this.closeColumnModal();
        this.showToast(this.currentColumnId ? 'Column updated' : 'Column created', 'success');
    }

    editColumn(columnId) {
        this.openColumnModal(columnId);
    }

    deleteColumn(columnId) {
        // Don't allow deleting if it's the only column
        if (this.columns.length <= 1) {
            this.showToast('Cannot delete the last column', 'error');
            return;
        }

        const column = this.columns.find(c => c.id === columnId);
        if (!column) return;

        const tasksInColumn = this.tasks.filter(t => t.column === columnId);
        
        let confirmMessage = `Are you sure you want to delete the "${column.title}" column?`;
        if (tasksInColumn.length > 0) {
            confirmMessage += `\n\nThis column contains ${tasksInColumn.length} task(s). They will be moved to the first column.`;
        }

        this.showConfirmDialog('Delete Column', confirmMessage, (confirmed) => {
            if (confirmed) {
                // Move tasks to the first column
                if (tasksInColumn.length > 0) {
                    const firstColumn = this.columns.find(c => c.id !== columnId);
                    tasksInColumn.forEach(task => {
                        task.column = firstColumn.id;
                    });
                }

                // Remove column
                this.columns = this.columns.filter(c => c.id !== columnId);
            
            // Reorder remaining columns
            this.columns.forEach((col, index) => {
                col.order = index;
            });

                this.saveColumnsToStorage();
                this.saveToStorage();
                this.renderBoard();
                this.showToast('Column deleted', 'info');
            }
        });
    }

    // Storage Management
    saveToStorage() {
        // Now just saves to the current board in savedBoards
        this.saveCurrentBoard();
        this.showToast('Board saved', 'success');
    }
    
    getLastSaveInfo() {
        if (!this.currentBoardId || !this.savedBoards[this.currentBoardId]) {
            return 'Not saved yet';
        }
        
        const board = this.savedBoards[this.currentBoardId];
        const lastSave = board.lastModified;
        if (!lastSave) {
            return 'Not saved yet';
        }
        
        const saveDate = new Date(lastSave);
        const now = new Date();
        const diffMs = now - saveDate;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffSecs < 60) {
            return 'Saved just now';
        } else if (diffMins < 60) {
            return `Saved ${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        } else if (diffHours < 24) {
            return `Saved ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        } else {
            return `Saved ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        }
    }

    loadFromStorage() {
        // Legacy method - now redirects to loadCurrentBoard
        // Kept for compatibility but uses new system
        this.loadCurrentBoard();
        this.renderBoard();
        return true;
    }

    clearBoard() {
        this.showConfirmDialog('Clear Board', 'Are you sure you want to clear all tasks? This cannot be undone.', (confirmed) => {
            if (confirmed) {
                this.tasks = [];
                this.saveCurrentBoard();
                this.renderBoard();
                this.showToast('Board cleared', 'info');
            }
        });
    }

    // URL Sharing
    loadFromUrl() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            try {
                const decoded = decodeURIComponent(atob(hash));
                const data = JSON.parse(decoded);
                
                // Handle both old format (tasks only) and new format (complete board)
                if (data.version === '2.0' || data.name || data.columns) {
                    // New format with complete board data
                    this.currentBoardName = data.name || 'Shared Board';
                    this.tasks = data.tasks || [];
                    this.columns = data.columns || [
                        { id: 'todo', title: 'To Do', order: 0 },
                        { id: 'in-progress', title: 'In Progress', order: 1 },
                        { id: 'done', title: 'Done', order: 2 }
                    ];
                    
                    // Update board name in UI
                    const boardNameInput = document.getElementById('board-name');
                    if (boardNameInput) {
                        boardNameInput.value = this.currentBoardName;
                    }
                } else {
                    // Legacy format - just tasks
                    this.tasks = data.tasks || [];
                }
                
                this.renderBoard();
                this.showToast('Board loaded from shared link', 'success');
                // Clear the hash after loading
                window.history.replaceState(null, null, window.location.pathname);
                return true;
            } catch (e) {
                console.error('Failed to load from URL:', e);
                this.showToast('Invalid share link', 'error');
            }
        }
        return false;
    }

    shareBoard() {
        // Feature temporarily disabled - show coming soon message
        this.showToast('Share via link coming soon! Stay tuned.', 'info');
    }

    async copyShareLink() {
        const input = document.getElementById('share-link');
        const url = input.value;
        
        try {
            // Modern clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
                this.showToast('Link copied to clipboard!', 'success');
            } else {
                // Fallback for older browsers
                input.select();
                input.setSelectionRange(0, 99999);
                document.execCommand('copy');
                this.showToast('Link copied to clipboard!', 'success');
            }
        } catch (e) {
            console.error('Copy failed:', e);
            this.showToast('Failed to copy link', 'error');
        }
    }

    closeShareModal() {
        document.getElementById('share-modal').classList.remove('show');
    }

    // Import/Export
    exportBoard() {
        const data = {
            // Board metadata
            name: this.currentBoardName,
            boardId: this.currentBoardName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            
            // Board content
            tasks: this.tasks,
            columns: this.columns,
            
            // Export metadata
            exportDate: new Date().toISOString(),
            version: '2.0',
            
            // User preferences (optional)
            preferences: {
                theme: this.currentTheme,
                density: this.currentDensity
            },
            
            // Statistics
            stats: {
                taskCount: this.tasks.length,
                columnCount: this.columns.length,
                completedTasks: this.tasks.filter(t => {
                    const columnTitle = this.columns.find(c => c.id === t.column)?.title.toLowerCase() || '';
                    return columnTitle.includes('done') || columnTitle.includes('complete') || t.progress === 100;
                }).length
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Use board name in filename, sanitized for file system
        const safeBoardName = this.currentBoardName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
        const dateString = new Date().toISOString().split('T')[0];
        a.download = `${safeBoardName}-${dateString}.json`;
        
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast(`Board "${this.currentBoardName}" exported successfully`, 'success');
    }

    importBoard() {
        document.getElementById('import-input').click();
    }

    handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Check if it's a valid board export
                if (!data.tasks || !Array.isArray(data.tasks)) {
                    throw new Error('Invalid file format - missing tasks array');
                }

                // Determine export version and handle accordingly
                const version = data.version || '1.0';
                let importedBoardName = 'Imported Board';
                let importedColumns = [];
                let importedTasks = [];
                let preferences = null;

                if (version === '2.0') {
                    // New format with full board data
                    importedBoardName = data.name || 'Imported Board';
                    importedColumns = data.columns || [];
                    importedTasks = data.tasks;
                    preferences = data.preferences;
                } else {
                    // Legacy format (v1.0) - only tasks
                    importedTasks = data.tasks;
                    importedColumns = [
                        { id: 'todo', title: 'To Do', order: 0 },
                        { id: 'in-progress', title: 'In Progress', order: 1 },
                        { id: 'done', title: 'Done', order: 2 }
                    ];
                }

                // Validate imported tasks
                importedTasks = importedTasks.filter(task => 
                    task && typeof task === 'object' && task.id && task.title
                );

                // Validate imported columns
                if (importedColumns.length === 0) {
                    importedColumns = [
                        { id: 'todo', title: 'To Do', order: 0 },
                        { id: 'in-progress', title: 'In Progress', order: 1 },
                        { id: 'done', title: 'Done', order: 2 }
                    ];
                }

                // Ask user what to do with the import
                const options = [
                    'Replace current board',
                    'Import as new board',
                    'Cancel import'
                ];

                this.showChoiceDialog(
                    'Import Board',
                    `Import "${importedBoardName}"?\n\nFound ${importedTasks.length} tasks and ${importedColumns.length} columns.\n\nWhat would you like to do?`,
                    options,
                    (choice) => {

                if (choice === 0) {
                    // Replace current board
                    this.currentBoardName = importedBoardName;
                    this.tasks = importedTasks;
                    this.columns = importedColumns;
                    
                    // Apply preferences if available
                    if (preferences) {
                        if (preferences.theme && ['white', 'grey', 'black'].includes(preferences.theme)) {
                            this.changeTheme(preferences.theme);
                            this.updateThemeButton();
                        }
                        if (preferences.density && ['comfortable', 'compact', 'dense'].includes(preferences.density)) {
                            this.changeDensity(preferences.density);
                            this.updateDensityButton();
                        }
                    }
                    
                    // Update UI
                    document.getElementById('board-name').value = this.currentBoardName;
                    this.renderBoard();
                    this.saveCurrentBoard();
                    this.saveColumnsToStorage();
                    this.saveToStorage();
                    this.showToast(`Board replaced with "${importedBoardName}"`, 'success');
                    
                } else if (choice === 1) {
                    // Import as new board
                    let newBoardName = importedBoardName;
                    
                    // Ensure unique name
                    let counter = 1;
                    while (this.savedBoards[newBoardName]) {
                        newBoardName = `${importedBoardName} (${counter})`;
                        counter++;
                    }
                    
                    // Save current board first
                    this.saveCurrentBoard();
                    
                    // Create new board with imported data
                    const newBoard = {
                        name: newBoardName,
                        tasks: importedTasks,
                        columns: importedColumns,
                        lastModified: new Date().toISOString()
                    };
                    
                    this.savedBoards[newBoardName] = newBoard;
                    this.saveBoardsToStorage();
                    
                    this.showToast(`Board imported as "${newBoardName}"`, 'success');
                } else {
                    // Cancel import
                    this.showToast('Import cancelled', 'info');
                }
                    });

            } catch (error) {
                console.error('Import failed:', error);
                this.showToast(`Failed to import board: ${error.message}`, 'error');
            }
        };
        reader.readAsText(file);
        
        // Reset the input
        event.target.value = '';
    }

    // Custom choice dialog to replace askUserChoice
    showChoiceDialog(title, message, options, callback) {
        let dialog = document.getElementById('choice-dialog');
        if (!dialog) {
            dialog = document.createElement('div');
            dialog.id = 'choice-dialog';
            dialog.className = 'modal';
            dialog.innerHTML = `
                <div class="modal-content modal-small">
                    <div class="modal-header">
                        <h2 class="modal-title" id="choice-dialog-title"></h2>
                        <button class="modal-close" onclick="kanban.closeChoiceDialog()">×</button>
                    </div>
                    <div class="modal-body">
                        <p id="choice-dialog-message"></p>
                        <div id="choice-dialog-options" class="choice-options"></div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="kanban.closeChoiceDialog()">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(dialog);
        }
        
        document.getElementById('choice-dialog-title').textContent = title;
        document.getElementById('choice-dialog-message').textContent = message;
        
        const optionsContainer = document.getElementById('choice-dialog-options');
        optionsContainer.innerHTML = options.map((option, index) => 
            `<button class="btn choice-btn" onclick="kanban.selectChoice(${index})">${option}</button>`
        ).join('');
        
        this.choiceDialogCallback = callback;
        dialog.classList.add('show');
    }
    
    closeChoiceDialog() {
        const dialog = document.getElementById('choice-dialog');
        if (dialog) {
            dialog.classList.remove('show');
            this.choiceDialogCallback = null;
        }
    }
    
    selectChoice(index) {
        if (this.choiceDialogCallback) {
            this.choiceDialogCallback(index);
        }
        this.closeChoiceDialog();
    }

    // Task Management
    openTaskModal(column, taskId = null) {
        this.currentColumn = column;
        this.currentTaskId = taskId;
        
        const modal = document.getElementById('task-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('task-form');
        
        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                title.textContent = 'Edit Task';
                this.populateTaskForm(task);
            }
        } else {
            title.textContent = 'New Task';
            form.reset();
            // Reset slider displays
            document.getElementById('task-difficulty').nextElementSibling.textContent = '3 / 5';
            document.getElementById('task-progress').nextElementSibling.textContent = '0%';
            document.getElementById('task-fun').nextElementSibling.textContent = '3 / 5';
            document.getElementById('task-monetization').nextElementSibling.textContent = '3 / 5';
            // Reset color to default
            document.getElementById('task-color').value = '#3b82f6';
            this.updateColorPickerSelection('#3b82f6');
        }
        
        modal.classList.add('show');
    }

    populateTaskForm(task) {
        document.getElementById('task-title').value = task.title || '';
        document.getElementById('task-description').value = task.description || '';
        
        const difficultySlider = document.getElementById('task-difficulty');
        const progressSlider = document.getElementById('task-progress');
        const funSlider = document.getElementById('task-fun');
        const monetizationSlider = document.getElementById('task-monetization');
        
        difficultySlider.value = task.difficulty || 3;
        progressSlider.value = task.progress || 0;
        funSlider.value = task.funFactor || 3;
        monetizationSlider.value = task.monetization || 3;
        
        // Update displays
        difficultySlider.nextElementSibling.textContent = `${task.difficulty || 3} / 5`;
        progressSlider.nextElementSibling.textContent = `${task.progress || 0}%`;
        funSlider.nextElementSibling.textContent = `${task.funFactor || 3} / 5`;
        monetizationSlider.nextElementSibling.textContent = `${task.monetization || 3} / 5`;
        
        document.getElementById('task-priority').value = task.priority || 'medium';
        document.getElementById('task-time').value = task.timeEstimate || '';
        document.getElementById('task-categories').value = (task.categories || []).join(', ');
        
        // Set task color
        const color = task.color || '#3b82f6';
        document.getElementById('task-color').value = color;
        this.updateColorPickerSelection(color);
    }

    setStarRating(rating) {
        document.getElementById('task-fun').value = rating;
        document.querySelectorAll('.star').forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });
    }

    setMoneyRating(rating) {
        document.getElementById('task-monetization').value = rating;
        document.querySelectorAll('.money').forEach((money, index) => {
            money.classList.toggle('active', index < rating);
        });
    }

    closeTaskModal() {
        document.getElementById('task-modal').classList.remove('show');
        this.currentTaskId = null;
    }

    saveTask(event) {
        event.preventDefault();
        
        const taskData = {
            id: this.currentTaskId || 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-description').value,
            column: this.currentColumn,
            difficulty: parseInt(document.getElementById('task-difficulty').value),
            progress: parseInt(document.getElementById('task-progress').value),
            priority: document.getElementById('task-priority').value,
            funFactor: parseInt(document.getElementById('task-fun').value),
            monetization: parseInt(document.getElementById('task-monetization').value),
            timeEstimate: document.getElementById('task-time').value,
            categories: document.getElementById('task-categories').value
                .split(',')
                .map(c => c.trim())
                .filter(c => c),
            color: document.getElementById('task-color').value || '#3b82f6',
            createdAt: this.currentTaskId ? 
                (this.tasks.find(t => t.id === this.currentTaskId)?.createdAt || new Date().toISOString()) : 
                new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (this.currentTaskId) {
            const index = this.tasks.findIndex(t => t.id === this.currentTaskId);
            if (index !== -1) {
                // Preserve the column if editing
                taskData.column = this.tasks[index].column;
                this.tasks[index] = taskData;
            }
        } else {
            this.tasks.push(taskData);
        }
        
        const isEditing = this.currentTaskId !== null;
        
        this.renderBoard();
        this.saveToStorage();
        this.closeTaskModal();
        this.showToast(isEditing ? 'Task updated' : 'Task created', 'success');
    }

    deleteTask(taskId) {
        this.showConfirmDialog('Delete Task', 'Are you sure you want to delete this task?', (confirmed) => {
            if (confirmed) {
                this.tasks = this.tasks.filter(t => t.id !== taskId);
                this.renderBoard();
                this.saveToStorage();
                this.showToast('Task deleted', 'info');
            }
        });
    }

    moveTask(taskId, newColumn) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.column !== newColumn) {
            const oldColumn = task.column;
            task.column = newColumn;
            task.updatedAt = new Date().toISOString();
            
            // Auto-update progress based on column name patterns
            const newColumnTitle = this.columns.find(c => c.id === newColumn)?.title.toLowerCase() || '';
            const oldColumnTitle = this.columns.find(c => c.id === oldColumn)?.title.toLowerCase() || '';
            
            // If moving to a "done" column, complete the task
            if ((newColumnTitle.includes('done') || newColumnTitle.includes('complete')) && task.progress < 100) {
                task.progress = 100;
            }
            // If moving from a "done" column to an active column, set partial progress
            else if (oldColumnTitle.includes('done') || oldColumnTitle.includes('complete')) {
                task.progress = Math.max(task.progress - 10, 0);
            }
            // If moving to an "in progress" column from todo, set partial progress
            else if ((newColumnTitle.includes('progress') || newColumnTitle.includes('doing')) && task.progress === 0) {
                task.progress = 25;
            }
            
            this.renderBoard();
            this.saveToStorage();
            this.showToast(`Task moved to ${this.columns.find(c => c.id === newColumn)?.title}`, 'success');
        }
    }

    // Search
    openSearch() {
        document.getElementById('search-modal').classList.add('show');
        document.getElementById('search-input').focus();
    }

    closeSearchModal() {
        document.getElementById('search-modal').classList.remove('show');
        document.getElementById('search-input').value = '';
        document.getElementById('search-results').innerHTML = '';
    }

    searchTasks(term) {
        this.searchTerm = term.toLowerCase();
        const results = document.getElementById('search-results');
        
        if (!term) {
            results.innerHTML = '';
            return;
        }
        
        const matches = this.tasks.filter(task => 
            task.title.toLowerCase().includes(this.searchTerm) ||
            task.description.toLowerCase().includes(this.searchTerm) ||
            task.categories.some(cat => cat.toLowerCase().includes(this.searchTerm))
        );
        
        if (matches.length === 0) {
            results.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No tasks found</p>';
            return;
        }
        
        results.innerHTML = matches.map(task => `
            <div class="search-result" onclick="kanban.highlightTask('${task.id}')">
                <div style="font-weight: 600;">${task.title}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">
                    ${task.column.replace('-', ' ').toUpperCase()} • Priority: ${task.priority}
                </div>
            </div>
        `).join('');
    }

    highlightTask(taskId) {
        this.closeSearchModal();
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            taskElement.style.animation = 'pulse 2s';
            setTimeout(() => {
                taskElement.style.animation = '';
            }, 2000);
        }
    }

    // Rendering
    renderBoard() {
        const boardContainer = document.querySelector('.board');
        if (!boardContainer) return;
        
        // Clear existing content
        boardContainer.innerHTML = '';
        
        // Sort columns by order
        const sortedColumns = [...this.columns].sort((a, b) => a.order - b.order);
        
        // Render each column
        sortedColumns.forEach((column, index) => {
            const tasks = this.tasks.filter(t => t.column === column.id);
            const canMoveLeft = index > 0;
            const canMoveRight = index < sortedColumns.length - 1;
            
            const columnElement = document.createElement('div');
            columnElement.className = 'column';
            columnElement.setAttribute('data-column', column.id);
            
            columnElement.innerHTML = `
                <div class="column-header">
                    <div class="column-title">${this.escapeHtml(column.title)}</div>
                    <div class="column-menu-container">
                        <button class="btn btn-secondary btn-icon column-menu-btn" onclick="kanban.toggleColumnMenu('${column.id}')" title="Column Options">⋯</button>
                        <div class="column-menu" id="menu-${column.id}">
                            <button class="column-menu-item" onclick="kanban.moveColumnLeft('${column.id}'); kanban.closeColumnMenus();" ${!canMoveLeft ? 'disabled' : ''}>
                                <span class="menu-icon">←</span> Move Left
                            </button>
                            <button class="column-menu-item" onclick="kanban.moveColumnRight('${column.id}'); kanban.closeColumnMenus();" ${!canMoveRight ? 'disabled' : ''}>
                                <span class="menu-icon">→</span> Move Right
                            </button>
                            <button class="column-menu-item" onclick="kanban.editColumn('${column.id}'); kanban.closeColumnMenus();">
                                <span class="menu-icon">✎</span> Edit
                            </button>
                            <button class="column-menu-item danger" onclick="kanban.deleteColumn('${column.id}'); kanban.closeColumnMenus();">
                                <span class="menu-icon">×</span> Delete
                            </button>
                        </div>
                    </div>
                </div>
                <div class="tasks-container" ondrop="kanban.drop(event)" ondragover="kanban.allowDrop(event)">
                    ${tasks
                        .sort((a, b) => {
                            // Sort by priority first, then by creation date
                            const priorityOrder = { high: 0, medium: 1, low: 2 };
                            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                                return priorityOrder[a.priority] - priorityOrder[b.priority];
                            }
                            return new Date(b.createdAt) - new Date(a.createdAt);
                        })
                        .map(task => this.renderTaskCard(task))
                        .join('')}
                    <button class="add-task-btn" onclick="kanban.openTaskModal('${column.id}')">
                        + Add task
                    </button>
                </div>
            `;
            
            boardContainer.appendChild(columnElement);
        });
        
        // Add "Add Column" button at the end
        const addColumnElement = document.createElement('div');
        addColumnElement.className = 'column add-column-container';
        addColumnElement.innerHTML = `
            <button class="add-column-btn" onclick="kanban.openColumnModal()">
                + Add Column
            </button>
        `;
        boardContainer.appendChild(addColumnElement);
        
        // Reinitialize touch support for new cards
        if ('ontouchstart' in window) {
            this.initializeTouchSupport();
        }
    }

    renderTaskCard(task) {
        const color = task.color || '#3b82f6';
        return `
            <div class="task-card" draggable="true" data-task-id="${task.id}" 
                 style="border-left: 4px solid ${color}; background: linear-gradient(90deg, ${color}15 0%, transparent 40%);"
                 ondragstart="kanban.drag(event)" ondragend="kanban.dragEnd(event)">
                <div class="task-header">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    <div class="task-actions">
                        <button class="task-action-btn" onclick="kanban.openTaskModal('${task.column}', '${task.id}')" title="Edit">✎</button>
                        <button class="task-action-btn" onclick="kanban.deleteTask('${task.id}')" title="Delete">×</button>
                    </div>
                </div>
                
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                
                <div class="task-metrics">
                    <div class="metric-item">
                        <span class="metric-label">Difficulty</span>
                        <span class="metric-value">${task.difficulty}/5</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Priority</span>
                        <span class="priority-badge priority-${task.priority}">${task.priority === 'medium' ? 'MED' : task.priority.toUpperCase()}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Fun</span>
                        <span class="metric-value">${task.funFactor}/5</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Money</span>
                        <span class="metric-value">${task.monetization}/5</span>
                    </div>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${task.progress}%"></div>
                </div>
                
                <div class="task-dense-info">
                    <span class="priority-badge priority-${task.priority}">${task.priority.substr(0,1).toUpperCase()}</span>
                    <span class="progress-indicator">${task.progress}%</span>
                </div>
                
                ${task.categories && task.categories.length > 0 ? `
                    <div class="task-tags">
                        ${(Array.isArray(task.categories) ? task.categories : task.categories.split(',').map(c => c.trim()).filter(c => c)).map(cat =>
                            `<span class="tag">${this.escapeHtml(cat)}</span>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Drag and Drop
    drag(event) {
        this.draggedElement = event.target;
        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target.innerHTML);
    }

    dragEnd(event) {
        event.target.classList.remove('dragging');
    }

    allowDrop(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        const dropZone = event.target.closest('.tasks-container');
        if (dropZone) {
            dropZone.classList.add('drag-over');
        }
    }

    drop(event) {
        event.preventDefault();
        const dropZone = event.target.closest('.tasks-container');
        
        if (dropZone) {
            dropZone.classList.remove('drag-over');
            
            const column = dropZone.closest('.column').dataset.column;
            const taskId = this.draggedElement.dataset.taskId;
            
            if (taskId && column) {
                this.moveTask(taskId, column);
            }
        }
    }

    // Utilities
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }
    
    // Custom Dialog System to replace browser prompts/confirms
    showInputDialog(title, message, defaultValue = '', callback) {
        let dialog = document.getElementById('input-dialog');
        if (!dialog) {
            dialog = document.createElement('div');
            dialog.id = 'input-dialog';
            dialog.className = 'modal';
            dialog.innerHTML = `
                <div class="modal-content modal-small">
                    <div class="modal-header">
                        <h2 class="modal-title" id="input-dialog-title"></h2>
                        <button class="modal-close" onclick="kanban.closeInputDialog()">×</button>
                    </div>
                    <div class="modal-body">
                        <p id="input-dialog-message"></p>
                        <input type="text" class="form-input" id="input-dialog-input" maxlength="100">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="kanban.closeInputDialog()">Cancel</button>
                        <button type="button" class="btn" onclick="kanban.submitInputDialog()">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(dialog);
        }
        
        document.getElementById('input-dialog-title').textContent = title;
        document.getElementById('input-dialog-message').textContent = message;
        const input = document.getElementById('input-dialog-input');
        input.value = defaultValue;
        
        this.inputDialogCallback = callback;
        dialog.classList.add('show');
        
        // Focus and select input
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);
        
        // Handle enter key
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                this.submitInputDialog();
            }
        };
    }
    
    closeInputDialog() {
        const dialog = document.getElementById('input-dialog');
        if (dialog) {
            dialog.classList.remove('show');
            this.inputDialogCallback = null;
        }
    }
    
    submitInputDialog() {
        const value = document.getElementById('input-dialog-input').value;
        if (this.inputDialogCallback) {
            this.inputDialogCallback(value);
        }
        this.closeInputDialog();
    }
    
    showConfirmDialog(title, message, callback) {
        let dialog = document.getElementById('confirm-dialog');
        if (!dialog) {
            dialog = document.createElement('div');
            dialog.id = 'confirm-dialog';
            dialog.className = 'modal';
            dialog.innerHTML = `
                <div class="modal-content modal-small">
                    <div class="modal-header">
                        <h2 class="modal-title" id="confirm-dialog-title"></h2>
                        <button class="modal-close" onclick="kanban.closeConfirmDialog()">×</button>
                    </div>
                    <div class="modal-body">
                        <p id="confirm-dialog-message"></p>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="kanban.closeConfirmDialog()">Cancel</button>
                        <button type="button" class="btn btn-danger" onclick="kanban.submitConfirmDialog()">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(dialog);
        }
        
        document.getElementById('confirm-dialog-title').textContent = title;
        document.getElementById('confirm-dialog-message').textContent = message;
        
        this.confirmDialogCallback = callback;
        dialog.classList.add('show');
    }
    
    closeConfirmDialog() {
        const dialog = document.getElementById('confirm-dialog');
        if (dialog) {
            dialog.classList.remove('show');
            this.confirmDialogCallback = null;
        }
    }
    
    submitConfirmDialog() {
        if (this.confirmDialogCallback) {
            this.confirmDialogCallback(true);
        }
        this.closeConfirmDialog();
    }
    
    // Color Selection Functions
    selectTaskColor(color) {
        document.getElementById('task-color').value = color;
        this.updateColorPickerSelection(color);
    }
    
    updateColorPickerSelection(color) {
        const container = document.querySelector('#task-modal .color-picker-container');
        if (!container) return;
        
        container.querySelectorAll('.color-option').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.color === color) {
                btn.classList.add('selected');
            }
        });
    }
    
    openCustomColorPicker() {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = document.getElementById('task-color').value || '#3b82f6';
        input.onchange = (e) => {
            this.selectTaskColor(e.target.value);
        };
        input.click();
    }
}

// Add pulse animation dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
`;
document.head.appendChild(style);

// Initialize the application
const kanban = new FreeKanban();