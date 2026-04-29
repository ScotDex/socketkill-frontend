// ============================================================
// SOCKET.KILL — FRONTEND
// ============================================================

const socket = io('https://ws.socketkill.com');

// ---- DOM refs ----------------------------------------------
const feed = document.getElementById('feed');
const status = document.getElementById('status');
const counterElement = document.getElementById('kill-counter');
const regionSearch = document.getElementById('regionSearch');

// ---- Constants ---------------------------------------------
const MAX_FEED_SIZE = 70;
const WHALE_THRESHOLD = 10_000_000_000;
const BILLION_THRESHOLD = 1_000_000_000;

// ---- State -------------------------------------------------
let regionCache = [];
let selectedIndex = -1;

// ============================================================
// UTILITIES
// ============================================================

function escapeHtml(value) {
    if (value == null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatIskShorthand(value) {
    const num = Number(value) || 0;
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
}

function getUtcTimestamp() {
    const now = new Date();
    const hh = now.getUTCHours().toString().padStart(2, '0');
    const mm = now.getUTCMinutes().toString().padStart(2, '0');
    return `[${hh}:${mm}]`;
}

// ============================================================
// RENDERERS — animations & typewriter effects
// ============================================================

function counterSurge() {
    const counter = document.getElementById('kill-counter');
    if (!counter || typeof gsap === 'undefined') return;

    gsap.timeline()
        .to(counter, {
            duration: 0.2,
            scale: 1.5,
            textShadow: `
                0 0 5px #fff,
                0 0 10px #3fb950,
                0 0 20px #3fb950,
                0 0 40px #3fb950
            `,
            ease: 'back.out(2)'
        })
        .to(counter, {
            duration: 0.3,
            scale: 1,
            textShadow: '0 0 8px rgba(63, 185, 80, 0.6)',
            ease: 'power2.out'
        });
}

function pulseCounter(value) {
    if (!counterElement) return;
    counterElement.innerText = value.toLocaleString();
    counterElement.classList.remove('counter-update');
    void counterElement.offsetWidth; // force reflow to restart CSS animation
    counterElement.classList.add('counter-update');
    counterSurge();
}

function typeBootSequence() {
    const bootLines = [
        '> INITIALIZING GRID MONITOR...',
        '> CONNECTING TO DATASOURCE...',
        '> CREW EXPENDABLE — PRIORITY ONE OVERRIDE',
        '> UPLINK ESTABLISHED',
        '> AWAITING DATA STREAM'
    ];
    const bootDisplay = document.querySelector('.boot-sequence');
    if (!bootDisplay) return;

    bootDisplay.innerHTML = '';
    let lineIndex = 0;
    let charIndex = 0;

    function typeChar() {
        if (lineIndex >= bootLines.length) return;

        if (charIndex < bootLines[lineIndex].length) {
            bootDisplay.innerHTML += escapeHtml(bootLines[lineIndex][charIndex]);
            charIndex++;
            setTimeout(typeChar, 30);
        } else {
            bootDisplay.innerHTML += '<br>';
            lineIndex++;
            charIndex = 0;
            if (lineIndex < bootLines.length) {
                setTimeout(typeChar, 200);
            } else {
                bootDisplay.innerHTML += '<span class="dot-pulse"></span>';
            }
        }
    }
    typeChar();
}

function typeTitle(elementId, text, speed = 150) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.innerHTML = '';
    let i = 0;

    function type() {
        if (i < text.length) {
            const span = document.createElement('span');
            span.className = 'char-flash';
            span.textContent = text.charAt(i);
            element.appendChild(span);
            i++;
            setTimeout(type, speed);
        } else {
            element.style.borderRight = 'none';
        }
    }
    type();
}

function renderShipName(el, text) {
    if (!el) return;
    el.innerText = text;
    el.animate(
        [
            { opacity: 0, filter: 'brightness(3)' },
            { opacity: 1, filter: 'brightness(1)' }
        ],
        { duration: 200, easing: 'ease-out' }
    );
}

function typeIskValue(el, text) {
    if (!el) return;
    el.innerText = '';
    let i = 0;

    function render() {
        // Bail out if node was evicted from feed
        if (!el.isConnected) return;

        if (i < text.length) {
            const span = document.createElement('span');
            span.className = 'char-flash';
            span.textContent = text[i];
            el.appendChild(span);
            i++;
            setTimeout(render, 40);
        }
    }
    render();
}

// ============================================================
// KILL ROW — build & insert
// ============================================================

function buildKillRow(kill) {
    const val = Number(kill.val) || 0;
    const isWhale = val >= WHALE_THRESHOLD;
    const iskClass = val >= BILLION_THRESHOLD ? 'isk-billion' : 'isk-million';

    const victimDisplay = kill.victimName === kill.corpName
        ? kill.victimName
        : `${kill.victimName} of ${kill.corpName}`;

    const div = document.createElement('div');
    div.className = `kill-row justify-content-between ${isWhale ? 'whale' : ''}`;
    div.dataset.alliance = (kill.allianceName || '').toLowerCase();

    div.innerHTML = `
        <div class="d-flex align-items-center" style="flex: 1;">
            <a href="${escapeHtml(kill.zkillUrl)}" target="_blank" rel="noopener" class="kill-info-link d-flex align-items-center">
                <div class="ship-icon-container">
                    <img src="${escapeHtml(kill.shipImageUrl)}" alt="Ship Render" class="ship-render" loading="lazy">
                </div>
                <div class="kill-info">
                    <div><strong class="ship-name">
                        <span class="timestamp">${getUtcTimestamp()}</span>
                        ${escapeHtml(victimDisplay)} lost
                        <span class="article-target"></span><span class="type-target ship-name-container"></span>
                    </strong></div>
                    <div class="small">
                        <span class="location-label ${kill.isTriglavian ? 'triglavian' : ''}">${escapeHtml(kill.locationLabel)}</span>
                    </div>
                </div>
            </a>
        </div>
        <div class="kill-meta">
            <span class="final-blow-label">${escapeHtml(String(kill.attackerCount))} attackers </span>
        </div>
        <div class="d-flex align-items-center">
            <div class="corp-square-container me-3">
                <img src="${escapeHtml(kill.corpImageUrl)}" alt="Corporation Logo" class="corp-logo-square" loading="lazy">
            </div>
            <div class="corp-square-container me-3">
                <img src="${escapeHtml(kill.allianceImageUrl)}" alt="Alliance Logo" class="corp-logo-square" loading="lazy">
            </div>
            <div class="text-end" style="width: 100px;">
                <div class="${iskClass} fw-bold isk-value"></div>
            </div>
        </div>
    `;

    return { div, val, isWhale };
}

function insertKillRow(kill) {
    const val = Number(kill.val) || 0;

    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.remove();

    const { div, isWhale } = buildKillRow(kill);

    if (isWhale) {
        document.body.classList.add('signal-interference');
        setTimeout(() => document.body.classList.remove('signal-interference'), 400);
    }

    // Apply current filter
    const filterTerm = regionSearch.value.toLowerCase().trim();
    if (filterTerm !== '') {
        const locationMatch = (kill.locationLabel || '').toLowerCase().includes(filterTerm);
        const allianceMatch = (kill.allianceName || '').toLowerCase().includes(filterTerm);
        if (!locationMatch && !allianceMatch) div.hidden = true;
    }

    feed.prepend(div);

    // Post-insert animations (need the node in the DOM)
    typeIskValue(div.querySelector('.isk-value'), formatIskShorthand(val));
    div.querySelector('.article-target').innerText = kill.article || 'a';
    renderShipName(div.querySelector('.type-target'), kill.ship);

    // Trim feed
    while (feed.children.length > MAX_FEED_SIZE) {
        feed.lastElementChild?.remove();
    }
}

// ============================================================
// AUTOCOMPLETE — region search dropdown
// ============================================================

function showSuggestions(term) {
    const dropdown = document.getElementById('region-suggestions');
    const matches = regionCache
        .filter(r => r.toLowerCase().includes(term))
        .slice(0, 6);

    if (matches.length === 0 || term.length < 2) {
        dropdown.classList.remove('active');
        selectedIndex = -1;
        return;
    }

    dropdown.innerHTML = matches
        .map((region, idx) =>
            `<div class="suggestion-item" data-region="${escapeHtml(region)}" data-idx="${idx}">${escapeHtml(region)}</div>`
        )
        .join('');

    dropdown.classList.add('active');
    selectedIndex = -1;

    dropdown.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            regionSearch.value = item.dataset.region;
            dropdown.classList.remove('active');
            regionSearch.dispatchEvent(new Event('input'));
            regionSearch.focus();
        });
    });
}

