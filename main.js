// ==UserScript==
// @name         Бесплатный кинопоиск
// @namespace    https://github.com/size-prog
// @version      1.0
// @description  Кнопка "Смотреть бесплатно" для фильмов и сериалов
// @author       Size
// @match        https://www.kinopoisk.ru/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const BASE  = 'https://testprosmotrfilm.duckdns.org/movie?kp=';
    const ID    = 'kp-free-btn';
    const RE    = /\/(?:film|series)\/(\d+)/;

    const SEL_CONTAINERS =
        '[data-tid="25c2fa6f"] [class*=buttonsContainer],' +
        '[data-tid="bda26fa2"] [class*=buttonsContainer],' +
        '[data-tid="d5ff4489"] [class*=buttonsContainer]';
    const SEL_BUTTONS =
        '.kinopoisk-watch-online-button,' +
        'button[title="Буду смотреть"],' +
        'a[href*="/watch/"]';
    const SEL_CLOSEST = '[class*=buttonsContainer],[class*=buttons_]';
    const SEL_GENERIC = '[class*=buttonsContainer]';

    let kpId    = null;
    let fullUrl = '';
    let ticket  = 0;
    let obs     = null;
    let rafQ    = false;
    let styled  = false;

    const getBtn = () => document.getElementById(ID);
    const isOk   = () => { const b = getBtn(); return b !== null && b.href === fullUrl; };
    const parseId = () => { const m = RE.exec(location.pathname); return m ? m[1] : null; };

    function injectCSS() {
        if (styled) return;
        styled = true;

        const s = document.createElement('style');
        s.textContent =
`#${ID}{
  display:inline-flex;align-items:center;justify-content:center;
  height:48px;padding:0 24px;
  background:linear-gradient(135deg,#f60,#e54);
  color:#fff!important;font:600 15px/1 inherit;
  border:0;border-radius:10px;
  text-decoration:none!important;cursor:pointer;white-space:nowrap;
  box-shadow:0 3px 12px #f603;
  transition:transform .18s,box-shadow .18s,filter .18s;
  will-change:transform;
}
#${ID}:hover{
  transform:translateY(-2px);
  box-shadow:0 8px 24px #f605;
  filter:brightness(1.08);
}
#${ID}:active{transform:translateY(0);box-shadow:0 2px 6px #f603}
[data-w]{display:contents}
[data-w].fb{display:block;margin:12px 0}`;

        document.head.appendChild(s);
    }

    function removeBtn() {
        const b = getBtn();
        if (!b) return;
        const w = b.parentElement;
        (w && w.hasAttribute('data-w') ? w : b).remove();
    }

    function findContainer() {
        let el = document.querySelector(SEL_CONTAINERS);
        if (el) return el;

        const btn = document.querySelector(SEL_BUTTONS);
        if (btn) {
            el = btn.closest(SEL_CLOSEST);
            if (el) return el;
        }

        return document.querySelector(SEL_GENERIC);
    }

    function insert() {
        if (!kpId) return true;
        if (isOk()) return true;

        removeBtn();

        const container = findContainer();
        const anchor    = container || document.querySelector('h1');
        if (!anchor) return false;
        injectCSS();

        const a = document.createElement('a');
        a.id     = ID;
        a.href   = fullUrl;
        a.target = '_blank';
        a.rel    = 'noopener noreferrer';
        a.textContent = '▶ Смотреть бесплатно';

        const w = document.createElement('div');
        w.setAttribute('data-w', '');
        w.appendChild(a);

        if (container) {
            container.appendChild(w);
        } else {
            w.classList.add('fb');
            anchor.after(w);
        }

        return true;
    }

    function scheduleRetry() {
        const t = ++ticket;
        let n = 0;

        (function loop() {
            if (t !== ticket) return;
            if (insert())     return;
            if (++n > 60)     return;
            requestAnimationFrame(loop);
        })();
    }

    function startObserver() {
        if (obs) return;

        obs = new MutationObserver(() => {
            if (rafQ || !kpId) return;
            rafQ = true;
            requestAnimationFrame(() => {
                rafQ = false;
                if (!isOk()) insert();
            });
        });

        obs.observe(document.body, { childList: true, subtree: true });
    }

    function stopObserver() {
        if (!obs) return;
        obs.disconnect();
        obs = null;
    }

    let lastHref = location.href;

    function onNavigate() {
        if (location.href === lastHref) return;
        lastHref = location.href;

        const newId = parseId();
        if (newId === kpId) return;

        kpId    = newId;
        fullUrl = newId ? BASE + newId : '';

        if (kpId) {
            removeBtn();
            scheduleRetry();
            startObserver();
        } else {
            removeBtn();
            stopObserver();
        }
    }

    for (const method of ['pushState', 'replaceState']) {
        const orig = history[method];
        history[method] = function () {
            orig.apply(this, arguments);
            onNavigate();
        };
    }
    window.addEventListener('popstate', onNavigate);

    kpId    = parseId();
    fullUrl = kpId ? BASE + kpId : '';

    if (kpId) {
        scheduleRetry();
        startObserver();
    }

})();