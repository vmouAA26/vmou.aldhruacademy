// Shared by the homepage and every degree page (one source for the subject cards).
// Loaded as a plain <script src="/site.js"> BEFORE the page's own inline script, so these
// functions always exist when the page draws (this ordering is what the 2026-11-24 hotfix relies on).
function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
}
// catalogue.json paths are relative ("products/x.html"); pages in /degrees/ need them absolute.
function absUrl(p) {
    if (!p) return p;
    return /^(https?:|\/)/.test(p) ? p : '/' + p;
}
        window.selectedScienceMedium = 'HI';
        window.setCardMedium = function(code, med) {
            const card = document.querySelector(`[data-card-code="${code}"]`);
            if (!card) return;
            const hiBtn = card.querySelector('[data-med-pill="HI"]');
            const enBtn = card.querySelector('[data-med-pill="EN"]');
            if (hiBtn && enBtn) {
                const isHi = (med === 'HI');
                hiBtn.className = isHi
                    ? 'px-2.5 py-1.5 rounded-lg text-xs font-black bg-[#392E7C] text-white shadow-sm transition flex-1'
                    : 'px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition flex-1';
                enBtn.className = !isHi
                    ? 'px-2.5 py-1.5 rounded-lg text-xs font-black bg-[#392E7C] text-white shadow-sm transition flex-1'
                    : 'px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition flex-1';
            }
            const viewLink = card.querySelector('.card-view-link');
            if (viewLink) {
                const baseHref = viewLink.getAttribute('data-base-link');
                viewLink.setAttribute('href', `${baseHref}?medium=${med}`);
            }
            const coverImg = card.querySelector('[data-card-cover]');
            if (coverImg) {
                const src = coverImg.getAttribute(med === 'EN' ? 'data-cover-en' : 'data-cover-hi');
                if (src) coverImg.setAttribute('src', src);
            }
            const cartBtn = card.querySelector('.add-cart-btn');
            if (cartBtn) {
                const baseItem = JSON.parse(cartBtn.getAttribute('data-base-item'));
                const medCode = `${baseItem.code}-${med}`;
                const medLabel = med === 'HI' ? `${baseItem.name_hi} (हिंदी माध्यम)` : `${baseItem.name_en} (English Medium)`;
                cartBtn.setAttribute('data-item', JSON.stringify({
                    code: medCode, name_hi: medLabel, name_en: baseItem.name_en, price: baseItem.price, degree: baseItem.degree
                }));
            }
        };
        window.setAllScienceMedium = function(med) {
            window.selectedScienceMedium = med;
            document.querySelectorAll('[data-global-med]').forEach(btn => {
                const active = btn.getAttribute('data-global-med') === med;
                btn.className = active
                    ? 'px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-[#392E7C] text-white shadow-md transition'
                    : 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 transition';
            });
            document.querySelectorAll('[data-card-code]').forEach(card => {
                window.setCardMedium(card.getAttribute('data-card-code'), med);
            });
        };

        function subjectCardHtml(c, tag) {
            const link = absUrl(c.link);
            // optional 2nd argument: small label next to the code (e.g. the subject area); ignored when it is not a string (forEach/map pass an index)
            const areaTag = (typeof tag === 'string' && tag) ? `<span class="ml-2 inline-block bg-[#392E7C]/10 text-[#392E7C] text-[11px] font-black px-2.5 py-1 rounded-full align-middle">${escapeHtml(tag)}</span>` : '';
            let purchaseButtons;
            const med = window.selectedScienceMedium || 'HI';
            if (c.available) {
                const baseItemObj = {code: c.code, name_hi: c.name_hi, name_en: c.name_en, price: c.price, degree: c.degree};
                const baseItemJson = JSON.stringify(baseItemObj).replace(/'/g, "&#39;");
                if (c.dual_medium) {
                    const initCode = `${c.code}-${med}`;
                    const initLabel = med === 'HI' ? `${c.name_hi} (हिंदी माध्यम)` : `${c.name_en} (English Medium)`;
                    const initItemJson = JSON.stringify({code: initCode, name_hi: initLabel, name_en: c.name_en, price: c.price, degree: c.degree}).replace(/'/g, "&#39;");
                    const hiCls = med === 'HI' ? 'bg-[#392E7C] text-white font-black shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold';
                    const enCls = med === 'EN' ? 'bg-[#392E7C] text-white font-black shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold';
                    purchaseButtons = `<div class="bg-[#392E7C]/5 p-2 rounded-xl border border-[#392E7C]/15 mb-1">
                        <div class="text-[11px] font-bold text-[#392E7C] text-center mb-1.5">🌐 माध्यम चुनें (Select Medium):</div>
                        <div class="flex gap-1.5">
                            <button type="button" data-med-pill="HI" onclick="setCardMedium('${c.code}','HI')" class="px-2.5 py-1.5 rounded-lg text-xs transition flex-1 ${hiCls}">🇮🇳 हिंदी</button>
                            <button type="button" data-med-pill="EN" onclick="setCardMedium('${c.code}','EN')" class="px-2.5 py-1.5 rounded-lg text-xs transition flex-1 ${enCls}">🇬🇧 English</button>
                        </div>
                    </div>
                    <a href="${link}?medium=${med}" data-base-link="${link}" class="card-view-link w-full block bg-[#392E7C] hover:bg-[#2d2461] text-white font-bold px-6 py-3.5 rounded-xl shadow-md transition transform hover:scale-105 text-center min-h-[44px]">PDF देखें ➔</a>
                    <button class="add-cart-btn w-full bg-white border-2 border-[#392E7C]/20 hover:border-[#C9A227] text-[#392E7C] font-bold px-6 py-3 rounded-xl transition text-sm min-h-[44px]" data-base-item='${baseItemJson}' data-item='${initItemJson}'>🛒 कार्ट में जोड़ें</button>`;
                } else {
                    purchaseButtons = `<a href="${link}" class="w-full block bg-[#392E7C] hover:bg-[#2d2461] text-white font-bold px-6 py-3.5 rounded-xl shadow-md transition transform hover:scale-105 text-center min-h-[44px]">PDF देखें ➔</a>
                        <button class="add-cart-btn w-full bg-white border-2 border-[#392E7C]/20 hover:border-[#C9A227] text-[#392E7C] font-bold px-6 py-3 rounded-xl transition text-sm min-h-[44px]" data-item='${baseItemJson}'>🛒 कार्ट में जोड़ें</button>`;
                }
            } else if (c.status === 'unbuildable') {
                purchaseButtons = `<a href="${link}" class="w-full block bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold px-3 py-3 rounded-xl transition text-center text-xs min-h-[44px] flex items-center justify-center">📋 केवल प्रायोगिक/प्रोजेक्ट (विवरण)</a>`;
            } else {
                purchaseButtons = `<a href="${link}" class="w-full block bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 font-bold px-3 py-3 rounded-xl transition text-center text-xs min-h-[44px] flex items-center justify-center">⏳ जल्द उपलब्ध होगा (Coming Soon)</a>`;
            }
            let coverHtml = '';
            if (c.available && (c.cover || c.cover_hi)) {
                const first = absUrl(c.dual_medium ? ((med === 'EN' ? c.cover_en : c.cover_hi) || c.cover_hi || c.cover_en) : c.cover);
                const medAttrs = c.dual_medium ? ` data-cover-hi="${absUrl(c.cover_hi) || first}" data-cover-en="${absUrl(c.cover_en) || first}"` : '';
                coverHtml = `<a href="${link}${c.dual_medium ? '?medium=' + med : ''}" class="block -mx-4 -mt-4 sm:-mx-8 sm:-mt-8 mb-4 aspect-[4/3] overflow-hidden bg-gray-50 border-b border-gray-100" aria-label="${c.code} booklet">
                    <img data-card-cover src="${first}"${medAttrs} alt="${c.code} booklet cover" width="480" height="679" loading="lazy" decoding="async" class="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-500" onerror="this.parentElement.remove()">
                </a>`;
            }
            return `<div data-card-code="${c.code}" class="card-in bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-100 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#392E7C]/8 to-[#C9A227]/10 rounded-bl-full -z-10 group-hover:scale-125 transition-transform duration-500"></div>
                <div class="z-10">
                    ${coverHtml}
                    <span class="bg-gray-900 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md">${c.code}</span>${areaTag}
                    <h4 class="text-lg font-bold text-gray-900 mt-6 mb-2 leading-snug">${escapeHtml(c.name_hi)}</h4>
                    ${c.dual_medium ? '<p class="text-xs font-semibold text-gray-500 mb-4">' + escapeHtml(c.name_en) + '</p>' : '<div class="mb-4"></div>'}
                </div>
                <div class="mt-auto pt-4 border-t border-gray-100 z-10 w-full flex flex-col gap-2">
                    ${purchaseButtons}
                </div>
            </div>`;
        }