function moveSelection(direction) {
    const dropdown = document.getElementById('region-suggestions');
    const items = dropdown.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;

    items.forEach(item => item.classList.remove('selected'));

    if (direction === 'down') {
        selectedIndex = (selectedIndex + 1) % items.length;
    } else if (direction === 'up') {
        selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
    }

    items[selectedIndex].classList.add('selected');
    items[selectedIndex].scrollIntoView({ block: 'nearest' });
}

function commitSelection() {
    const dropdown = document.getElementById('region-suggestions');
    const selected = dropdown.querySelector('.suggestion-item.selected');
    if (selected) {
        regionSearch.value = selected.dataset.region;
        dropdown.classList.remove('active');
        regionSearch.dispatchEvent(new Event('input'));
    }
}

function applyFilter(term) {
    const header = document.querySelector('.terminal-header');
    const filterLabel = document.getElementById('active-filter-label');

    header.classList.toggle('filter-active', term !== '');
    filterLabel.innerText = term ? `// FILTERING: ${term.toUpperCase()}` : '';
    filterLabel.classList.toggle('active', term !== '');

    document.querySelectorAll('.kill-row').forEach(row => {
        const locationText = row.querySelector('.location-label')?.textContent.toLowerCase() || '';
        const allianceText = (row.dataset.alliance || '').toLowerCase();
        row.hidden = term !== '' && !locationText.includes(term) && !allianceText.includes(term);
    });
}

