class EasyKanban {
    constructor() {
        this.tasks = [];
        this.columns = [
            { id: 'backlog', title: 'Backlog', order: 0, color: '#a855f7' },
            { id: 'todo', title: 'To Do', order: 1, color: '#ef4444' },
            { id: 'in-progress', title: 'In Progress', order: 2, color: '#eab308' },
            { id: 'done', title: 'Done', order: 3, color: '#22c55e' }
        ];
        this.currentTaskId = null;
        this.currentColumn = 'todo';
        this.drag = null;
        this.searchTerm = '';
        this.currentDensity = 'comfortable';
        this.currentBoardId = null; // Track current board ID
        this.currentBoardName = 'My Projects';
        this.savedBoards = {};
        this.currentColumnLayout = 4;
        this.currentView = 'columns';
        
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

        // Load board layout mode (vertical columns or horizontal lanes)
        this.changeView(localStorage.getItem('kanban-view') === 'lanes' ? 'lanes' : 'columns', false);

        // Load column layout preference
        const savedLayout = parseInt(localStorage.getItem('kanban-column-layout')) || 4;
        this.currentColumnLayout = savedLayout;
        this.changeColumnLayout(savedLayout);
        this.updateLayoutButton();

        // Load board data
        this.loadSavedBoards();
        
        // Load the current board or create default
        this.loadCurrentBoard();
        
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

        // Drag and drop (mouse, pen and touch share one pointer-based implementation)
        this.initializeDragAndDrop();

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
            
            card.style.display = matches ? '' : 'none';
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
            'grey': 'Dusk Theme',
            'black': 'Dark Theme'
        };
        
