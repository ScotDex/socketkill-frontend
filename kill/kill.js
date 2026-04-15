const API_BASE = 'https://ws.socketkill.com';
const EVE_IMG = 'https://images.evetech.net';
const VISIBLE_ATTACKERS = 5;


const FIT_GROUP_ORDER = [
    { key: 'high', label: 'HIGH SLOTS' },
    { key: 'mid', label: 'MID SLOTS' },
    { key: 'low', label: 'LOW SLOTS' },
    { key: 'rig', label: 'RIG SLOTS' },
    { key: 'subsystem', label: 'SUBSYSTEMS' },
    { key: 'drone', label: 'DRONE BAY' },
    { key: 'fighter', label: 'FIGHTER BAY' },
    { key: 'cargo', label: 'CARGO BAY' },
];

async function loadKill() {
    
    const params = new URLSearchParams(window.location.search);
    const killID = params.get('id');
    const date = params.get('date');
    if (!killID || !date) return showError('Missing id or date parameter.');

    try {
        const res = await fetch(`${API_BASE}/api/kill/${date}/${killID}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        render(await res.json());
    } catch (err) {
        showError(`Failed to load kill: ${err.message}`);
    }
}

function render(data) {
    document.title = `${data.victim.name} lost a ${data.victim.ship} | Socket.Kill`;

    // Body background — ship render dimmed with gradient overlay
    document.body.style.backgroundImage = `
        linear-gradient(rgba(13,17,23,0.82), rgba(13,17,23,0.92)),
        url('${EVE_IMG}/types/${data.victim.shipTypeID}/render?size=1024')`;

    // Pilot card
    setText('pilot-name', data.victim.name);
    setText('pilot-corp', data.victim.corp);
    setText('pilot-alliance', data.victim.alliance || 'UNAFFILIATED');
    setImg('pilot-portrait-img', `${EVE_IMG}/characters/${data.victim.characterID}/portrait?size=128`);
    if (data.victim.corporationID) {
        setImg('pilot-crest-img', `${EVE_IMG}/corporations/${data.victim.corporationID}/logo?size=64`);
    }

    renderFit(data.items);

    // Ship panel
    setText('ship-name', data.victim.ship);
    setImg('ship-render-img', `${EVE_IMG}/types/${data.victim.shipTypeID}/render?size=512`);
    if (data.totalValue) setText('ship-value', `${data.totalValue} ISK`);

    // Attackers
    setText('attacker-count', data.attackerCount);
    renderAttackers(data.attackers || []);

    // Location data card
    if (data.system) {
        setText('location-system', data.system.name || '—');
        setText('location-region', data.system.region || '—');
        setText('location-time', formatTime(data.killmailTime));

        const secValue = data.system.security;
        const secElem = document.getElementById('location-security');
        if (secElem && typeof secValue === 'number') {
            const { label, className } = classifySecurity(secValue);
            secElem.textContent = label;
            secElem.className = `location-value ${className}`;
        }
    }


    // OG tag update experiment
    const ship = data.victim.ship;
    const pilot = data.victim.name;
    const value = data.totalValue || 'Unknown value';
    const system = data.system.name;
    const region = data.system.region;
    const attackers = data.attackerCount;

    const title = `${pilot} lost a ${ship} (${value})`;
    const description = `${system}, ${region} — ${attackers} attackers`;
    const image = `https://images.evetech.net/types/${data.victim.shipTypeID}/render?size=512`;

    document.title = title;

    const updates = {
        'meta[property="og:title"]': { attr: 'content', value: title },
        'meta[property="og:description"]': { attr: 'content', value: description },
        'meta[property="og:image"]': { attr: 'content', value: image },
        'meta[property="og:url"]': { attr: 'content', value: window.location.href },
        'meta[name="twitter:title"]': { attr: 'content', value: title },
        'meta[name="twitter:description"]': { attr: 'content', value: description },
        'meta[name="twitter:image"]': { attr: 'content', value: image },
        'meta[property="twitter:url"]': { attr: 'content', value: window.location.href },
    };

    for (const [selector, { attr, value }] of Object.entries(updates)) {
        const el = document.querySelector(selector);
        if (el) el.setAttribute(attr, value);
    }

    console.log('[OG] Tags updated:', { title, description, image });
}

function renderAttackers(attackers) {
    const sorted = [...attackers].sort((a, b) => b.damage - a.damage);
    const list = document.getElementById('attacker-list');
    const expandBtn = document.getElementById('attacker-expand');

    const renderRows = (arr) => arr.map(a => `
        <li class="attacker-row${a.finalBlow ? ' final-blow' : ''}">
            <div class="attacker-portrait">
                ${a.characterID ? `<img src="${EVE_IMG}/characters/${a.characterID}/portrait?size=64" alt="">` : ''}
            </div>
            <div class="attacker-ship">
                ${a.shipTypeID ? `<img src="${EVE_IMG}/types/${a.shipTypeID}/render?size=64" alt="">` : ''}
            </div>
            <div class="attacker-info">
                <div class="attacker-name">${escapeHtml(a.name)}</div>
                <div class="attacker-corp">${escapeHtml(a.corp)}</div>
            </div>
            <div class="attacker-damage">${a.damage.toLocaleString()}</div>
        </li>
    `).join('');

    list.innerHTML = renderRows(sorted.slice(0, VISIBLE_ATTACKERS));

    const remaining = sorted.length - VISIBLE_ATTACKERS;
    if (remaining > 0) {
        expandBtn.hidden = false;
        document.getElementById('attacker-expand-count').textContent = remaining;
        expandBtn.onclick = () => {
            list.innerHTML = renderRows(sorted);
            expandBtn.hidden = true;
        };
    } else {
        expandBtn.hidden = true;
    }
}

let isTyping = false;

function typeTitle(elementId, text, speed = 100) {
    if (isTyping) return;
    isTyping = true;
    const element = document.getElementById(elementId);
    if (!element) return;
    element.innerHTML = "";
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
            element.style.borderRight = "none";
            isTyping = false;
        }
    }
    type();
}

