export async function onRequest(context) {
    const { params } = context;
    const { date, killID } = params;
    const id = parseInt(killID);

    try {
        // 1. Fetch API Data
        const apiRes = await fetch(`https://ws.socketkill.com/api/kill/${date}/${id}`);
        if (!apiRes.ok) return new Response('Kill not found', { status: 404 });
        const data = await apiRes.json();

        // 2. Fetch the actual STATIC HTML template from your origin/KV
        // Replace with your actual asset URL
        const templateRes = await fetch(`${new URL(context.request.url).origin}/kill/template.html`);
        let html = await templateRes.text();

        // 3. Dynamic Metadata
        const title = `${data.victim.name} lost a ${data.victim.ship}${data.totalValue ? ` (${data.totalValue} ISK)` : ''}`;
        const description = `${data.system.name}, ${data.system.region} — ${data.attackerCount} attackers`;
        const image = `https://images.evetech.net/types/${data.victim.shipTypeID}/render?size=512`;

        // 4. Inject into the HTML (Simple String Replace)
        html = html
            .replace(/<title>.*?<\/title>/, `<title>${esc(title)} | Socket.Kill</title>`)
            .replace('__OG_TITLE__', esc(title))
            .replace('__OG_DESC__', esc(description))
            .replace('__OG_IMAGE__', image)
            .replace('__OG_URL__', `https://socketkill.com/kill/${date}/${id}`);

        return new Response(html, {
            headers: { 'content-type': 'text/html; charset=utf-8' }
        });

    } catch (err) {
        return new Response(`Error: ${err.message}`, { status: 500 });
    }
}