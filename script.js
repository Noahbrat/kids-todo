let currentMode = 'todo';
let currentPerson = 'ruthie';
let isDragging = false;
let motherMessage = "Good morning, my beautiful children! Remember to be kind to each other and have a wonderful day! ❤️";
let messageHistory = [];

// Celebration tracking - prevent repeat celebrations
let celebratedToday = {
    ruthie: false,
    lily: false,
    allie: false
};

// Configuration System
// Uses config.js file that's included in the repository
const CONFIG = window.APP_CONFIG || {
    JSONBIN_API_KEY: 'YOUR_API_KEY_HERE',
    JSONBIN_BIN_ID: 'YOUR_BIN_ID_HERE', 
    APP_TITLE: 'Morning Todo List',
    APP_EMOJI: '🌅'
};

// Family Data Structure
let familyChildren = [
    { name: "Ruthie", shortName: "Ruth", id: "ruthie" },
    { name: "Lily", shortName: "Lily", id: "lily" }, 
    { name: "Allie", shortName: "Allie", id: "allie" }
];

// Cloud Storage Functions
async function saveToCloud() {
    const dataToSave = {
        version: 1,
        tasks: tasks,
        motherMessage: motherMessage,
        messageHistory: messageHistory,
        celebratedToday: celebratedToday,
        children: familyChildren,
        migrated: true,
        lastUpdated: new Date().toISOString(),
        authorizedDomains: ['noahbrat.github.io'] // Always preserve production domain
        // allowedDevelopmentDomains removed for security - use enableDevMode() when testing locally
    };

    try {
        // Show loading state
        setLoadingState(true, 'Saving...');

        // Check if API credentials are configured  
        if (CONFIG.JSONBIN_API_KEY === 'YOUR_API_KEY_HERE' || CONFIG.JSONBIN_BIN_ID === 'YOUR_BIN_ID_HERE') {
            showMessage('Please edit config.js with your JSONBin credentials', 'warning');
            // Save to localStorage only
            saveToLocalStorage(dataToSave);
            return;
        }

        // Update existing bin
        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': CONFIG.JSONBIN_API_KEY
            },
            body: JSON.stringify(dataToSave)
        });

        if (response.ok) {
            showMessage('Data saved to cloud!', 'success');
        }

        if (!response.ok) {
            throw new Error(`Cloud save failed: ${response.status}`);
        }

        // Also save to localStorage as backup
        saveToLocalStorage(dataToSave);

    } catch (error) {
        console.error('Cloud save error:', error);
        // Fall back to localStorage
        saveToLocalStorage(dataToSave);
        showMessage('Saved locally (cloud unavailable)', 'warning');
    } finally {
        setLoadingState(false);
    }
}

async function loadFromCloud() {
    try {
        setLoadingState(true, 'Loading...');

        if (CONFIG.JSONBIN_API_KEY === 'YOUR_API_KEY_HERE' || CONFIG.JSONBIN_BIN_ID === 'YOUR_BIN_ID_HERE') {
            // API not configured, use localStorage
            showMessage('Edit config.js with your JSONBin credentials for cloud sync', 'warning');
            return loadFromLocalStorage();
        }

        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.JSONBIN_BIN_ID}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': CONFIG.JSONBIN_API_KEY
            }
        });

        if (response.ok) {
            const result = await response.json();
            const data = result.record;

            // Check domain authorization before processing data
            // If this is existing data without authorized domains, add current domain for migration
            if (data.version === 1 && !data.authorizedDomains) {
                console.log('Migrating existing data: adding authorized domain for', window.location.hostname);
                data.authorizedDomains = [window.location.hostname].filter(domain => domain);
                data.allowedDevelopmentDomains = ["localhost", "127.0.0.1", "file://"];
                // Save the updated data back to cloud with domain info
                setTimeout(() => saveToCloud(), 1000); // Save after current load completes
            } else if (data.version === 1 && data.authorizedDomains && !isAuthorizedDomain(data)) {
                console.log('Domain access denied:', window.location.hostname, 'not in', data.authorizedDomains);
                showUnauthorizedDomainError(data.authorizedDomains);
                return false;
            }

            if (data.version === 1 && data.tasks && data.motherMessage !== undefined) {
                tasks = data.tasks;
                motherMessage = data.motherMessage;
                messageHistory = data.messageHistory || [];
                celebratedToday = data.celebratedToday || {};
                
                // Load children if available
                if (data.children && data.children.length > 0) {
                    familyChildren = data.children;
                }
                
                showMessage('Data loaded from cloud!', 'success');
                return true;
            }
        } else {
            throw new Error(`Cloud load failed: ${response.status}`);
        }
    } catch (error) {
        console.error('Cloud load error:', error);
        // Fall back to localStorage
        const loaded = loadFromLocalStorage();
        if (loaded) {
            showMessage('Loaded from local storage', 'warning');
        }
        return loaded;
    } finally {
        setLoadingState(false);
    }

    return false;
}

