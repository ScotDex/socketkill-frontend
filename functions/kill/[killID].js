export async function onRequest(context) {
    const { params } = context;
    const { killID } = params;

    if (killID.includes('.')) {
        return context.next();
    }

    const id = parseInt(killID);
    if (!Number.isFinite(id) || id <= 0) {
        return new Response('Invalid killID', { status: 400 });
    }

    function article(shipName) {
        const vowels = ['a', 'e', 'i', 'o', 'u'];
        const firstLetter = shipName[0].toLowerCase();
        return vowels.includes(firstLetter) ? 'an' : 'a';
    }

    function esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function buildTitle(data) {
        const valueClause = data.totalValue ? ` (${data.totalValue} ISK)` : '';
        return `${data.victim.name} lost ${article(data.victim.ship)} ${data.victim.ship}${valueClause}`;
    }

    function buildDescription(data) {
        const parts = [];
        const victimAffiliation = data.victim.corp || data.victim.alliance;
        const victimLabel = victimAffiliation
            ? `${data.victim.name} of ${victimAffiliation}`
            : data.victim.name;

        let mainClause = `${victimLabel} lost ${article(data.victim.ship)} ${data.victim.ship} in ${data.system.name} // ${data.system.region}`;

        if (data.totalValue) {
            mainClause += ` worth ${data.totalValue} ISK`;
        }

        parts.push(mainClause);

        if (data.finalBlow) {
            const fbAffiliation = data.finalBlow.corp || data.finalBlow.alliance;
            const fbLabel = fbAffiliation
                ? `${data.finalBlow.name} of ${fbAffiliation}`
                : data.finalBlow.name;

            let fbClause = `Final blow by ${fbLabel} in ${article(data.finalBlow.ship)} ${data.finalBlow.ship}`;

            if (data.attackerCount > 1) {
                fbClause += ` with ${data.attackerCount} attackers`;
            }

            parts.push(fbClause);
        }

        return parts.join(': ');
    }

    try {
        const apiRes = await fetch(`https://ws.socketkill.com/api/kill/${id}`);
        if (!apiRes.ok) {
            return new Response('Kill not found', { status: 404 });
        }
        const data = await apiRes.json();

        const title = buildTitle(data);
        const description = buildDescription(data);
        const image = `https://images.evetech.net/types/${data.victim.shipTypeID}/render?size=512`;
        const canonicalUrl = `https://socketkill.com/kill/${id}`;
        const embeddedData = JSON.stringify(data).replace(/'/g, "&#39;").replace(/</g, "\\u003c");

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)} | Socketkill.com</title>
    <meta name="description" content="${esc(description)}">
    <meta name="author" content="Dexomus Viliana">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:site_name" content="Socketkill.com">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${image}">
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          'eve-dark': '#0a0b0e',
          'eve-border': 'rgba(255, 255, 255, 0.1)',
          'eve-accent': '#00d4ff',
        },
        fontFamily: {
          'mono': ['Share Tech Mono', 'monospace'],
          'exo': ['Exo 2', 'sans-serif'],
        },
      },
    },
  }
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "name": "${esc(title)}",
  "description": "${esc(description)}",
  "location": {
    "@type": "Place",
    "name": "${data.system.name}"
  },
  "eventStatus": "https://schema.org/EventCancelled",
  "startDate": "${data.killmailTime}"
}
</script>

<link rel="icon" type="image/png" href="https://edge.socketkill.com/favicon.png">
<link rel="stylesheet" href="/kill/components.css">

    <!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "9a7b8334fd974f46a3b570cbc18d90b1"}'></script><!-- End Cloudflare Web Analytics -->


</head>
<body data-kill='${embeddedData}'>

    <header class="site-header">
        <div class="header-left">
            <h1 class="site-title m-0">
                <span id="socket-title" class="typewriter" aria-label="Socket.Kill"></span>
                <span class="ml-2 px-1.5 py-0.5 text-[9px] tracking-widest text-gray-500 border border-gray-700 uppercase">beta</span>
            </h1>
        </div>
    </header>

