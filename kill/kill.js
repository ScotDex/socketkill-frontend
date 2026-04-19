const API_BASE = 'https://ws.socketkill.com';
const EVE_IMG = 'https://images.evetech.net';
const VISIBLE_ATTACKERS = 5;
const VISIBLE_FIT_ITEMS = 10;


const FIT_GROUP_ORDER = [
    { key: 'high', label: 'HIGH SLOTS' },
    { key: 'mid', label: 'MID SLOTS' },
    { key: 'low', label: 'LOW SLOTS' },
    { key: 'rig', label: 'RIGS' },
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
        <li class="grid grid-cols-[40px_40px_1fr_auto] items-center gap-2 p-2 border-b border-white/5 ${a.finalBlow ? 'bg-red-900/10' : ''}">
            <div class="w-10 h-10 bg-black border border-eve-border overflow-hidden">
                ${a.characterID ? `<img src="${EVE_IMG}/characters/${a.characterID}/portrait?size=64" class="w-full h-full object-cover" alt="">` : ''}
            </div>
            <div class="w-10 h-10 bg-black border border-eve-border overflow-hidden">
                ${a.shipTypeID ? `<img src="${EVE_IMG}/types/${a.shipTypeID}/render?size=64" class="w-full h-full object-cover" alt="">` : ''}
            </div>
            <div class="min-w-0">
                <div class="text-sm text-white font-exo truncate">${escapeHtml(a.name)}</div>
                <div class="text-[10px] text-gray-400 truncate">${escapeHtml(a.corp)}</div>
            </div>
            <div class="font-mono text-xs text-gray-300 text-right">${a.damage.toLocaleString()}</div>
        </li>
    `).join('');

    list.innerHTML = renderRows(sorted.slice(0, VISIBLE_ATTACKERS));

    if (sorted.length > VISIBLE_ATTACKERS) {
        expandBtn.hidden = false;
        document.getElementById('attacker-expand-count').textContent = sorted.length - VISIBLE_ATTACKERS;
        expandBtn.onclick = () => {
            list.innerHTML = renderRows(sorted);
            expandBtn.hidden = true;
        };
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

    return `
        <div class="fit-group mb-4" data-group="${key}">
            <div class="flex justify-between items-center text-[10px] tracking-widest text-gray-500 uppercase mb-2 border-b border-white/5 pb-1">
                <span>&gt; ${label}</span>
                ${count > 0 ? `<span class="text-[10px] text-gray-600">${count}</span>` : ''}
            </div>
            ${items.length === 0 ? '<div class="text-[10px] text-gray-700 italic ml-2">&gt; NONE</div>' : `
                <div class="grid grid-cols-[32px_1fr_auto_auto] items-center gap-3 px-1.5 py-1 text-[9px] tracking-widest text-gray-600 uppercase">
                    <span></span>
                    <span>ITEM</span>
                    <span></span>
                    <span class="text-right">VALUE</span>
                </div>
                ${items.slice(0, VISIBLE_FIT_ITEMS).map(renderItemRow).join('')}
            `}
            ${items.length > VISIBLE_FIT_ITEMS ? `
                <button class="w-full mt-2 py-1 text-[10px] text-eve-accent border border-eve-border hover:bg-white/5 transition-colors">
                    SHOW ${items.length - VISIBLE_FIT_ITEMS} MORE
                </button>
            ` : ''}
        </div>
    `;
}

function renderItemRow(item) {
    const state = item.destroyed > 0 && item.dropped > 0 ? 'bg-orange-500/10 border-l-orange-500'
        : item.dropped > 0 ? 'bg-green-500/10 border-l-green-500'
            : 'bg-red-500/10 border-l-red-500';

    return `
        <div class="grid grid-cols-[32px_1fr_auto_auto] items-center gap-3 p-1.5 border-b border-white/5 text-xs font-mono border-l-4 ${state}">
            <div class="w-8 h-8 bg-black border border-eve-border flex items-center justify-center">
                <img src="https://api.socketkill.com/render/market/${item.typeID}" alt="" class="w-full h-full object-cover opacity-90" loading="lazy">
            </div>
            <div class="text-white truncate font-exo font-medium" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
            <div class="text-gray-400 font-bold ml-2">${item.quantity > 1 ? `×${item.quantity.toLocaleString()}` : ''}</div>
            <div class="text-eve-accent text-right font-mono">${item.formattedValue || ''}</div>
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