// Manual sync function for the sync button
async function syncFromCloud() {
    const syncBtn = document.getElementById('syncBtn');
    const syncIcon = syncBtn.querySelector('.sync-icon');

    // Add spinning animation
    syncBtn.classList.add('syncing');
    syncBtn.disabled = true;

    try {
        const success = await loadFromCloud();
        if (success) {
            // Refresh the UI
            renderTasks();
            updateMessageDisplay();
            showMessage('Synced from cloud!', 'success');
        } else {
            showMessage('Sync failed - using local data', 'warning');
        }
    } catch (error) {
        console.error('Manual sync error:', error);
        showMessage('Sync error - using local data', 'error');
    } finally {
        // Remove spinning animation
        syncBtn.classList.remove('syncing');
        syncBtn.disabled = false;
    }
}

// Migration and Setup Functions (Fixed to not trigger for properly configured data)
function needsMigration(data) {
    // Only migrate if data truly lacks proper structure
    // FIXED: More strict checking to avoid false positives
    if (!data) return true;                              // No data at all
    if (data.migrated === true && 
        data.children && 
        data.children.length > 0 && 
        data.tasks && 
        Object.keys(data.tasks).length > 0) {
        return false; // Data is properly configured, no migration needed
    }
    return true; // Needs migration
}

async function checkAndMigrate() {
    try {
        const loaded = await loadFromCloud();
        
        if (loaded) {
            // We have existing cloud data, check if the loaded data itself is properly configured
            // If the children array has the expected children, skip setup
            if (familyChildren && familyChildren.length > 0 && 
                familyChildren.includes('Ruthie') && familyChildren.includes('Lily') && familyChildren.includes('Allie') &&
                tasks && Object.keys(tasks).length > 5) { // User has substantial task data
                // This is properly configured data, no setup needed
                console.log('Found properly configured family data, skipping setup wizard');
                hideSetupWizard();
                return false;
            }
            
            // For other families with different configurations, also check for proper structure
            if (familyChildren && familyChildren.length > 0 && tasks && Object.keys(tasks).length > 0) {
                console.log('Found configured family data with different children, skipping setup wizard');
                hideSetupWizard();
                return false;
            }
        }
        
        // Check localStorage as fallback
        const savedData = localStorage.getItem('kidsTodoData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                if (!needsMigration(data)) {
                    // Load from localStorage
                    familyChildren = data.children || familyChildren;
                    return false;
                }
            } catch (e) {
                console.log('Error parsing localStorage data:', e);
            }
        }
        
        // Show setup wizard for new families
        showSetupWizard();
        return true;
        
    } catch (error) {
        console.error('Migration check error:', error);
        // For errors, don't show setup wizard - just proceed normally
        return false;
    }
}

function showSetupWizard(existingChildren = null) {
    const overlay = document.getElementById('setupOverlay');
    const setupArea = document.getElementById('childrenSetup');
    
    // Clear existing inputs
    setupArea.innerHTML = '';
    
    // Use existing children or defaults for new families
    const childrenToShow = existingChildren || [
        { name: "Child 1", shortName: "C1", id: "child1" },
        { name: "Child 2", shortName: "C2", id: "child2" },
        { name: "Child 3", shortName: "C3", id: "child3" }
    ];
    
    // Add input fields for each child
    childrenToShow.forEach((child, index) => {
        addChildInputField(child.name, index);
    });
    
    // Show the overlay
    overlay.classList.add('active');
    
    // Focus first input
    setTimeout(() => {
        const firstInput = setupArea.querySelector('.child-input');
        if (firstInput) {
            firstInput.focus();
        }
    }, 300);
}

function hideSetupWizard() {
    const overlay = document.getElementById('setupOverlay');
    overlay.classList.remove('active');
}

function addChildInput() {
    const setupArea = document.getElementById('childrenSetup');
    const currentCount = setupArea.children.length;
    addChildInputField('', currentCount);
    
    // Focus the new input
    const newInput = setupArea.lastElementChild.querySelector('.child-input');
    if (newInput) {
        newInput.focus();
    }
}

function addChildInputField(name = '', index = 0) {
    const setupArea = document.getElementById('childrenSetup');
    
    const inputGroup = document.createElement('div');
    inputGroup.className = 'child-input-group';
    
    const input = document.createElement('input');
    input.className = 'child-input';
    input.type = 'text';
    input.value = name;
    input.placeholder = `Child ${index + 1} name...`;
    input.addEventListener('input', validateSetup);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-child-btn';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => {
        if (setupArea.children.length > 1) {
            inputGroup.remove();
            validateSetup();
        }
    };
    
    inputGroup.appendChild(input);
    inputGroup.appendChild(removeBtn);
    setupArea.appendChild(inputGroup);
    
    validateSetup();
}

function validateSetup() {
    const setupArea = document.getElementById('childrenSetup');
    const errorDiv = document.getElementById('setupError');
    const inputs = setupArea.querySelectorAll('.child-input');
    
    let hasErrors = false;
    const names = [];
    
    inputs.forEach(input => {
        const name = input.value.trim();
        input.classList.remove('error');
        
        if (name === '') {
            hasErrors = true;
            input.classList.add('error');
        } else if (names.includes(name.toLowerCase())) {
            hasErrors = true;
            input.classList.add('error');
        } else {
            names.push(name.toLowerCase());
        }
    });
    
    if (names.length === 0) {
        hasErrors = true;
        errorDiv.textContent = 'Please enter at least one child\'s name.';
    } else if (names.length !== new Set(names).size) {
        hasErrors = true;
        errorDiv.textContent = 'Each child must have a unique name.';
    } else {
        errorDiv.textContent = '';
    }
    
    if (hasErrors) {
        errorDiv.classList.remove('hidden');
    } else {
        errorDiv.classList.add('hidden');
    }
    
    return !hasErrors;
}