<main class="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 max-w-7xl mx-auto">
    <section class="md:col-span-3 flex flex-col gap-4">


        <div class="fade-card bg-eve-dark border border-eve-border rounded-sm overflow-hidden">
            <div class="bg-black/40 px-3 py-2 border-b border-eve-border flex justify-between items-center text-[10px] tracking-widest text-gray-400 font-exo uppercase">
                <span>LOCATION DATA</span>
            </div>
            <div class="p-3 space-y-2 text-sm font-mono">
                <div class="flex justify-between"><span class="text-gray-500">SYSTEM</span><span id="location-system" class="text-white">—</span></div>
                <div class="flex justify-between"><span class="text-gray-500">REGION</span><span id="location-region" class="text-white">—</span></div>
                <div class="flex justify-between"><span class="text-gray-500">SEC.STATUS</span><span id="location-security" class="text-white">—</span></div>
                <div class="flex justify-between"><span class="text-gray-500">TIME</span><span id="location-time" class="text-white">—</span></div>
            </div>
            <div class="bg-black/20 px-3 py-1 text-[10px] text-eve-accent border-t border-eve-border">&gt; COORDINATES LOGGED</div>
        </div>

        <div class="fade-card bg-eve-dark border border-eve-border rounded-sm overflow-hidden">
            <div class="bg-black/40 px-3 py-2 border-b border-eve-border flex justify-between items-center text-[10px] tracking-widest text-gray-400 font-exo uppercase">
                <span>VALUE ANALYSIS</span>
            </div>
            <div class="p-3 space-y-2 text-sm font-mono">
                <div class="flex justify-between"><span class="text-gray-500">TOTAL VALUE</span><span id="value-total" class="text-white">—</span></div>
                <div class="flex justify-between"><span class="text-gray-500">DROPPED</span><span id="value-dropped" class="text-green-400">—</span></div>
                <div class="flex justify-between"><span class="text-gray-500">DESTROYED</span><span id="value-destroyed" class="text-red-400">—</span></div>
            </div>
        </div>

                <div class="fade-card bg-eve-dark border border-eve-border rounded-sm p-3">
            <div class="flex justify-between mb-2">
                <span class="text-[10px] tracking-widest text-gray-500">&gt; ATTACKERS</span>
                <span id="attacker-count" class="text-sm text-eve-accent">0</span>
            </div>
            <ul id="attacker-list" class="space-y-2"></ul>
            <button id="attacker-expand" class="w-full mt-2 py-1 text-[10px] border border-eve-border bg-black/60 text-eve-accent hover:bg-eve-accent hover:text-black transition-colors" hidden>
                SHOW <span id="attacker-expand-count">0</span> MORE
            </button>
        </div>
        </div>
    </section>

    <section class="fade-card md:col-span-6 bg-eve-dark border border-eve-border rounded-sm p-4">
        <div class="text-[10px] tracking-widest text-gray-500 mb-4">&gt; KILLMAIL CONTENTS</div>
        <div id="fit-groups" class="space-y-4">
            <div class="text-sm text-gray-500 italic">&gt; NO DATA</div>
        </div>
    </section>

<section class="md:col-span-3 flex flex-col gap-4">

    <!-- PILOT CARD (top) -->
    <div class="fade-card bg-eve-dark border border-eve-border rounded-sm overflow-hidden">
        <div class="bg-black/40 px-3 py-2 border-b border-eve-border flex justify-between items-center text-[10px] tracking-widest text-gray-400 font-exo uppercase">
            <span>${data.victim.characterID ? 'PILOT ID ' : 'CORP ID'} </span>
            <span class="text-eve-accent">RECORD UPLOADED</span>
        </div>
        <div class="p-3 space-y-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gray-800 rounded"><img id="pilot-portrait-img" class="w-full h-full object-cover"></div>
                <div id="pilot-name" class="font-exo font-bold text-white text-sm"></div>
            </div>
            <div class="flex items-center gap-3">
                <div class="w-10 h-10"><img id="pilot-crest-img" class="w-full h-full object-contain"></div>
                <div id="pilot-corp" class="font-exo font-bold text-white text-sm"></div>
            </div>
            <div class="flex items-center gap-3">
                <div class="w-10 h-10"><img id="pilot-alliance-img" class="w-full h-full object-contain"></div>
                <div id="pilot-alliance" class="font-exo font-bold text-white text-sm">NO ALLIANCE</div>
            </div>
        </div>
        <div class="bg-black/20 px-3 py-1 text-[10px] text-eve-accent tracking-tighter border-t border-eve-border">&gt; STATUS: DEAD</div>
    </div>

    <!-- SHIP CARD -->
    <div class="fade-card bg-eve-dark border border-eve-border rounded-sm overflow-hidden">
        <div class="bg-black/40 px-3 py-2 border-b border-eve-border flex justify-between items-center text-[10px] tracking-widest text-gray-400 font-exo uppercase">
            <span>TARGET DESTROYED</span>
            <span class="text-eve-accent">WRECKAGE SCANNED</span>
        </div>
        <div class="relative"><img id="ship-render-img" class="w-full h-auto"></div>
        <div class="p-3 border-t border-eve-border">
            <div id="ship-name" class="font-bold text-white">—</div>
            <div id="ship-value" class="text-sm text-eve-accent">—</div>
        </div>
    </div>

 <!-- ACTIONS CARD -->
