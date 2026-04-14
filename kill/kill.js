const API_BASE = 'https://ws.socketkill.com';
const EVE_IMG = 'https://images.evetech.net';
const VISIBLE_ATTACKERS = 5;

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

    // Ship panel
    setText('ship-name', data.victim.ship);
    setImg('ship-render-img', `${EVE_IMG}/types/${data.victim.shipTypeID}/render?size=512`);
    if (data.totalValue) setText('ship-value', `${data.totalValue} ISK`);

    // Attackers
    setText('attacker-count', data.attackerCount);
    renderAttackers(data.attackers || []);
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

loadKill();