        if (button) {
            button.querySelector('.v').textContent = themeNames[this.currentTheme].replace(' Theme', '');
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
            button.querySelector('.v').textContent = densityNames[this.currentDensity].replace(' View', '');
            button.title = `Current: ${densityNames[this.currentDensity]} - Click to change`;
        }
    }

    // Board Layout Mode
    changeView(view, rerender = true) {
        this.currentView = view;
        document.body.setAttribute('data-view', view);
        localStorage.setItem('kanban-view', view);
        document.querySelectorAll('[data-view-btn]').forEach(btn => {
            btn.setAttribute('aria-pressed', btn.dataset.viewBtn === view ? 'true' : 'false');
        });
        this.updateLayoutButton();
        if (rerender) this.renderBoard();
    }

    goToLane(id) {
        document.body.classList.remove('rail-open');
        const el = document.getElementById(`lane-${id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: this.currentView === 'columns' ? 'nearest' : 'start', inline: 'center' });
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
        if (!button) return;
        const cols = this.currentView === 'columns';
        const names = cols ? { 3: '3 across', 4: '4 across', 5: '5 across' } : { 3: 'Wide', 4: 'Medium', 5: 'Narrow' };
        button.querySelector('.g').textContent = cols ? 'Columns shown' : 'Card size';
        button.querySelector('.v').textContent = names[this.currentColumnLayout];
        button.title = `Current: ${names[this.currentColumnLayout]} - Click to change`;
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
            this.showToast(`Stage moved ${this.currentView === 'columns' ? 'left' : 'up'}`, 'success');
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
            this.showToast(`Stage moved ${this.currentView === 'columns' ? 'right' : 'down'}`, 'success');
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
                        title: 'Kanban App Project',
                        description: 'Build Cool Kanban app with easy customization!',
                        column: 'backlog',
                        difficulty: 2,
                        progress: 0,
                        priority: 'low',
                        color: '',
                        createdAt: now,
                        updatedAt: now
                    },
                    {
                        id: 'demo-2',
                        title: 'College Assignment',
                        description: 'Deadline on 30 Sept',
                        column: 'todo',
                        difficulty: 1,
                        progress: 0,
                        priority: 'medium',
                        color: '',
                        createdAt: now,
                        updatedAt: now
                    },
                    {
                        id: 'demo-3',
                        title: 'Intern Project',
                        description: 'Debugging backend system',
                        column: 'in-progress',
                        difficulty: 3,
                        progress: 40,
                        priority: 'high',
                        color: '',
                        createdAt: now,
                        updatedAt: now
                    },
                    {
                        id: 'demo-4',
                        title: 'Capstone Project',
                        description: 'Deployed',
                        column: 'done',
                        difficulty: 4,
                        progress: 100,
                        priority: 'high',
                        color: '',
                        createdAt: now,
                        updatedAt: now
                    }
                ],
                columns: [
                    { id: 'backlog', title: 'Backlog', order: 0, color: '#a855f7' },
                    { id: 'todo', title: 'To Do', order: 1, color: '#ef4444' },
                    { id: 'in-progress', title: 'In Progress', order: 2, color: '#eab308' },
                    { id: 'done', title: 'Done', order: 3, color: '#22c55e' }
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
        setTimeout(() => this.renderRail(), 0);
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
                        <h2 class="modal-title">Manage boards</h2>
                        <button class="modal-close" onclick="kanban.closeBoardManager()">×</button>
                    </div>
                    <div class="board-manager-compact">
                        <div class="board-actions-row">
                            <button class="btn btn-sm" onclick="kanban.createNewBoard()">New board</button>
                            <button class="btn btn-sm btn-secondary" onclick="kanban.duplicateCurrentBoard()">Duplicate board</button>
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
                            <small class="footer-note">Boards auto-save every 5 minutes</small>
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
                        <button class="btn-compact" onclick="kanban.switchToBoard('${boardId}')" title="Open">Open</button>
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
                        <h2 class="modal-title" id="column-modal-title">New stage</h2>
                    </div>
                    <form id="column-form" onsubmit="kanban.saveColumn(event)">
                        <div class="form-group">
                            <label class="form-label" for="column-title">Stage name</label>
                            <input type="text" class="form-input" id="column-title" required maxlength="50" placeholder="e.g., In review">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Color</label>
                            <div class="color-picker-container">
                                <button type="button" class="color-option" data-color="" title="Default (no color)" onclick="kanban.selectColumnColor('')">
                                    <span class="color-circle no-color">✕</span>
                                </button>
                                <button type="button" class="color-option" data-color="#ef4444" title="Red" onclick="kanban.selectColumnColor('#ef4444')">
                                    <span class="color-circle" style="background: #ef4444"></span>
                                </button>
                                <button type="button" class="color-option" data-color="#f97316" title="Orange" onclick="kanban.selectColumnColor('#f97316')">
                                    <span class="color-circle" style="background: #f97316"></span>
                                </button>
                                <button type="button" class="color-option" data-color="#eab308" title="Yellow" onclick="kanban.selectColumnColor('#eab308')">
                                    <span class="color-circle" style="background: #eab308"></span>
                                </button>
                                <button type="button" class="color-option" data-color="#22c55e" title="Green" onclick="kanban.selectColumnColor('#22c55e')">
                                    <span class="color-circle" style="background: #22c55e"></span>
                                </button>
                                <button type="button" class="color-option" data-color="#3b82f6" title="Blue" onclick="kanban.selectColumnColor('#3b82f6')">
                                    <span class="color-circle" style="background: #3b82f6"></span>
                                </button>
                                <button type="button" class="color-option" data-color="#a855f7" title="Purple" onclick="kanban.selectColumnColor('#a855f7')">
                                    <span class="color-circle" style="background: #a855f7"></span>
                                </button>
                                <button type="button" class="color-option" data-color="#ec4899" title="Pink" onclick="kanban.selectColumnColor('#ec4899')">
                                    <span class="color-circle" style="background: #ec4899"></span>
                                </button>
                                <button type="button" class="color-option" data-color="#6b7280" title="Gray" onclick="kanban.selectColumnColor('#6b7280')">
                                    <span class="color-circle" style="background: #6b7280"></span>
                                </button>
                                <button type="button" class="color-option custom-color" title="Custom Color" onclick="kanban.openCustomColumnColorPicker()">
                                    <span class="color-circle custom">+</span>
                                </button>
                            </div>
                            <input type="hidden" id="column-color" value="">
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="kanban.closeColumnModal()">Cancel</button>
                            <button type="submit" class="btn">Save stage</button>
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
                title.textContent = 'Edit stage';
                document.getElementById('column-title').value = column.title;
                const color = column.color || '';
                document.getElementById('column-color').value = color;
                this.updateColumnColorPickerSelection(color);
            }
        } else {
            title.textContent = 'New stage';
            form.reset();
            document.getElementById('column-color').value = '';
            this.updateColumnColorPickerSelection('');
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
        const color = document.getElementById('column-color').value || '';

        if (this.currentColumnId) {
            // Edit existing column
            const column = this.columns.find(c => c.id === this.currentColumnId);
            if (column) {
                column.title = title;
                column.color = color;
            }
        } else {
            // Add new column
            const newColumn = {
                id: 'col-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                title: title,
                order: this.columns.length,
                color: color
            };
            this.columns.push(newColumn);
        }

        this.saveColumnsToStorage();
        this.renderBoard();
        this.closeColumnModal();
        this.showToast(this.currentColumnId ? 'Stage updated' : 'Stage created', 'success');
    }

    editColumn(columnId) {
        this.openColumnModal(columnId);
    }

    deleteColumn(columnId) {
        // Don't allow deleting if it's the only column
        if (this.columns.length <= 1) {
            this.showToast('Cannot delete the last stage', 'error');
            return;
        }

        const column = this.columns.find(c => c.id === columnId);
        if (!column) return;

        const tasksInColumn = this.tasks.filter(t => t.column === columnId);
        
        let confirmMessage = `Are you sure you want to delete the "${column.title}" stage?`;
        if (tasksInColumn.length > 0) {
            confirmMessage += `\n\nThis stage contains ${tasksInColumn.length} task(s). They will be moved to the first stage.`;
        }

        this.showConfirmDialog('Delete stage', confirmMessage, (confirmed) => {
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
                this.showToast('Stage deleted', 'info');
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
                    `Import "${importedBoardName}"?\n\nFound ${importedTasks.length} tasks and ${importedColumns.length} stages.\n\nWhat would you like to do?`,
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
            // Reset color to no color
            document.getElementById('task-color').value = '';
            this.updateColorPickerSelection('');
        }
        
        modal.classList.add('show');
    }

    populateTaskForm(task) {
        document.getElementById('task-title').value = task.title || '';
        document.getElementById('task-description').value = task.description || '';
        
        const difficultySlider = document.getElementById('task-difficulty');
        const progressSlider = document.getElementById('task-progress');
        
        difficultySlider.value = task.difficulty || 3;
        progressSlider.value = task.progress || 0;
        
        // Update displays
        difficultySlider.nextElementSibling.textContent = `${task.difficulty || 3} / 5`;
        progressSlider.nextElementSibling.textContent = `${task.progress || 0}%`;
        
        document.getElementById('task-priority').value = task.priority || 'medium';
        
        // Set task color
        const color = (task.color === undefined || task.color === null) ? '#3b82f6' : task.color;
        document.getElementById('task-color').value = color;
        this.updateColorPickerSelection(color);
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
            color: document.getElementById('task-color').value,
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
                if (this.tasks[index].order !== undefined) taskData.order = this.tasks[index].order;
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

    // Order of tasks inside one stage: manual order (set by dragging) wins;
    // tasks that were never placed manually (e.g. new ones) sit on top, by priority then newest.
    compareTasks(a, b) {
        const aSet = a.order !== undefined, bSet = b.order !== undefined;
        if (aSet && bSet && a.order !== b.order) return a.order - b.order;
        if (aSet !== bSet) return aSet ? 1 : -1;
        const rank = { high: 0, medium: 1, low: 2 };
        return (rank[a.priority] - rank[b.priority]) || (new Date(b.createdAt) - new Date(a.createdAt));
    }

    sortedTasksInColumn(columnId) {
        return this.tasks.filter(t => t.column === columnId).sort((a, b) => this.compareTasks(a, b));
    }

    moveTask(taskId, newColumn, beforeTaskId = null) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return false;
        const oldColumn = task.column;
        const changedColumn = oldColumn !== newColumn;

        // Work out the new sequence of the target stage
        const currentSeq = this.sortedTasksInColumn(newColumn);
        const seq = currentSeq.filter(t => t.id !== taskId);
        let index = beforeTaskId ? seq.findIndex(t => t.id === beforeTaskId) : -1;
        if (index < 0) index = seq.length;
        seq.splice(index, 0, task);

        if (!changedColumn && seq.every((t, i) => t.id === currentSeq[i].id)) return false; // dropped where it already was

        if (changedColumn) {
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
        }

        seq.forEach((t, i) => { t.order = i; });

        this.renderBoard();
        this.saveToStorage();
        this.showToast(changedColumn ? `Task moved to ${this.columns.find(c => c.id === newColumn)?.title}` : 'Task reordered', 'success');
        return true;
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
            (task.categories && task.categories.some(cat => cat.toLowerCase().includes(this.searchTerm)))
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
        // Keep each stage's horizontal scroll position across re-renders (no jump after a drop)
        const scrolls = {};
        boardContainer.querySelectorAll('.column').forEach(col => {
            const z = col.querySelector('.tasks-container');
            if (z && z.scrollLeft) scrolls[col.dataset.column] = z.scrollLeft;
        });
        const sorted = [...this.columns].sort((a, b) => a.order - b.order);
        const horiz = this.currentView === 'columns';
        const lanes = sorted.map((column, i) => {
            const id = column.id;
            const tasks = this.sortedTasksInColumn(id);
            return `
            <section class="column lane" id="lane-${id}" data-column="${id}" style="--c:${column.color || '#8A96AB'}">
                <div class="lane-head">
                    <div class="lane-top">
                        <span class="lane-dot"></span>
                        <h2 class="column-title">${this.escapeHtml(column.title)}</h2>
                        <div class="column-menu-container">
                            <button class="btn-icon column-menu-btn" onclick="kanban.toggleColumnMenu('${id}')" title="Stage options" aria-label="Stage options">⋯</button>
                            <div class="column-menu" id="menu-${id}">
                                <button class="column-menu-item" onclick="kanban.moveColumnLeft('${id}'); kanban.closeColumnMenus();" ${i === 0 ? 'disabled' : ''}>${horiz ? '← Move left' : '↑ Move up'}</button>
                                <button class="column-menu-item" onclick="kanban.moveColumnRight('${id}'); kanban.closeColumnMenus();" ${i === sorted.length - 1 ? 'disabled' : ''}>${horiz ? '→ Move right' : '↓ Move down'}</button>
                                <button class="column-menu-item" onclick="kanban.editColumn('${id}'); kanban.closeColumnMenus();">Rename or recolor</button>
                                <button class="column-menu-item danger" onclick="kanban.deleteColumn('${id}'); kanban.closeColumnMenus();">Delete stage</button>
                            </div>
                        </div>
                    </div>
                    <span class="lane-count">${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}</span>
                    <button class="lane-add" onclick="kanban.openTaskModal('${id}')">Add task</button>
                </div>
                <div class="tasks-container">
                    ${tasks.length ? tasks.map(t => this.renderTaskCard(t)).join('') : '<span class="empty">No tasks yet. Drop one here.</span>'}
                </div>
            </section>`;
        }).join('');
        boardContainer.innerHTML = lanes + `
            <div class="add-lane"><button class="add-column-btn" onclick="kanban.openColumnModal()">Add a stage</button></div>`;

        boardContainer.querySelectorAll('.column').forEach(col => {
            const z = col.querySelector('.tasks-container');
            if (z && scrolls[col.dataset.column]) z.scrollLeft = scrolls[col.dataset.column];
        });

        this.renderRail();
        if (this.searchTerm) this.filterTasks();
    }

    renderRail() {
        const boards = document.getElementById('rail-boards');
        const lanes = document.getElementById('rail-lanes');
        if (!boards || !lanes) return;
        boards.innerHTML = Object.keys(this.savedBoards).map(id => {
            const b = this.savedBoards[id];
            const cur = id === this.currentBoardId;
            const name = this.escapeHtml(cur ? this.currentBoardName : b.name);
            const n = cur ? this.tasks.length : (b.tasks || []).length;
            return `<button class="rail-item${cur ? ' on' : ''}" ${cur ? '' : `onclick="kanban.switchToBoard('${id}')"`}><span class="g">${name}</span><em>${n}</em></button>`;
        }).join('');
        const sorted = [...this.columns].sort((a, b) => a.order - b.order);
        lanes.innerHTML = sorted.map(c => {
            const n = this.tasks.filter(t => t.column === c.id).length;
            return `<button class="rail-item" onclick="kanban.goToLane('${c.id}')"><span class="d" style="--c:${c.color || '#8A96AB'}"></span><span class="g">${this.escapeHtml(c.title)}</span><em>${n}</em></button>`;
        }).join('');
        const done = this.tasks.filter(t => t.progress >= 100).length;
        const summary = document.getElementById('summary');
        if (summary) summary.textContent = `${this.tasks.length} tasks, ${done} finished`;
    }

    renderTaskCard(task) {
        const color = (task.color === undefined || task.color === null) ? '#3b82f6' : task.color;
        const prio = { high: 'High', medium: 'Med', low: 'Low' }[task.priority] || task.priority;
        const pips = [1, 2, 3, 4, 5].map(n => `<i class="${n <= task.difficulty ? 'f' : ''}"></i>`).join('');
        return `
            <article class="task-card${color ? ' colored' : ''}" data-task-id="${task.id}" ${color ? `style="--tc:${color}"` : ''}>
                <div class="t-main">
                    <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                    ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                </div>
                <div class="t-side">
                    <span class="t-pct">${task.progress}%</span>
                    <span class="t-actions">
                        <button onclick="kanban.openTaskModal('${task.column}', '${task.id}')" title="Edit" aria-label="Edit task">✎</button>
                        <button onclick="kanban.deleteTask('${task.id}')" title="Delete" aria-label="Delete task">×</button>
                    </span>
                </div>
                <div class="t-meta">
                    <span class="m-item m-diff"><span class="lbl">Difficulty</span><span class="pips" title="${task.difficulty} of 5">${pips}</span></span>
                    <span class="m-item m-prio"><span class="lbl">Priority</span><span class="prio prio-${task.priority}">${prio}</span></span>
                </div>
                <div class="t-progress" title="Progress"><span class="track"><i style="width:${task.progress}%"></i></span><span>${task.progress}%</span></div>
            </article>`;
    }

    // ───────────────────────── Drag and Drop ─────────────────────────
    // Native HTML5 drag-and-drop can't be animated (the browser paints its own ghost and the
    // drop is instant), so this is pointer based:
    //   1. the pressed card is lifted into a floating clone that follows the pointer
    //   2. the original stays in the list as a dashed "slot" and is moved around live
    //   3. every other card (and lane) glides to its new spot with FLIP animations
    //   4. on release the clone flies into the slot, then the real data update happens
    // Works the same for mouse, pen and touch (touch = press and hold to pick up).

    initializeDragAndDrop() {
        this.dragEase = 'cubic-bezier(.2, .8, .2, 1)';
        this._onMove = (e) => this.onPointerMove(e);
        this._onUp = (e) => this.onPointerUp(e);
        this._onCancel = () => this.abortDrag();
        this._onKey = (e) => {
            if (e.key === 'Escape' && this.drag && this.drag.active) { e.preventDefault(); this.abortDrag(); }
        };

        const board = document.querySelector('.board');
        if (!board) return;
        board.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        board.addEventListener('contextmenu', (e) => {
            if (this.drag && this.drag.type === 'touch') e.preventDefault(); // long-press menu
        });
        // Once a touch drag is running, keep the page from scrolling under the finger
        document.addEventListener('touchmove', (e) => {
            if (this.drag && this.drag.active) e.preventDefault();
        }, { passive: false });
    }

    reduceMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    onPointerDown(e) {
        if (this.drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
        const card = e.target.closest('.task-card');
        if (!card || e.target.closest('button, a, input, textarea, select')) return;

        this.drag = {
            card, type: e.pointerType, id: e.pointerId,
            x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY,
            active: false, ending: false, dirty: false, timer: null
        };
        // Touch: hold briefly to pick up, so a normal swipe still scrolls the board
        if (e.pointerType === 'touch') this.drag.timer = setTimeout(() => this.beginDrag(), 220);

        window.addEventListener('pointermove', this._onMove);
        window.addEventListener('pointerup', this._onUp);
        window.addEventListener('pointercancel', this._onCancel);
        window.addEventListener('keydown', this._onKey);
        window.addEventListener('blur', this._onCancel);
    }

    onPointerMove(e) {
        const d = this.drag;
        if (!d || e.pointerId !== d.id) return;
        d.x = e.clientX; d.y = e.clientY; d.dirty = true;
        if (d.active) return;

        const moved = Math.hypot(d.x - d.startX, d.y - d.startY);
        if (d.type === 'touch') {
            if (moved > 8) this.abortDrag(); // finger is scrolling, not dragging
        } else if (moved > 4) {
            this.beginDrag();
        }
    }

    onPointerUp(e) {
        const d = this.drag;
        if (!d || e.pointerId !== d.id) return;
        if (!d.active) { this.abortDrag(); return; } // it was just a click
        this.endDrag();
    }

    teardownDragListeners() {
        window.removeEventListener('pointermove', this._onMove);
        window.removeEventListener('pointerup', this._onUp);
        window.removeEventListener('pointercancel', this._onCancel);
        window.removeEventListener('keydown', this._onKey);
        window.removeEventListener('blur', this._onCancel);
        if (this.drag) clearTimeout(this.drag.timer);
    }

    beginDrag() {
        const d = this.drag;
        if (!d || d.active) return;
        clearTimeout(d.timer);

        const card = d.card;
        const rect = card.getBoundingClientRect();
        d.active = true;
        d.dirty = true;
        d.offX = d.startX - rect.left;
        d.offY = d.startY - rect.top;
        d.origin = { parent: card.parentNode, next: card.nextElementSibling };
        d.zone = card.parentNode;

        // Floating clone that follows the pointer
        const ghost = card.cloneNode(true);
        ghost.removeAttribute('data-task-id');
        ghost.setAttribute('aria-hidden', 'true');
        ghost.classList.add('drag-ghost');
        ghost.style.width = rect.width + 'px';
        ghost.style.height = rect.height + 'px';
        ghost.style.translate = `${rect.left}px ${rect.top}px`;
        document.body.appendChild(ghost);
        ghost.getBoundingClientRect();      // commit the start state so the lift is a transition
        ghost.classList.add('lifted');
        d.ghost = ghost;

        // The original becomes the slot that shows where the card will land
        card.classList.add('is-placeholder');
        d.zone.classList.add('drag-over');
        document.body.classList.add('is-dragging');
        if (d.type === 'touch' && navigator.vibrate) navigator.vibrate(8);

        this.dragFrame();
    }

    // One frame of the drag: move the ghost, auto-scroll near edges, re-project the slot
    dragFrame() {
        const d = this.drag;
        if (!d || !d.active || d.ending) return;

        d.ghost.style.translate = `${d.x - d.offX}px ${d.y - d.offY}px`;

        let scrolled = false;
        const edge = 80, speed = 16;

        // Page scroll (top and bottom edges of the viewport)
        const vy = d.y < edge ? -(1 - Math.max(d.y, 0) / edge)
            : d.y > window.innerHeight - edge ? 1 - Math.max(window.innerHeight - d.y, 0) / edge : 0;
        if (vy) {
            const before = window.scrollY;
            window.scrollBy(0, vy * speed);
            if (window.scrollY !== before) scrolled = true;
        }

        // Horizontal scroll inside the stage under the pointer (lanes layout)
        const zone = d.zone;
        if (zone && zone.scrollWidth > zone.clientWidth) {
            const zr = zone.getBoundingClientRect();
            if (d.y >= zr.top && d.y <= zr.bottom) {
                const fromLeft = d.x - zr.left, fromRight = zr.right - d.x;
                const hx = fromLeft < edge ? -(1 - Math.max(fromLeft, 0) / edge)
                    : fromRight < edge ? 1 - Math.max(fromRight, 0) / edge : 0;
                if (hx) {
                    const before = zone.scrollLeft;
                    zone.scrollLeft += hx * speed;
                    if (zone.scrollLeft !== before) scrolled = true;
                }
            }
        }

        if (d.dirty || scrolled) {
            d.dirty = false;
            this.updatePlacement();
        }
        d.raf = requestAnimationFrame(() => this.dragFrame());
    }

    // Next visible task card after an element (null = it is last)
    nextVisibleCard(el) {
        let n = el.nextElementSibling;
        while (n && !(n.classList.contains('task-card') && n.offsetParent !== null)) n = n.nextElementSibling;
        return n;
    }

    // The card the dragged task should be inserted before (null = end of stage).
    // Uses layout positions (offset*), not on-screen rects, so cards that are still
    // mid-animation don't make the decision flicker.
    getDropReference(zone, x, y) {
        const vertical = getComputedStyle(zone).flexDirection === 'column';
        const zr = zone.getBoundingClientRect();
        const cards = [...zone.querySelectorAll(':scope > .task-card')]
            .filter(c => !c.classList.contains('is-placeholder') && c.offsetParent !== null);
        for (const c of cards) {
            const mid = vertical
                ? zr.top - zone.scrollTop + c.offsetTop + c.offsetHeight / 2
                : zr.left - zone.scrollLeft + c.offsetLeft + c.offsetWidth / 2;
            if ((vertical ? y : x) < mid) return c;
        }
        return null;
    }

    updatePlacement() {
        const d = this.drag;
        const under = document.elementFromPoint(d.x, d.y);
        const col = under && under.closest('.column');
        // Pointer over a gap or the header: keep the last stage instead of jumping around
        const zone = (col && col.querySelector('.tasks-container')) || d.zone;
        const ph = d.card;
        const ref = this.getDropReference(zone, d.x, d.y);

        if (ph.parentNode === zone && this.nextVisibleCard(ph) === ref) return; // already projected here

        this.flipMove(() => zone.insertBefore(ph, ref), ph);
        this.setDragOver(zone);
    }

    setDragOver(zone) {
        if (this.drag) this.drag.zone = zone;
        document.querySelectorAll('.tasks-container.drag-over').forEach(z => { if (z !== zone) z.classList.remove('drag-over'); });
        zone.classList.add('drag-over');
    }

    // FLIP: record where everything is, change the DOM, then animate each thing from
    // its old on-screen position to its new one. Stages (lanes) animate their height too,
    // so nothing snaps when a card leaves or enters.
    flipMove(mutate, ph) {
        const board = document.querySelector('.board');
        const boxes = [...board.children];
        const cards = [...board.querySelectorAll('.task-card')].filter(c => c.offsetParent !== null);
        const colOf = (c) => c.closest('.column');

        const firstBox = new Map(boxes.map(b => [b, b.getBoundingClientRect()]));
        const firstCard = new Map(cards.map(c => [c, c.getBoundingClientRect()]));
        const colBefore = new Map(cards.map(c => [c, colOf(c)]));

        [...boxes, ...cards].forEach(el => el.getAnimations().forEach(a => a.cancel()));
        mutate();
        if (this.reduceMotion()) return;

        // Measure everything first, animate afterwards (animations would skew later reads)
        const lastBox = new Map(boxes.map(b => [b, b.getBoundingClientRect()]));
        const lastCard = new Map(cards.map(c => [c, c.getBoundingClientRect()]));
        const colAfter = new Map(cards.map(c => [c, colOf(c)]));
        const opts = { duration: 240, easing: this.dragEase };

        boxes.forEach(b => {
            const f = firstBox.get(b), l = lastBox.get(b);
            const dx = f.left - l.left, dy = f.top - l.top, dh = f.height - l.height;
            if (Math.abs(dx) < .5 && Math.abs(dy) < .5 && Math.abs(dh) < .5) return;
            const from = { transform: `translate(${dx}px, ${dy}px)` };
            const to = { transform: 'none' };
            if (Math.abs(dh) >= .5) {
                Object.assign(from, { height: f.height + 'px', overflow: 'hidden', alignContent: 'start' });
                Object.assign(to, { height: l.height + 'px', overflow: 'hidden', alignContent: 'start' });
            }
            b.animate([from, to], opts);
        });

        cards.forEach(c => {
            if (c === ph && colBefore.get(c) !== colAfter.get(c)) {
                // Slot appears in a different stage: fade/scale in rather than fly across the board
                c.animate([{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], opts);
                return;
            }
            // Movement relative to the stage, because the stage itself is animated above
            const f = firstCard.get(c), l = lastCard.get(c);
            const fb = firstBox.get(colBefore.get(c)) || { left: 0, top: 0 };
            const lb = lastBox.get(colAfter.get(c)) || { left: 0, top: 0 };
            const dx = (f.left - fb.left) - (l.left - lb.left);
            const dy = (f.top - fb.top) - (l.top - lb.top);
            if (Math.abs(dx) < .5 && Math.abs(dy) < .5) return;
            c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], opts);
        });
    }

    // Final on-screen position of an element from layout only (ignores in-flight transforms)
    layoutPos(el) {
        let x = 0, y = 0;
        for (let n = el; n; n = n.offsetParent) {
            x += n.offsetLeft; y += n.offsetTop;
            const p = n.offsetParent;
            if (p) { x += p.clientLeft - p.scrollLeft; y += p.clientTop - p.scrollTop; }
        }
        return { x: x - window.scrollX, y: y - window.scrollY };
    }

    // Fly the ghost into the slot, then call done()
    landGhost(done) {
        const d = this.drag, g = d.ghost;
        if (this.reduceMotion()) { done(); return; }
        const t = this.layoutPos(d.card);
        g.classList.remove('lifted');
        g.classList.add('landing');
        g.style.translate = `${t.x}px ${t.y}px`;

        let finished = false;
        const end = () => {
            if (finished) return;
            finished = true;
            g.removeEventListener('transitionend', onEnd);
            done();
        };
        const onEnd = (e) => { if (e.target === g && e.propertyName === 'translate') end(); };
        g.addEventListener('transitionend', onEnd);
        setTimeout(end, 400); // safety net if transitionend never fires
    }

    endDrag() {
        const d = this.drag;
        d.ending = true;
        cancelAnimationFrame(d.raf);
        this.teardownDragListeners();

        this.landGhost(() => {
            const ph = d.card;
            const zone = ph.parentNode;
            const column = zone.closest('.column').dataset.column;
            let next = ph.nextElementSibling;
            while (next && !next.classList.contains('task-card')) next = next.nextElementSibling;

            this.holdScrollSnap();
            document.body.classList.remove('is-dragging');
            document.querySelectorAll('.tasks-container.drag-over').forEach(z => z.classList.remove('drag-over'));

            // moveTask re-renders the board; the ghost is exactly over the new card, so
            // removing it in the same frame is seamless
            const taskId = ph.dataset.taskId;
            const changed = this.moveTask(taskId, column, next ? next.dataset.taskId : null);
            if (changed) {
                const el = document.querySelector(`.task-card[data-task-id="${CSS.escape(taskId)}"]`);
                if (el) {
                    el.classList.add('just-dropped');
                    el.addEventListener('animationend', () => el.classList.remove('just-dropped'), { once: true });
                }
            } else {
                ph.classList.remove('is-placeholder');
            }
            d.ghost.remove();
            this.drag = null;
        });
    }

    // Scroll-snap would nudge a lane sideways the moment a drag ends (a small visible jump),
    // so it stays off until the person scrolls again.
    holdScrollSnap() {
        document.body.classList.add('snap-off');
        if (this._snapRelease) return;
        const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
        this._snapRelease = () => {
            if (this.drag) return;
            document.body.classList.remove('snap-off');
            events.forEach(t => window.removeEventListener(t, this._snapRelease));
            this._snapRelease = null;
        };
        events.forEach(t => window.addEventListener(t, this._snapRelease, { passive: true }));
    }

    // Escape, window blur or pointercancel: put the card back where it started
    abortDrag() {
        const d = this.drag;
        if (!d) return;
        this.teardownDragListeners();
        if (!d.active) { this.drag = null; return; }

        d.ending = true;
        cancelAnimationFrame(d.raf);
        const ph = d.card, { parent, next } = d.origin;
        if (ph.parentNode !== parent || ph.nextElementSibling !== next) {
            this.flipMove(() => parent.insertBefore(ph, next), ph);
            this.setDragOver(parent);
        }
        this.landGhost(() => {
            this.holdScrollSnap();
            document.body.classList.remove('is-dragging');
            document.querySelectorAll('.tasks-container.drag-over').forEach(z => z.classList.remove('drag-over'));
            ph.classList.remove('is-placeholder');
            d.ghost.remove();
            this.drag = null;
        });
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

    // Column Color Selection Functions
    selectColumnColor(color) {
        document.getElementById('column-color').value = color;
        this.updateColumnColorPickerSelection(color);
    }

    updateColumnColorPickerSelection(color) {
        const container = document.querySelector('#column-modal .color-picker-container');
        if (!container) return;

        container.querySelectorAll('.color-option').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.color === color) {
                btn.classList.add('selected');
            }
        });
    }

    openCustomColumnColorPicker() {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = document.getElementById('column-color').value || '#3b82f6';
        input.onchange = (e) => {
            this.selectColumnColor(e.target.value);
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
const kanban = new EasyKanban();