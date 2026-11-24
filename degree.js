// Degree page logic (loaded after /site.js). Data comes from the inline <script id="degree-data">,
// so nothing here waits for a network request -- the page can never show "failed to load".
(function () {
    var data = JSON.parse(document.getElementById('degree-data').textContent);
    var papers = data.papers;
    var tabsEl = document.getElementById('degree-tabs');
    var listEl = document.getElementById('degree-subjects');
    var areaLabels = data.area_labels || {};
    var MODE_KEY = 'vmou_view_mode';

    // Which switches make sense: semester degrees with 4+ terms can also be seen as years (2 semesters = 1 year);
    // 2-semester diplomas have nothing to group; B.Ed is natively yearly; single-term courses get no tabs.
    var modes = [];
    if (data.system === 'semester' && data.terms >= 2) modes.push('sem');
    if (data.system === 'semester' && data.terms >= 4) modes.push('year');
    if (data.system === 'year') modes.push('year');

    function unitCount(mode) {
        if (mode === 'year') return data.system === 'year' ? data.terms : Math.ceil(data.terms / 2);
        return data.terms;
    }
    function unitOf(p, mode) {
        if (mode === 'year') return data.system === 'year' ? p.term : Math.ceil(p.term / 2);
        return p.term;
    }
    function unitLabel(mode, n) {
        return (mode === 'year' ? 'वर्ष ' : 'सेमेस्टर ') + n;
    }
    function unitLabelLong(mode, n) {
        var base = (mode === 'year' ? 'वर्ष ' : 'सेमेस्टर ') + n + (mode === 'year' ? ' (Year ' : ' (Semester ') + n + ')';
        if (mode === 'year' && data.system === 'semester') base += ' — सेमेस्टर ' + (2 * n - 1) + ' + ' + (2 * n);
        return base;
    }

    var state = { mode: modes[0] || 'sem', unit: 'all' };

    function readHash() {
        var m = /^#(all|sem-(\d+)|year-(\d+))$/.exec(location.hash);
        if (m && m[1] === 'all') { state.unit = 'all'; }
        else if (m && m[2] && modes.indexOf('sem') !== -1 && +m[2] >= 1 && +m[2] <= unitCount('sem')) { state.mode = 'sem'; state.unit = +m[2]; }
        else if (m && m[3] && modes.indexOf('year') !== -1 && +m[3] >= 1 && +m[3] <= unitCount('year')) { state.mode = 'year'; state.unit = +m[3]; }
        else { state.unit = 'all'; }
        if (!m || m[1] === 'all') {
            // remembered choice only when the link itself does not say
            try {
                var saved = localStorage.getItem(MODE_KEY);
                if (saved && modes.indexOf(saved) !== -1 && state.unit === 'all') state.mode = saved;
            } catch (e) {}
        }
    }
    function go(mode, unit) {
        var h = unit === 'all' ? '#all' : '#' + mode + '-' + unit;
        if (location.hash === h) { render(); return; }
        location.hash = h;
    }
    function switchMode(mode) {
        if (mode === state.mode) return;
        var unit = state.unit;
        if (unit !== 'all') {
            if (mode === 'year') unit = Math.ceil(unit / 2);
            else unit = 2 * unit - 1;
        }
        try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
        state.mode = mode;
        go(mode, unit);
    }

    function countIn(mode, unit) {
        return papers.filter(function (p) { return unit === 'all' || unitOf(p, mode) === unit; }).length;
    }

    function renderTabs() {
        if (modes.length === 0) { tabsEl.innerHTML = ''; return; }
        var html = '';
        if (modes.length > 1) {
            html += '<div class="flex justify-center mb-3"><div class="inline-flex bg-gray-100 rounded-2xl p-1 gap-1">';
            modes.forEach(function (m) {
                var active = m === state.mode;
                html += '<button type="button" data-mode="' + m + '" class="px-4 sm:px-6 py-2.5 rounded-xl text-sm font-black transition min-h-[44px] ' +
                    (active ? 'bg-[#392E7C] text-white shadow-md' : 'text-gray-600 hover:bg-white') + '">' +
                    (m === 'sem' ? '📘 सेमेस्टर सिस्टम' : '📅 वार्षिक सिस्टम') + '</button>';
            });
            html += '</div></div>';
        }
        html += '<div class="flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:justify-center" role="tablist">';
        var chips = [['all', 'सभी विषय (All)']];
        for (var n = 1; n <= unitCount(state.mode); n++) chips.push([n, unitLabel(state.mode, n)]);
        chips.forEach(function (c) {
            var active = state.unit === c[0];
            html += '<button type="button" role="tab" data-unit="' + c[0] + '" class="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-black border transition min-h-[44px] whitespace-nowrap ' +
                (active ? 'bg-[#392E7C] text-white border-[#392E7C] shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-[#C9A227]') + '">' +
                escapeHtml(c[1]) + ' <span class="' + (active ? 'text-amber-200' : 'text-gray-400') + ' text-xs font-bold">' + countIn(state.mode, c[0]) + '</span></button>';
        });
        html += '</div>';
        tabsEl.innerHTML = html;
        tabsEl.querySelectorAll('[data-mode]').forEach(function (b) {
            b.addEventListener('click', function () { switchMode(b.getAttribute('data-mode')); });
        });
        tabsEl.querySelectorAll('[data-unit]').forEach(function (b) {
            b.addEventListener('click', function () {
                var u = b.getAttribute('data-unit');
                go(state.mode, u === 'all' ? 'all' : +u);
            });
        });
    }

    function gridHtml(list) {
        return '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-8">' + list.map(function (p) { return subjectCardHtml(p); }).join('') + '</div>';
    }
    // B.A./B.Sc.: big lists (a whole degree / year) are grouped by subject area (History, Hindi...). Inside one
    // semester every area has only 1-2 papers, so there the cards stay in one grid, each tagged with its area.
    function groupedHtml(list) {
        if (!data.multi_area) return gridHtml(list);
        var order = [], groups = {};
        list.forEach(function (p) {
            var k = p.code.split('-')[0];
            if (!groups[k]) { groups[k] = []; order.push(k); }
            groups[k].push(p);
        });
        if (order.length && list.length / order.length < 2) {
            return '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-8">' +
                list.map(function (p) { var k = p.code.split('-')[0]; return subjectCardHtml(p, areaLabels[k] || ''); }).join('') + '</div>';
        }
        return order.map(function (k) {
            return '<div class="mb-8"><h4 class="text-lg font-black text-[#392E7C] mb-3 flex items-center gap-2"><span class="w-1.5 h-6 bg-[#C9A227] rounded-full inline-block"></span>' +
                escapeHtml(areaLabels[k] || k) + ' <span class="text-xs font-bold text-gray-400">' + groups[k].length + ' विषय</span></h4>' + gridHtml(groups[k]) + '</div>';
        }).join('');
    }
    function mediumBarHtml(list) {
        if (!list.some(function (p) { return p.dual_medium; })) return '';
        var m = window.selectedScienceMedium || 'HI';
        var on = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-[#392E7C] text-white shadow-md transition';
        var off = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 transition';
        return '<div class="mb-6 bg-amber-50/90 border-2 border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">' +
            '<div class="text-center sm:text-left"><div class="text-sm sm:text-base font-black text-gray-900">🌐 बुकलेट उत्तर का माध्यम चुनें (Select Booklet Medium)</div>' +
            '<div class="text-xs text-gray-600 font-medium">दोनों माध्यमों में प्रश्न द्विभाषी (Hindi + English) हैं • उत्तर आपके चुने गए माध्यम में होंगे</div></div>' +
            '<div class="flex items-center gap-2"><button type="button" data-global-med="HI" onclick="setAllScienceMedium(\'HI\')" class="' + (m === 'HI' ? on : off) + '">🇮🇳 हिंदी माध्यम</button>' +
            '<button type="button" data-global-med="EN" onclick="setAllScienceMedium(\'EN\')" class="' + (m === 'EN' ? on : off) + '">🇬🇧 English Medium</button></div></div>';
    }

    function render() {
        renderTabs();
        var html = '';
        var shown;
        if (modes.length === 0) {
            shown = papers;
            html = groupedHtml(papers);
        } else if (state.unit === 'all') {
            shown = papers;
            for (var n = 1; n <= unitCount(state.mode); n++) {
                var part = papers.filter(function (p) { return unitOf(p, state.mode) === n; });
                if (!part.length) continue;
                html += '<section class="mb-10"><h3 class="font-display text-xl sm:text-2xl font-black text-gray-900 mb-4 pb-2 border-b-2 border-[#C9A227]/40">' +
                    escapeHtml(unitLabelLong(state.mode, n)) + ' <span class="text-sm font-bold text-gray-400">' + part.length + ' विषय</span></h3>' + groupedHtml(part) + '</section>';
            }
        } else {
            shown = papers.filter(function (p) { return unitOf(p, state.mode) === state.unit; });
            html = '<h3 class="font-display text-xl sm:text-2xl font-black text-gray-900 mb-4 pb-2 border-b-2 border-[#C9A227]/40">' +
                escapeHtml(unitLabelLong(state.mode, state.unit)) + ' <span class="text-sm font-bold text-gray-400">' + shown.length + ' विषय</span></h3>' + groupedHtml(shown);
            if (!shown.length) html += '<p class="text-center text-gray-500 font-bold py-10">इस भाग में अभी कोई विषय सूचीबद्ध नहीं है।</p>';
        }
        listEl.innerHTML = mediumBarHtml(shown) + html;
    }

    // share buttons
    var copyBtn = document.getElementById('copy-link-btn');
    if (copyBtn) copyBtn.addEventListener('click', function () {
        var done = function () { copyBtn.textContent = '✅ लिंक कॉपी हो गया'; setTimeout(function () { copyBtn.textContent = '🔗 लिंक कॉपी करें'; }, 2000); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(done, function () { window.prompt('लिंक कॉपी करें:', location.href); });
        else window.prompt('लिंक कॉपी करें:', location.href);
    });
    var waBtn = document.getElementById('wa-share-btn');
    if (waBtn) waBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var text = data.share_text + ' ' + location.href;
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    });

    window.addEventListener('hashchange', function () { readHash(); render(); });
    readHash();
    render();
})();
