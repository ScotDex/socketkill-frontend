export async function onRequest(context) {
    const { params } = context;
    const { killID } = params;

    const id = parseInt(killID);
    if (!Number.isFinite(id) || id <= 0) {
        return new Response('Invalid killID', { status: 400 });
    }

    try {
        const apiRes = await fetch(`https://ws.socketkill.com/api/kill/${id}`);
        if (!apiRes.ok) {
            return new Response('Kill not found', { status: 404 });
        }
        const data = await apiRes.json();

        const title = `${data.victim.name} lost a ${data.victim.ship}${data.totalValue ? ` (${data.totalValue} ISK)` : ''}`;
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

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${image}">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800&family=Share+Tech+Mono&display=swap" rel="stylesheet">

    <link rel="icon" type="image/png" href="https://edge.socketkill.com/favicon.png">
    <link rel="stylesheet" href="https://socketkill.com/style.css">
    <link rel="stylesheet" href="https://socketkill.com/kill/base.css">

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

    <main class="kill-grid">

        <section class="zone-pilot" aria-label="Pilot Identification">
            <div class="pilot-card">
                <div class="pilot-card-header">
                    <span>PILOT IDENTIFICATION</span>
                    <span class="pilot-card-status">RECORD ARCHIVED</span>
                </div>
                <div class="pilot-row">
                    <div class="pilot-portrait"><img id="pilot-portrait-img" src="" alt=""></div>
                    <div id="pilot-name" class="pilot-name"></div>
                </div>
                <div class="pilot-row">
                    <div class="pilot-crest"><img id="pilot-crest-img" src="" alt=""></div>
                    <div id="pilot-corp" class="pilot-corp"></div>
                </div>
                <div class="pilot-row">
                    <div class="pilot-crest pilot-crest-alliance">
                        <img id="pilot-alliance-img" src="" alt="">
                    </div>
                    <div id="pilot-alliance" class="pilot-alliance">UNASSOCIATED</div>
                </div>
                <div class="pilot-card-footer">&gt; STATUS: KIA</div>
            </div>

            <div class="pilot-card">
                <div class="pilot-card-header">
                    <span>LOCATION DATA</span>
                    <span class="pilot-card-status">SCAN COMPLETE</span>
                </div>
                <div class="location-row">
                    <span class="location-label">SYSTEM</span>
                    <span class="location-value" id="location-system">—</span>
                </div>
                <div class="location-row">
                    <span class="location-label">REGION</span>
                    <span class="location-value" id="location-region">—</span>
                </div>
                <div class="location-row">
                    <span class="location-label">SEC.STATUS</span>
                    <span class="location-value" id="location-security">—</span>
                </div>
                <div class="location-row">
                    <span class="location-label">TIME</span>
                    <span class="location-value" id="location-time">—</span>
                </div>
                <div class="pilot-card-footer location-footer">
                    &gt; COORDINATES LOGGED
                </div>
            </div>

            <div class="pilot-card">
                <div class="pilot-card-header">
                    <span>COST INFO</span>
                    <span class="pilot-card-status">SCAN COMPLETE</span>
                </div>
                <div class="location-row">
                    <span class="location-label">TOTAL VALUE</span>
                    <span class="location-value" id="value-total">—</span>
                </div>
                <div class="location-row">
                    <span class="location-label">DROPPED</span>
                    <span class="location-value value-dropped" id="value-dropped">—</span>
                </div>
                <div class="location-row">
                    <span class="location-label">DESTROYED</span>
                    <span class="location-value value-destroyed" id="value-destroyed">—</span>
                </div>
            </div>
        </section>

        <section class="zone-ship" aria-label="Wreckage">
            <div class="fit-panel">
                <div class="section-header">&gt; WRECKAGE RECOVERED</div>
                <div class="fit-groups" id="fit-groups">
                    <div class="fit-pending">&gt; ITEM ANALYSIS PENDING</div>
                </div>
            </div>
        </section>

        <section class="zone-intel" aria-label="Combat Intel">
            <div class="ship-panel">
                <div class="ship-panel-header">
                    <span>VESSEL DESTROYED</span>
                    <span class="ship-panel-status">WRECKAGE SCANNED</span>
                </div>
                <div class="ship-render-wrap">
                    <img id="ship-render-img" src="" alt="">
                    <div class="ship-render-overlay"></div>
                </div>
                <div class="ship-name-block">
                    <div class="ship-name" id="ship-name">—</div>
                    <div class="ship-value" id="ship-value">—</div>
                </div>
            </div>

            <div class="replay-panel">
                <div class="section-header">&gt; RECOVERED FOOTAGE</div>
                <div class="replay-slot" id="replay-slot">
                    <div class="replay-pending">&gt; AWAITING FOOTAGE</div>
                </div>
            </div>

            <div class="attackers-panel">
                <div class="attackers-header">
                    <span class="section-header">&gt; HOSTILES</span>
                    <span class="attacker-count" id="attacker-count">0</span>
                </div>
                <ul class="attacker-list" id="attacker-list"></ul>
                <button class="attacker-expand" id="attacker-expand" hidden>
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