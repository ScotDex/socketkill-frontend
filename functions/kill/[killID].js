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

    function esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    try {
        const apiRes = await fetch(`https://ws.socketkill.com/api/kill/${id}`);
        if (!apiRes.ok) {
            return new Response('Kill not found', { status: 404 });
        }
        const data = await apiRes.json();

        const title = `${data.victim.name} lost a ${data.victim.ship}${data.totalValue ? ` (${data.totalValue} ISK)` : ''}`;
        const description = `${data.victim.alliance ? `${data.victim.name} (${data.victim.alliance})` : data.victim.name} lost their ${data.victim.ship} in ${data.system.name} (${data.system.region})${data.finalBlow ? `. Final Blow by ${data.finalBlow.name}${data.finalBlow.alliance || data.finalBlow.corp ? ` (${data.finalBlow.alliance || data.finalBlow.corp})` : ''} in their ${data.finalBlow.ship}${data.attackerCount > 1 ? ` along with ${data.attackerCount - 1} other ${data.attackerCount - 1 === 1 ? 'pilot' : 'pilots'}` : ' solo'}` : ''}${data.totalValue ? `. Total Value: ${data.totalValue} ISK` : ''}`;
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

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${image}">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800&family=Share+Tech+Mono&display=swap" rel="stylesheet">
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

    <link rel="icon" type="image/png" href="https://edge.socketkill.com/favicon.png">
   <link rel="stylesheet" href="/style.css"> 
   <link rel="stylesheet" href="/kill/components.css">
   <!-- <link rel="stylesheet" href="/kill/base.css"> -->

    <!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "9a7b8334fd974f46a3b570cbc18d90b1"}'></script><!-- End Cloudflare Web Analytics -->
</head>
<body data-kill='${embeddedData}'>

    <div class="beta-badge" aria-label="Beta — Early Access">
        <span class="beta-dot"></span>
        BETA — EARLY ACCESS
    </div>

    <header class="site-header">
        <div class="header-left">
            <h5 class="site-title m-0">
                <span id="socket-title" class="typewriter" aria-label="Socket.Kill"></span>
            </h5>
        </div>
    </header>

<main class="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 max-w-7xl mx-auto">
    <section class="md:col-span-3 flex flex-col gap-4">
        <div class="bg-eve-dark border border-eve-border rounded-sm overflow-hidden">
            <div class="bg-black/40 px-3 py-2 border-b border-eve-border flex justify-between items-center text-[10px] tracking-widest text-gray-400 font-exo uppercase">
                <span>PILOT ID</span>
                <span class="text-eve-accent">RECORD ARCHIVED</span>
            </div>
            <div class="p-3 space-y-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gray-800 rounded"><img id="pilot-portrait-img" class="w-full h-full object-cover"></div>
                    <div id="pilot-name" class="font-exo font-bold text-white text-sm"></div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8"><img id="pilot-crest-img" class="w-full h-full object-contain"></div>
                    <div id="pilot-corp" class="text-xs text-gray-300"></div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8"><img id="pilot-alliance-img" class="w-full h-full object-contain"></div>
                    <div id="pilot-alliance" class="text-xs text-gray-400">UNASSOCIATED</div>
                </div>
            </div>
            <div class="bg-black/20 px-3 py-1 text-[10px] text-eve-accent tracking-tighter border-t border-eve-border">&gt; STATUS: KIA</div>
        </div>

        <div class="bg-eve-dark border border-eve-border rounded-sm overflow-hidden">
            <div class="bg-black/40 px-3 py-2 border-b border-eve-border flex justify-between items-center text-[10px] tracking-widest text-gray-400 font-exo uppercase">
                <span>LOCATION DATA</span>
                <span class="text-eve-accent">SCAN COMPLETE</span>
            </div>
            <div class="p-3 space-y-2 text-xs font-mono">
                <div class="flex justify-between"><span class="text-gray-500">SYSTEM</span><span id="location-system" class="text-white">—</span></div>
                <div class="flex justify-between"><span class="text-gray-500">REGION</span><span id="location-region" class="text-white">—</span></div>
                <div class="flex justify-between"><span class="text-gray-500">SEC.STATUS</span><span id="location-security" class="text-white">—</span></div>
                <div class="flex justify-between"><span class="text-gray-500">TIME</span><span id="location-time" class="text-white">—</span></div>
            </div>
            <div class="bg-black/20 px-3 py-1 text-[10px] text-eve-accent border-t border-eve-border">&gt; COORDINATES LOGGED</div>
        </div>

        <div class="bg-eve-dark border border-eve-border rounded-sm overflow-hidden">
            <div class="bg-black/40 px-3 py-2 border-b border-eve-border flex justify-between items-center text-[10px] tracking-widest text-gray-400 font-exo uppercase">
                <span>VALUE ANALYSIS</span>
                <span class="text-eve-accent">SCAN COMPLETE</span>
            </div>
            <div class="p-3 space-y-2 text-xs font-mono">
                <div class="flex justify-between"><span class="text-gray-500">TOTAL VALUE</span><span id="value-total" class="text-white">—</span></div>
                <div class="flex justify-between"><span class="text-gray-500">DROPPED</span><span id="value-dropped" class="text-green-400">—</span></div>
                <div class="flex justify-between"><span class="text-gray-500">DESTROYED</span><span id="value-destroyed" class="text-red-400">—</span></div>
            </div>
        </div>
    </section>

    <section class="md:col-span-6 bg-eve-dark border border-eve-border rounded-sm p-4">
        <div class="text-[10px] tracking-widest text-gray-500 mb-4">&gt; WRECKAGE RECOVERED</div>
        <div id="fit-groups" class="space-y-4">
            <div class="text-sm text-gray-500 italic">&gt; ITEM ANALYSIS PENDING</div>
        </div>
    </section>

    <section class="md:col-span-3 flex flex-col gap-4">
        <div class="bg-eve-dark border border-eve-border rounded-sm overflow-hidden">
            <div class="bg-black/40 px-3 py-2 border-b border-eve-border flex justify-between items-center text-[10px] tracking-widest text-gray-400 font-exo uppercase">
                <span>VESSEL DESTROYED</span>
                <span class="text-eve-accent">WRECKAGE SCANNED</span>
            </div>
            <div class="relative"><img id="ship-render-img" class="w-full h-auto"></div>
            <div class="p-3 border-t border-eve-border">
                <div id="ship-name" class="font-bold text-white">—</div>
                <div id="ship-value" class="text-xs text-eve-accent">—</div>
            </div>
        </div>

        <div class="bg-eve-dark border border-eve-border rounded-sm p-3">
            <div class="text-[10px] tracking-widest text-gray-500 mb-2">&gt; RECOVERED FOOTAGE</div>
            <div id="replay-slot" class="text-sm text-gray-500">&gt; AWAITING FOOTAGE</div>
        </div>

        <div class="bg-eve-dark border border-eve-border rounded-sm p-3">
            <div class="flex justify-between mb-2">
                <span class="text-[10px] tracking-widest text-gray-500">&gt; HOSTILES</span>
                <span id="attacker-count" class="text-xs text-eve-accent">0</span>
            </div>
            <ul id="attacker-list" class="space-y-2"></ul>
            <button id="attacker-expand" class="w-full mt-2 py-1 text-[10px] border border-eve-border hover:bg-white/5" hidden>
                SHOW <span id="attacker-expand-count">0</span> MORE
            </button>
        </div>
    </section>
</main>

    <script src="/kill/kill.js"></script>
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