function skipSetup() {
    // Use default children for new families
    familyChildren = [
        { name: "Ruthie", shortName: "Ruth", id: "ruthie" },
        { name: "Lily", shortName: "Lily", id: "lily" }, 
        { name: "Allie", shortName: "Allie", id: "allie" }
    ];
    
    completeSetupProcess();
}

function completeSetup() {
    if (!validateSetup()) {
        return; // Don't proceed if validation fails
    }
    
    // Collect children from inputs
    const setupArea = document.getElementById('childrenSetup');
    const inputs = setupArea.querySelectorAll('.child-input');
    
    familyChildren = Array.from(inputs).map((input, index) => {
        const name = input.value.trim();
        const shortName = name.length > 6 ? name.substring(0, 4) : name;
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '') || `child${index + 1}`;
        
        return { name, shortName, id };
    });
    
    completeSetupProcess();
}

function completeSetupProcess() {
    // Hide setup wizard
    document.getElementById('setupOverlay').classList.remove('active');
    
    // Update currentPerson to first child
    currentPerson = familyChildren[0]?.id || 'child1';
    
    // Create/update tasks structure for all children
    const newTasks = {};
    familyChildren.forEach(child => {
        newTasks[child.id] = [
            { name: 'Brush teeth', emoji: '🦷', completed: createCompletionObject(false) },
            { name: 'Get dressed', emoji: '👔', completed: createCompletionObject(false) },
            { name: 'Eat breakfast', emoji: '🍳', completed: createCompletionObject(false) }
        ];
    });
    
    tasks = newTasks;
    
    // Reset celebration tracking for all children
    celebratedToday = {};
    familyChildren.forEach(child => {
        celebratedToday[child.id] = false;
    });
    
    // Update page title and UI
    updatePageTitle();
    updateTableStructure();
    renderTasks();
    updateMessageDisplay();
    
    // Save to cloud
    saveToCloud();
    
    showMessage('Family setup complete!', 'success');
}

function createCompletionObject(defaultValue = false) {
    const completion = {};
    familyChildren.forEach(child => {
        completion[child.id] = defaultValue;
    });
    return completion;
}

function updatePageTitle() {
    document.title = CONFIG.APP_TITLE;
    const titleElement = document.querySelector('h1');
    if (titleElement) {
        titleElement.textContent = CONFIG.APP_TITLE;
    }
    
    const emojiElement = document.querySelector('.header span');
    if (emojiElement) {
        emojiElement.textContent = CONFIG.APP_EMOJI;
    }
}

function updateTableStructure() {
    // Update table header
    const headerRow = document.querySelector('.tasks-table thead tr');
    
    // Clear existing headers except the first (task name)
    while (headerRow.children.length > 1) {
        headerRow.removeChild(headerRow.lastChild);
    }
    
    // Add headers for each child
    familyChildren.forEach(child => {
        const th = document.createElement('th');
        th.className = 'child-name-column';
        th.innerHTML = `<span class="name-full">${child.name}</span><span class="name-short">${child.shortName}</span>`;
        headerRow.appendChild(th);
    });
    
    // Add actions header in edit mode
    if (currentMode === 'edit') {
        const actionsHeader = document.createElement('th');
        actionsHeader.className = 'actions-header';
        actionsHeader.textContent = 'Actions';
        headerRow.appendChild(actionsHeader);
    }
}

// Domain Authorization Functions
function isAuthorizedDomain(data) {
    const currentDomain = window.location.hostname;
    const currentProtocol = window.location.protocol;
    
    // Get authorized domains from data, default to empty array
    const authorizedDomains = data.authorizedDomains || [];
    const devDomains = data.allowedDevelopmentDomains || [];
    
    // Always include production domain from config if available
    const productionDomain = window.APP_CONFIG?.PRODUCTION_DOMAIN;
    if (productionDomain && !authorizedDomains.includes(productionDomain)) {
        authorizedDomains.push(productionDomain);
    }
    
    // For file:// protocol, check if "file://" is in development domains
    if (currentProtocol === 'file:') {
        return devDomains.includes('file://');
    }
    
    // Check if current domain is authorized or is a development domain
    return authorizedDomains.includes(currentDomain) || devDomains.includes(currentDomain);
}

function showUnauthorizedDomainError(authorizedDomains) {
    const currentDomain = window.location.hostname;
    const message = `
        ⚠️ Domain Access Denied
        
        This data belongs to: ${authorizedDomains.join(', ')}
        Your current domain: ${currentDomain}
        
        It looks like you're using someone else's JSONBin credentials!
        
        To set up your own family's todo app:
        1. Go to https://jsonbin.io and create a free account
        2. Create a new bin for your family's data
        3. Update your config.js file with your own credentials
        
        Click OK to go to the setup wizard.
    `;
    
    alert(message);
    // Redirect to setup wizard
    showSetupWizard();
}

