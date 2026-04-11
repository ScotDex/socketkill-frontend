// kill.js — fetch the killmail JSON and populate the skeleton

const API_BASE = 'https://ws.socketkill.com';

async function loadKill() {
    const params = new URLSearchParams(window.location.search);
    const killID = params.get('id');
    const date = params.get('date');

    if (!killID || !date) {
        document.title = 'Invalid kill | Socket.Kill';
        document.querySelector('.kill-page').innerHTML = '<p>Missing id or date parameter.</p>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/kill/${date}/${killID}`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        render(data);
    } catch (err) {
        document.title = 'Kill not found | Socket.Kill';
        document.querySelector('.kill-page').innerHTML = `<p>Failed to load kill: ${err.message}</p>`;
    }
}

function render(data) {
    // Page title
    document.title = `${data.victim.name} lost a ${data.victim.ship} | Socket.Kill`;

    // Header
    setText('victim-name', data.victim.name);
    setText('victim-ship', data.victim.ship);
    setText('victim-article', /^[aeiou]/i.test(data.victim.ship) ? 'an' : 'a');
    setText('kill-time', formatTime(data.killmailTime));
    setText('kill-system', data.system.name);
    setText('kill-region', data.system.region);

    // Victim block
    setText('victim-corp', data.victim.corp);
    setText('kill-value', '—'); // placeholder, value isn't in the API yet

    // Final blow
    setText('finalblow-name', data.finalBlow.name);
    setText('finalblow-corp', data.finalBlow.corp);
    setText('finalblow-ship', data.finalBlow.ship);

    // Attackers
    setText('attacker-count', data.attackerCount);
    const tbody = document.getElementById('attackers-tbody');
    tbody.innerHTML = data.attackers
        .sort((a, b) => b.damage - a.damage)
        .map(a => `
            <tr${a.finalBlow ? ' class="final-blow-row"' : ''}>
                <td>${escapeHtml(a.name)}</td>
                <td>${escapeHtml(a.corp)}</td>
                <td>${escapeHtml(a.ship)}</td>
                <td class="num">${a.damage.toLocaleString()}</td>
            </tr>
        `).join('');

    // zKill fallback link
    document.getElementById('zkill-link').href = `https://zkillboard.com/kill/${data.killID}/`;

    // Ship background — the design idea
    document.body.style.backgroundImage = `
        linear-gradient(rgba(13,17,23,0.82), rgba(13,17,23,0.92)),
        url('https://images.evetech.net/types/${data.victim.shipTypeID}/render?size=1024')
    `;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatTime(iso) {
    if (!iso) return 'Unknown';
    return iso.replace('T', ' ').replace('Z', ' UTC');
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

loadKill();