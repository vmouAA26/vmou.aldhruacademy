// Shared cart widget -- included on the homepage and every product page via
// <script src="/cart.js">. Builds its own floating pill + drawer + toast DOM on
// load so no page template needs the markup inline. Cart items are stored as full
// objects (not just codes) in localStorage so a product page can add an item to the
// cart without needing to fetch catalogue.json first.
(function() {
    var CART_KEY = 'vmou_cart';
    var BASE_PRICE = 79;
    var ORDER_ENDPOINT = "https://asia-south1-aldhru-academy-cloud.cloudfunctions.net/create-razorpay-order";
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var PHONE_RE = /^[6-9]\d{9}$/;
    var TIER_PRICES = {0: 0, 1: 79, 2: 149, 3: 215, 4: 275, 5: 330};

    function tieredTotal(n) {
        if (n <= 5) return TIER_PRICES[n] || 0;
        return 330 + (n - 5) * 63;
    }

    function getCart() {
        try {
            var raw = localStorage.getItem(CART_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function saveCart(items) {
        try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
        renderPill();
        if (!document.getElementById('vmou-cart-drawer').classList.contains('hidden')) renderDrawer();
    }

    function addToCart(item) {
        var items = getCart();
        if (items.some(function(i) { return i.code === item.code; })) {
            showToast('यह विषय पहले से ही कार्ट में है।');
            return;
        }
        items.push(item);
        saveCart(items);
        showToast('🛒 कार्ट में जोड़ा गया: ' + item.code);
    }

    function removeFromCart(code) {
        saveCart(getCart().filter(function(i) { return i.code !== code; }));
    }

    function clearCart() {
        saveCart([]);
    }

    var toastTimer = null;
    function showToast(msg) {
        var el = document.getElementById('vmou-cart-toast');
        el.textContent = msg;
        el.classList.remove('hidden');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function() { el.classList.add('hidden'); }, 2200);
    }

    function renderPill() {
        var items = getCart();
        var pill = document.getElementById('vmou-cart-pill');
        var mobileBar = document.getElementById('mobile-floating-cart');
        if (items.length === 0) {
            pill.classList.add('cart-pill-empty');
            if (mobileBar) mobileBar.classList.add('hidden');
            return;
        }
        pill.classList.remove('cart-pill-empty');
        document.getElementById('vmou-cart-pill-text').textContent =
            'कार्ट (' + items.length + ' पत्र) • ₹' + tieredTotal(items.length);
        if (mobileBar) {
            mobileBar.classList.remove('hidden');
            document.getElementById('mobile-cart-count').textContent = items.length;
            document.getElementById('mobile-cart-total').textContent = '₹' + tieredTotal(items.length);
        }
    }

    function incentiveBannerHtml(n) {
        if (n <= 0) return '';
        if (n === 1) {
            return '<div class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-center text-sm font-bold text-amber-800 mb-4">💡 1 और विषय जोड़ें और पाएं छूट!</div>';
        }
        if (n >= 2 && n <= 4) {
            var savingsNow = n * BASE_PRICE - tieredTotal(n);
            var savingsNext = (n + 1) * BASE_PRICE - tieredTotal(n + 1);
            var extra = savingsNext - savingsNow;
            return '<div class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-center text-sm font-bold text-amber-800 mb-4">🎉 1 और विषय जोड़ें और पाएं ₹' + extra + ' की अतिरिक्त छूट!</div>';
        }
        return '<div class="bg-green-50 border-2 border-green-400 rounded-2xl p-4 text-center text-sm font-bold text-green-700 mb-4">🌟 बधाई हो! आपको अधिकतम 5-पेपर बंडल छूट मिल चुकी है!</div>';
    }

    function cartItemRowHtml(item) {
        return '<div class="flex items-center justify-between gap-3 py-3 border-b border-gray-100">' +
            '<div class="min-w-0">' +
            '<span class="bg-gray-900 text-white text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide">' + item.code + '</span>' +
            '<p class="text-sm font-bold text-gray-800 mt-1.5 leading-snug">' + (item.name_hi || item.code) + '</p>' +
            '<p class="text-xs text-gray-400 font-bold mt-0.5">₹' + BASE_PRICE + '</p>' +
            '</div>' +
            '<button class="cart-remove-btn text-red-500 hover:text-red-700 text-xl leading-none font-black px-2" data-code="' + item.code + '" title="हटाएं">✕</button>' +
            '</div>';
    }

    function showSuccessState() {
        try { localStorage.setItem(CART_KEY, JSON.stringify([])); } catch (e) {}
        renderPill();
        var body = document.getElementById('vmou-cart-body');
        var countEl = document.getElementById('vmou-cart-count');
        if (countEl) countEl.textContent = '';
        if (body) {
            body.innerHTML = 
                '<div class="bg-green-50 border-2 border-green-400 rounded-2xl p-6 text-center my-6 shadow-sm">' +
                '<div class="text-5xl mb-3">✅</div>' +
                '<p class="font-black text-green-700 text-xl">पेमेंट सफल!</p>' +
                '<p class="text-gray-700 mt-2 text-sm leading-relaxed">आपकी सभी PDF <b>5 मिनट के भीतर</b> आपकी ईमेल पर भेज दी जाएँगी।</p>' +
                '<p class="text-xs text-gray-500 mt-3 font-medium">कृपया अपना Inbox और Spam/Promotions फ़ोल्डर चेक करें।</p>' +
                '<button id="vmou-cart-success-close" class="mt-6 w-full bg-[#392E7C] hover:bg-[#2d2461] text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-colors">बंद करें (Close)</button>' +
                '</div>';
            var closeBtn = document.getElementById('vmou-cart-success-close');
            if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        }
    }

    function renderDrawer() {
        var items = getCart();
        var body = document.getElementById('vmou-cart-body');
        document.getElementById('vmou-cart-count').textContent = items.length > 0 ? '(' + items.length + ')' : '';

        if (items.length === 0) {
            body.innerHTML = '<div class="text-center py-16"><div class="text-5xl mb-3">🛒</div><p class="text-gray-400 font-bold">आपका कार्ट खाली है।</p></div>';
            return;
        }

        var subtotal = items.length * BASE_PRICE;
        var total = tieredTotal(items.length);
        var discount = subtotal - total;

        var html = '<div class="mb-2">' + items.map(cartItemRowHtml).join('') + '</div>';
        html += '<button id="vmou-cart-clear" class="w-full text-center text-red-600 hover:text-red-800 font-bold text-sm py-3 mt-1">🗑️ पूरा कार्ट खाली करें (Clear Cart)</button>';
        html += incentiveBannerHtml(items.length);
        html += '<div class="bg-gray-50 rounded-2xl p-4 mb-4 space-y-1.5">' +
            '<div class="flex justify-between text-sm text-gray-600 font-bold"><span>कुल मूल्य (Subtotal)</span><span>₹' + subtotal + '</span></div>' +
            '<div class="flex justify-between text-sm text-green-600 font-bold"><span>विशेष छूट (Discount)</span><span>-₹' + discount + '</span></div>' +
            '<div class="flex justify-between text-base text-gray-900 font-black pt-1.5 border-t border-gray-200 mt-1.5"><span>भुगतान योग्य राशि (Total)</span><span>₹' + total + '</span></div>' +
            '</div>';

        html += '<div class="cart-success hidden bg-green-50 border-2 border-green-400 rounded-2xl p-5 text-center mb-4">' +
            '<p class="font-black text-green-700 text-lg">✅ पेमेंट सफल!</p>' +
            '<p class="text-gray-700 mt-1 text-sm">आपकी सभी PDF 5 मिनट के भीतर आपकी ईमेल पर भेज दी जाएँगी।</p></div>';

        html += '<form class="cart-checkout-form space-y-3">' +
            '<input type="text" class="cart-name-input w-full border-2 border-[#392E7C]/15 focus:border-[#C9A227] outline-none rounded-xl px-4 py-3 text-base font-medium" placeholder="आपका पूरा नाम *">' +
            '<input type="email" class="cart-email-input w-full border-2 border-[#392E7C]/15 focus:border-[#C9A227] outline-none rounded-xl px-4 py-3 text-base font-medium" placeholder="आपकी ईमेल आईडी *">' +
            '<input type="tel" maxlength="10" class="cart-phone-input w-full border-2 border-[#392E7C]/15 focus:border-[#C9A227] outline-none rounded-xl px-4 py-3 text-base font-medium" placeholder="आपका मोबाइल नंबर *">' +
            '<button type="button" class="cart-buy-btn w-full bg-[#392E7C] hover:bg-[#2d2461] text-white font-black text-lg px-6 py-4 rounded-2xl shadow-xl transition disabled:opacity-60">सुरक्षित भुगतान करें (₹' + total + ')</button>' +
            '<p class="cart-checkout-error hidden text-red-600 text-sm font-bold text-center"></p>' +
            '</form>';

        body.innerHTML = html;

        body.querySelectorAll('.cart-remove-btn').forEach(function(btn) {
            btn.addEventListener('click', function() { removeFromCart(btn.getAttribute('data-code')); });
        });
        document.getElementById('vmou-cart-clear').addEventListener('click', function() {
            if (confirm('क्या आप वाकई पूरा कार्ट खाली करना चाहते हैं?')) clearCart();
        });
        body.querySelector('.cart-buy-btn').addEventListener('click', onCartCheckout);
    }

    function onCartCheckout() {
        var items = getCart();
        if (items.length === 0 || !ORDER_ENDPOINT) return;
        var form = document.querySelector('.cart-checkout-form');
        var btn = form.querySelector('.cart-buy-btn');
        var nameInput = form.querySelector('.cart-name-input');
        var emailInput = form.querySelector('.cart-email-input');
        var phoneInput = form.querySelector('.cart-phone-input');
        var errorEl = form.querySelector('.cart-checkout-error');

        var name = nameInput.value.trim();
        var email = emailInput.value.trim();
        var phone = phoneInput.value.replace(/\D/g, '');
        errorEl.classList.add('hidden');
        if (!name) { nameInput.focus(); return; }
        if (!EMAIL_RE.test(email)) { emailInput.focus(); return; }
        if (!PHONE_RE.test(phone)) { phoneInput.focus(); return; }

        btn.disabled = true;
        btn.textContent = 'कृपया प्रतीक्षा करें...';

        fetch(ORDER_ENDPOINT, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                subject_codes: items.map(function(i) { return i.code; }),
                buyer_name: name, buyer_email: email, buyer_phone: phone
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data.order_id) { throw new Error(data.error || 'Order creation failed'); }
            var rzp = new Razorpay({
                key: data.key_id, amount: data.amount, currency: data.currency, order_id: data.order_id,
                name: 'Aldhru Academy', description: items.length + '-Paper Cart Order',
                prefill: { name: name, email: email, contact: phone },
                theme: { color: '#392E7C' },
                handler: function() {
                    sessionStorage.setItem('vmou_payment_success', 'true');
                    showSuccessState();
                },
                modal: { ondismiss: function() { btn.disabled = false; btn.textContent = 'सुरक्षित भुगतान करें (₹' + tieredTotal(items.length) + ')'; } }
            });
            rzp.on('payment.failed', function() {
                errorEl.textContent = 'पेमेंट असफल रहा, कृपया दोबारा कोशिश करें।';
                errorEl.classList.remove('hidden');
                btn.disabled = false;
                btn.textContent = 'सुरक्षित भुगतान करें (₹' + tieredTotal(items.length) + ')';
            });
            rzp.open();
            btn.disabled = false;
            btn.textContent = 'सुरक्षित भुगतान करें (₹' + tieredTotal(items.length) + ')';
        })
        .catch(function() {
            errorEl.textContent = 'कुछ गड़बड़ हुई, कृपया दोबारा कोशिश करें।';
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'सुरक्षित भुगतान करें (₹' + tieredTotal(items.length) + ')';
        });
    }

    function openDrawer() {
        renderDrawer();
        document.getElementById('vmou-cart-overlay').classList.remove('hidden');
        var drawer = document.getElementById('vmou-cart-drawer');
        drawer.classList.remove('hidden');
        requestAnimationFrame(function() { drawer.classList.remove('translate-x-full'); });
    }

    function closeDrawer() {
        var drawer = document.getElementById('vmou-cart-drawer');
        drawer.classList.add('translate-x-full');
        document.getElementById('vmou-cart-overlay').classList.add('hidden');
        setTimeout(function() { drawer.classList.add('hidden'); }, 300);
    }

    function injectMarkup() {
        document.body.insertAdjacentHTML('beforeend',
            '<div id="vmou-cart-overlay" class="hidden fixed inset-0 z-50 bg-black/60"></div>' +
            '<div id="vmou-cart-drawer" class="hidden fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col translate-x-full transition-transform duration-300">' +
                '<div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">' +
                    '<h3 class="font-display text-xl font-black text-gray-900">आपका कार्ट (Your Cart) <span id="vmou-cart-count" class="text-sm text-gray-400 font-bold"></span></h3>' +
                    '<button id="vmou-cart-close" class="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>' +
                '</div>' +
                '<div id="vmou-cart-body" class="flex-1 overflow-y-auto px-5 py-4"></div>' +
            '</div>' +
            '<button id="vmou-cart-pill" class="cart-pill-empty hidden sm:flex fixed bottom-6 left-6 z-40 bg-[#392E7C] hover:bg-[#2d2461] text-white font-bold px-5 py-3 rounded-full shadow-2xl items-center gap-2 transition-transform hover:scale-105">' +
                '<span>🛒</span><span id="vmou-cart-pill-text"></span>' +
            '</button>' +
            '<div id="mobile-floating-cart" class="hidden fixed bottom-4 left-4 right-4 z-40 sm:hidden">' +
                '<button onclick="openDrawer()" class="w-full bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-black py-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between text-base border border-emerald-400/30 min-h-[48px]">' +
                    '<span class="flex items-center gap-2"><span>🛒 कार्ट (<span id="mobile-cart-count">0</span>)</span></span>' +
                    '<span class="flex items-center gap-1"><span id="mobile-cart-total">₹0</span><span>ऑर्डर पूरा करें →</span></span>' +
                '</button>' +
            '</div>' +
            '<div id="vmou-cart-toast" class="hidden fixed bottom-24 left-6 z-50 bg-gray-900 text-white font-bold px-5 py-3 rounded-xl shadow-2xl text-sm max-w-[80vw]"></div>'
        );
        document.getElementById('vmou-cart-pill').addEventListener('click', openDrawer);
        document.getElementById('vmou-cart-close').addEventListener('click', closeDrawer);
        document.getElementById('vmou-cart-overlay').addEventListener('click', closeDrawer);
    }

    document.addEventListener('DOMContentLoaded', function() {
        injectMarkup();
        renderPill();
        if (sessionStorage.getItem('vmou_payment_success') === 'true') {
            sessionStorage.removeItem('vmou_payment_success');
            openDrawer();
            showSuccessState();
        }
        document.body.addEventListener('click', function(e) {
            var btn = e.target.closest('.add-cart-btn');
            if (!btn) return;
            var item;
            try { item = JSON.parse(btn.getAttribute('data-item')); } catch (err) { return; }
            addToCart(item);
        });
    });

    window.VMOU_CART = { addToCart: addToCart };
})();
