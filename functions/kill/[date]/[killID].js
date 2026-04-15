export async function onRequest(context) {
    const { params } = context;
    const { date, killID } = params;

    // Helper function for HTML escaping
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Response('Invalid date', { status: 400 });
    }

    const id = parseInt(killID);
    if (!Number.isFinite(id) || id <= 0) {
        return new Response('Invalid killID', { status: 400 });
    }

    try {
        const apiRes = await fetch(`https://ws.socketkill.com/api/kill/${date}/${id}`);
        if (!apiRes.ok) return new Response('Kill not found', { status: 404 });
        
        const data = await apiRes.json();

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
    <meta name="twitter:card" content="summary_large_image">
    <link rel="stylesheet" href="https://socketkill.com/style.css">
</head>
<body>
    <p>Loading kill page...</p>
    <script>
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