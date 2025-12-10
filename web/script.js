const socket = io();
const consoleEl = document.getElementById('console');
const commandInput = document.getElementById('commandInput');
const botsListEl = document.getElementById('botsList');
let logsMode = false;

const MAX_CONSOLE_LINES = 1000;
const COLORS = {
    active: '#00CED1',
    inactive: '#ff4444'
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function trimConsoleLines() {
    while (consoleEl.children.length > MAX_CONSOLE_LINES) {
        consoleEl.removeChild(consoleEl.firstChild);
    }
}

socket.on('connect', () => {
    console.log('Połączono z serwerem');
});

socket.on('disconnect', () => {
    console.log('Rozłączono z serwerem');
    const line = document.createElement('div');
    line.className = 'console-line';
    line.style.color = COLORS.inactive;
    line.textContent = '>>> Połączenie z serwerem zostało przerwane';
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
});

socket.on('log', (message) => {
    const line = document.createElement('div');
    line.className = 'console-line';
    line.textContent = message;
    consoleEl.appendChild(line);
    trimConsoleLines();
    consoleEl.scrollTop = consoleEl.scrollHeight;
});

socket.on('botList', (bots) => {
    botsListEl.innerHTML = '';
    
    if (!bots || bots.length === 0) {
        botsListEl.innerHTML = '<div style="color: #858585;">Brak botow</div>';
        return;
    }
    
    bots.forEach(bot => {
        const botEl = document.createElement('div');
        botEl.className = 'bot-item';
        
        const nameEl = document.createElement('div');
        nameEl.className = 'bot-name';
        nameEl.textContent = bot.name;
        
        const statusEl = document.createElement('div');
        statusEl.className = 'bot-status';
        
        if (bot.active) {
            if (bot.connected) {
                const span = document.createElement('span');
                span.style.color = COLORS.active;
                span.textContent = 'WŁĄCZONY (połączony)';
                statusEl.appendChild(span);
            } else {
                const activeSpan = document.createElement('span');
                activeSpan.style.color = COLORS.active;
                activeSpan.textContent = 'WŁĄCZONY';
                
                const disconnectedSpan = document.createElement('span');
                disconnectedSpan.style.color = COLORS.inactive;
                disconnectedSpan.textContent = ' (niepołączony)';
                
                statusEl.appendChild(activeSpan);
                statusEl.appendChild(disconnectedSpan);
            }
        } else {
            const span = document.createElement('span');
            span.style.color = COLORS.inactive;
            span.textContent = 'WYŁĄCZONY';
            statusEl.appendChild(span);
        }
        
        botEl.appendChild(nameEl);
        botEl.appendChild(statusEl);
        botsListEl.appendChild(botEl);
    });
});

socket.on('logsMode', (isLogsMode) => {
    logsMode = isLogsMode;
    commandInput.placeholder = isLogsMode ? 'Wpisz wiadomosc lub .exit...' : 'Wpisz komende...';
});

socket.on('clearConsole', () => {
    consoleEl.innerHTML = '';
});

function sendCommand() {
    const command = commandInput.value.trim();
    if (!command) return;
    
    socket.emit(logsMode ? 'logsMessage' : 'command', command);
    commandInput.value = '';
}

commandInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendCommand();
    }
});

socket.emit('getInitialData');