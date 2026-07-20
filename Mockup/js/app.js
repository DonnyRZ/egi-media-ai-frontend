/* Shared app shell & utilities — EGI Media */
(function () {
  'use strict';

  var PERSIST_KEY = 'egi-media-news-dashboard-mockup-v7';

  function hydrateState() {
    try {
      var stored = window.localStorage.getItem(PERSIST_KEY);
      if (!stored) return;
      var snapshot = JSON.parse(stored);
      ['issues', 'alerts', 'emails', 'saved', 'team', 'companyContext', 'notifications', 'billing', 'user'].forEach(function (key) {
        if (snapshot[key] !== undefined) EGI[key] = snapshot[key];
      });
      if (snapshot.activeCompanyId) EGI.state.activeCompanyId = snapshot.activeCompanyId;
      if (typeof snapshot.onboardingComplete === 'boolean') {
        EGI.state.onboardingComplete = snapshot.onboardingComplete;
      }
    } catch (e) {
      // Prototype state is optional; a malformed snapshot should not block the app.
    }
  }

  function persistState() {
    try {
      window.localStorage.setItem(PERSIST_KEY, JSON.stringify({
        issues: EGI.issues,
        alerts: EGI.alerts,
        emails: EGI.emails,
        saved: EGI.saved,
        team: EGI.team,
        companyContext: EGI.companyContext,
        notifications: EGI.notifications,
        billing: EGI.billing,
        user: EGI.user,
        activeCompanyId: EGI.state.activeCompanyId,
        onboardingComplete: !!EGI.state.onboardingComplete
      }));
    } catch (e) {
      // Local storage is best effort for this static prototype.
    }
  }

  hydrateState();
  window.addEventListener('beforeunload', persistState);

  const icons = {
    layout: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
    bell: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    file: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
    bookmark: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
    settings: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    search: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    building: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>',
    chevron: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    x: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    menu: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>',
    arrowUp: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>',
    minus: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>',
    external: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    user: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    logOut: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
    credit: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',
    help: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    message: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
    empty: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="9" x2="15" y1="13" y2="13"/><line x1="9" x2="15" y1="17" y2="17"/></svg>',
    fileText: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
    star: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 20 9.27 16 14.14 17.18 21.02 12 17.77 6.82 21.02 8 14.14 4 9.27 8.91 8.26 12 2"/></svg>',
    chart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16v-5"/><path d="M12 16v-9"/><path d="M17 16V8"/></svg>',
    alertTriangle: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    eye: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>',
    listChecks: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>',
    brain: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.337 7a3 3 0 0 0 .538 5.5"/><path d="M20.125 7a3 3 0 0 1-.538 5.5"/><path d="M12 18a4 4 0 0 0-4-4h8a4 4 0 0 0-4 4"/></svg>',
    lightbulb: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
    folder: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
    more: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    arrowRight: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>'
  };

  window.EGIIcons = icons;

  var FEEDBACK_OPTIONS = [
    'Relevan',
    'Tidak relevan',
    'Prioritas terlalu tinggi',
    'Prioritas terlalu rendah',
    'Analisis kurang tepat',
    'Isu duplikat',
    'Tidak perlu dipantau lagi'
  ];

  function getActiveCompany() {
    return EGI.companies.find(function (c) { return c.id === EGI.state.activeCompanyId; }) || EGI.companies[0];
  }

  function priorityBadge(priority) {
    var map = {
      tinggi: { cls: 'meta-priority-tinggi', label: 'Prioritas Tinggi' },
      sedang: { cls: 'meta-priority-sedang', label: 'Prioritas Sedang' },
      rendah: { cls: 'meta-priority-rendah', label: 'Prioritas Rendah' }
    };
    var p = map[priority] || map.sedang;
    return '<span class="meta-tag meta-priority ' + p.cls + '">' + p.label + '</span>';
  }

  function statusBadge(status) {
    var labels = { baru: 'Baru', berkembang: 'Berkembang', dipantau: 'Dipantau', selesai: 'Selesai' };
    return '<span class="meta-tag meta-status meta-status-' + status + '">' + (labels[status] || status) + '</span>';
  }

  function reviewBadge(status) {
    var labels = {
      draft: 'Draf',
      'in-review': 'Ditinjau',
      approved: 'Disetujui',
      shared: 'Dibagikan',
      'needs-review': 'Perlu ditinjau'
    };
    var cls = String(status || '').replace(/[^a-z-]/g, '');
    return '<span class="meta-tag meta-review meta-review-' + cls + '">' + (labels[status] || status) + '</span>';
  }

  function toast(message, type) {
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.setAttribute('role', 'status');
    el.innerHTML = icons.check + '<span>' + message + '</span>';
    container.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.2s';
      setTimeout(function () { el.remove(); }, 200);
    }, 2800);
  }

  function clearMenuPosition(menu) {
    if (!menu) return;
    menu.style.position = '';
    menu.style.top = '';
    menu.style.left = '';
    menu.style.right = '';
    menu.style.bottom = '';
    menu.style.width = '';
    menu.style.minWidth = '';
    menu.style.maxWidth = '';
    menu.style.maxHeight = '';
    menu.style.zIndex = '';
  }

  function positionViewportMenu(trigger, menu, preferredWidth) {
    if (!trigger || !menu) return;
    var pad = 12;
    var gap = 8;
    var rect = trigger.getBoundingClientRect();
    var width = Math.min(preferredWidth || 380, Math.max(260, window.innerWidth - pad * 2));
    var maxHeight = Math.max(220, window.innerHeight - rect.bottom - gap - pad);

    menu.style.position = 'fixed';
    menu.style.zIndex = '90';
    menu.style.width = width + 'px';
    menu.style.minWidth = width + 'px';
    menu.style.maxWidth = width + 'px';
    menu.style.right = 'auto';

    var left = rect.right - width;
    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
    menu.style.left = left + 'px';

    var openUp = rect.bottom + gap + 200 > window.innerHeight && rect.top > window.innerHeight - rect.bottom;
    if (openUp) {
      menu.style.top = 'auto';
      menu.style.bottom = (window.innerHeight - rect.top + gap) + 'px';
      menu.style.maxHeight = Math.max(220, rect.top - gap - pad) + 'px';
    } else {
      menu.style.bottom = 'auto';
      menu.style.top = (rect.bottom + gap) + 'px';
      menu.style.maxHeight = maxHeight + 'px';
    }
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu.open').forEach(function (m) {
      m.classList.remove('open');
      clearMenuPosition(m);
      var trigger = m.previousElementSibling;
      if (trigger && trigger.setAttribute) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function setExpanded(btn, menu, open) {
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (menu) {
      menu.classList.toggle('open', open);
      if (!open) clearMenuPosition(menu);
    }
  }

  function showPageLoading(done) {
    var overlay = document.getElementById('page-loading');
    if (!overlay) return done && done();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(function () {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      if (done) done();
    }, 450);
  }

  function getEmailsForActiveCompany() {
    var companyId = EGI.state.activeCompanyId;
    return (EGI.emails || []).filter(function (email) {
      return !email.companyIds || email.companyIds.indexOf(companyId) !== -1;
    }).sort(function (a, b) {
      return new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime();
    });
  }

  function getUnreadEmailCount() {
    return getEmailsForActiveCompany().filter(function (email) { return !email.read; }).length;
  }

  function emailTypeLabel(type) {
    return type === 'ringkasan' ? 'Ringkasan Harian' : 'Alert Urgent';
  }

  function refreshNotifUI() {
    var unread = getUnreadEmailCount();
    var menu = document.getElementById('notif-menu');
    var btn = document.getElementById('notif-btn');
    if (menu) menu.innerHTML = notifPanelHtml();
    if (btn) {
      var dot = btn.querySelector('.notif-dot');
      if (unread && !dot) btn.insertAdjacentHTML('beforeend', '<span class="notif-dot"></span>');
      if (!unread && dot) dot.remove();
    }
    var badge = document.querySelector('.nav-item[href="Alerts.html"] .nav-badge');
    var link = document.querySelector('.nav-item[href="Alerts.html"]');
    if (badge) {
      if (unread) badge.textContent = unread;
      else badge.remove();
    } else if (unread && link) {
      link.insertAdjacentHTML('beforeend', '<span class="nav-badge">' + unread + '</span>');
    }
    bindNotifPanelEvents();
  }

  function notifPanelHtml() {
    var unread = getUnreadEmailCount();
    var items = getEmailsForActiveCompany().slice(0, 5);
    var list;

    if (!items.length) {
      list = '<div class="notif-empty">Tidak ada email peringatan baru untuk konteks perusahaan ini.</div>';
    } else {
      list = items.map(function (email) {
        return (
          '<button type="button" class="notif-item' + (!email.read ? ' unread' : '') + '" data-email-preview="' + email.id + '">' +
            '<div class="notif-item-body">' +
              '<div class="notif-item-top"><span class="notif-type">' + emailTypeLabel(email.type) + '</span></div>' +
              '<div class="notif-item-title">' + escapeHtml(email.subject) + '</div>' +
              '<div class="notif-item-summary">' + escapeHtml(email.preview) + '</div>' +
              '<div class="notif-item-time">' + escapeHtml(email.sentLabel) +
                (!email.read ? ' · <span class="notif-unread-label">Belum dibaca</span>' : '') +
              '</div>' +
            '</div>' +
          '</button>'
        );
      }).join('');
    }

    return (
      '<div class="notif-panel">' +
        '<div class="notif-panel-header">' +
          '<div><strong>Email peringatan</strong><span>' + (unread ? unread + ' belum dibaca' : 'Semua sudah dibaca') + '</span></div>' +
          (unread ? '<button type="button" class="btn btn-ghost btn-sm" id="notif-mark-all">Tandai semua dibaca</button>' : '') +
        '</div>' +
        '<div class="notif-panel-list">' + list + '</div>' +
      '</div>'
    );
  }

  function openEmailFromAnywhere(emailId) {
    var email = (EGI.emails || []).find(function (item) { return item.id === emailId; });
    if (!email) return;
    closeAllDropdowns();
    window.location.href = 'Alerts.html?email=' + encodeURIComponent(email.id);
  }

  function bindNotifPanelEvents() {
    var markAll = document.getElementById('notif-mark-all');
    if (markAll) {
      markAll.onclick = function (e) {
        e.stopPropagation();
        getEmailsForActiveCompany().forEach(function (email) { email.read = true; });
        toast('Semua email peringatan ditandai telah dibaca', 'success');
        refreshNotifUI();
      };
    }
    document.querySelectorAll('[data-email-preview]').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        openEmailFromAnywhere(this.getAttribute('data-email-preview'));
      };
    });
  }

  function openFeedbackPicker(contextLabel) {
    openModal({
      title: 'Berikan feedback',
      small: true,
      subtitle: contextLabel ? '<span class="form-hint">' + escapeHtml(contextLabel) + '</span>' : '',
      body:
        '<p class="modal-lead">Pilih penilaian Anda. Feedback membantu menyempurnakan relevansi insight.</p>' +
        '<div class="feedback-grid">' +
          FEEDBACK_OPTIONS.map(function (f) {
            return '<button type="button" class="feedback-choice" data-feedback="' + f + '">' + f + '</button>';
          }).join('') +
        '</div>' +
        '<div class="form-group full" style="margin-top:14px">' +
          '<label for="feedback-note">Catatan (opsional)</label>' +
          '<textarea id="feedback-note" rows="2" placeholder="Tambahkan konteks singkat..."></textarea>' +
        '</div>',
      footer:
        '<button type="button" class="btn btn-secondary" id="feedback-cancel">Batal</button>'
    });
    document.getElementById('feedback-cancel').onclick = closeModal;
    document.querySelectorAll('.feedback-choice').forEach(function (btn) {
      btn.onclick = function () {
        var note = (document.getElementById('feedback-note').value || '').trim();
        toast('Feedback terkirim: ' + this.getAttribute('data-feedback') + (note ? ' — catatan disimpan' : ''), 'success');
        closeModal();
      };
    });
  }

  function openSourcePreview(source) {
    openModal({
      title: source.title,
      subtitle: '<span class="source-preview-meta">' + escapeHtml(source.date) + ' · ' + escapeHtml(source.author) + ' · Redaksi EGI Media</span>',
      body:
        '<div class="source-preview-card">' +
          '<div class="source-preview-kicker">Fakta yang didukung artikel ini</div>' +
          '<p>' + escapeHtml(source.claim) + '</p>' +
        '</div>' +
        '<p class="form-hint" style="margin-top:14px">Artikel asli tersimpan di arsip editorial EGI Media dan dapat dibuka saat terhubung ke CMS publikasi.</p>',
      footer:
        '<button type="button" class="btn btn-secondary" id="source-close">Tutup</button>' +
        '<button type="button" class="btn btn-primary" id="source-open">' + icons.external + ' Buka artikel asli</button>'
    });
    document.getElementById('source-close').onclick = closeModal;
    document.getElementById('source-open').onclick = function () {
      toast('Membuka artikel di arsip EGI Media', 'success');
      closeModal();
    };
  }

  function renderShell(options) {
    options = options || {};
    var active = options.active || 'dashboard';
    var pageTitle = options.pageTitle || 'Executive Dashboard';
    var showSearch = options.showSearch !== false;
    var company = getActiveCompany();
    var unread = getUnreadEmailCount();

    var nav = [
      { id: 'dashboard', href: 'Executive-Summary.html', label: 'Executive Dashboard', icon: icons.layout },
      { id: 'alerts', href: 'Alerts.html', label: 'Alerts', icon: icons.bell, badge: unread },
      { id: 'reports', href: 'Reports.html', label: 'Reports', icon: icons.file },
      { id: 'saved', href: 'Saved.html', label: 'Saved', icon: icons.bookmark }
    ];

    var navHtml = nav.map(function (item) {
      var badge = item.badge ? '<span class="nav-badge">' + item.badge + '</span>' : '';
      return '<a class="nav-item' + (active === item.id ? ' active' : '') + '" href="' + item.href + '">' +
        item.icon + '<span>' + item.label + '</span>' + badge + '</a>';
    }).join('');

    var companyItems = EGI.companies.map(function (c) {
      return (
        '<button type="button" class="company-option' + (c.id === company.id ? ' active' : '') + '" data-company="' + c.id + '">' +
          '<span class="company-option-icon">' + icons.building + '</span>' +
          '<span class="company-option-text">' +
            '<strong>' + escapeHtml(c.name) + '</strong>' +
            '<span>' + escapeHtml(c.industry) + '</span>' +
          '</span>' +
          (c.id === company.id ? '<span class="company-option-check">' + icons.check + '</span>' : '') +
        '</button>'
      );
    }).join('');

    var searchHtml = showSearch ? (
      '<div class="header-search">' +
        '<div class="search-input-wrap">' +
          icons.search +
          '<input type="search" id="global-search" placeholder="Cari isu, topik, atau laporan..." autocomplete="off" />' +
          '<button type="button" class="search-clear" id="search-clear" aria-label="Hapus pencarian">' + icons.x + '</button>' +
        '</div>' +
        '<div class="search-suggestions" id="search-suggestions" role="listbox"></div>' +
      '</div>'
    ) : '';

    return (
      '<aside class="sidebar" id="sidebar">' +
        '<a class="sidebar-logo" href="Executive-Summary.html" aria-label="EGI Media — News Insight Assistant">' +
          '<img src="Asset/Logo_EGI-Media.png" alt="EGI Media" class="sidebar-logo-img" />' +
          '<span class="sidebar-logo-text">' +
            '<span class="logo-title">News Insight</span>' +
            '<span class="logo-sub">Assistant</span>' +
          '</span>' +
        '</a>' +
        '<nav class="sidebar-nav">' + navHtml + '</nav>' +
        '<div class="sidebar-footer">' +
          '<a class="nav-item' + (active === 'settings' ? ' active' : '') + '" href="Settings.html">' +
            icons.settings + '<span>Settings</span></a>' +
        '</div>' +
      '</aside>' +
      '<div class="sidebar-backdrop" id="sidebar-backdrop"></div>' +
      '<div class="main">' +
        '<header class="header">' +
          '<div class="header-left">' +
            '<button type="button" class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Menu">' + icons.menu + '</button>' +
            '<h1 class="page-title">' + pageTitle + '</h1>' +
            '<div class="dropdown">' +
              '<button type="button" class="company-selector" id="company-btn" aria-haspopup="listbox" aria-expanded="false">' +
                icons.building +
                '<span class="company-selector-copy">' +
                  '<span class="label" id="company-label">' + escapeHtml(company.name) + '</span>' +
                  '<span class="company-sub" id="company-sub">' + escapeHtml(company.industry) + '</span>' +
                '</span>' +
                icons.chevron +
              '</button>' +
              '<div class="dropdown-menu left-align company-menu" id="company-menu" role="listbox">' +
                companyItems +
              '</div>' +
            '</div>' +
          '</div>' +
          searchHtml +
          '<div class="header-right">' +
            '<div class="dropdown">' +
              '<button type="button" class="icon-btn" id="notif-btn" aria-label="Notifikasi" aria-haspopup="true" aria-expanded="false">' +
                icons.bell + (unread ? '<span class="notif-dot"></span>' : '') +
              '</button>' +
              '<div class="dropdown-menu notif-menu" id="notif-menu">' + notifPanelHtml() + '</div>' +
            '</div>' +
            '<div class="dropdown">' +
              '<button type="button" class="avatar-btn" id="avatar-btn" aria-label="Menu akun" aria-haspopup="true" aria-expanded="false">' +
                '<img src="' + EGI.user.avatar + '" alt="' + escapeHtml(EGI.user.name) + '" />' +
              '</button>' +
              '<div class="dropdown-menu" id="avatar-menu">' +
                '<div class="dropdown-header"><strong>' + escapeHtml(EGI.user.name) + '</strong><span>' + escapeHtml(EGI.user.role) + ' · ' + escapeHtml(EGI.user.email) + '</span></div>' +
                '<a class="dropdown-item" href="Settings.html#profile">' + icons.user + ' Profile</a>' +
                '<a class="dropdown-item" href="Settings.html#notifications">' + icons.settings + ' Preferences</a>' +
                '<a class="dropdown-item" href="Settings.html#billing">' + icons.credit + ' Billing</a>' +
                '<button type="button" class="dropdown-item" id="help-btn">' + icons.help + ' Bantuan</button>' +
                '<div class="dropdown-divider"></div>' +
                '<button type="button" class="dropdown-item danger" id="logout-btn">' + icons.logOut + ' Keluar</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</header>' +
        '<div class="content" id="content">' + (options.content || '') + '</div>' +
      '</div>' +
      '<div class="page-loading" id="page-loading" aria-hidden="true"><div class="page-loading-card"><div class="spinner"></div><span>Memuat konteks perusahaan…</span></div></div>' +
      '<div class="drawer-overlay" id="drawer-overlay"></div>' +
      '<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" hidden>' +
        '<div class="drawer-header">' +
          '<div class="drawer-header-top">' +
            '<h2 class="drawer-title" id="drawer-title"></h2>' +
            '<button type="button" class="drawer-close" id="drawer-close" aria-label="Tutup">' + icons.x + '</button>' +
          '</div>' +
          '<div class="drawer-badges" id="drawer-badges"></div>' +
        '</div>' +
        '<div class="drawer-actions" id="drawer-actions"></div>' +
        '<div class="drawer-body" id="drawer-body"></div>' +
      '</aside>' +
      '<div class="modal-overlay" id="modal-overlay">' +
        '<div class="modal" id="modal" role="dialog" aria-modal="true">' +
          '<div class="modal-header">' +
            '<div><h2 id="modal-title"></h2><div id="modal-subtitle" class="modal-subtitle"></div></div>' +
            '<button type="button" class="drawer-close" id="modal-close" aria-label="Tutup">' + icons.x + '</button>' +
          '</div>' +
          '<div class="modal-body" id="modal-body"></div>' +
          '<div class="modal-footer" id="modal-footer"></div>' +
        '</div>' +
      '</div>' +
      '<div class="toast-container" id="toast-container"></div>'
    );
  }

  function section(num, title, iconHtml, bodyHtml, iconCls) {
    return (
      '<section class="drawer-section">' +
        '<div class="drawer-section-head">' +
          '<span class="section-icon' + (iconCls ? ' ' + iconCls : '') + '">' + iconHtml + '</span>' +
          '<h3>' + num + '. ' + title + '</h3>' +
        '</div>' + bodyHtml +
      '</section>'
    );
  }

  function listHtml(items) {
    if (!items || !items.length) return '<p class="muted-line">Tidak ada item.</p>';
    return '<ul>' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
  }

  function isIssueSaved(issueId) {
    return EGI.saved.issues.indexOf(issueId) !== -1 || !!(EGI.issues.find(function (i) { return i.id === issueId; }) || {}).saved;
  }

  function toggleSaveIssue(issueId) {
    var idx = EGI.saved.issues.indexOf(issueId);
    var issue = EGI.issues.find(function (i) { return i.id === issueId; });
    if (idx === -1) {
      EGI.saved.issues.push(issueId);
      if (issue) issue.saved = true;
      toast('Isu disimpan', 'success');
      return true;
    }
    EGI.saved.issues.splice(idx, 1);
    if (issue) issue.saved = false;
    toast('Isu dihapus dari Tersimpan');
    return false;
  }

  function sourceItemHtml(s, idx) {
    return (
      '<button type="button" class="source-item" data-source-idx="' + idx + '">' +
        '<div class="source-item-body">' +
          '<div class="source-title">' + escapeHtml(s.title) + '</div>' +
          '<div class="source-meta">' + escapeHtml(s.date) + ' · ' + escapeHtml(s.author) + '</div>' +
          '<div class="source-claim">Mendukung: ' + escapeHtml(s.claim) + '</div>' +
        '</div>' + icons.external +
      '</button>'
    );
  }

  function openIssueDrawer(issueId, triggerEl, options) {
    options = options || {};
    var issue = EGI.issues.find(function (i) { return i.id === issueId; });
    if (!issue) {
      toast('Isu tidak ditemukan', 'error');
      return;
    }

    var drawer = document.getElementById('drawer');
    var overlay = document.getElementById('drawer-overlay');
    var content = document.getElementById('content');
    var saved = isIssueSaved(issue.id);
    var changeText = options.change || '';
    var sentAt = options.sentAt || '';
    var alertId = options.alertId || '';
    var sourceIndexes = options.sourceIndexes || [];
    var alertBanner = '';
    var prevDevHtml = '';

    function sourceButtonsHtml(indexes) {
      if (!indexes || !indexes.length || !issue.sources) return '';
      var buttons = indexes.map(function (idx) {
        var s = issue.sources[idx];
        if (!s) return '';
        return (
          '<button type="button" class="drawer-alert-source-btn" data-drawer-source-idx="' + idx + '">' +
            icons.external +
            '<span>' + escapeHtml(s.title) + '</span>' +
          '</button>'
        );
      }).filter(Boolean).join('');
      if (!buttons) return '';
      return '<div class="drawer-alert-sources">' + buttons + '</div>';
    }

    if (changeText) {
      alertBanner =
        '<div class="drawer-alert-banner" role="status">' +
          '<div class="drawer-alert-banner-label">Perkembangan terkait alert</div>' +
          '<div class="drawer-alert-banner-change">' + escapeHtml(changeText) + '</div>' +
          (sentAt
            ? '<div class="drawer-alert-banner-time">Dikirim ' + escapeHtml(sentAt) + '</div>'
            : '') +
          sourceButtonsHtml(sourceIndexes) +
        '</div>';
    }

    if (alertId && issueId) {
      var prevAlerts = EGI.alerts.filter(function (a) {
        return a.type === 'langsung' && a.issueId === issueId && a.id !== alertId;
      });
      if (prevAlerts.length) {
        prevDevHtml =
          '<div class="drawer-prev-dev">' +
            '<div class="drawer-prev-dev-label">Perkembangan sebelumnya</div>' +
            prevAlerts.map(function (pa) {
              var paChange = pa.change || pa.summary || '';
              return (
                '<div class="drawer-prev-dev-item">' +
                  '<div class="drawer-prev-dev-change">' + escapeHtml(paChange) + '</div>' +
                  '<div class="drawer-prev-dev-time">' + escapeHtml(pa.createdAt) + '</div>' +
                  sourceButtonsHtml(pa.sourceIndexes || []) +
                '</div>'
              );
            }).join('') +
          '</div>';
      }
    }

    document.getElementById('drawer-title').textContent = issue.title;
    document.getElementById('drawer-badges').innerHTML =
      priorityBadge(issue.priority) + statusBadge(issue.status) +
      '<span class="timestamp">Diperbarui ' + issue.updatedAt + '</span>';

    document.getElementById('drawer-actions').innerHTML =
      '<button type="button" class="btn btn-secondary btn-sm' + (saved ? ' active-saved' : '') + '" id="btn-save-issue">' +
        icons.bookmark + (saved ? ' Tersimpan' : ' Simpan isu') + '</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="btn-feedback">' + icons.message + ' Feedback</button>' +
      '<div class="action-relative">' +
        '<button type="button" class="btn btn-ghost btn-sm" id="btn-more-actions" aria-haspopup="true" aria-expanded="false">' + icons.more + ' Lainnya</button>' +
        '<div class="dropdown-menu more-menu" id="more-actions-menu">' +
          '<button type="button" class="dropdown-item" id="btn-mark-done">' + icons.check + ' Tandai selesai</button>' +
        '</div>' +
      '</div>';

    document.getElementById('drawer-body').innerHTML =
      alertBanner +
      prevDevHtml +
      '<div class="priority-reason"><strong>Alasan prioritas</strong> ' + escapeHtml(issue.priorityReason) + '</div>' +
      section(1, 'Apa yang terjadi', icons.fileText, '<p>' + escapeHtml(issue.whatHappened) + '</p>') +
      section(2, 'Mengapa penting bagi perusahaan', icons.star, '<p>' + escapeHtml(issue.whyMatters) + '</p>') +
      section(3, 'Dampak utama', icons.chart, listHtml(issue.impacts)) +
      section(4, 'Risiko utama', icons.alertTriangle, listHtml(issue.risks), 'warn') +
      section(5, 'Hal yang perlu dipantau', icons.eye, listHtml(issue.watch)) +
      '<div class="drawer-divider"></div>' +
      section(6, 'Fakta', icons.listChecks, listHtml(issue.facts)) +
      section(7, 'Analisis untuk perusahaan', icons.brain, '<p>' + escapeHtml(issue.analysis) + '</p>') +
      section(8, 'Asumsi analisis', icons.lightbulb,
        '<div class="assumption-box"><strong>Asumsi analisis</strong>' + escapeHtml(issue.assumption) + '</div>', 'assume') +
      section(9, 'Sumber', icons.folder, '<div class="source-list">' + issue.sources.map(sourceItemHtml).join('') + '</div>') +
      '<div class="drawer-footnote">' + icons.info +
        '<span>Fakta, Analisis, dan Asumsi dipisahkan untuk akurasi dan kejelasan.</span></div>';

    drawer.hidden = false;
    requestAnimationFrame(function () {
      drawer.classList.add('open');
      overlay.classList.add('open');
      if (content) content.classList.add('drawer-open');
    });

    document.querySelectorAll('.issue-card').forEach(function (c) {
      c.classList.toggle('active', c.getAttribute('data-issue-id') === issueId);
    });

    drawer.dataset.issueId = issueId;
    drawer.dataset.triggerId = triggerEl ? triggerEl.id || '' : '';

    document.getElementById('btn-save-issue').onclick = function () {
      var nowSaved = toggleSaveIssue(issue.id);
      this.classList.toggle('active-saved', nowSaved);
      this.innerHTML = icons.bookmark + (nowSaved ? ' Tersimpan' : ' Simpan isu');
      if (typeof window.onSavedChange === 'function') window.onSavedChange();
    };

    document.getElementById('btn-feedback').onclick = function () {
      openFeedbackPicker(issue.title);
    };

    var moreBtn = document.getElementById('btn-more-actions');
    var moreMenu = document.getElementById('more-actions-menu');
    moreBtn.onclick = function (e) {
      e.stopPropagation();
      var open = !moreMenu.classList.contains('open');
      closeAllDropdowns();
      setExpanded(moreBtn, moreMenu, open);
    };

    document.getElementById('btn-mark-done').onclick = function () {
      issue.status = 'selesai';
      toast('Isu dipindahkan ke arsip selesai', 'success');
      closeDrawer();
      if (typeof window.onIssueUpdated === 'function') window.onIssueUpdated();
    };

    document.querySelectorAll('#drawer-body .source-item').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(this.getAttribute('data-source-idx'), 10);
        openSourcePreview(issue.sources[idx]);
      };
    });

    document.querySelectorAll('#drawer-body [data-drawer-source-idx]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(this.getAttribute('data-drawer-source-idx'), 10);
        openSourcePreview(issue.sources[idx]);
      };
    });
  }

  function closeDrawer() {
    var drawer = document.getElementById('drawer');
    var overlay = document.getElementById('drawer-overlay');
    var content = document.getElementById('content');
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    if (content) content.classList.remove('drawer-open');
    setTimeout(function () { drawer.hidden = true; }, 280);
    document.querySelectorAll('.issue-card.active').forEach(function (c) { c.classList.remove('active'); });
  }

  function openModal(opts) {
    opts = opts || {};
    document.getElementById('modal-title').textContent = opts.title || '';
    document.getElementById('modal-subtitle').innerHTML = opts.subtitle || '';
    document.getElementById('modal-body').innerHTML = opts.body || '';
    document.getElementById('modal-footer').innerHTML = opts.footer || '';
    var modal = document.getElementById('modal');
    modal.className = 'modal' + (opts.small ? ' modal-sm' : '');
    document.getElementById('modal-overlay').classList.add('open');
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  function bindShell() {
    var companyBtn = document.getElementById('company-btn');
    var companyMenu = document.getElementById('company-menu');
    var notifBtn = document.getElementById('notif-btn');
    var notifMenu = document.getElementById('notif-menu');
    var avatarBtn = document.getElementById('avatar-btn');
    var avatarMenu = document.getElementById('avatar-menu');

    if (companyBtn) {
      companyBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var wasOpen = companyMenu.classList.contains('open');
        closeAllDropdowns();
        setExpanded(companyBtn, companyMenu, !wasOpen);
      });
    }

    document.querySelectorAll('[data-company]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-company');
        if (id === EGI.state.activeCompanyId) {
          closeAllDropdowns();
          return;
        }
        closeAllDropdowns();
        showPageLoading(function () {
          EGI.state.activeCompanyId = id;
          var c = getActiveCompany();
          document.getElementById('company-label').textContent = c.name;
          var sub = document.getElementById('company-sub');
          if (sub) sub.textContent = c.industry;
          document.querySelectorAll('.company-option').forEach(function (opt) {
            var active = opt.getAttribute('data-company') === id;
            opt.classList.toggle('active', active);
            var check = opt.querySelector('.company-option-check');
            if (active && !check) {
              opt.insertAdjacentHTML('beforeend', '<span class="company-option-check">' + icons.check + '</span>');
            } else if (!active && check) check.remove();
          });
          toast('Konteks diganti ke ' + c.name, 'success');
          refreshNotifUI();
          if (typeof window.onCompanyChange === 'function') window.onCompanyChange();
        });
      });
    });

    if (notifBtn) {
      notifBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var wasOpen = notifMenu.classList.contains('open');
        closeAllDropdowns();
        if (!wasOpen) {
          refreshNotifUI();
          setExpanded(notifBtn, notifMenu, true);
          positionViewportMenu(notifBtn, notifMenu, 380);
        }
      });
    }

    bindNotifPanelEvents();

    if (avatarBtn) {
      avatarBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var wasOpen = avatarMenu.classList.contains('open');
        closeAllDropdowns();
        if (!wasOpen) {
          setExpanded(avatarBtn, avatarMenu, true);
          positionViewportMenu(avatarBtn, avatarMenu, 280);
        }
      });
    }

    function repositionOpenHeaderMenus() {
      if (notifMenu && notifMenu.classList.contains('open')) {
        positionViewportMenu(notifBtn, notifMenu, 380);
      }
      if (avatarMenu && avatarMenu.classList.contains('open')) {
        positionViewportMenu(avatarBtn, avatarMenu, 280);
      }
    }

    window.addEventListener('resize', repositionOpenHeaderMenus);
    window.addEventListener('scroll', repositionOpenHeaderMenus, true);

    var helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', function () {
        closeAllDropdowns();
        openModal({
          title: 'Bantuan',
          small: true,
          body:
            '<p class="modal-lead">Tim dukungan EGI Media siap membantu penggunaan dashboard eksekutif.</p>' +
            '<ul class="help-list">' +
              '<li><strong>Email</strong> helpdesk@egimedia.co.id</li>' +
              '<li><strong>Jam layanan</strong> Senin–Jumat, 09:00–18:00 WIB</li>' +
              '<li><strong>Prioritas</strong> respons dalam 1 hari kerja untuk akun Enterprise</li>' +
            '</ul>',
          footer: '<button type="button" class="btn btn-primary" id="close-help">Tutup</button>'
        });
        document.getElementById('close-help').onclick = closeModal;
      });
    }

    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        closeAllDropdowns();
        openModal({
          title: 'Keluar dari akun',
          small: true,
          body: '<p>Anda yakin ingin keluar? Sesi akan diakhiri di perangkat ini.</p>',
          footer:
            '<button type="button" class="btn btn-secondary" id="cancel-logout">Batal</button>' +
            '<button type="button" class="btn btn-primary" id="confirm-logout">Keluar</button>'
        });
        document.getElementById('cancel-logout').onclick = closeModal;
        document.getElementById('confirm-logout').onclick = function () {
          closeModal();
          toast('Anda telah keluar', 'success');
          setTimeout(function () { window.location.href = 'Executive-Summary.html'; }, 700);
        };
      });
    }

    document.getElementById('drawer-close').addEventListener('click', closeDrawer);
    document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (document.getElementById('modal-overlay').classList.contains('open')) closeModal();
        else if (document.getElementById('drawer').classList.contains('open')) closeDrawer();
        else closeAllDropdowns();
      }
    });

    document.addEventListener('click', function () {
      closeAllDropdowns();
      var sug = document.getElementById('search-suggestions');
      if (sug) sug.classList.remove('open');
    });

    var mobileBtn = document.getElementById('mobile-menu-btn');
    var sidebar = document.getElementById('sidebar');
    var backdrop = document.getElementById('sidebar-backdrop');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', function () {
        sidebar.classList.add('open');
        backdrop.classList.add('open');
      });
    }
    if (backdrop) {
      backdrop.addEventListener('click', function () {
        sidebar.classList.remove('open');
        backdrop.classList.remove('open');
      });
    }

    if (notifMenu) notifMenu.addEventListener('click', function (e) { e.stopPropagation(); });
    if (companyMenu) companyMenu.addEventListener('click', function (e) { e.stopPropagation(); });
    if (avatarMenu) avatarMenu.addEventListener('click', function (e) { e.stopPropagation(); });

    bindGlobalSearch();
  }

  function bindGlobalSearch() {
    var input = document.getElementById('global-search');
    if (!input) return;
    var suggestions = document.getElementById('search-suggestions');
    var clearBtn = document.getElementById('search-clear');
    var debounceTimer;

    input.addEventListener('click', function (e) { e.stopPropagation(); });
    suggestions.addEventListener('click', function (e) { e.stopPropagation(); });

    input.addEventListener('input', function () {
      var q = this.value.trim();
      clearBtn.classList.toggle('visible', q.length > 0);
      clearTimeout(debounceTimer);
      if (q.length < 2) {
        suggestions.classList.remove('open');
        suggestions.innerHTML = '';
        return;
      }
      debounceTimer = setTimeout(function () {
        var results = searchAll(q).slice(0, 6);
        if (!results.length) {
          suggestions.innerHTML = '<div class="suggestion-empty">Tidak ada saran untuk “' + escapeHtml(q) + '”</div>';
        } else {
          suggestions.innerHTML = results.map(function (r) {
            return '<button type="button" class="suggestion-item" data-search-type="' + r.type + '" data-search-id="' + r.id + '">' +
              '<div><div class="suggestion-cat">' + r.typeLabel + '</div>' +
              '<div class="suggestion-title">' + escapeHtml(r.title) + '</div>' +
              '<div class="suggestion-meta">' + escapeHtml(r.meta) + '</div></div></button>';
          }).join('');
          suggestions.querySelectorAll('.suggestion-item').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var type = this.getAttribute('data-search-type');
              var id = this.getAttribute('data-search-id');
              suggestions.classList.remove('open');
              if (type === 'issue') {
                if (typeof window.onSearchSelect === 'function') window.onSearchSelect(id);
                else openIssueDrawer(id);
              } else if (type === 'report') {
                window.location.href = 'Reports.html?open=' + id;
              }
            });
          });
        }
        suggestions.classList.add('open');
      }, 220);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        suggestions.classList.remove('open');
        var q = this.value.trim();
        if (typeof window.onGlobalSearch === 'function') window.onGlobalSearch(q);
        else if (q) window.location.href = 'Executive-Summary.html?q=' + encodeURIComponent(q);
      }
    });

    clearBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      input.value = '';
      clearBtn.classList.remove('visible');
      suggestions.classList.remove('open');
      if (typeof window.onSearchClear === 'function') window.onSearchClear();
    });
  }

  function searchAll(q) {
    q = q.toLowerCase();
    var results = [];
    EGI.issues.forEach(function (i) {
      if (i.title.toLowerCase().indexOf(q) !== -1 || i.summary.toLowerCase().indexOf(q) !== -1) {
        results.push({ type: 'issue', typeLabel: 'Isu', id: i.id, title: i.title, meta: 'Diperbarui ' + i.updatedAt });
      }
    });
    EGI.reports.forEach(function (r) {
      if (r.title.toLowerCase().indexOf(q) !== -1 || r.summary.toLowerCase().indexOf(q) !== -1) {
        results.push({ type: 'report', typeLabel: 'Laporan', id: r.id, title: r.title, meta: r.periodLabel });
      }
    });
    return results;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function filterIssuesByCompany(issues) {
    var cid = EGI.state.activeCompanyId;
    return issues.filter(function (i) {
      return !i.companyIds || i.companyIds.indexOf(cid) !== -1;
    });
  }

  function filterIssuesByPeriod(issues, period) {
    if (period === '24jam') return issues.filter(function (i) { return i.period === '24jam'; });
    if (period === '7hari') return issues.filter(function (i) { return i.period === '24jam' || i.period === '7hari'; });
    return issues;
  }

  function issueCardHtml(issue, rank, active) {
    return (
      '<button type="button" class="issue-card' + (active ? ' active' : '') + '" data-issue-id="' + issue.id + '" id="issue-card-' + issue.id + '">' +
        '<span class="issue-rank">' + rank + '</span>' +
        '<div class="issue-body">' +
          '<div class="issue-title">' + escapeHtml(issue.title) + '</div>' +
          '<div class="issue-summary">' + escapeHtml(issue.summary) + '</div>' +
        '</div>' +
        '<div class="issue-meta">' +
          '<div class="badge-row">' + priorityBadge(issue.priority) + statusBadge(issue.status) + '</div>' +
          '<span class="timestamp">Diperbarui ' + issue.updatedAt + '</span>' +
        '</div>' +
      '</button>'
    );
  }

  function emptyState(title, desc, ctaHtml) {
    return (
      '<div class="empty-state">' +
        icons.empty +
        '<h3>' + title + '</h3>' +
        '<p>' + desc + '</p>' +
        (ctaHtml || '') +
      '</div>'
    );
  }

  function reportSourceHtml(sources) {
    if (!sources || !sources.length) return '<p class="muted-line">Tidak ada sumber.</p>';
    return '<div class="source-list">' + sources.map(function (title, idx) {
      return (
        '<button type="button" class="source-item" data-report-source="' + idx + '">' +
          '<div class="source-item-body">' +
            '<div class="source-title">' + escapeHtml(title) + '</div>' +
            '<div class="source-meta">Arsip editorial EGI Media</div>' +
          '</div>' + icons.external +
        '</button>'
      );
    }).join('') + '</div>';
  }

  function filterDropdownHtml(opts) {
    opts = opts || {};
    var id = opts.id || 'filter-dd';
    var kicker = opts.kicker || 'Filter';
    var headerTitle = opts.headerTitle || 'Pilih opsi';
    var headerHint = opts.headerHint || '';
    var valueAttr = opts.valueAttr || 'data-value';
    var selected = opts.selected;
    var options = opts.options || [];
    var icon = opts.icon || icons.listChecks;
    var current = options.find(function (o) { return o.id === selected; }) || options[0] || { id: '', label: '—' };

    var optionHtml = options.map(function (o) {
      var active = o.id === current.id;
      return (
        '<button type="button" class="period-option' + (active ? ' active' : '') + '" ' + valueAttr + '="' + o.id + '" role="option" aria-selected="' + active + '">' +
          '<span class="period-option-text">' +
            '<strong>' + escapeHtml(o.label) + '</strong>' +
            (o.desc ? '<span>' + escapeHtml(o.desc) + '</span>' : '') +
          '</span>' +
          (active ? '<span class="period-option-check" aria-hidden="true">' + icons.check + '</span>' : '') +
        '</button>'
      );
    }).join('');

    return (
      '<div class="dropdown period-dropdown" id="' + id + '">' +
        '<button type="button" class="period-trigger" id="' + id + '-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="' + escapeHtml(kicker) + '">' +
          '<span class="period-trigger-icon" aria-hidden="true">' + icon + '</span>' +
          '<span class="period-trigger-copy">' +
            '<span class="period-trigger-kicker">' + escapeHtml(kicker) + '</span>' +
            '<span class="period-trigger-label" id="' + id + '-label">' + escapeHtml(current.label) + '</span>' +
          '</span>' +
          icons.chevron +
        '</button>' +
        '<div class="dropdown-menu left-align period-menu" id="' + id + '-menu" role="listbox">' +
          '<div class="dropdown-header"><strong>' + escapeHtml(headerTitle) + '</strong>' +
            (headerHint ? '<span>' + escapeHtml(headerHint) + '</span>' : '') +
          '</div>' +
          optionHtml +
        '</div>' +
      '</div>'
    );
  }

  function bindFilterDropdown(opts) {
    opts = opts || {};
    var id = opts.id;
    var valueAttr = opts.valueAttr || 'data-value';
    var options = opts.options || [];
    var btn = document.getElementById(id + '-btn');
    var menu = document.getElementById(id + '-menu');
    var label = document.getElementById(id + '-label');
    if (!btn || !menu) return;

    function setSelected(value) {
      var meta = options.find(function (o) { return o.id === value; }) || options[0];
      if (label && meta) label.textContent = meta.label;
      menu.querySelectorAll('.period-option').forEach(function (opt) {
        var active = opt.getAttribute(valueAttr) === value;
        opt.classList.toggle('active', active);
        opt.setAttribute('aria-selected', active ? 'true' : 'false');
        var check = opt.querySelector('.period-option-check');
        if (active && !check) {
          opt.insertAdjacentHTML('beforeend', '<span class="period-option-check" aria-hidden="true">' + icons.check + '</span>');
        } else if (!active && check) {
          check.remove();
        }
      });
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var wasOpen = menu.classList.contains('open');
      closeAllDropdowns();
      setExpanded(btn, menu, !wasOpen);
    });

    menu.addEventListener('click', function (e) { e.stopPropagation(); });

    menu.querySelectorAll('.period-option').forEach(function (opt) {
      opt.addEventListener('click', function () {
        var value = this.getAttribute(valueAttr);
        setSelected(value);
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        if (typeof opts.onChange === 'function') opts.onChange(value);
      });
    });

    return { setSelected: setSelected };
  }

  window.EGIApp = {
    icons: icons,
    renderShell: renderShell,
    bindShell: bindShell,
    toast: toast,
    persistState: persistState,
    priorityBadge: priorityBadge,
    statusBadge: statusBadge,
    reviewBadge: reviewBadge,
    openIssueDrawer: openIssueDrawer,
    closeDrawer: closeDrawer,
    openModal: openModal,
    closeModal: closeModal,
    openFeedbackPicker: openFeedbackPicker,
    openSourcePreview: openSourcePreview,
    openEmailFromAnywhere: openEmailFromAnywhere,
    refreshNotifUI: refreshNotifUI,
    showPageLoading: showPageLoading,
    toggleSaveIssue: toggleSaveIssue,
    isIssueSaved: isIssueSaved,
    filterIssuesByCompany: filterIssuesByCompany,
    filterIssuesByPeriod: filterIssuesByPeriod,
    issueCardHtml: issueCardHtml,
    emptyState: emptyState,
    searchAll: searchAll,
    escapeHtml: escapeHtml,
    getActiveCompany: getActiveCompany,
    listHtml: listHtml,
    reportSourceHtml: reportSourceHtml,
    filterDropdownHtml: filterDropdownHtml,
    bindFilterDropdown: bindFilterDropdown
  };
})();