// Development Mode Control Functions
async function enableDevMode() {
    console.log('🔓 Enabling development mode (localhost access)...');
    // Use current in-memory data (don't try to load from cloud as that would trigger domain check)
    
    // Add development domains and save back to cloud
    const dataToSave = {
        version: 1,
        tasks: tasks,
        motherMessage: motherMessage,
        messageHistory: messageHistory,
        celebratedToday: celebratedToday,
        children: familyChildren,
        migrated: true,
        lastUpdated: new Date().toISOString(),
        authorizedDomains: ['noahbrat.github.io'], // Always preserve production domain
        allowedDevelopmentDomains: ["localhost", "127.0.0.1", "file://"] // Add dev access
    };
    
    // Temporarily override saveToCloud to include dev domains
    const originalData = {
        version: 1,
        tasks: tasks,
        motherMessage: motherMessage,
        messageHistory: messageHistory,
        celebratedToday: celebratedToday,
        children: familyChildren,
        migrated: true,
        lastUpdated: new Date().toISOString(),
        authorizedDomains: [window.location.hostname].filter(domain => domain),
        allowedDevelopmentDomains: ["localhost", "127.0.0.1", "file://"]
    };
    
    try {
        if (CONFIG.JSONBIN_API_KEY === 'YOUR_API_KEY_HERE' || CONFIG.JSONBIN_BIN_ID === 'YOUR_BIN_ID_HERE') {
            alert('Please configure your JSONBin credentials first');
            return;
        }

        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': CONFIG.JSONBIN_API_KEY
            },
            body: JSON.stringify(originalData)
        });

        if (response.ok) {
            console.log('✅ Development mode enabled! localhost access allowed.');
            showMessage('Development mode enabled - localhost access allowed', 'success');
        } else {
            throw new Error(`Failed to enable dev mode: ${response.status}`);
        }
    } catch (error) {
        console.error('Failed to enable dev mode:', error);
        showMessage('Failed to enable dev mode', 'error');
    }
}

async function disableDevMode() {
    console.log('🔒 Disabling development mode (removing localhost access)...');
    // This will use the normal saveToCloud which excludes development domains
    await saveToCloud();
    console.log('✅ Development mode disabled! localhost access removed.');
    showMessage('Development mode disabled - localhost access removed', 'success');
}

// localStorage backup functions
function saveToLocalStorage(dataToSave = null) {
    if (!dataToSave) {
        dataToSave = {
            version: 1,
            tasks: tasks,
            motherMessage: motherMessage,
            messageHistory: messageHistory,
            celebratedToday: celebratedToday,
            children: familyChildren,
            migrated: true
        };
    }
    localStorage.setItem('kidsTodoData', JSON.stringify(dataToSave));
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('kidsTodoData');
        if (savedData) {
            const data = JSON.parse(savedData);
            if (data.version === 1 && data.tasks && data.motherMessage !== undefined) {
                tasks = data.tasks;
                motherMessage = data.motherMessage;
                messageHistory = data.messageHistory || [];
                celebratedToday = data.celebratedToday || {};
                
                // Load children if available
                if (data.children && data.children.length > 0) {
                    familyChildren = data.children;
                }
                
                return true;
            }
        }
    } catch (e) {
        console.log('Error loading from localStorage:', e);
    }
    return false;
}

// UI feedback functions
function setLoadingState(loading, message = '') {
    const container = document.querySelector('.container');
    if (loading) {
        container.style.opacity = '0.7';
        if (message) {
            showMessage(message, 'info');
        }
    } else {
        container.style.opacity = '1';
    }
}

