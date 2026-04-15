export async function onRequest(context) {
    const { params, request } = context;
    const { date, killID } = params;

    // Validate
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Response('Invalid date', { status: 400 });
    }
    const id = parseInt(killID);
    if (!Number.isFinite(id) || id <= 0) {
        return new Response('Invalid killID', { status: 400 });
    }

    try {
        // Fetch your existing kill data from your API
        const apiRes = await fetch(`https://ws.socketkill.com/api/kill/${date}/${id}`);
        if (!apiRes.ok) {
            return new Response('Kill not found', { status: 404 });
        }
        const data = await apiRes.json();

        // Build the page with OG tags + body
        const title = `${data.victim.name} lost a ${data.victim.ship}${data.totalValue ? ` (${data.totalValue} ISK)` : ''}`;
        const description = `${data.system.name}, ${data.system.region} — ${data.attackerCount} ${data.attackerCount === 1 ? 'attacker' : 'attackers'}`;
        const image = `https://images.evetech.net/types/${data.victim.shipTypeID}/render?size=512`;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)} | Socket.Kill</title>
    <meta name="description" content="${esc(description)}">

    <meta property="og:type" content="article">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="https://socketkill.com/kill/${date}/${id}">
    <meta property="og:site_name" content="Socket.Kill">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${image}">

    <link rel="icon" type="image/png" href="https://edge.socketkill.com/favicon.png">
    <link rel="stylesheet" href="https://socketkill.com/style.css">
    <link rel="stylesheet" href="https://socketkill.com/kill/base.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800&family=Share+Tech+Mono&display=swap" rel="stylesheet">
</head>
<body>
    <p>Loading kill page...</p>
    <script>
        // Redirect to the existing static kill page with query params
        window.location.replace('/kill/?id=${id}&date=${date}');
    </script>
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

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}