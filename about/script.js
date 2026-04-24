// 1. Ad Rotation Logic
const ads = [
    { img: 'https://edge.socketkill.com/friend.jpg', title: 'START YOUR EVE JOURNEY', text: 'New player? Get 1,000,000 skill points free', cta: 'CLAIM BONUS', url: 'https://www.eveonline.com/signup?invc=e32ca441-aa95-4eb7-ad06-d2c6334a5872' },
    { img: 'https://web-platforms.sfo2.cdn.digitaloceanspaces.com/WWW/Badge%201.svg', title: 'DIGITAL OCEAN HOSTING', text: '$200 credit for new accounts', cta: 'GET CREDIT', url: 'https://www.digitalocean.com/?refcode=1808909b79cf' },
    { img: 'https://edge.socketkill.com/NoD_Stacked_White.png', title: 'DO YOU STREAM?', text: 'Discounts Available', cta: 'GET DEAL', url: 'https://nerdordie.com/shop/ref/kps2mr/' },
    { img: 'https://storage.ko-fi.com/cdn/brandasset/v2/support_me_on_kofi_dark.png', title: 'SUPPORT SOCKETKILL', text: 'Help keep these tools free', cta: 'DONATE', url: 'https://ko-fi.com/scottishdex' }
];

let currentAd = 0;
function renderAd() {
    const ad = ads[currentAd];
    document.getElementById('ad-slot').innerHTML = `
        <div class="flex items-center gap-6 bg-[#0d0d14] border border-[#1a1a2e] p-5">
            <img src="${ad.img}" class="w-16 h-auto" alt="${ad.title}">
            <div class="flex-grow">
                <h3 class="text-phosphor-bright text-xs tracking-widest mb-1">${ad.title}</h3>
                <p class="text-gray-500 text-xs">${ad.text}</p>
            </div>
            <a href="${ad.url}" target="_blank" class="border border-phosphor-bright text-phosphor-bright px-4 py-2 text-xs hover:bg-phosphor-bright hover:text-black transition">${ad.cta}</a>
        </div>
    `;
}

setInterval(() => { currentAd = (currentAd + 1) % ads.length; renderAd(); }, 15000);
renderAd();

// 2. Accordion Logic (Simplified)
document.addEventListener('click', (e) => {
    if (e.target.closest('.accordion-trigger')) {
        const content = e.target.closest('.accordion-item').querySelector('.accordion-content');
        content.classList.toggle('hidden');
    }
});