function bindAutocomplete() {
    regionSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        applyFilter(term);

        const exactMatch = regionCache.some(r => r.toLowerCase() === term);
        if (exactMatch) {
            document.getElementById('region-suggestions').classList.remove('active');
            return;
        }

        showSuggestions(term);
    });

    regionSearch.addEventListener('keydown', (e) => {
        const dropdown = document.getElementById('region-suggestions');
        if (!dropdown.classList.contains('active')) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                moveSelection('down');
                break;
            case 'ArrowUp':
                e.preventDefault();
                moveSelection('up');
                break;
            case 'Enter':
                e.preventDefault();
                commitSelection();
                break;
            case 'Escape':
                dropdown.classList.remove('active');
                selectedIndex = -1;
                break;
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.terminal-input-wrapper')) {
            document.getElementById('region-suggestions').classList.remove('active');
            selectedIndex = -1;
        }
    });
}

// ============================================================
// SOCKET HANDLERS
// ============================================================

function bindSocketHandlers() {
    socket.on('connect', () => {
        status.innerText = '● ONLINE';
        status.className = 'status-online';
    });

    socket.on('disconnect', () => {
        status.innerText = '● OFFLINE';
        status.className = 'status-offline';
    });

    socket.io.on('reconnect_attempt', () => {
        status.innerText = '● RECONNECTING';
        status.className = 'status-reconnecting';
    });

    socket.on('region-list', (regionNames) => {
        regionCache = regionNames || [];
    });

    socket.on('gatekeeper-stats', (data) => {
        if (!data) return;
        if (data.totalScanned) pulseCounter(data.totalScanned);
        if (data.totalIsk) {
            const headerIsk = document.getElementById('isk-ticker-header');
            if (headerIsk) headerIsk.innerText = formatIskShorthand(data.totalIsk);
        }
    });

    socket.on('player-count', (data) => {
        const headerPlayers = document.getElementById('player-count-header');
        if (!headerPlayers) return;
        if (data && data.active) {
            headerPlayers.innerText = data.count.toLocaleString();
        } else {
            headerPlayers.innerText = 'OFFLINE';
        }
    });

    socket.on('nebula-update', (data) => {
        if (!data || !data.url) return;
        const tempImg = new Image();
        tempImg.src = data.url;
        tempImg.onload = () => {
            document.body.style.backgroundImage =
                `linear-gradient(rgba(13, 17, 23, 0.8), rgba(13, 17, 23, 0.8)), url('${data.url}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundAttachment = 'fixed';
            document.body.style.backgroundPosition = 'center';
        };
    });

    socket.on('raw-kill', (kill) => {
        if (kill.totalScanned) pulseCounter(kill.totalScanned);
        insertKillRow(kill);
    });
}

// ============================================================
// PERIODIC TASKS
// ============================================================

async function updateNPCTicker() {
    const npcDisplay = document.getElementById('npc-count');
    if (!npcDisplay) return;

    try {
        const response = await fetch('https://api.socketkill.com/stats/npc-kills');
        const data = await response.json();
        if (data && data.lifetimeTotal) {
            npcDisplay.innerText = data.lifetimeTotal.toLocaleString();
            npcDisplay.style.opacity = '0.5';
            setTimeout(() => (npcDisplay.style.opacity = '1'), 200);
        }
    } catch (err) {
        npcDisplay.innerText = 'OFFLINE';
        npcDisplay.classList.replace('text-warning', 'text-danger');
    }
}

// ============================================================
// UI BINDINGS — non-search interactions
// ============================================================

function bindNetworkDropdown() {
    const toggle = document.getElementById('network-toggle');
    const dropdown = document.getElementById('network-dropdown');
    if (!toggle || !dropdown) return;

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#network-toggle') && !e.target.closest('#network-dropdown')) {
            dropdown.classList.remove('active');
        }
    });
}

// ============================================================
// INIT
// ============================================================

function initApp() {
    typeTitle('socket-title', 'Socket.Kill', 150);
    typeBootSequence();
    updateNPCTicker();
    setInterval(updateNPCTicker, 300_000);

    bindAutocomplete();
    bindSocketHandlers();
    bindNetworkDropdown();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}