<div class="fade-card bg-eve-dark border border-eve-border rounded-sm p-3">
    <div class="flex justify-between items-center mb-3">
        <span class="text-[10px] tracking-widest text-gray-500">&gt; ACTIONS</span>
        <div class="flex gap-1">
            <!-- X/Twitter -->
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(esc(title))}&url=${encodeURIComponent(canonicalUrl)}"
               target="_blank" rel="noopener noreferrer"
               class="text-eve-accent border border-eve-border p-1 hover:bg-white/5 transition-colors"
               aria-label="Share on X">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
            </a>

            <!-- Copy Link -->
            <button id="copy-link-btn"
                    class="text-eve-accent border border-eve-border p-1 hover:bg-white/5 transition-colors relative"
                    aria-label="Copy link">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <span id="copy-confirm" class="absolute -top-7 left-1/2 -translate-x-1/2 text-[9px] text-eve-accent opacity-0 transition-opacity pointer-events-none whitespace-nowrap">COPIED</span>
</button>
        </div>
    </div>
    
    <div class="grid grid-cols-2 gap-2">
        <a href="https://eveship.fit/?fit=killmail:${id}/${data.killmailHash}"
           target="_blank" rel="noopener noreferrer"
           class="text-[9px] text-center text-eve-accent border border-eve-border px-2 py-1 hover:bg-white/5 transition-colors">
           VIEW FIT
        </a>
        
        <a href="https://zkillboard.com/kill/${id}/"
           target="_blank" rel="noopener noreferrer"
           class="text-[9px] text-center text-gray-400 border border-eve-border px-2 py-1 hover:text-white hover:border-white transition-colors">
           VIEW ON ZKILLBOARD
        </a>

        <a href="https://eve-kill.com/kill/${id}/"
           target="_blank" rel="noopener noreferrer"
           class="text-[9px] text-center text-gray-400 border border-eve-border px-2 py-1 hover:text-white hover:border-white transition-colors">
           VIEW ON EVE-KILL
        </a>

        <a href="https://ws.socketkill.com/api/kill/${id}"
           target="_blank" rel="noopener noreferrer"
           class="text-[9px] text-center text-gray-600 border border-eve-border px-2 py-1 hover:text-gray-400 transition-colors">
           RAW DATA
        </a>
    </div>
</div>

</section>
</main>

    <script src="/kill/kill.js"></script>
<script>
    document.getElementById('copy-link-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        const confirm = document.getElementById('copy-confirm');
        confirm.style.opacity = '1';
        setTimeout(() => { confirm.style.opacity = '0'; }, 1500);
    });
</script>

<footer class="max-w-7xl mx-auto p-4 mt-8 border-t border-eve-border text-center">
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] tracking-widest text-gray-500 font-exo">
        <div>
            <a href="/" class="hover:text-eve-accent transition-colors">&lt; BACK TO SOCKETKILL.COM</a>
        </div>
        <div class="space-x-4">
            <a href="https://socketkill.com/about/" class="hover:text-eve-accent">ABOUT</a>
            <a href="https://github.com/ScotDex/socketkill-frontend" target="_blank" class="hover:text-eve-accent">GITHUB</a>
            <a href="https://api.socketkill.com/docs/" class="hover:text-eve-accent">API</a>
            <a href="https://discord.gg/dpgmEm9REc" target="_blank" class="hover:text-eve-accent">DISCORD</a>
        </div>
        <div>
            &copy; 2026 SOCKETKILL.COM
        </div>
    </div>
</footer>

</body>
</html>`;

        return new Response(html, {
            headers: {
                'content-type': 'text/html; charset=utf-8',
                'cache-control': 'public, max-age=3600'
            }
        });
    } catch (err) {
        return new Response(`Error: ${err.message}`, { status: 500 });
    }
}