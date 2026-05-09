const API_BASE = 'https://ws.socketkill.com';

const els = {
  list: document.getElementById('kill-list'),
  count: document.getElementById('kill-count'),
  status: document.getElementById('status-text'),
  currentDate: document.getElementById('current-date'),
  dayStatus: document.getElementById('day-status'),
  prev: document.getElementById('prev-day'),
  next: document.getElementById('next-day'),
};

// ---- Date helpers ----
const today = () => new Date().toISOString().slice(0, 10);

function getDateFromUrl() {
  const match = window.location.pathname.match(/\/log\/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : today();
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---- Formatters ----
function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function classifySec(sec, regionID) {
  if (sec == null) return { label: '—', cls: '' };
  if (regionID === 10000070) return { label: 'POCH', cls: 'sec-pochven' };
  if (sec >= 0.5) return { label: sec.toFixed(1), cls: 'sec-high' };
  if (sec > 0) return { label: sec.toFixed(1), cls: 'sec-low' };
  return { label: sec.toFixed(1), cls: 'sec-null' };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function renderRow(k) {
  const sec = classifySec(k.system.security, k.system.regionID);
  const portraitSrc = k.victim.characterID
    ? `https://images.evetech.net/characters/${k.victim.characterID}/portrait?size=64`
    : `https://api.socketkill.com/render/corp/${k.victim.corporationID}?size=64`;
  const shipSrc = `https://api.socketkill.com/render/ship/${k.victim.shipTypeID}?size=64`;

  return `
    <li>
      <a href="/kill/${k.killID}"
         class="grid grid-cols-[40px_40px_60px_1fr_140px_60px_120px] gap-3 items-center px-2 py-2 hover:bg-white/5 transition-colors">
        
        <img src="${shipSrc}" loading="lazy"
             class="w-10 h-10 border border-eve-border bg-black object-cover"
             onerror="this.style.opacity='0.2'" alt="">
        
        <img src="${portraitSrc}" loading="lazy"
             class="w-10 h-10 border border-eve-border bg-black object-cover"
             onerror="this.style.opacity='0.2'" alt="">
        
        <span class="font-mono text-gray-500 text-xs">${formatTime(k.time)}</span>
        
        <div class="min-w-0">
          <div class="text-white truncate font-exo text-sm" title="${escapeHtml(k.victim.name)}">${escapeHtml(k.victim.name)}</div>
          <div class="text-gray-400 truncate font-exo text-sm" title="${escapeHtml(k.victim.ship)}">${escapeHtml(k.victim.ship)}</div>
        </div>
        
        <span class="truncate font-mono text-sm" title="${escapeHtml(k.system.region)}">
          <span class="text-white">${escapeHtml(k.system.name)}</span>
          <span class="${sec.cls} ml-1">${sec.label}</span>
        </span>
        
        <span class="text-right text-gray-400 font-mono text-sm">${k.attackerCount}</span>
        
        <span class="text-right text-eve-accent font-mono text-sm">${k.formattedValue}</span>
      </a>
    </li>
  `;
}

function renderEmpty() {
  return `<li class="text-gray-500 italic text-sm font-mono p-4 text-center">&gt; NO KILLS RECORDED</li>`;
}

function renderError(msg) {
  return `<li class="text-red-400 italic text-sm font-mono p-4 text-center">&gt; ${escapeHtml(msg)}</li>`;
}

// ---- Date controller ----
function updateDateUI(date) {
  const isToday = date === today();
  els.currentDate.textContent = date.replace(/-/g, '.');
  els.dayStatus.textContent = `> ${isToday ? 'LIVE' : 'ARCHIVED'}`;
  els.prev.href = `/log/${shiftDate(date, -1)}`;

  if (isToday) {
    els.next.href = '#';
    els.next.classList.add('opacity-30', 'cursor-not-allowed');
  } else {
    els.next.href = `/log/${shiftDate(date, 1)}`;
    els.next.classList.remove('opacity-30', 'cursor-not-allowed');
  }
}

// ---- Fetch + render ----
async function loadDay(date) {
  els.status.textContent = '> LOADING';
  els.list.innerHTML = `<li class="text-gray-500 italic text-sm font-mono p-4 text-center">&gt; LOADING...</li>`;

  try {
    const res = await fetch(`${API_BASE}/api/kills/${date}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    els.count.textContent = data.count;
    els.status.textContent = `> ${data.hasMore ? `SHOWING ${data.count} OF ${data.total}` : 'COMPLETE'}`;
    els.list.innerHTML = data.kills.length ? data.kills.map(renderRow).join('') : renderEmpty();
  } catch (err) {
    els.list.innerHTML = renderError(`Failed to load ${date}: ${err.message}`);
    els.status.textContent = '> ERROR';
  }
}

// ---- Auto-refresh for today only ----
let refreshInterval = null;
function startAutoRefresh(date) {
  if (refreshInterval) clearInterval(refreshInterval);
  if (date !== today()) return;

  refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') loadDay(date);
  }, 30_000);
}

// ---- Boot ----
const date = getDateFromUrl();
updateDateUI(date);
loadDay(date);
startAutoRefresh(date);