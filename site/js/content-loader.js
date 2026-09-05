// ===========================================================
// MHPU site — content loader
// Fetches editable content from /content/*.json (managed via the
// /admin CMS dashboard) and renders it into the page at runtime.
// Design/markup/CSS is untouched by this — only text/data changes.
// ===========================================================

(function () {
  function esc(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function fetchJSON(path) {
    return fetch(path, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('Failed to load ' + path);
      return res.json();
    });
  }

  function setText(selector, value) {
    var el = document.querySelector(selector);
    if (!el || value == null) return; // field not present at all — leave static fallback as-is
    if (String(value).trim() === '') {
      // Editor intentionally cleared this field — hide it entirely rather
      // than leaving an empty, oddly-spaced element on the page.
      el.style.display = 'none';
    } else {
      el.style.display = '';
      el.textContent = value;
    }
  }

  function setHTML(selector, value) {
    var el = document.querySelector(selector);
    if (el && value != null) el.innerHTML = value;
  }

  // Shared helper — every list item across the site now supports an
  // individual "Hidden" checkbox in /admin. This filters those out before
  // rendering, without ever touching the underlying data (so un-hiding is
  // instant, no re-entry needed).
  function visibleOnly(items) {
    return (items || []).filter(function (item) { return !item || item.hidden !== true; });
  }

  /* ---------- Generic page-hero helper ---------- */
  function renderPageHero(data) {
    if (!data) return;
    setText('[data-cms="heroKicker"]', data.heroKicker);
    setText('[data-cms="heroHeadline"]', data.heroHeadline);
    setText('[data-cms="heroLede"]', data.heroLede);
  }

  /* ---------- Site-wide footer (every page) ---------- */
  function renderSiteFooter(site) {
    if (!site) return;
    setText('[data-cms="footerSlogan"]', site.footerSlogan);
    setText('[data-cms="footerDescription"]', site.footerDescription);
  }

  /* ---------- Homepage ---------- */
  function renderHome(home, stats) {
    setText('[data-cms="heroKicker"]', home.heroKicker);

    var headlineEl = document.querySelector('[data-cms="heroHeadline"]');
    if (headlineEl) {
      var plain = (home.heroHeadlinePlain || '').trim();
      var red = (home.heroHeadlineRed || '').trim();
      if (!plain && !red) {
        headlineEl.style.display = 'none';
      } else {
        headlineEl.style.display = '';
        var html = esc(plain);
        if (red) html += '<span style="color:var(--red);">' + esc(red) + '</span>';
        headlineEl.innerHTML = html;
      }
    }

    setText('[data-cms="slogan"]', home.slogan);
    setText('[data-cms="heroSubtext"]', home.heroSubtext);
    setText('[data-cms="actionTag"]', home.actionTag);
    setText('[data-cms="actionHeadline"]', home.actionHeadline);
    setText('[data-cms="actionText"]', home.actionText);

    var pillarWrap = document.querySelector('[data-cms-list="pillars"]');
    if (pillarWrap && home.pillars) {
      pillarWrap.innerHTML = visibleOnly(home.pillars).map(function (p) {
        return '<div class="pillar"><div class="mark-sm"></div><h3>' + esc(p.title) + '</h3><p>' + esc(p.text) + '</p></div>';
      }).join('');
    }

    var whyJoinWrap = document.querySelector('[data-cms-list="whyJoin"]');
    if (whyJoinWrap && home.whyJoin) {
      whyJoinWrap.innerHTML = visibleOnly(home.whyJoin).map(function (w) {
        return '<div class="card"><h3>' + esc(w.title) + '</h3><p>' + esc(w.text) + '</p></div>';
      }).join('');
    }

    if (stats) {
      setText('[data-cms="stat-members"]', stats.members);
      setText('[data-cms="stat-membersLabel"]', stats.membersLabel);
      setText('[data-cms="stat-atolls"]', stats.atolls);
      setText('[data-cms="stat-atollsLabel"]', stats.atollsLabel);
      setText('[data-cms="stat-resolutionRate"]', stats.resolutionRate);
      setText('[data-cms="stat-resolutionRateLabel"]', stats.resolutionRateLabel);
    }

    // Homepage news preview — first 3 visible posts
    var newsWrap = document.querySelector('[data-cms-list="news-preview"]');
    fetchJSON('content/news.json').then(function (news) {
      if (newsWrap && news.posts) {
        newsWrap.innerHTML = visibleOnly(news.posts).slice(0, 3).map(function (p) {
          return '<div class="news-row"><div><h4>' + esc(p.title) + '</h4></div><span class="date">' + esc(p.date) + '</span></div>';
        }).join('');
      }
    }).catch(function () {});
  }

  /* ---------- News & campaigns page ---------- */
  function renderNews(news) {
    renderPageHero(news);
    setText('[data-cms="campaignTag"]', news.campaignTag);
    setText('[data-cms="campaignHeadline"]', news.campaignHeadline);
    setText('[data-cms="campaignText"]', news.campaignText);

    var listWrap = document.querySelector('[data-cms-list="posts"]');
    if (listWrap && news.posts) {
      listWrap.innerHTML = visibleOnly(news.posts).map(function (p) {
        var cat = esc(p.category).toLowerCase();
        return '<div class="news-row" data-category="' + cat + '"><div><span class="cat">' + esc(p.category) + '</span><h4>' + esc(p.title) + '</h4></div><span class="date">' + esc(p.date) + '</span></div>';
      }).join('');
    }

    // Re-bind the category filter chips now that rows were rebuilt.
    var chips = document.querySelectorAll('.chip[data-filter]');
    var newsItems = document.querySelectorAll('[data-category]');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        var filter = chip.getAttribute('data-filter');
        newsItems.forEach(function (item) {
          var cat = item.getAttribute('data-category');
          item.style.display = (filter === 'all' || filter === cat) ? '' : 'none';
        });
      });
    });
  }

  /* ---------- About / leadership page ---------- */
  function avatarHTML(person) {
    if (person.photo) {
      return '<div class="avatar" style="background-image:url(\'' + esc(person.photo) + '\');" role="img" aria-label="Photo of ' + esc(person.name) + '"></div>';
    }
    return '<div class="avatar">' + esc(person.initials) + '</div>';
  }

  function renderLeadership(data) {
    var execWrap = document.querySelector('[data-cms-list="executive"]');
    if (execWrap && data.executive) {
      execWrap.innerHTML = visibleOnly(data.executive).map(function (m) {
        return '<div class="team-card">' + avatarHTML(m) + '<h4>' + esc(m.name) + '</h4><p>' + esc(m.role) + '</p></div>';
      }).join('');
    }
    var genWrap = document.querySelector('[data-cms-list="generalMembers"]');
    if (genWrap && data.generalMembers) {
      genWrap.innerHTML = visibleOnly(data.generalMembers).map(function (m) {
        return '<div class="team-card">' + avatarHTML(m) + '<h4>' + esc(m.name) + '</h4><p>' + esc(m.role) + '</p></div>';
      }).join('');
    }
    var repWrap = document.querySelector('[data-cms-list="regionalReps"]');
    if (repWrap && data.regionalReps) {
      repWrap.innerHTML = visibleOnly(data.regionalReps).map(function (r) {
        return '<div class="team-card">' + avatarHTML(r) + '<h4>' + esc(r.name) + '</h4><p>' + esc(r.area) + '</p></div>';
      }).join('');
    }
  }

  function renderAbout(about) {
    renderPageHero(about);
    setText('[data-cms="missionPara1"]', about.missionPara1);
    setText('[data-cms="missionPara2"]', about.missionPara2);

    var guidesWrap = document.querySelector('[data-cms-list="guides-list"]');
    if (guidesWrap && about.guides) {
      guidesWrap.innerHTML = about.guides.map(function (g, i) {
        var mb = i === about.guides.length - 1 ? '0' : '22px';
        return '<div class="stat-block" style="margin-bottom:' + mb + ';"><p class="l" style="font-size:15px;color:var(--ink);font-weight:600;">' + esc(g) + '</p></div>';
      }).join('');
    }

    var historyWrap = document.querySelector('[data-cms-list="history"]');
    if (historyWrap && about.history) {
      historyWrap.innerHTML = visibleOnly(about.history).map(function (h) {
        return '<div class="card"><h3 style="font-size:32px;color:var(--red);">' + esc(h.year) + '</h3><p>' + esc(h.text) + '</p></div>';
      }).join('');
    }

    setText('[data-cms="generalMembersNote"]', about.generalMembersNote);
    setText('[data-cms="ctaHeadline"]', about.ctaHeadline);
    setText('[data-cms="ctaText"]', about.ctaText);
  }

  /* ---------- Membership page ---------- */
  function renderMembership(m) {
    renderPageHero(m);
    if (m.monthlyFee) {
      setText('[data-cms="monthlyFee-tag"]', m.monthlyFee.tag);
      setText('[data-cms="monthlyFee-title"]', m.monthlyFee.title);
      setText('[data-cms="monthlyFee-price"]', m.monthlyFee.price);
      setText('[data-cms="monthlyFee-period"]', m.monthlyFee.period);
      var mf = document.querySelector('[data-cms-list="monthlyFee-features"]');
      if (mf && m.monthlyFee.features) mf.innerHTML = m.monthlyFee.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');
    }
    if (m.joiningFee) {
      setText('[data-cms="joiningFee-title"]', m.joiningFee.title);
      setText('[data-cms="joiningFee-price"]', m.joiningFee.price);
      setText('[data-cms="joiningFee-period"]', m.joiningFee.period);
      var jf = document.querySelector('[data-cms-list="joiningFee-features"]');
      if (jf && m.joiningFee.features) jf.innerHTML = m.joiningFee.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');
    }
    setText('[data-cms="feeNote"]', m.feeNote);
    setText('[data-cms="joinSectionSub"]', m.joinSectionSub);
    setText('[data-cms="declarationText"]', m.declarationText);
    var tickerWrap = document.querySelector('[data-cms-list="ticker"]');
    if (tickerWrap && m.ticker) tickerWrap.innerHTML = m.ticker.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
  }

  /* ---------- Know your rights page ---------- */
  function renderRights(r) {
    renderPageHero(r);
    setText('[data-cms="ctaHeadline"]', r.ctaHeadline);
    setText('[data-cms="ctaText"]', r.ctaText);

    var linksWrap = document.querySelector('[data-cms-list="usefulLinks"]');
    if (linksWrap && r.usefulLinks && r.usefulLinks.length) {
      linksWrap.innerHTML = visibleOnly(r.usefulLinks).map(function (link) {
        return '<a href="' + esc(link.url) + '" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="text-align:left;width:100%;">' + esc(link.label) + '</a>';
      }).join('');
    }

    var tickerWrap = document.querySelector('[data-cms-list="ticker"]');
    if (tickerWrap && r.ticker) tickerWrap.innerHTML = r.ticker.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');

    var accWrap = document.querySelector('[data-cms-list="accordion"]');
    if (accWrap && r.accordion) {
      accWrap.innerHTML = visibleOnly(r.accordion).map(function (item, i) {
        var n = i + 1;
        var bullets = (item.bullets || []).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('');
        var expanded = i === 0 ? 'true' : 'false';
        var maxH = i === 0 ? ' style="max-height:320px;"' : '';
        return '<div class="accordion-item">' +
          '<button class="accordion-trigger" aria-expanded="' + expanded + '" aria-controls="panel-' + n + '" id="acc-' + n + '"><h3>' + esc(item.title) + '</h3><span class="plus">+</span></button>' +
          '<div class="accordion-panel" id="panel-' + n + '" role="region" aria-labelledby="acc-' + n + '"' + maxH + '>' +
          '<p>' + esc(item.body) + '</p><ul>' + bullets + '</ul></div></div>';
      }).join('');

      // Re-bind accordion behaviour now that the DOM was rebuilt.
      accWrap.querySelectorAll('.accordion-trigger').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var expanded = btn.getAttribute('aria-expanded') === 'true';
          var panel = document.getElementById(btn.getAttribute('aria-controls'));
          btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
          if (panel) panel.style.maxHeight = expanded ? null : panel.scrollHeight + 'px';
        });
      });
    }
  }

  /* ---------- Contact page ---------- */
  function renderContact(c) {
    renderPageHero(c);
    if (c.headOffice) {
      var ho = c.headOffice;
      setText('[data-cms="headOffice-name"]', ho.name);
      setHTML('[data-cms="headOffice-details"]',
        esc(ho.address) + '<br>Phone: <a href="tel:' + esc((ho.phone1 || '').replace(/\s/g, '')) + '" style="color:var(--muted);">' + esc(ho.phone1) + '</a> &middot; <a href="tel:' + esc((ho.phone2 || '').replace(/\s/g, '')) + '" style="color:var(--muted);">' + esc(ho.phone2) + '</a><br>Email: <a href="mailto:' + esc(ho.email) + '" style="color:var(--muted);">' + esc(ho.email) + '</a>'
      );
    }
    var regWrap = document.querySelector('[data-cms-list="regionalOffices"]');
    if (regWrap && c.regionalOffices) {
      regWrap.innerHTML = visibleOnly(c.regionalOffices).map(function (o) {
        return '<div class="office-row"><h4>' + esc(o.name) + '</h4><p>' + esc(o.details) + '</p></div>';
      }).join('');
    }
    setText('[data-cms="repsNote"]', c.repsNote);
  }

  /* ---------- Resources page ---------- */
  function renderResources(data) {
    renderPageHero(data);
    var guidesWrap = document.querySelector('[data-cms-list="guides"]');
    if (guidesWrap && data.guides) {
      guidesWrap.innerHTML = visibleOnly(data.guides).map(function (g) {
        return renderResourceCard(g.filetag, g.title, g.description, g.meta, g.file, true, 'Download');
      }).join('');
    }
    var campaignWrap = document.querySelector('[data-cms-list="campaignMaterials"]');
    if (campaignWrap && data.campaignMaterials) {
      campaignWrap.innerHTML = visibleOnly(data.campaignMaterials).map(function (c) {
        return renderResourceCard(c.filetag, c.title, c.description, c.meta, c.url, c.download, c.buttonLabel);
      }).join('');
    }
    setText('[data-cms="footerNote"]', data.footerNote);
  }

  function renderResourceCard(filetag, title, description, meta, url, download, buttonLabel) {
    var dlAttr = download ? ' download' : '';
    return '<div class="resource-card"><span class="filetag">' + esc(filetag) + '</span><h3>' + esc(title) + '</h3><p>' + esc(description) + '</p><span class="meta">' + esc(meta) + '</span><a href="' + esc(url) + '" class="btn btn-outline btn-sm"' + dlAttr + '>' + esc(buttonLabel) + '</a></div>';
  }

  /* ---------- Hero image swap (every page) ---------- */
  // The hero's diagonal red stripe can be replaced with an uploaded photo,
  // per page, from /admin. Falls back to the original stripe pattern
  // automatically when no image has been set for that page. The homepage
  // supports multiple photos: they auto-rotate every 30 seconds, and if
  // there's more than one, prev/next arrows let visitors step through
  // manually (which also resets the 30-second auto-rotate timer).
  function applyHeroImage(images) {
    var page = document.body.getAttribute('data-cms-page');
    var stripeEl = document.querySelector('.stripe');
    if (!page || !stripeEl || !images) return;

    var value = images[page];
    if (!value) return;

    var urls = (Array.isArray(value) ? value : [value]).filter(Boolean);
    if (urls.length === 0) return;

    var i = 0;
    var autoTimer = null;

    function setImage(index) {
      i = ((index % urls.length) + urls.length) % urls.length;
      stripeEl.style.backgroundImage = 'url("' + urls[i] + '")';
      stripeEl.style.backgroundSize = 'cover';
      stripeEl.style.backgroundPosition = 'center';
      stripeEl.style.opacity = '1';
    }

    function startAutoRotate() {
      if (autoTimer) clearInterval(autoTimer);
      if (urls.length > 1) {
        autoTimer = setInterval(function () { setImage(i + 1); }, 30000);
      }
    }

    setImage(0);
    startAutoRotate();

    if (urls.length > 1) {
      var prevBtn = document.createElement('button');
      prevBtn.className = 'hero-slide-arrow prev';
      prevBtn.setAttribute('aria-label', 'Previous photo');
      prevBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      prevBtn.addEventListener('click', function () { setImage(i - 1); startAutoRotate(); });

      var nextBtn = document.createElement('button');
      nextBtn.className = 'hero-slide-arrow next';
      nextBtn.setAttribute('aria-label', 'Next photo');
      nextBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      nextBtn.addEventListener('click', function () { setImage(i + 1); startAutoRotate(); });

      stripeEl.appendChild(prevBtn);
      stripeEl.appendChild(nextBtn);
    }
  }

  /* ---------- Page visibility (every page) ---------- */
  // A page can be toggled off in /admin without deleting anything — this
  // swaps its main content for a simple "unavailable" message while
  // leaving the header, footer, and navigation fully intact so visitors
  // can still reach the site's other pages.
  function applyPageVisibility(visibility) {
    var page = document.body.getAttribute('data-cms-page');
    if (!page || !visibility) return true; // visible by default if data is missing

    var isVisible = visibility[page] !== false; // default true unless explicitly false
    if (isVisible) return true;

    var main = document.querySelector('main');
    if (main) {
      main.innerHTML =
        '<section style="padding:120px 0;text-align:center;">' +
        '<div class="wrap" style="max-width:560px;">' +
        '<h1 style="font-size:32px;color:var(--ink);margin-bottom:16px;">Page unavailable</h1>' +
        '<p style="font-family:\'Source Sans 3\',sans-serif;color:var(--muted);font-size:16px;line-height:1.6;">This page is temporarily unavailable. Please check back later, or use the menu above to visit another page.</p>' +
        '</div></section>';
    }
    return false;
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-cms-page');
    if (!page) return;

    fetchJSON('content/hero-images.json').then(applyHeroImage).catch(function () {});
    fetchJSON('content/site.json').then(renderSiteFooter).catch(function () {});

    fetchJSON('content/page-visibility.json').then(function (visibility) {
      var visible = applyPageVisibility(visibility);
      if (!visible) return; // don't bother loading/rendering content for a hidden page

      loadPageContent(page);
    }).catch(function () {
      loadPageContent(page); // if the visibility file itself fails to load, default to showing the page
    });
  });

  function loadPageContent(page) {
    if (page === 'home') {
      Promise.all([fetchJSON('content/home.json'), fetchJSON('content/stats.json')])
        .then(function (results) { renderHome(results[0], results[1]); })
        .catch(function (err) { console.warn('Content load failed:', err); });
    } else if (page === 'news') {
      fetchJSON('content/news.json').then(renderNews).catch(function (err) { console.warn('Content load failed:', err); });
    } else if (page === 'about') {
      fetchJSON('content/leadership.json').then(renderLeadership).catch(function (err) { console.warn('Content load failed:', err); });
      fetchJSON('content/about.json').then(renderAbout).catch(function (err) { console.warn('Content load failed:', err); });
    } else if (page === 'membership') {
      fetchJSON('content/membership.json').then(renderMembership).catch(function (err) { console.warn('Content load failed:', err); });
    } else if (page === 'rights') {
      fetchJSON('content/rights.json').then(renderRights).catch(function (err) { console.warn('Content load failed:', err); });
    } else if (page === 'contact') {
      fetchJSON('content/leadership.json').then(renderLeadership).catch(function (err) { console.warn('Content load failed:', err); });
      fetchJSON('content/contact.json').then(renderContact).catch(function (err) { console.warn('Content load failed:', err); });
    } else if (page === 'resources') {
      fetchJSON('content/resources.json').then(renderResources).catch(function (err) { console.warn('Content load failed:', err); });
    }
  }
})();
