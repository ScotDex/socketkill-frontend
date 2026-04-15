const API_BASE = 'https://ws.socketkill.com';
const EVE_IMG = 'https://images.evetech.net';
const VISIBLE_ATTACKERS = 5;
const VISIBLE_FIT_ITEMS = 10;


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
    typeTitle('socket-title', 'Socket.Kill', 100);

    // Check for server-embedded data first (Pages Function flow)
    const embedded = document.body.dataset.kill;
    if (embedded) {
        try {
            const data = JSON.parse(embedded);
            return render(data);
        } catch (err) {
            console.warn('[KILL] Embedded data parse failed, falling back to API:', err);
        }
    }

    // Fallback: API fetch (legacy query-string URL flow)
    const params = new URLSearchParams(window.location.search);
    const killID = params.get('id');
    const date = params.get('date');

    if (!killID || !date) return showError('Missing killID or date in URL.');

    try {
        const res = await fetch(`${API_BASE}/api/kill/${date}/${killID}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        render(data);
    } catch (err) {
        showError(`Failed to load kill: ${err.message}`);
    }
}

function render(data) {
    // Pilot card
    setText('pilot-name', data.victim.name);
    setText('pilot-corp', data.victim.corp);
    setText('pilot-alliance', data.victim.alliance || 'UNAFFILIATED');

    if (data.victim.characterID) {
        setImg('pilot-portrait-img', `${EVE_IMG}/characters/${data.victim.characterID}/portrait?size=128`);
    }
    if (data.victim.corporationID) {
        setImg('pilot-crest-img', `${EVE_IMG}/corporations/${data.victim.corporationID}/logo?size=64`);
    }
    if (data.victim.allianceID) {
        setImg('pilot-alliance-img', `${EVE_IMG}/alliances/${data.victim.allianceID}/logo?size=64`);
    }

    // Location card
    setText('location-system', data.system?.name || '—');
    setText('location-region', data.system?.region || '—');
    setText('location-time', formatTime(data.killmailTime));

    if (data.system?.security !== undefined) {
        const sec = classifySecurity(data.system.security);
        const el = document.getElementById('location-security');
        if (el) {
            el.textContent = sec.label;
            el.className = `location-value ${sec.className}`;
        }
    }

    // Cost analysis card
    setText('value-total', data.totalValue || '—');
    setText('value-dropped', data.droppedValue || '—');
    setText('value-destroyed', data.destroyedValue || '—');

    // Ship panel
    setText('ship-name', data.victim.ship);
    setText('ship-value', data.totalValue || '—');
    if (data.victim.shipTypeID) {
        setImg('ship-render-img', `${EVE_IMG}/types/${data.victim.shipTypeID}/render?size=512`);
    }

    // Body background ship render
    if (data.victim.shipTypeID) {
        document.body.style.backgroundImage = `linear-gradient(rgba(10, 12, 16, 0.85), rgba(10, 12, 16, 0.95)), url(${EVE_IMG}/types/${data.victim.shipTypeID}/render?size=512)`;
    }

    // Attacker count
    setText('attacker-count', data.attackerCount || data.attackers?.length || 0);

    // Attackers list
    if (data.attackers) {
        renderAttackers(data.attackers);
    }

    // Fit display
    renderFit(data.items);
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

    // Wire up expand buttons after rendering
    container.querySelectorAll('.fit-expand').forEach(btn => {
        btn.addEventListener('click', () => {
            const group = btn.closest('.fit-group');
            const hidden = group.querySelector('.fit-hidden');
            const hiddenHtml = hidden.dataset.hiddenHtml;

            const decoded = hiddenHtml
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");

            hidden.outerHTML = decoded;
            btn.remove();
        });
    });
}

function renderGroup({ key, label }, items) {
    if ((key === 'subsystem' || key === 'fighter') && items.length === 0) return '';

    const count = items.reduce((sum, i) => sum + i.quantity, 0);

    let body;
    if (items.length === 0) {
        body = `<div class="fit-group-empty">&gt; NONE</div>`;
    } else if (items.length <= VISIBLE_FIT_ITEMS) {
        body = items.map(renderItemRow).join('');
    } else {
        const visible = items.slice(0, VISIBLE_FIT_ITEMS).map(renderItemRow).join('');
        const hiddenCount = items.length - VISIBLE_FIT_ITEMS;
        const hiddenItemsHtml = items.slice(VISIBLE_FIT_ITEMS).map(renderItemRow).join('');

        body = `
            ${visible}
            <div class="fit-hidden" data-hidden-html="${escapeHtml(hiddenItemsHtml)}"></div>
            <button class="fit-expand" data-group="${key}">
                SHOW <span>${hiddenCount}</span> MORE
            </button>
        `;
    }

    return `
        <div class="fit-group" data-group="${key}">
            <div class="fit-group-header">
                <span>&gt; ${label}</span>
                ${count > 0 ? `<span class="fit-group-count">${count}</span>` : ''}
            </div>
            ${body}
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