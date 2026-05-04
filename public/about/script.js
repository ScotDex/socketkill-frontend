// 2. Accordion Logic (Simplified)
document.addEventListener('click', (e) => {
    if (e.target.closest('.accordion-trigger')) {
        const content = e.target.closest('.accordion-item').querySelector('.accordion-content');
        content.classList.toggle('hidden');
    }
});