function showMessage(text, type = 'info') {
    // Remove existing messages
    const existingMessage = document.querySelector('.toast-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const message = document.createElement('div');
    message.className = `toast-message toast-${type}`;
    message.textContent = text;
    message.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#2196f3'};
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        font-weight: 600;
        z-index: 2000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
    `;

    document.body.appendChild(message);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (message.parentNode) {
            message.style.opacity = '0';
            message.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => message.remove(), 300);
        }
    }, 3000);
}

let tasks = {
    ruthie: [
        { name: 'Brush teeth', emoji: '🦷', completed: { ruthie: false, lily: false, allie: null } },
        { name: 'Get dressed', emoji: '👔', completed: { ruthie: false, lily: false, allie: false } },
        { name: 'Eat breakfast', emoji: '🍳', completed: { ruthie: false, lily: false, allie: false } }
    ],
    lily: [
        { name: 'Brush teeth', emoji: '🦷', completed: { ruthie: false, lily: false, allie: null } },
        { name: 'Get dressed', emoji: '👔', completed: { ruthie: false, lily: false, allie: false } },
        { name: 'Eat breakfast', emoji: '🍳', completed: { ruthie: false, lily: false, allie: false } }
    ],
    allie: [
        { name: 'Brush teeth', emoji: '🦷', completed: { ruthie: false, lily: false, allie: null } },
        { name: 'Get dressed', emoji: '👔', completed: { ruthie: false, lily: false, allie: false } },
        { name: 'Eat breakfast', emoji: '🍳', completed: { ruthie: false, lily: false, allie: false } }
    ]
};

// Celebration Functions
function checkForCompletion(person) {
    // Only check in todo mode and if not already celebrated today
    if (currentMode !== 'todo' || celebratedToday[person]) {
        return false;
    }

    const personTasks = tasks[person] || [];

    // Check if all applicable tasks (non-null) are completed
    let applicableTasks = 0;
    let completedTasks = 0;

    personTasks.forEach(task => {
        if (task.completed[person] !== null) {
            applicableTasks++;
            if (task.completed[person] === true) {
                completedTasks++;
            }
        }
    });

    // Must have at least one applicable task and all must be completed
    return applicableTasks > 0 && completedTasks === applicableTasks;
}

function showCelebration(person) {
    // Mark as celebrated to prevent repeats
    celebratedToday[person] = true;

    const overlay = document.getElementById('celebrationOverlay');
    
    // Find the person name from familyChildren
    const child = familyChildren.find(c => c.id === person);
    const personName = child ? child.name : person;

    // Clear any existing celebration content
    overlay.innerHTML = '';

    // Create celebration message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'celebration-message';
    messageDiv.innerHTML = `🎉 Great job, ${personName}! 🌟<br>All done! `;

    // Create floating emojis
    const celebrationEmojis = ['🎉', '⭐', '🌟', '🎊', '✨', '🏆', '💖', '🎈'];

    for (let i = 0; i < 8; i++) {
        const emoji = document.createElement('div');
        emoji.className = 'celebration-emoji';
        emoji.textContent = celebrationEmojis[i % celebrationEmojis.length];

        // Random positioning around the screen
        emoji.style.left = Math.random() * 80 + 10 + '%';
        emoji.style.top = Math.random() * 60 + 20 + '%';
        emoji.style.animationDelay = (Math.random() * 0.5) + 's';

        overlay.appendChild(emoji);
    }

    // Create fireworks
    for (let i = 0; i < 24; i++) {
        const firework = document.createElement('div');
        firework.className = 'firework';

        // Position fireworks in a burst pattern from center
        const angle = (i / 24) * 360;
        const distance = 100 + Math.random() * 100;
        const centerX = 50;
        const centerY = 50;

        const x = centerX + Math.cos(angle * Math.PI / 180) * distance;
        const y = centerY + Math.sin(angle * Math.PI / 180) * distance;

        firework.style.left = x + '%';
        firework.style.top = y + '%';
        firework.style.animationDelay = (Math.random() * 0.5) + 's';

        overlay.appendChild(firework);
    }

    overlay.appendChild(messageDiv);

    // Show the celebration
    overlay.classList.add('active');

    // Auto-hide after 3 seconds
    setTimeout(() => {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.innerHTML = '';
        }, 500); // Wait for fade-out transition
    }, 5000);
}

// Mode switching
document.getElementById('todoModeBtn').addEventListener('click', () => {
    // Save message when switching from edit mode
    if (currentMode === 'edit') {
        clearTimeout(saveTimeout);
        updateMessage();
        saveMessageToHistory();
        saveToCloud();
    }

    currentMode = 'todo';
    document.getElementById('todoModeBtn').className = 'mode-btn todo-mode';
    document.getElementById('editModeBtn').className = 'mode-btn inactive';
    document.getElementById('addTaskForm').classList.add('hidden');
    document.getElementById('resetButtonContainer').classList.remove('hidden');

    // Message area - show display, hide textarea
    document.getElementById('messageTextarea').classList.add('hidden');
    document.getElementById('messageDisplay').classList.remove('hidden');
    document.getElementById('messageHistory').classList.add('hidden');
    updateMessageDisplay();

    updateTableHeader();
    renderTasks();
});

document.getElementById('editModeBtn').addEventListener('click', () => {
    currentMode = 'edit';
    document.getElementById('todoModeBtn').className = 'mode-btn inactive';
    document.getElementById('editModeBtn').className = 'mode-btn edit-mode';
    document.getElementById('addTaskForm').classList.remove('hidden');
    document.getElementById('resetButtonContainer').classList.add('hidden');

    // Message area - show textarea, hide display
    document.getElementById('messageTextarea').classList.remove('hidden');
    document.getElementById('messageDisplay').classList.add('hidden');
    document.getElementById('messageHistory').classList.remove('hidden');
    document.getElementById('messageTextarea').value = motherMessage;
    renderMessageHistory();

    updateTableHeader();
    renderTasks();
});

function updateTableHeader() {
    // This is now handled by updateTableStructure()
    updateTableStructure();
}

// Person tab switching
document.querySelectorAll('.person-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.person-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentPerson = e.target.dataset.person;
        renderTasks();
    });
});

function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = '';

    const personTasks = tasks[currentPerson];
    if (!personTasks) {
        console.warn(`No tasks found for person: ${currentPerson}`);
        return;
    }

    personTasks.forEach((task, index) => {
        const row = document.createElement('tr');
        row.className = 'task-row';

        // Task name cell
        const nameCell = document.createElement('td');
        if (currentMode === 'edit') {
            // In edit mode, show emoji picker and editable text
            const emojiBtn = document.createElement('button');
            emojiBtn.textContent = task.emoji || '📝';
            emojiBtn.style.background = 'none';
            emojiBtn.style.border = 'none';
            emojiBtn.style.fontSize = '1.5em';
            emojiBtn.style.cursor = 'pointer';
            emojiBtn.style.marginRight = '10px';
            emojiBtn.onclick = () => showEmojiPicker(index);

            const taskText = document.createElement('span');
            taskText.textContent = task.name;

            nameCell.appendChild(emojiBtn);
            nameCell.appendChild(taskText);
        } else {
            // In todo mode, show emoji and task name together
            const emoji = task.emoji || '';
            nameCell.textContent = emoji ? `${emoji} ${task.name}` : task.name;
        }
        row.appendChild(nameCell);

        // Dynamic children cells
        familyChildren.forEach(child => {
            const childCell = document.createElement('td');
            
            if (currentMode === 'todo') {
                if (task.completed[child.id] === null) {
                    childCell.innerHTML = '<span style="color: #999; font-weight: bold;">N/A</span>';
                } else {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'task-checkbox';
                    checkbox.checked = task.completed[child.id] === true;
                    checkbox.onchange = () => toggleTask(index, child.id);
                    childCell.appendChild(checkbox);
                }
            } else {
                const input = document.createElement('div');
                input.className = 'task-input';
                const status = task.completed[child.id];

                // Apply styling based on current status
                if (status === null) {
                    input.className += ' na';
                    input.textContent = 'N/A';
                    input.style.background = '#999';
                    input.style.color = 'white';
                    input.style.borderColor = '#999';
                } else if (status === true) {
                    input.textContent = 'Yes';
                    input.style.background = '#4caf50';
                    input.style.color = 'white';
                    input.style.borderColor = '#4caf50';
                } else { // status === false or undefined
                    input.textContent = 'No';
                    input.style.background = '#f44336';
                    input.style.color = 'white';
                    input.style.borderColor = '#f44336';
                }

                // Add click handler with better event handling
                input.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cycleTaskStatus(index, child.id);
                };
                childCell.appendChild(input);
            }
            row.appendChild(childCell);
        });

        // Add action buttons for edit mode
        if (currentMode === 'edit') {
            const buttonCell = document.createElement('td');

            // Up arrow button
            const upBtn = document.createElement('button');
            upBtn.className = 'btn btn-move';
            upBtn.textContent = '↑';
            upBtn.onclick = () => moveTaskUp(index);
            upBtn.disabled = index === 0;
            upBtn.style.marginRight = '3px';

            // Down arrow button
            const downBtn = document.createElement('button');
            downBtn.className = 'btn btn-move';
            downBtn.textContent = '↓';
            downBtn.onclick = () => moveTaskDown(index);
            downBtn.disabled = index === personTasks.length - 1;
            downBtn.style.marginRight = '5px';

            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-edit';
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => editTask(index);
            editBtn.style.marginRight = '3px';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-delete';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => deleteTask(index);

            buttonCell.appendChild(upBtn);
            buttonCell.appendChild(downBtn);
            buttonCell.appendChild(editBtn);
            buttonCell.appendChild(deleteBtn);
            row.appendChild(buttonCell);
        }

        tasksList.appendChild(row);
    });
}

function addTask() {
    const input = document.getElementById('newTaskInput');
    const taskName = input.value.trim();

    if (taskName) {
        const newTask = {
            name: taskName,
            emoji: '📝', // Default emoji
            completed: createCompletionObject(false)
        };

        // Add to all people's lists
        familyChildren.forEach(child => {
            if (tasks[child.id]) {
                tasks[child.id].push({...newTask});
            }
        });

        input.value = '';

        // Re-render immediately to ensure event handlers are properly attached
        renderTasks();
        saveToCloud();
    }
}

function editTask(index) {
    const newName = prompt('Edit task name:', tasks[currentPerson][index].name);
    if (newName && newName.trim()) {
        // Update task name for all people
        familyChildren.forEach(child => {
            if (tasks[child.id] && tasks[child.id][index]) {
                tasks[child.id][index].name = newName.trim();
            }
        });
        renderTasks();
        saveToCloud();
    }
}

function deleteTask(index) {
    if (confirm('Are you sure you want to delete this task?')) {
        // Delete from all people's lists
        familyChildren.forEach(child => {
            if (tasks[child.id]) {
                tasks[child.id].splice(index, 1);
            }
        });
        renderTasks();
        saveToCloud();
    }
}

function toggleTask(index, person) {
    // Toggle completion status for the specific person on all task lists
    familyChildren.forEach(child => {
        if (tasks[child.id] && tasks[child.id][index]) {
            tasks[child.id][index].completed[person] = !tasks[child.id][index].completed[person];
        }
    });
    renderTasks();
    saveToCloud();

    // Check for completion and show celebration
    if (checkForCompletion(person)) {
        // Small delay to let the checkbox render first
        setTimeout(() => showCelebration(person), 100);
    }
}

function cycleTaskStatus(index, person) {
    // Cycle through: No -> Yes -> N/A -> No

    // Get current status from the first available task list (they should all be identical)
    const firstChildTasks = tasks[familyChildren[0]?.id];
    if (!firstChildTasks || !firstChildTasks[index]) {
        console.error(`Task ${index} not found in tasks array`);
        return;
    }

    const currentStatus = firstChildTasks[index].completed[person];

    let newStatus;
    if (currentStatus === false) {
        // No -> Yes
        newStatus = true;
    } else if (currentStatus === true) {
        // Yes -> N/A (mark as null to indicate not applicable)
        newStatus = null;
    } else if (currentStatus === null) {
        // N/A -> No
        newStatus = false;
    } else {
        // Fallback case - if status is undefined or unexpected, set to false
        newStatus = false;
    }

    // Update the status for this person across all task lists
    familyChildren.forEach(child => {
        if (tasks[child.id] && tasks[child.id][index]) {
            tasks[child.id][index].completed[person] = newStatus;
        }
    });

    renderTasks();
    saveToCloud();
}

function resetAllTasks() {
    if (confirm('Are you sure you want to reset all tasks? This will uncheck all checkboxes and clear the message.')) {
        // Reset all tasks to unchecked, but preserve N/A status
        familyChildren.forEach(child => {
            if (tasks[child.id]) {
                tasks[child.id].forEach(task => {
                    familyChildren.forEach(childForReset => {
                        if (task.completed[childForReset.id] !== null) {
                            task.completed[childForReset.id] = false;
                        }
                    });
                });
            }
        });

        // Reset celebration tracking so kids can be celebrated again
        celebratedToday = {};
        familyChildren.forEach(child => {
            celebratedToday[child.id] = false;
        });

        // Clear mother's message
        motherMessage = "";
        updateMessageDisplay();

        renderTasks();
        saveToCloud();
    }
}

function reorderTasks(fromIndex, toIndex) {
    // Reorder tasks in all person arrays to maintain consistency
    familyChildren.forEach(child => {
        if (tasks[child.id]) {
            const taskArray = tasks[child.id];
            const [movedTask] = taskArray.splice(fromIndex, 1);
            taskArray.splice(toIndex, 0, movedTask);
        }
    });

    // Re-render the tasks to reflect the new order
    renderTasks();
    saveToCloud();
}

function moveTaskUp(index) {
    if (index > 0) {
        reorderTasks(index, index - 1);
    }
}

function moveTaskDown(index) {
    const taskCount = tasks[currentPerson].length;
    if (index < taskCount - 1) {
        reorderTasks(index, index + 1);
    }
}


function showEmojiPicker(taskIndex) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'emoji-overlay';

    // Create picker
    const picker = document.createElement('div');
    picker.className = 'emoji-picker';

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'emoji-close-btn';
    closeBtn.textContent = '✕';
    closeBtn.style.position = 'fixed';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '20px';
    closeBtn.style.zIndex = '1001';

    const closePicker = () => {
        document.body.removeChild(overlay);
        document.body.removeChild(picker);
        document.body.removeChild(closeBtn);
    };

    closeBtn.onclick = closePicker;
    overlay.onclick = closePicker;

    // Comprehensive task emojis
    const emojis = [
        // Personal care & hygiene
        '🦷', '🪥', '🧼', '🚿', '🛁', '🧴', '🪒', '💄', '🧻', '🪞', '🪮', '💧',

        // Clothing & shoes
        '👕', '👔', '🧥', '👗', '👚', '🩳', '👖', '🧦', '👠', '👟', '🥿', '🩴',

        // Food & meals
        '🍳', '🥞', '🍞', '🥐', '🍎', '🍌', '🥛', '☕', '🥤', '🧴', '🍱', '🍽️', '🥄', '🍴',

        // School & homework
        '📚', '✏️', '🎒', '📝', '📖', '🖊️', '📐', '🧮', '💻', '🖥️',

        // Chores & cleaning
        '🧽', '🧹', '🧺', '👕', '🛏️', '🗑️', '♻️', '🧴', '🪣', '🧤',

        // Pets & animals
        '🐶', '🐱', '🐹', '🐰', '🐠', '🐟', '🦎', '🐢', '🐦', '🪶',

        // Activities & play
        '🧸', '🎮', '⚽', '🏃', '🚴', '🛴', '🏊', '🎨', '🎵', '📺',

        // Sleep & bedtime
        '😴', '🛏️', '🌙', '⭐', '🌟', '💤', '🕘', '⏰', '🧸', '📚',

        // General & misc
        '🌈', '🌞', '❤️', '✨', '⚡', '🔥', '💎', '🎁', '🎈', '🎊'
    ];

    emojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-option';
        btn.textContent = emoji;
        btn.onclick = () => {
            // Update emoji for this task across all people
            familyChildren.forEach(child => {
                if (tasks[child.id] && tasks[child.id][taskIndex]) {
                    tasks[child.id][taskIndex].emoji = emoji;
                }
            });
            renderTasks();
            saveToCloud();
            closePicker();
        };
        picker.appendChild(btn);
    });

    // Add elements to DOM
    document.body.appendChild(overlay);
    document.body.appendChild(picker);
    document.body.appendChild(closeBtn);
}

function updateMessage() {
    motherMessage = document.getElementById('messageTextarea').value;
}

// Message History Functions
function saveMessageToHistory() {
    if (!motherMessage || motherMessage.trim() === '') return;

    const trimmedMessage = motherMessage.trim();

    // Don't save if it's the same as the most recent message
    if (messageHistory.length > 0 && messageHistory[0].message === trimmedMessage) {
        return;
    }

    // Add to beginning of history
    messageHistory.unshift({
        message: trimmedMessage,
        timestamp: new Date().toISOString(),
        dateLabel: formatDateForHistory(new Date())
    });

    // Keep only last 15 messages
    if (messageHistory.length > 15) {
        messageHistory = messageHistory.slice(0, 15);
    }
}

function formatDateForHistory(date) {
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

function loadMessageFromHistory(index) {
    if (index >= 0 && index < messageHistory.length) {
        const historicalMessage = messageHistory[index].message;
        motherMessage = historicalMessage;
        document.getElementById('messageTextarea').value = historicalMessage;
        updateMessage();
    }
}

function deleteMessageFromHistory(index) {
    if (index >= 0 && index < messageHistory.length) {
        const message = messageHistory[index].message;
        const preview = message.length > 50 ? message.substring(0, 50) + '...' : message;

        if (confirm(`Are you sure you want to delete this message?\n\n"${preview}"\n\nThis action cannot be undone.`)) {
            messageHistory.splice(index, 1);
            renderMessageHistory();
            saveToCloud();
        }
    }
}

function loadSampleMessage() {
    const sampleMessage = "Good morning, my beautiful children! Remember to be kind to each other and have a wonderful day! I love you all so much! ❤️✨";
    motherMessage = sampleMessage;
    document.getElementById('messageTextarea').value = sampleMessage;
    updateMessage();
}


function renderMessageHistory() {
    const historyList = document.getElementById('messageHistoryList');
    const historyCount = document.getElementById('historyCount');

    // Update count (always show actual history length)
    historyCount.textContent = messageHistory.length;

    // Clear existing items
    historyList.innerHTML = '';

    if (messageHistory.length === 0) {
        // Show a sample/default message when history is empty
        const sampleMessage = "Good morning, my beautiful children! Remember to be kind to each other and have a wonderful day! I love you all so much! ❤️✨";

        const historyItem = document.createElement('div');
        historyItem.className = 'history-item sample-message';

        historyItem.innerHTML = `
            <div class="history-item-header">
                <span class="history-date">Sample</span>
                <div class="history-actions">
                    <button class="history-btn history-btn-load" onclick="loadSampleMessage()" title="Load this sample message">
                        Load
                    </button>
                </div>
            </div>
            <div class="history-message">${sampleMessage}</div>
        `;

        historyList.appendChild(historyItem);
        return;
    }

    // Update date labels for each message (in case time has passed)
    messageHistory.forEach(item => {
        item.dateLabel = formatDateForHistory(new Date(item.timestamp));
    });

    // Render each history item
    messageHistory.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        historyItem.innerHTML = `
            <div class="history-item-header">
                <span class="history-date">${item.dateLabel}</span>
                <div class="history-actions">
                    <button class="history-btn history-btn-load" onclick="loadMessageFromHistory(${index})" title="Load this message">
                        Load
                    </button>
                    <button class="history-btn history-btn-delete" onclick="deleteMessageFromHistory(${index})" title="Delete this message">
                        ×
                    </button>
                </div>
            </div>
            <div class="history-message">${item.message}</div>
        `;

        historyList.appendChild(historyItem);
    });
}

// Debounced save to avoid API calls on every keystroke
let saveTimeout;
function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveToCloud();
    }, 1500); // Wait 1.5 seconds after user stops typing
}

function updateMessageDisplay() {
    document.getElementById('messageDisplay').textContent = motherMessage;
}

function updateDayOfWeek() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();

    // If it's past noon (12 PM), show tomorrow's day
    if (now.getHours() >= 12) {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const dayName = days[tomorrow.getDay()];
        document.getElementById('dayHeader').textContent = dayName;
    } else {
        const dayName = days[now.getDay()];
        document.getElementById('dayHeader').textContent = dayName;
    }
}

// Initialize app with cloud storage and migration
async function initializeApp() {
    // Check for migration needs first
    const needsSetup = await checkAndMigrate();
    
    if (!needsSetup) {
        // No setup needed, proceed normally
        const loaded = await loadFromCloud();
        if (!loaded) {
            // No saved data, save the default data to cloud
            await saveToCloud();
        }
        
        // Update UI with current family configuration
        updatePageTitle();
        updateTableStructure();
        
        // Initial render - start in todo mode
        document.getElementById('resetButtonContainer').classList.remove('hidden');
        renderTasks();
        updateMessageDisplay();
        updateDayOfWeek();
    }
    // If setup is needed, the setup wizard will handle initialization after completion
}

// Start the app
initializeApp();