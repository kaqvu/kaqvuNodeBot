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

const escapeDiv = document.createElement('div');
function escapeHtml(text) {
    escapeDiv.textContent = text;
    return escapeDiv.innerHTML;
}

const htmlRegex = /<html>(.*?)<\/html>/gs;
function parseLogMessage(message) {
    if (message.includes('<html>')) {
        return message.replace(htmlRegex, (_, content) => content);
    }
    return escapeHtml(message);
}

function trimConsoleLines() {
    while (consoleEl.children.length > MAX_CONSOLE_LINES) {
        consoleEl.removeChild(consoleEl.firstChild);
    }
}

socket.on('connect', () => console.log('Połączono z serwerem'));

socket.on('disconnect', () => {
    console.log('Rozłączono z serwerem');
    const line = document.createElement('div');
    line.className = 'console-line';
    line.style.color = COLORS.inactive;
    line.textContent = '>>> Połączenie z serwerem zostało przerwane';
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
});

let scrollPending = false;
function scrollToBottom() {
    if (!scrollPending) {
        scrollPending = true;
        requestAnimationFrame(() => {
            consoleEl.scrollTop = consoleEl.scrollHeight;
            scrollPending = false;
        });
    }
}

socket.on('log', (message) => {
    const line = document.createElement('div');
    line.className = 'console-line';
    line.innerHTML = parseLogMessage(message);
    consoleEl.appendChild(line);
    trimConsoleLines();
    scrollToBottom();
});

socket.on('botList', (bots) => {
    if (!bots || bots.length === 0) {
        botsListEl.innerHTML = '<div style="color: #858585;">Brak botow</div>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
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
                statusEl.innerHTML = `<span style="color: ${COLORS.active}">WŁĄCZONY (połączony)</span>`;
            } else {
                statusEl.innerHTML = `<span style="color: ${COLORS.active}">WŁĄCZONY</span><span style="color: ${COLORS.inactive}"> (niepołączony)</span>`;
            }
        } else {
            statusEl.innerHTML = `<span style="color: ${COLORS.inactive}">WYŁĄCZONY</span>`;
        }
        
        botEl.appendChild(nameEl);
        botEl.appendChild(statusEl);
        fragment.appendChild(botEl);
    });
    
    botsListEl.innerHTML = '';
    botsListEl.appendChild(fragment);
});

socket.on('logsMode', (isLogsMode) => {
    logsMode = isLogsMode;
    commandInput.placeholder = isLogsMode ? 'Wpisz wiadomosc lub .exit...' : 'Wpisz komende...';
});

socket.on('clearConsole', () => consoleEl.innerHTML = '');

function sendCommand() {
    const command = commandInput.value.trim();
    if (!command) return;
    socket.emit(logsMode ? 'logsMessage' : 'command', command);
    commandInput.value = '';
}

commandInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendCommand();
});

socket.emit('getInitialData');