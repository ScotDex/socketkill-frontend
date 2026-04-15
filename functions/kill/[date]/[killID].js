export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    // Helper to prevent HTML injection/breakage
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    // 1. Extract Data
    // Supports: /kill/2026-04-15/12345 OR /kill/?id=12345&date=2026-04-15
    const pathParts = url.pathname.split('/').filter(Boolean); // ['kill', 'date', 'id']
    
    let date = pathParts[1]; 
    let id = pathParts[2];
    
    const queryDate = url.searchParams.get('date');
    const queryId = url.searchParams.get('id');

    if (queryDate && queryId) {
        date = queryDate;
        id = queryId;
    }

    // 2. Fallback: If no ID/Date, let Cloudflare serve the static index/landing page
    if (!date || !id || date === 'index.html') {
        return context.next(); 
    }

    try {
        // 3. Fetch Combat Data
        const apiRes = await fetch(`https://ws.socketkill.com/api/kill/${date}/${id}`);
        if (!apiRes.ok) return context.next();
        const data = await apiRes.json();

        // 4. Fetch the Template
        // IMPORTANT: Rename your static index.html to template.html to avoid recursion
        const templateRes = await fetch(`${url.origin}/kill/template.html`);
        if (!templateRes.ok) return new Response("Template missing", { status: 500 });
        let html = await templateRes.text();

        // 5. Construct Metadata
        const title = `${data.victim.name} lost a ${data.victim.ship}${data.totalValue ? ` (${data.totalValue} ISK)` : ''}`;
        const desc = `${data.system.name}, ${data.system.region} — ${data.attackerCount} hostiles`;
        const img = `https://images.evetech.net/types/${data.victim.shipTypeID}/render?size=512`;
        const canonicalUrl = `${url.origin}/kill/${date}/${id}`;

        // 6. Injection Logic
        // Use esc() for text, but raw strings for URLs
        html = html
            .replaceAll('__OG_TITLE__', esc(title))
            .replaceAll('__OG_DESC__', esc(desc))
            .replaceAll('__OG_IMAGE__', img)
            .replaceAll('__OG_URL__', canonicalUrl);

        return new Response(html, {
            headers: { 
                'content-type': 'text/html; charset=utf-8',
                'cache-control': 'public, max-age=3600' 
            }
        });

    } catch (e) {
        return new Response(`Portal Error: ${e.message}`, { status: 500 });
    }
}