/**
 * SOCKET.KILL - FULL VISUAL REFACTOR
 * Optimized Hardware Acceleration + Full Animation Suite
 */

// === CONFIG & STATE ===
const socket = io('https://ws.socketkill.com');
const feed = document.getElementById('feed');
const counterElement = document.getElementById('kill-counter');
const MAX_FEED_SIZE = 70;
let regionCache = [];

// === UTILITIES ===
const formatIsk = (val) => {
    const num = Number(val);
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    return (num / 1e6).toFixed(1) + "M";
};

// === ANIMATION ENGINE ===

// Surge effect with overwrite protection
function counterSurge() {
    gsap.timeline({ overwrite: 'auto' })
        .to(counterElement, {
            duration: 0.2,
            scale: 1.5,
            textShadow: "0 0 10px #3fb950, 0 0 20px #3fb950",
            ease: 'back.out(2)'
        })
        .to(counterElement, {
            duration: 0.3,
            scale: 1,
            textShadow: '0 0 8px rgba(63, 185, 80, 0.6)',
            ease: 'power2.out'
        });
}

// Surgical typewriter using requestAnimationFrame to prevent stutter
const typeTerminalText = (el, text, speed = 30) => {
    el.innerText = '';
    let i = 0;
    let lastTime = 0;

    const render = (now) => {
        if (!lastTime) lastTime = now;
        if (now - lastTime >= speed) {
            if (i < text.length) {
                el.innerText += text[i];
                i++;
                lastTime = now;
            } else {
                return; // Animation complete
            }
        }
        requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
};

// === CORE RENDERING ENGINE ===
const createKillRow = (kill) => {
    const val = Number(kill.val) || 0;
    const isWhale = val >= 10_000_000_000;
    const now = new Date();
    const timestamp = `[${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}]`;

    const div = document.createElement('div');
    div.className = `kill-row justify-content-between ${isWhale ? 'whale' : ''}`;
    div.style.willChange = "transform, opacity"; // Hint for GPU
    div.dataset.alliance = (kill.allianceName || '').toLowerCase();
    div.dataset.location = (kill.locationLabel || '').toLowerCase();

    const victimDisplay = kill.victimName === kill.corpName
        ? kill.victimName
        : `${kill.victimName} of ${kill.corpName}`;

    div.innerHTML = `
        <div class="d-flex align-items-center" style="flex: 1;">
            <div class="ship-icon-container">
                <img src="${kill.shipImageUrl}" alt="Ship" class="ship-render" loading="lazy">
            </div>
            <a href="${kill.zkillUrl}" target="_blank" rel="noopener" class="kill-info-link">
                <div class="kill-info">
                    <div><strong class="ship-name">
                        <span class="timestamp">${timestamp}</span>
                        ${victimDisplay} lost
                        <span class="article-target">${kill.article || 'a'}</span> 
                        <span class="type-target ship-name-container"></span>
                    </strong></div>
                    <div class="small">
                        <span class="location-label ${kill.isTriglavian ? 'triglavian' : ''}">${kill.locationLabel}</span>
                    </div>
                </div>
            </a>
        </div>
        <div class="kill-meta">
            <span class="final-blow-label">${kill.attackerCount} attackers</span>
        </div>
        <div class="d-flex align-items-center">
            <div class="corp-square-container me-3"><img src="${kill.corpImageUrl}" class="corp-logo-square"></div>
            <div class="corp-square-container me-3"><img src="${kill.allianceImageUrl}" class="corp-logo-square"></div>
            <div class="text-end" style="width: 100px;">
                <div class="${val >= 1e9 ? 'isk-billion' : 'isk-million'} fw-bold isk-value"></div>
            </div>
        </div>
    `;

    return { node: div, val, isWhale, shipName: kill.ship };
};

// === EVENT HANDLERS ===
socket.on('raw-kill', (kill) => {
    const { node, val, isWhale, shipName } = createKillRow(kill);

    // Logic Gate: Filter check
    const filter = document.getElementById('regionSearch').value.toLowerCase().trim();
    if (filter && !node.dataset.location.includes(filter) && !node.dataset.alliance.includes(filter)) {
        node.hidden = true;
    }

    // Whale Effect (Signal Interference)
    if (isWhale) {
        document.body.classList.add('signal-interference');
        setTimeout(() => document.body.classList.remove('signal-interference'), 400);
    }

    feed.prepend(node);

    // Trigger Visuals: ISK value and Ship Name typing
    typeTerminalText(node.querySelector('.isk-value'), formatIsk(val), 40);
    typeTerminalText(node.querySelector('.type-target'), shipName, 60);

    if (counterElement && kill.totalScanned) {
        counterElement.innerText = kill.totalScanned.toLocaleString();
        counterSurge();
    }

    // Performance Cleanup
    if (feed.children.length > MAX_FEED_SIZE) {
        feed.lastElementChild.remove();
    }
});

// === INITIALIZATION & BOOT ===
async function typeBootSequence() {
    const bootLines = [
        '> INITIALIZING GRID MONITOR...',
        '> CONNECTING TO DATASOURCE...',
        '> CREW EXPENDABLE — PRIORITY ONE OVERRIDE',
        '> UPLINK ESTABLISHED',
        '> AWAITING DATA STREAM'
    ];
    const bootDisplay = document.querySelector('.boot-sequence');
    if (!bootDisplay) return;

    for (const line of bootLines) {
        const div = document.createElement('div');
        bootDisplay.appendChild(div);
        for (const char of line) {
            div.textContent += char;
            await new Promise(r => setTimeout(r, 30));
        }
        await new Promise(r => setTimeout(r, 200));
    }
}

// Start sequence
document.addEventListener('DOMContentLoaded', () => {
    typeBootSequence();
    // Re-bind Title Animation
    const title = document.getElementById('socket-title');
    if (title) typeTerminalText(title, 'Socket.Kill', 150);
});