function renderFit(items) {
    const container = document.getElementById('fit-groups');
    if (!container) return;

    if (!items || items.status !== 'resolved') {
        container.innerHTML = `<div class="fit-pending">&gt; ITEM ANALYSIS PENDING</div>`;
        return;
    }

    const groups = items.groups || {};
    const hasAnyItems = Object.values(groups).some(arr => arr && arr.length > 0);

    if (!hasAnyItems) {
        container.innerHTML = `<div class="fit-pending">&gt; NO RECOVERABLE WRECKAGE</div>`;
        return;
    }

    container.innerHTML = FIT_GROUP_ORDER
        .filter(g => groups[g.key] || g.key !== 'subsystem' && g.key !== 'fighter')
        .map(g => renderGroup(g, groups[g.key] || []))
        .join('');
}

function renderGroup({ key, label }, items) {
    // Hide subsystem/fighter groups if empty (they're T3/capital specific)
    if ((key === 'subsystem' || key === 'fighter') && items.length === 0) return '';

    const count = items.reduce((sum, i) => sum + i.quantity, 0);

    const rows = items.length === 0
        ? `<div class="fit-group-empty">&gt; NONE</div>`
        : items.map(renderItemRow).join('');

    return `
        <div class="fit-group">
            <div class="fit-group-header">
                <span>&gt; ${label}</span>
                ${count > 0 ? `<span class="fit-group-count">${count}</span>` : ''}
            </div>
            ${rows}
        </div>
    `;
}

function renderItemRow(item) {
    const state = item.destroyed > 0 && item.dropped > 0 ? 'mixed'
        : item.dropped > 0 ? 'dropped'
            : 'destroyed';

    const qtyDisplay = item.quantity > 1 ? `×${item.quantity.toLocaleString()}` : '';

    return `
        <div class="fit-row ${state}">
            <div class="fit-icon">
                <img src="https://api.socketkill.com/render/market/${item.typeID}" alt="" loading="lazy">
            </div>
            <div class="fit-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
            <div class="fit-qty">${qtyDisplay}</div>
        </div>
    `;
}

function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
}

function setImg(id, src) {
    const el = document.getElementById(id);
    if (el) el.src = src;
}

function showError(msg) {
    document.querySelector('main').innerHTML = `<p style="color:#ff6b6b;padding:40px;text-align:center;font-family:var(--mono-font);">${msg}</p>`;
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

function classifySecurity(sec) {
    if (sec >= 0.5) return { label: `HIGHSEC (${sec.toFixed(1)})`, className: 'sec-highsec' };
    if (sec > 0.0) return { label: `LOWSEC (${sec.toFixed(1)})`, className: 'sec-lowsec' };
    if (sec > -0.99) return { label: `NULLSEC (${sec.toFixed(2)})`, className: 'sec-nullsec' };
    return { label: 'UNKNOWN', className: '' };
}

function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mi = String(d.getUTCMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${mi} UTC`;
}
typeTitle('socket-title', 'Socket.Kill', 100)
loadKill();