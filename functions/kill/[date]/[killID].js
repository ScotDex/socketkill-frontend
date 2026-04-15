export async function onRequest(context) {
    const { request, params } = context;
    const { date, killID } = params;
    const url = new URL(request.url);

    // Helper to prevent pilot names from breaking HTML
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    try {
        // 1. Fetch data from your API
        const apiRes = await fetch(`https://ws.socketkill.com/api/kill/${date}/${killID}`);
        if (!apiRes.ok) return new Response('Kill not found', { status: 404 });
        const data = await apiRes.json();

        // 2. Fetch your actual LIVE index.html file
        // This grabs the file you already have on your server
        const templateRes = await fetch(`${url.origin}/kill/index.html`);
        let html = await templateRes.text();

        // 3. Prepare the data
        const title = `${data.victim.name} | ${data.victim.ship}`;
        const desc = `${data.system.name} — ${data.totalValue ? data.totalValue + ' ISK' : 'Record Archived'}`;
        const image = `https://images.evetech.net/types/${data.victim.shipTypeID}/render?size=512`;
        const canonical = `${url.origin}/kill/${date}/${killID}`;

        // 4. Inject into the placeholders you already have in index.html
        html = html
            .replaceAll('__OG_TITLE__', esc(title))
            .replaceAll('__OG_DESC__', esc(desc))
            .replaceAll('__OG_IMAGE__', image)
            .replaceAll('__OG_URL__', canonical);

        // 5. Serve the full, modified page
        return new Response(html, {
            headers: { 
                'content-type': 'text/html; charset=utf-8',
                'cache-control': 'public, max-age=3600'
            }
        });

    } catch (err) {
        return new Response(`Portal Error: ${err.message}`, { status: 500 });
    }
}