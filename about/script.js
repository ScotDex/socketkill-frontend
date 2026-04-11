const ads = [
    {
        img: 'https://edge.socketkill.com/friend.jpg',
        title: 'START YOUR EVE JOURNEY',
        text: 'New player? Get 1,000,000 skill points free',
        cta: 'CLAIM BONUS',
        url: 'https://www.eveonline.com/signup?invc=e32ca441-aa95-4eb7-ad06-d2c6334a5872'
    },
    {
        img: 'https://web-platforms.sfo2.cdn.digitaloceanspaces.com/WWW/Badge%201.svg',
        title: 'DIGITAL OCEAN HOSTING',
        text: '$200 credit for new accounts',
        cta: 'GET CREDIT',
        url: 'https://www.digitalocean.com/?refcode=1808909b79cf&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge'
    },
    {
        img: 'https://edge.socketkill.com/NoD_Stacked_White.png',
        title: 'DO YOU STREAM?',
        text: 'Discounts Available',
        cta: 'GET DEAL',
        url: 'https://nerdordie.com/shop/ref/kps2mr/'
    },
    {
        img: 'https://storage.ko-fi.com/cdn/brandasset/v2/support_me_on_kofi_dark.png',
        title: 'SUPPORT SOCKETKILL',
        text: 'Help keep these tools free',
        cta: 'DONATE',
        url: 'https://ko-fi.com/scottishdex'
    }
];

        function formatIsk(value) {
            if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T';
            if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
            if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
            return value.toLocaleString();
        }

        function formatUptime(seconds) {
            const d = Math.floor(seconds / 86400);
            const h = Math.floor((seconds % 86400) / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            return `${d}d ${h}h ${m}m`;
        }

        async function fetchStats() {
            try {
                const res = await fetch('https://ws.socketkill.com/api/stats');
                const data = await res.json();

                document.getElementById('totalScanned').innerText = data.totalScanned.toLocaleString();
                document.getElementById('totalIsk').innerText = formatIsk(data.totalIsk);
                document.getElementById('connections').innerText = data.connections;
                document.getElementById('uptime').innerText = formatUptime(data.uptime);
                document.getElementById('cacheCharacters').innerText = data.cache.characters.toLocaleString();
                document.getElementById('cacheCorporations').innerText = data.cache.corporations.toLocaleString();
                document.getElementById('cacheTypes').innerText = data.cache.types.toLocaleString();
                document.getElementById('cacheRegions').innerText = data.cache.regions.toLocaleString();
                document.getElementById('rss').innerText = data.memory.rss + ' MB';
                document.getElementById('heapUsed').innerText = data.memory.heapUsed + ' MB';
                document.getElementById('heapTotal').innerText = data.memory.heapTotal + ' MB';
                document.getElementById('last-updated').innerText = new Date().toUTCString();
            } catch (err) {
                document.getElementById('last-updated').innerText = 'FETCH FAILED';
            }
        }

        fetchStats();
        setInterval(fetchStats, 30000);

let currentAd = 0;

function renderAd() {
    const ad = ads[currentAd];
    document.getElementById('ad-slot').innerHTML = `
        <div class="ad-card">
            <img src="${ad.img}" alt="${ad.title}">
            <h3>${ad.title}</h3>
            <p>${ad.text}</p>
            <a href="${ad.url}" target="_blank" rel="noopener" class="ad-cta">${ad.cta}</a>
        </div>
    `;
}

function nextAd() {
    const card = document.querySelector('#ad-slot .ad-card');
    card.style.opacity = '0';
    setTimeout(() => {
        currentAd = (currentAd + 1) % ads.length;
        renderAd();
        document.querySelector('#ad-slot .ad-card').style.opacity = '1';
    }, 300);
}

document.querySelectorAll('.accordion-trigger').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const item = trigger.parentElement;
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });

renderAd();
setInterval(nextAd, 15000);