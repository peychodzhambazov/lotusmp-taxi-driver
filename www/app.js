/* LOTUS MP – Такси Шофьор (Android приложение) */
(function () {
  'use strict';

  // Сървърите се пробват по ред; работещият се запомня.
  var BASES = ['https://lotusmp.eu'];
  var CAP = window.Capacitor;
  var NATIVE = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
  var Tracker = NATIVE && CAP.Plugins ? CAP.Plugins.Tracker : null;
  var PREVIEW = /[?&]preview=1/.test(location.search);

  var SVG = {
    car: '<svg viewBox="0 0 24 24"><path d="M18.9 6c-.2-.6-.8-1-1.4-1h-11c-.7 0-1.2.4-1.4 1L3 12v8c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h12v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-8l-2.1-6zM6.5 16c-.8 0-1.5-.7-1.5-1.5S5.7 13 6.5 13s1.5.7 1.5 1.5S7.3 16 6.5 16zm11 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>'
  };

  var I18N = {
    bg: {
      app: 'Такси Шофьор', city: 'Кърджали', loginT: 'Вход за шофьори', loginP: 'Покажете колата си на картата на Кърджали и получавайте обаждания от клиенти наблизо.', phone: 'Телефон', password: 'Парола', enter: 'Вход', newDriver: 'Нов шофьор? Регистрация', haveAcc: 'Имате профил? Вход',
      regT: 'Регистрация', regP: 'LOTUS MP проверява всеки шофьор, преди колата да се покаже на картата.', name: 'Име и фамилия', email: 'Имейл (по желание)', firm: 'Таксиметрова фирма', permit: '№ на разрешително / удостоверение', permitH: 'Издадено от общината за таксиметров превоз', car: 'Марка и модел', color: 'Цвят', plate: 'Рег. номер', callPhone: 'Телефон за клиентите (по желание)', callH: 'Ако клиентите трябва да звънят на диспечера – въведете неговия номер.', pass6: 'Поне 6 символа',
      consent1: 'Приемам ', contract: 'Договора за абонамент', consent2: ' ({d} дни безплатно, после {p} € на месец) и ', terms: 'Условията', consent3: '. Колата и местоположението ми се виждат на картата само докато съм на смяна, включително при изключен екран.', promo: 'Първите {d} дни са безплатни. После {p} € на месец, без автоматично подновяване.', trialUntil: 'Безплатен период до', daysLeft: 'остават {n} дни', afterTrial: 'След безплатния период: {p} € на месец.', expSoon: 'Абонаментът изтича след {n} дни. За подновяване ({p} € на месец) се свържете с LOTUS MP.', shiftTime: 'На смяна от', share: 'Сподели картата с клиенти', shareT: 'Кажете на клиентите', shareP: 'Колкото повече хора ползват картата, толкова повече обаждания получавате.', shareMsg: 'Такси в Кърджали? Вижте най-близкото свободно такси на картата:', sysStopped: 'Смяната беше спряна от телефона. Натиснете „Започни смяна“ отново и проверете настройките за батерията.', register: 'Изпрати заявка', required: 'Попълнете задължителните полета и приемете условията.',
      pendT: 'Заявката е получена', pendP: 'LOTUS MP ще провери данните ви и ще одобри профила. След това ще видите бутона „Започни смяна“.', check: 'Провери отново', logout: 'Изход', support: 'Обадете се на LOTUS MP',
      subOk: 'Абонамент до', subNo: 'Абонаментът е изтекъл', subNoP: 'Колата ви не се показва на картата. За подновяване се свържете с LOTUS MP.',
      start: 'ЗАПОЧНИ СМЯНА', startS: 'натиснете, за да ви виждат клиентите', end: 'Край на смяната', free: 'Свободен', busy: 'Зает', freeBig: 'СВОБОДЕН', busyBig: 'ЗАЕТ', visible: 'клиентите ви виждат', gps: 'GPS точност', sent: 'Последен сигнал', ago: 'преди', sec: 'сек', min: 'мин', waitGps: 'чакам GPS…', live: 'на живо', notLive: 'няма сигнал',
      bgOk: 'Работи и при изключен екран. Можете да заключите телефона.', battT: 'Разрешете работа на заден план', battP: 'За да ви виждат клиентите и при заключен телефон, разрешете на приложението да работи без ограничения на батерията.', battB: 'Разреши', battX: 'На Xiaomi, Huawei и Oppo включете и „Автоматично стартиране“ за приложението в Настройки.',
      permT: 'Нужно е разрешение за местоположение', permP: 'Изберете „Докато използвате приложението“ и „Точно местоположение“.', openSet: 'Отвори настройките',
      outArea: 'Извън района на Кърджали – колата не се показва.', net: 'Няма интернет – опитвам отново…',
      stats: 'Обаждания от приложението', today: 'днес', d7: '7 дни', d30: '30 дни', clients: 'Карта за клиенти', confirmEnd: 'Да приключи ли смяната? Колата ще изчезне от картата.', confirmOut: 'Да изляза ли от профила? Смяната ще спре.', blocked: 'Профилът е спрян. Свържете се с LOTUS MP.',
      update: 'Има нова версия', updateB: 'Изтегли', noServer: 'Няма връзка със сървъра. Проверете интернета.', retry: 'Опитай пак', resumed: 'Смяната продължава.', notif: 'Разрешете известията, за да виждате бутоните „Свободен / Зает / Край“ и при заключен екран.'
    },
    tr: {
      app: 'Taksi Şoför', city: 'Kırcaali', loginT: 'Şoför girişi', loginP: 'Aracınızı Kırcaali haritasında gösterin ve yakındaki müşterilerden arama alın.', phone: 'Telefon', password: 'Şifre', enter: 'Giriş', newDriver: 'Yeni şoför müsünüz? Kayıt olun', haveAcc: 'Hesabınız var mı? Giriş',
      regT: 'Kayıt', regP: 'LOTUS MP, aracı haritada göstermeden önce her şoförü kontrol eder.', name: 'Ad Soyad', email: 'E-posta (isteğe bağlı)', firm: 'Taksi firması', permit: 'Ruhsat / belge no', permitH: 'Belediyenin verdiği taksi izni', car: 'Marka ve model', color: 'Renk', plate: 'Plaka', callPhone: 'Müşteriler için telefon (isteğe bağlı)', callH: 'Müşteriler santrali arayacaksa onun numarasını girin.', pass6: 'En az 6 karakter',
      consent1: '', contract: 'Abonelik sözleşmesini', consent2: ' ({d} gün ücretsiz, sonra ayda {p} €) ve ', terms: 'Koşulları', consent3: ' kabul ediyorum. Aracım ve konumum yalnızca vardiyadayken, ekran kapalıyken de, haritada görünür.', promo: 'İlk {d} gün ücretsiz. Sonra ayda {p} €, otomatik yenileme yok.', trialUntil: 'Ücretsiz dönem bitişi', daysLeft: '{n} gün kaldı', afterTrial: 'Ücretsiz dönemden sonra: ayda {p} €.', expSoon: 'Abonelik {n} gün sonra bitiyor. Yenilemek için (ayda {p} €) LOTUS MP ile iletişime geçin.', shiftTime: 'Vardiya süresi', share: 'Haritayı müşterilerle paylaş', shareT: 'Müşterilere söyleyin', shareP: 'Haritayı ne kadar çok kişi kullanırsa o kadar çok arama alırsınız.', shareMsg: 'Kırcaali\'de taksi mi lazım? En yakın boş taksiyi haritada görün:', sysStopped: 'Vardiya telefon tarafından durduruldu. Tekrar «Vardiyayı başlat»a dokunun ve pil ayarlarını kontrol edin.', register: 'Başvuruyu gönder', required: 'Zorunlu alanları doldurun ve koşulları kabul edin.',
      pendT: 'Başvurunuz alındı', pendP: 'LOTUS MP bilgilerinizi kontrol edip profilinizi onaylayacak. Sonra "Vardiyayı başlat" düğmesini göreceksiniz.', check: 'Tekrar kontrol et', logout: 'Çıkış', support: 'LOTUS MP\'yi arayın',
      subOk: 'Abonelik bitişi', subNo: 'Abonelik sona erdi', subNoP: 'Aracınız haritada görünmüyor. Yenilemek için LOTUS MP ile iletişime geçin.',
      start: 'VARDİYAYI BAŞLAT', startS: 'müşterilerin sizi görmesi için dokunun', end: 'Vardiyayı bitir', free: 'Boş', busy: 'Dolu', freeBig: 'BOŞ', busyBig: 'DOLU', visible: 'müşteriler sizi görüyor', gps: 'GPS hassasiyeti', sent: 'Son sinyal', ago: '', sec: 'sn önce', min: 'dk önce', waitGps: 'GPS bekleniyor…', live: 'canlı', notLive: 'sinyal yok',
      bgOk: 'Ekran kapalıyken de çalışır. Telefonu kilitleyebilirsiniz.', battT: 'Arka planda çalışmaya izin verin', battP: 'Telefon kilitliyken de görünmek için uygulamanın pil kısıtlaması olmadan çalışmasına izin verin.', battB: 'İzin ver', battX: 'Xiaomi, Huawei ve Oppo\'da Ayarlar\'dan "Otomatik başlatma"yı da açın.',
      permT: 'Konum izni gerekli', permP: '"Uygulamayı kullanırken" ve "Hassas konum" seçin.', openSet: 'Ayarları aç',
      outArea: 'Kırcaali bölgesi dışındasınız – araç gösterilmiyor.', net: 'Bağlantı yok – tekrar deneniyor…',
      stats: 'Uygulamadan gelen aramalar', today: 'bugün', d7: '7 gün', d30: '30 gün', clients: 'Müşteri haritası', confirmEnd: 'Vardiya bitirilsin mi? Araç haritadan kaybolacak.', confirmOut: 'Çıkış yapılsın mı? Vardiya duracak.', blocked: 'Profil durduruldu. LOTUS MP ile iletişime geçin.',
      update: 'Yeni sürüm var', updateB: 'İndir', noServer: 'Sunucuya bağlanılamıyor. İnterneti kontrol edin.', retry: 'Tekrar dene', resumed: 'Vardiya devam ediyor.', notif: 'Kilit ekranında "Boş / Dolu / Bitir" düğmelerini görmek için bildirimlere izin verin.'
    },
    en: {
      app: 'Taxi Driver', city: 'Kardzhali', loginT: 'Driver login', loginP: 'Show your car on the Kardzhali map and get calls from nearby customers.', phone: 'Phone', password: 'Password', enter: 'Log in', newDriver: 'New driver? Register', haveAcc: 'Have an account? Log in',
      regT: 'Registration', regP: 'LOTUS MP checks every driver before the car appears on the map.', name: 'Full name', email: 'Email (optional)', firm: 'Taxi company', permit: 'Permit / certificate no.', permitH: 'Issued by the municipality', car: 'Make and model', color: 'Colour', plate: 'Plate no.', callPhone: 'Phone for customers (optional)', callH: 'If customers should call the dispatcher, enter that number.', pass6: 'At least 6 characters',
      consent1: 'I accept the ', contract: 'Subscription contract', consent2: ' ({d} days free, then {p} € per month) and the ', terms: 'Terms', consent3: '. My car and location are shown on the map only while I am on shift, including with the screen off.', promo: 'The first {d} days are free. Then {p} € per month, no automatic renewal.', trialUntil: 'Free period until', daysLeft: '{n} days left', afterTrial: 'After the free period: {p} € per month.', expSoon: 'Your subscription ends in {n} days. To renew ({p} € per month) contact LOTUS MP.', shiftTime: 'On shift for', share: 'Share the map with customers', shareT: 'Tell your customers', shareP: 'The more people use the map, the more calls you get.', shareMsg: 'Need a taxi in Kardzhali? See the nearest free taxi on the map:', sysStopped: 'The shift was stopped by the phone. Tap Start shift again and check the battery settings.', register: 'Send request', required: 'Fill in the required fields and accept the terms.',
      pendT: 'Request received', pendP: 'LOTUS MP will check your details and approve your profile. Then you will see "Start shift".', check: 'Check again', logout: 'Log out', support: 'Call LOTUS MP',
      subOk: 'Subscription until', subNo: 'Subscription expired', subNoP: 'Your car is not shown on the map. Contact LOTUS MP to renew.',
      start: 'START SHIFT', startS: 'tap so customers can see you', end: 'End shift', free: 'Free', busy: 'Busy', freeBig: 'FREE', busyBig: 'BUSY', visible: 'customers can see you', gps: 'GPS accuracy', sent: 'Last signal', ago: '', sec: 's ago', min: 'min ago', waitGps: 'waiting for GPS…', live: 'live', notLive: 'no signal',
      bgOk: 'Works with the screen off. You can lock the phone.', battT: 'Allow background work', battP: 'To stay visible while the phone is locked, let the app run without battery restrictions.', battB: 'Allow', battX: 'On Xiaomi, Huawei and Oppo also enable "Autostart" for the app in Settings.',
      permT: 'Location permission needed', permP: 'Choose "While using the app" and "Precise location".', openSet: 'Open settings',
      outArea: 'Outside the Kardzhali area – your car is not shown.', net: 'No connection – retrying…',
      stats: 'Calls from the app', today: 'today', d7: '7 days', d30: '30 days', clients: 'Customer map', confirmEnd: 'End the shift? Your car will disappear from the map.', confirmOut: 'Log out? The shift will stop.', blocked: 'Profile suspended. Contact LOTUS MP.',
      update: 'New version available', updateB: 'Download', noServer: 'Cannot reach the server. Check the internet.', retry: 'Try again', resumed: 'Shift resumed.', notif: 'Allow notifications to see the "Free / Busy / End" buttons on the lock screen.'
    }
  };

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  var lang = ls('lmp_lang') || ((navigator.language || 'bg').slice(0, 2).toLowerCase() === 'tr' ? 'tr' : 'bg');
  if (!I18N[lang]) lang = 'bg';
  function t(k) { var d = I18N[lang]; return d && d[k] != null ? d[k] : (I18N.bg[k] != null ? I18N.bg[k] : k); }
  function tf(k, o) { return t(k).replace(/\{(\w)\}/g, function (m, a) { return o[a] != null ? o[a] : m; }); }
  function days() { return (config && config.pilot_days) || 60; }
  function price() { return (profile && profile.price) || (config && config.price_month) || '2'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }

  var base = 'https://lotusmp.eu'; ls('lmp_base', null);
  var token = ls('lmp_token');
  var config = null, profile = null, nstate = null, appVersion = '';
  var screen = 'loading', msg = '', msgType = 'err';
  var root = $('root');

  function api(path, body) {
    var h = { 'Content-Type': 'application/json' };
    if (token) h['X-LMP-Token'] = token;
    return fetch(base + '/wp-json/lmp/v1/taxi/' + path, { method: 'POST', headers: h, body: JSON.stringify(body || {}), cache: 'no-store' })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var e = new Error(j.message || 'Error'); e.code = j.code; e.status = r.status; throw e; }
          return j;
        });
      });
  }

  function findServer() {
    var list = base ? [base].concat(BASES.filter(function (b) { return b !== base; })) : BASES.slice();
    var i = 0;
    function next() {
      if (i >= list.length) return Promise.reject(new Error('noserver'));
      var b = list[i++];
      var ctl = window.AbortController ? new AbortController() : null;
      var tmo = setTimeout(function () { if (ctl) ctl.abort(); }, 7000);
      return fetch(b + '/wp-json/lmp/v1/taxi/config?t=' + Date.now(), { method: 'GET', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function (r) { clearTimeout(tmo); return r; })
        .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
        .then(function (j) { if (!j || !j.ok) throw new Error('bad'); base = b; ls('lmp_base', b); config = j; return j; })
        .catch(next);
    }
    return next();
  }

  function openUrl(u) {
    if (Tracker) Tracker.openUrl({ url: u }); else window.open(u, '_blank');
  }

  /* ---------- Изгледи ---------- */
  function top() {
    return '<header class="top"><img src="icon-192.png" alt=""><div class="t"><b>' + esc(t('app')) + '</b><small>LOTUS MP · ' + esc(t('city')) + '</small></div>' +
      '<select id="lang" class="chip" aria-label="Language"><option value="bg">BG</option><option value="tr">TR</option><option value="en">EN</option></select></header>';
  }
  function note() { return msg ? '<div class="msg ' + msgType + '">' + esc(msg) + '</div>' : ''; }
  function field(id, label, type, extra, hint) {
    return '<label class="f"><span>' + esc(label) + '</span><input id="' + id + '" type="' + (type || 'text') + '" ' + (extra || '') + '>' + (hint ? '<em>' + esc(hint) + '</em>' : '') + '</label>';
  }
  function supportBtn() {
    var s = config && config.support_phone;
    return s ? '<button class="btn ghost" style="margin-top:10px" data-url="tel:' + esc(s.replace(/\s/g, '')) + '">' + SVG.phone + esc(t('support')) + '</button>' : '';
  }
  function fmtDate(ts) { var d = new Date(ts * 1000); function p(n) { return (n < 10 ? '0' : '') + n; } return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear(); }
  function cmpVer(a, b) { a = String(a || '0').split('.'); b = String(b || '0').split('.'); for (var i = 0; i < 3; i++) { var x = +a[i] || 0, y = +b[i] || 0; if (x !== y) return x > y ? 1 : -1; } return 0; }
  function updateBanner() {
    if (!config || !config.app_version || !config.app_url || !appVersion || cmpVer(config.app_version, appVersion) <= 0) return '';
    return '<div class="msg ok">' + esc(t('update')) + ': ' + esc(config.app_version) + '<button class="btn gold" data-url="' + esc(config.app_url) + '">' + esc(t('updateB')) + '</button></div>';
  }
  function foot() {
    var h = '<div class="foot"><button data-url="' + esc((config && config.client) || (base + '/taxi/')) + '">' + esc(t('clients')) + '</button><button data-url="' + esc((config && config.terms) || (base + '/taxi-usloviya/')) + '">' + esc(t('terms')) + '</button>';
    if (token) h += '<button id="logout">' + esc(t('logout')) + '</button>';
    return h + '</div><div class="ver">LOTUS MP · v' + esc(appVersion || '1.0.0') + '</div>';
  }

  function render() {
    var h = top() + '<main>';
    if (screen === 'loading') {
      h += '<div class="spin"></div>';
    } else if (screen === 'offline') {
      h += '<div class="card center"><h1>' + esc(t('app')) + '</h1><p>' + esc(t('noServer')) + '</p><button id="retry" class="btn gold">' + esc(t('retry')) + '</button></div>';
    } else if (screen === 'login') {
      h += updateBanner() + '<div class="card"><h1>' + esc(t('loginT')) + '</h1><p>' + esc(t('loginP')) + '</p>' + note() +
        '<form id="f-login">' + field('l-phone', t('phone'), 'tel', 'autocomplete="tel" inputmode="tel" placeholder="08…" required') + field('l-pass', t('password'), 'password', 'autocomplete="current-password" required') +
        '<button class="btn gold" type="submit">' + esc(t('enter')) + '</button></form>' +
        '<div class="msg ok" style="margin:14px 0 0">' + esc(tf('promo', { d: days(), p: price() })) + '</div>' +
        '<p class="center" style="margin:12px 0 0"><button class="lnk" id="go-reg" type="button">' + esc(t('newDriver')) + '</button></p></div>';
    } else if (screen === 'register') {
      h += '<div class="card"><h1>' + esc(t('regT')) + '</h1><p>' + esc(t('regP')) + '</p>' + note() + '<form id="f-reg">' +
        field('r-name', t('name') + ' *', 'text', 'autocomplete="name"') +
        '<div class="g2">' + field('r-phone', t('phone') + ' *', 'tel', 'inputmode="tel" placeholder="08…"') + field('r-pass', t('password') + ' *', 'password', 'autocomplete="new-password"', t('pass6')) + '</div>' +
        field('r-email', t('email'), 'email', 'autocomplete="email"') +
        field('r-firm', t('firm') + ' *', 'text', '') +
        field('r-permit', t('permit'), 'text', '', t('permitH')) +
        '<div class="g2">' + field('r-car', t('car') + ' *', 'text', 'placeholder="Skoda Octavia"') + field('r-color', t('color'), 'text', '') + '</div>' +
        field('r-plate', t('plate') + ' *', 'text', 'placeholder="К 1234 АВ" style="text-transform:uppercase"') +
        field('r-cphone', t('callPhone'), 'tel', 'inputmode="tel"', t('callH')) +
        '<label class="chk"><input id="r-consent" type="checkbox"><span>' + esc(t('consent1')) + '<a href="#" data-url="' + esc((config && config.contract) || (base + '/taxi-dogovor/')) + '">' + esc(t('contract')) + '</a>' + esc(tf('consent2', { d: days(), p: price() })) + '<a href="#" data-url="' + esc((config && config.terms) || (base + '/taxi-usloviya/')) + '">' + esc(t('terms')) + '</a>' + esc(t('consent3')) + '</span></label>' +
        '<button class="btn gold" type="submit">' + esc(t('register')) + '</button></form>' +
        '<p class="center" style="margin:12px 0 0"><button class="lnk" id="go-login" type="button">' + esc(t('haveAcc')) + '</button></p></div>';
    } else if (screen === 'pending') {
      h += '<div class="card center"><div class="av" style="margin:0 auto 14px">' + SVG.car + '</div><h1>' + esc(t('pendT')) + '</h1><p>' + esc(t('pendP')) + '</p>' + note() +
        '<p style="color:var(--ink);font-weight:700">' + esc(profile.name) + ' · ' + esc(profile.firm) + ' · ' + esc(profile.plate) + '</p>' +
        '<button id="refresh" class="btn gold">' + esc(t('check')) + '</button>' + supportBtn() + '</div>';
    } else if (screen === 'main') {
      h += updateBanner() + mainHtml();
    }
    h += foot() + '</main><div id="toast" class="toast"></div>';
    root.innerHTML = h;
    bind();
  }

  function onShift() { return nstate && nstate.shift; }
  function status() { return (nstate && nstate.status) || 'free'; }

  function subHtml(p) {
    if (!p.active) return '<div class="sub no"><span>' + esc(t('subNo')) + '</span></div><p style="margin:12px 0 0">' + esc(t('subNoP')) + ' ' + esc(tf('afterTrial', { p: price() })) + '</p>' + supportBtn();
    var left = Math.max(0, Math.ceil((p.paid_until - Date.now() / 1000) / 86400));
    var h = '<div class="sub ok"><span>' + esc(p.trial ? t('trialUntil') : t('subOk')) + '</span><span>' + fmtDate(p.paid_until) + '</span></div>';
    if (p.trial) {
      var pct = Math.max(3, Math.min(100, Math.round(left / days() * 100)));
      h += '<div class="bar"><i style="width:' + pct + '%"></i></div><div class="barl"><span>' + esc(tf('daysLeft', { n: left })) + '</span><span>' + esc(tf('afterTrial', { p: price() })) + '</span></div>';
    }
    if (left <= 7) h += '<div class="msg warn" style="margin:12px 0 0">' + esc(tf('expSoon', { n: left, p: price() })) + '</div>' + supportBtn();
    return h;
  }

  function mainHtml() {
    var p = profile, h = '';
    h += '<div class="card"><div class="who"><div class="av">' + SVG.car + '</div><div><b>' + esc(p.name) + '</b><span>' + esc(p.firm) + ' · ' + esc([p.car, p.color].filter(Boolean).join(' ')) + '</span><br><span class="plate">' + esc(p.plate) + '</span></div></div>' +
      subHtml(p) + '</div>';
    if (p.active) {
      h += '<div class="card shift">' + note() + '<div id="warn"></div>';
      if (!onShift()) {
        h += '<button id="start" class="ring start"><span class="in">' + SVG.play + '<b>' + esc(t('start')) + '</b><small>' + esc(t('startS')) + '</small></span></button>';
      } else {
        var b = status() === 'busy';
        h += '<div class="ring ' + (b ? 'b' : 'f') + '"><span class="in">' + SVG.car + '<b>' + esc(b ? t('busyBig') : t('freeBig')) + '</b><small id="livelbl"></small></span></div>' +
          '<div class="seg"><button id="s-free" class="sf' + (b ? '' : ' on') + '">' + esc(t('free')) + '</button><button id="s-busy" class="sb' + (b ? ' on' : '') + '">' + esc(t('busy')) + '</button></div>' +
          '<div class="info three"><div>' + esc(t('shiftTime')) + '<b id="i-time">—</b></div><div>' + esc(t('gps')) + '<b id="i-acc">—</b></div><div>' + esc(t('sent')) + '<b id="i-sent">—</b></div></div>' +
          '<button id="end" class="btn ghost">' + SVG.stop + esc(t('end')) + '</button>';
      }
      h += '</div>';
      h += '<div id="batt"></div>';
    }
    if (p.active) h += '<div class="card"><h2>' + esc(t('shareT')) + '</h2><p>' + esc(t('shareP')) + '</p><button class="btn dark" id="share">' + esc(t('share')) + '</button></div>';
    h += '<div class="card"><h2>' + esc(t('stats')) + '</h2><div class="kpis"><div><b>' + (p.calls_today || 0) + '</b><span>' + esc(t('today')) + '</span></div><div><b>' + (p.calls_7d || 0) + '</b><span>' + esc(t('d7')) + '</span></div><div><b>' + (p.calls_30d || 0) + '</b><span>' + esc(t('d30')) + '</span></div></div></div>';
    return h;
  }

  // Обновява само малките части без да прерисува целия екран.
  function tickInfo() {
    if (screen !== 'main' || !nstate) return;
    var acc = $('i-acc'), sent = $('i-sent'), live = $('livelbl'), warn = $('warn'), batt = $('batt');
    var now = nstate.now || Date.now();
    var tm = $('i-time');
    if (tm) { var st0 = +ls('lmp_shift_start') || now; var mm = Math.max(0, Math.floor((now - st0) / 60000)); tm.textContent = Math.floor(mm / 60) + ':' + (mm % 60 < 10 ? '0' : '') + (mm % 60); }
    if (acc) acc.textContent = nstate.fix ? '±' + Math.round(nstate.acc) + ' m' : t('waitGps');
    if (sent) {
      if (!nstate.sent) sent.textContent = '—';
      else { var s = Math.max(0, Math.round((now - nstate.sent) / 1000)); sent.textContent = s < 90 ? (t('ago') ? t('ago') + ' ' : '') + s + ' ' + t('sec') : (t('ago') ? t('ago') + ' ' : '') + Math.round(s / 60) + ' ' + t('min'); }
    }
    var isLive = nstate.sent && now - nstate.sent < 60000 && !nstate.error;
    if (live) live.innerHTML = '<span class="live' + (isLive ? '' : ' off') + '">' + esc(isLive ? t('visible') : t('notLive')) + '</span>';
    if (warn) {
      var w = '', e = nstate.error;
      if (e === 'out_of_area') w = '<div class="msg warn">' + esc(t('outArea')) + '</div>';
      else if (e === 'net') w = '<div class="msg warn">' + esc(t('net')) + '</div>';
      else if (e === 'permission' && !onShift()) w = '<div class="msg err">' + esc(t('sysStopped')) + '</div>';
      else if (onShift() && !nstate.location) w = '<div class="msg err"><b>' + esc(t('permT')) + '</b><br>' + esc(t('permP')) + '<button class="btn dark" id="w-set">' + esc(t('openSet')) + '</button></div>';
      if (warn.innerHTML !== w) { warn.innerHTML = w; var ws = $('w-set'); if (ws) ws.onclick = function () { Tracker && Tracker.openSettings(); }; }
    }
    if (batt) {
      var bh = '';
      if (NATIVE && nstate.battery === false) {
        bh = '<div class="card"><h2>' + esc(t('battT')) + '</h2><p>' + esc(t('battP')) + '</p><button class="btn gold" id="b-req">' + esc(t('battB')) + '</button><p style="margin:12px 0 0;font-size:13px">' + esc(t('battX')) + '</p></div>';
      } else if (NATIVE && onShift()) {
        bh = '<div class="msg ok">' + esc(t('bgOk')) + '</div>';
      }
      if (batt.getAttribute('data-h') !== bh) { batt.setAttribute('data-h', bh); batt.innerHTML = bh; var br = $('b-req'); if (br) br.onclick = function () { Tracker.requestBattery(); }; }
    }
  }

  function toast(m) { var el = $('toast'); if (!el) return; el.textContent = m; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('on'); }, 3000); }

  function bind() {
    var sel = $('lang');
    if (sel) { sel.value = lang; sel.onchange = function () { lang = this.value; ls('lmp_lang', lang); document.documentElement.lang = lang; if (Tracker && onShift()) Tracker.setStatus({ lang: lang }); render(); tickInfo(); }; }
    [].forEach.call(root.querySelectorAll('[data-url]'), function (el) { el.onclick = function (e) { e.preventDefault(); var u = el.getAttribute('data-url'); if (u) openUrl(u); }; });
    on('go-reg', function () { msg = ''; screen = 'register'; render(); });
    on('go-login', function () { msg = ''; screen = 'login'; render(); });
    on('retry', boot);
    on('logout', function () { if (confirm(t('confirmOut'))) logout(); });
    on('refresh', function () { refresh(); });
    on('start', startShift);
    on('share', function () { var u = (config && config.client) || (base + '/taxi/'); if (Tracker && Tracker.share) Tracker.share({ text: t('shareMsg') + ' ' + u }); else if (navigator.share) navigator.share({ text: t('shareMsg') + ' ' + u }); });
    on('s-free', function () { setStatus('free'); });
    on('s-busy', function () { setStatus('busy'); });
    on('end', function () { if (confirm(t('confirmEnd'))) endShift(); });
    var fl = $('f-login');
    if (fl) fl.onsubmit = function (e) {
      e.preventDefault();
      var b = fl.querySelector('button'); b.disabled = true;
      api('login', { phone: $('l-phone').value, password: $('l-pass').value }).then(gotAuth)
        .catch(function (err) { b.disabled = false; msg = err.message; msgType = 'err'; render(); });
    };
    var fr = $('f-reg');
    if (fr) fr.onsubmit = function (e) {
      e.preventDefault();
      var v = function (id) { return ($(id).value || '').trim(); };
      if (!v('r-name') || !v('r-phone') || $('r-pass').value.length < 6 || !v('r-firm') || !v('r-car') || !v('r-plate') || !$('r-consent').checked) { msg = t('required'); msgType = 'err'; keepForm(); return; }
      var b = fr.querySelector('button[type=submit]'); b.disabled = true;
      api('register', { contract: (config && config.contract_ver) || '', name: v('r-name'), phone: v('r-phone'), password: $('r-pass').value, email: v('r-email'), firm: v('r-firm'), permit: v('r-permit'), car: v('r-car'), color: v('r-color'), plate: v('r-plate'), call_phone: v('r-cphone'), consent: 1 })
        .then(gotAuth).catch(function (err) { b.disabled = false; msg = err.message; msgType = 'err'; keepForm(); });
    };
  }
  function on(id, fn) { var el = $(id); if (el) el.onclick = fn; }
  function keepForm() {
    var vals = {};
    [].forEach.call(root.querySelectorAll('input'), function (i) { vals[i.id] = i.type === 'checkbox' ? i.checked : i.value; });
    render();
    Object.keys(vals).forEach(function (id) { var i = $(id); if (!i) return; if (i.type === 'checkbox') i.checked = vals[id]; else i.value = vals[id]; });
    scrollTo(0, 0);
  }

  /* ---------- Профил ---------- */
  function gotAuth(j) { token = j.token; ls('lmp_token', token); profile = j.profile; msg = ''; route(); }
  function route() {
    if (!profile) screen = 'login';
    else if (profile.status === 'pending') screen = 'pending';
    else if (profile.status === 'blocked') { msg = t('blocked'); msgType = 'err'; localLogout(); screen = 'login'; }
    else screen = 'main';
    if (screen === 'main' && !profile.active && onShift()) endShift(true);
    render();
    tickInfo();
    // Смяната е била активна (напр. след рестарт на телефона) – продължава сама.
    if (screen === 'main' && profile.active && nstate && nstate.shift && !nstate.running && Tracker) {
      Tracker.start({ api: base + '/wp-json/lmp/v1/taxi/', token: token, status: nstate.status || 'free', lang: lang }).then(function (s) { nstate = s; render(); tickInfo(); toast(t('resumed')); }).catch(function () {});
    }
  }
  function refresh() {
    if (!token) { screen = 'login'; render(); return Promise.resolve(); }
    return api('me').then(function (j) { profile = j.profile; if (j.support_phone && config) config.support_phone = j.support_phone; msg = ''; route(); })
      .catch(function (err) {
        if (err.status === 401) { localLogout(); screen = 'login'; render(); }
        else if (!profile) { screen = 'offline'; render(); }
      });
  }
  function localLogout() { token = null; ls('lmp_token', null); profile = null; if (Tracker) Tracker.logout(); nstate = null; }
  function logout() { var tk = token; if (tk) api('logout').catch(function () {}); localLogout(); msg = ''; screen = 'login'; render(); }

  /* ---------- Смяна ---------- */
  function startShift() {
    if (!Tracker) { toast('Android'); return; }
    var btn = $('start'); if (btn) btn.disabled = true;
    Tracker.prepare().then(function (r) {
      if (!r.ok) { msg = t('permT') + '. ' + t('permP'); msgType = 'err'; render(); Tracker.openSettings(); return; }
      if (r.notifications === false) toast(t('notif'));
      return Tracker.start({ api: base + '/wp-json/lmp/v1/taxi/', token: token, status: 'free', lang: lang }).then(function (s) {
        nstate = s; msg = ''; ls('lmp_shift_start', String(Date.now())); render(); tickInfo();
        if (navigator.vibrate) navigator.vibrate(80);
        if (s.battery === false) setTimeout(function () { Tracker.requestBattery(); }, 600);
      });
    }).catch(function (e) { msg = String(e && e.message || e); msgType = 'err'; render(); });
  }
  function setStatus(st) {
    if (!Tracker || status() === st) return;
    Tracker.setStatus({ status: st, lang: lang }).then(function (s) { nstate = s; render(); tickInfo(); if (navigator.vibrate) navigator.vibrate(50); });
  }
  function endShift(silent) {
    if (!Tracker) return;
    ls('lmp_shift_start', null);
    Tracker.stop().then(function (s) { nstate = s; nstate.shift = false; if (!silent) { render(); tickInfo(); } });
  }

  function pollState() {
    if (!Tracker || document.hidden) return;
    Tracker.getState().then(function (s) {
      var was = nstate;
      nstate = s;
      if (s.error === 'auth') { localLogout(); screen = 'login'; render(); return; }
      if (s.error === 'inactive' && was && was.error !== 'inactive') { msg = s.errorMsg || t('subNo'); msgType = 'err'; refresh(); return; }
      if (profile && s.callsToday >= 0 && s.callsToday !== profile.calls_today) { profile.calls_today = s.callsToday; if (screen === 'main') { render(); } }
      if (!was || was.shift !== s.shift || was.status !== s.status) { if (screen === 'main') render(); }
      tickInfo();
    }).catch(function () {});
  }

  /* ---------- Старт ---------- */
  function boot() {
    screen = 'loading'; render();
    if (PREVIEW) {
      config = { ok: true, support_phone: '+359 888 000 000', app_version: '', app_url: '', pilot_days: 60, price_month: '2' };
      profile = { name: 'Иван Петров', firm: 'Такси Родопи', car: 'Skoda Octavia', color: 'жълта', plate: 'К 1234 АВ', status: 'approved', active: true, paid_until: Date.now() / 1000 + 20 * 86400, calls_today: 4, calls_7d: 23, calls_30d: 91, trial: true, price: '2' };
      token = 'x'; nstate = /shift/.test(location.search) ? { shift: true, running: true, status: /busy/.test(location.search) ? 'busy' : 'free', sent: Date.now() - 6000, now: Date.now(), fix: 1, acc: 6, battery: true, location: true, error: '' } : { shift: false, battery: false, location: true };
      screen = 'main'; render(); tickInfo(); return;
    }
    var st = Tracker ? Tracker.getState().then(function (s) { nstate = s; }).catch(function () {}) : Promise.resolve();
    var info = Tracker ? Tracker.appInfo().then(function (r) { appVersion = r.version || ''; }).catch(function () {}) : Promise.resolve();
    Promise.all([st, info]).then(findServer).then(function () {
      if (token) return refresh();
      screen = 'login'; render();
    }).catch(function () {
      // Без интернет: ако смяната вече върви, показваме я; иначе – екран за повторен опит.
      screen = 'offline'; render();
    });
  }

  document.documentElement.lang = lang;
  setInterval(pollState, 2000);
  setInterval(function () { if (token && !document.hidden && screen === 'main') refresh(); }, 120000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { pollState(); if (token && screen === 'main') refresh(); } });
  boot();
})();
