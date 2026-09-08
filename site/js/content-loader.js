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

  // Formats a real stored date (YYYY-MM-DD, auto-filled by /admin when an
  // item is created) the way a news feed normally reads — relative for
  // recent items, a plain date for older ones. Falls back to showing
  // whatever text is there unchanged if it isn't a real date at all
  // (covers older content entered before dates were auto-filled).
  function formatDate(value) {
    if (!value) return '';
    var d = new Date(value);
    if (isNaN(d.getTime())) return value;

    var now = new Date();
    var diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return diffDays + ' days ago';
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return Math.floor(diffDays / 7) + ' weeks ago';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Sorts a list newest-first by its real "date" field, so anything just
  // added (which auto-fills with today's date) naturally lands at the
  // top — no manual dragging/reordering needed in /admin. Items with a
  // missing or non-real date (e.g. older free-text dates from before
  // auto-dating existed) sort to the end rather than breaking the sort.
  function sortByDateDesc(items) {
    return (items || []).slice().sort(function (a, b) {
      var da = new Date(a && a.date).getTime();
      var db = new Date(b && b.date).getTime();
      if (isNaN(da)) da = -Infinity;
      if (isNaN(db)) db = -Infinity;
      return db - da;
    });
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

  /* ---------- Active campaigns (Homepage: first one; News page: all of them) ---------- */
  function applyCampaignBanner(data) {
    if (!data) return;
    var campaigns = sortByDateDesc(visibleOnly(data.campaigns || []));

    var actionCard = document.getElementById('action-card');
    if (actionCard) {
      var first = campaigns[0];
      if (!first) {
        actionCard.style.display = 'none';
      } else {
        actionCard.style.display = '';
        setText('[data-cms="actionTag"]', first.tag);
        setText('[data-cms="actionHeadline"]', first.headline);
        setText('[data-cms="actionText"]', first.text);
      }
    }

    var campaignSection = document.getElementById('campaign-banner-section');
    if (campaignSection) {
      if (campaigns.length === 0) {
        campaignSection.style.display = 'none';
      } else {
        campaignSection.style.display = '';
        var listWrap = campaignSection.querySelector('[data-cms-list="campaigns"]');
        if (listWrap) {
          listWrap.innerHTML = campaigns.map(function (c) {
            return '<div class="card" style="border-color:var(--red);border-width:2px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;">' +
              '<div><span style="background:var(--red);color:white;font-size:11px;font-weight:700;padding:4px 10px;font-family:\'Source Sans 3\',sans-serif;letter-spacing:.04em;">' + esc(c.tag) + '</span>' +
              '<h3 style="font-size:24px;margin-top:14px;">' + esc(c.headline) + '</h3>' +
              '<p>' + esc(c.text) + '</p></div>' +
              '<a href="#" class="btn btn-red">Add your name</a></div>';
          }).join('');
        }
      }
    }
  }

  /* ---------- Homepage ---------- */
  function renderHome(home, affiliations) {
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

    var tickerEl = document.getElementById('home-ticker');
    if (tickerEl) {
      if (home.showTicker === false) {
        tickerEl.style.display = 'none';
      } else {
        tickerEl.style.display = '';
        var homeTickerWrap = tickerEl.querySelector('[data-cms-list="ticker"]');
        if (homeTickerWrap && home.ticker) {
          homeTickerWrap.innerHTML = home.ticker.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
        }
      }
    }

    var pillarsSection = document.getElementById('pillars-section');
    if (pillarsSection) pillarsSection.style.display = (home.showPillars === false) ? 'none' : '';
    var pillarWrap = document.querySelector('[data-cms-list="pillars"]');
    if (pillarWrap && home.pillars) {
      pillarWrap.innerHTML = visibleOnly(home.pillars).map(function (p) {
        return '<div class="pillar"><div class="mark-sm"></div><h3>' + esc(p.title) + '</h3><p>' + esc(p.text) + '</p></div>';
      }).join('');
    }

    var whyJoinSection = document.getElementById('why-join-section');
    if (whyJoinSection) whyJoinSection.style.display = (home.showWhyJoin === false) ? 'none' : '';
    var whyJoinWrap = document.querySelector('[data-cms-list="whyJoin"]');
    if (whyJoinWrap && home.whyJoin) {
      whyJoinWrap.innerHTML = visibleOnly(home.whyJoin).map(function (w) {
        return '<div class="card"><h3>' + esc(w.title) + '</h3><p>' + esc(w.text) + '</p></div>';
      }).join('');
    }

    var affSection = document.getElementById('affiliations-section');
    if (affSection) affSection.style.display = (affiliations && affiliations.showAffiliations === false) ? 'none' : '';
    if (affiliations && affiliations.affiliations) {
      var affWrap = document.querySelector('[data-cms-list="affiliations"]');
      if (affWrap) {
        affWrap.innerHTML = visibleOnly(affiliations.affiliations).map(function (a) {
          var logo = a.logo ? '<img src="' + esc(a.logo) + '" alt="">' : '';
          return '<div class="affiliation-item">' + logo + '<a href="' + esc(a.url || '#') + '" target="_blank" rel="noopener">' + esc(a.name) + '</a></div>';
        }).join('');
      }
    }

    var latestUpdatesSection = document.getElementById('latest-updates-section');
    if (latestUpdatesSection) latestUpdatesSection.style.display = (home.showLatestUpdates === false) ? 'none' : '';

    // Homepage "Latest updates" — pulls the most recent items across
    // everything (news, petitions, articles, statements, videos), not
    // just news posts, so this reflects whatever's actually newest
    // anywhere on the site.
    var newsWrap = document.querySelector('[data-cms-list="news-preview"]');
    Promise.all([
      fetchJSON('content/news.json').catch(function () { return {}; }),
      fetchJSON('content/campaign.json').catch(function () { return {}; }),
      fetchJSON('content/newsroom.json').catch(function () { return {}; })
    ]).then(function (results) {
      var news = results[0] || {};
      var campaign = results[1] || {};
      var newsroom = results[2] || {};
      var combined = [];

      visibleOnly(news.posts).forEach(function (p) {
        combined.push({ type: 'News', title: p.title, date: p.date, link: 'news.html' });
      });
      visibleOnly(campaign.campaigns).forEach(function (c) {
        combined.push({ type: 'Petition', title: c.headline, date: c.date, link: 'news.html' });
      });
      visibleOnly(newsroom.featuredStories).forEach(function (s) {
        var headline = s.headline || s.headlineDv || '';
        var hasArticle = !!((s.body || s.bodyDv) && s.slug);
        var link = hasArticle ? ('article.html?slug=' + encodeURIComponent(s.slug)) : (s.url || 'newsroom.html');
        combined.push({ type: 'Article', title: headline, date: s.date, link: link });
      });
      visibleOnly(newsroom.pressReleases).forEach(function (p) {
        combined.push({ type: 'Statement', title: p.title, date: p.date, link: p.file || 'newsroom.html' });
      });
      visibleOnly(newsroom.videoMessages).forEach(function (v) {
        combined.push({ type: 'Video', title: v.title, date: v.date, link: v.videoFile || v.videoUrl || 'newsroom.html' });
      });

      if (newsWrap) {
        newsWrap.innerHTML = sortByDateDesc(combined).slice(0, 5).map(function (item) {
          if (!item.title) return '';
          return '<div class="news-row"><div><span class="cat">' + esc(item.type) + '</span><h4><a href="' + esc(item.link) + '" style="color:inherit;text-decoration:none;">' + esc(item.title) + '</a></h4></div><span class="date">' + esc(formatDate(item.date)) + '</span></div>';
        }).join('');
      }
    }).catch(function () {});
  }

  /* ---------- News & campaigns page ---------- */
  function renderNews(news) {
    renderPageHero(news);

    var latestNewsSection = document.getElementById('latest-news-section');
    if (latestNewsSection) latestNewsSection.style.display = (news.showLatestNews === false) ? 'none' : '';

    // Build a lookup of which categories are currently hidden, so we can
    // both exclude their posts from the list and hide their filter chip —
    // hiding a whole category this way needs no per-post editing at all.
    var hiddenCategories = {};
    (news.categories || []).forEach(function (c) {
      if (c.hidden === true && c.name) hiddenCategories[c.name.toLowerCase()] = true;
    });

    var listWrap = document.querySelector('[data-cms-list="posts"]');
    if (listWrap && news.posts) {
      var visiblePosts = sortByDateDesc(visibleOnly(news.posts).filter(function (p) {
        return !hiddenCategories[(p.category || '').toLowerCase()];
      }));
      listWrap.innerHTML = visiblePosts.map(function (p) {
        var cat = esc(p.category).toLowerCase();
        return '<div class="news-row" data-category="' + cat + '"><div><span class="cat">' + esc(p.category) + '</span><h4>' + esc(p.title) + '</h4></div><span class="date">' + esc(formatDate(p.date)) + '</span></div>';
      }).join('');
    }

    // Re-bind the category filter chips now that rows were rebuilt.
    var chips = document.querySelectorAll('.chip[data-filter]');
    var newsItems = document.querySelectorAll('[data-category]');
    chips.forEach(function (chip) {
      var filterValue = chip.getAttribute('data-filter');
      chip.style.display = (filterValue !== 'all' && hiddenCategories[filterValue]) ? 'none' : '';
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
    var execSection = document.getElementById('leadership');
    if (execSection) execSection.style.display = (data.showExecutive === false) ? 'none' : '';
    var execWrap = document.querySelector('[data-cms-list="executive"]');
    if (execWrap && data.executive) {
      execWrap.innerHTML = visibleOnly(data.executive).map(function (m) {
        return '<div class="team-card">' + avatarHTML(m) + '<h4>' + esc(m.name) + '</h4><p>' + esc(m.role) + '</p></div>';
      }).join('');
    }
    var genSection = document.getElementById('general-members-section');
    if (genSection) genSection.style.display = (data.showGeneralMembers === false) ? 'none' : '';
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

    var missionSection = document.getElementById('mission-section');
    if (missionSection) missionSection.style.display = (about.showMission === false) ? 'none' : '';
    setText('[data-cms="missionPara1"]', about.missionPara1);
    setText('[data-cms="missionPara2"]', about.missionPara2);

    var guidesSection = document.getElementById('guides-section');
    if (guidesSection) guidesSection.style.display = (about.showGuides === false) ? 'none' : '';
    var guidesWrap = document.querySelector('[data-cms-list="guides-list"]');
    if (guidesWrap && about.guides) {
      guidesWrap.innerHTML = about.guides.map(function (g, i) {
        var mb = i === about.guides.length - 1 ? '0' : '22px';
        return '<div class="stat-block" style="margin-bottom:' + mb + ';"><p class="l" style="font-size:15px;color:var(--ink);font-weight:600;">' + esc(g) + '</p></div>';
      }).join('');
    }

    var historySection = document.getElementById('history-section');
    if (historySection) historySection.style.display = (about.showHistory === false) ? 'none' : '';
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

    var feeSection = document.getElementById('fee-section');
    if (feeSection) feeSection.style.display = (m.showFee === false) ? 'none' : '';
    var joinSection = document.getElementById('join');
    if (joinSection) joinSection.style.display = (m.showJoin === false) ? 'none' : '';

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

    var ctaSection = document.getElementById('rights-cta-section');
    if (ctaSection) {
      ctaSection.style.display = (r.showCta === false) ? 'none' : '';
    }

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

    var officesSection = document.getElementById('offices-section');
    if (officesSection) officesSection.style.display = (c.showOffices === false) ? 'none' : '';
    var sendMessageSection = document.getElementById('send-message-section');
    if (sendMessageSection) sendMessageSection.style.display = (c.showSendMessage === false) ? 'none' : '';

    var repsSection = document.getElementById('regional-reps-section');
    if (repsSection) {
      repsSection.style.display = (c.showRegionalReps === false) ? 'none' : '';
    }

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
        var details = o.details ? '<p>' + esc(o.details) + '</p>' : '';
        return '<div class="office-row"><h4>' + esc(o.name) + '</h4>' + details + '</div>';
      }).join('');
    }
    setText('[data-cms="repsNote"]', c.repsNote);
  }

  /* ---------- Resources page ---------- */
  function renderResources(data) {
    renderPageHero(data);
    var guidesSection = document.getElementById('guides-resources-section');
    if (guidesSection) guidesSection.style.display = (data.showGuides === false) ? 'none' : '';
    var guidesWrap = document.querySelector('[data-cms-list="guides"]');
    if (guidesWrap && data.guides) {
      guidesWrap.innerHTML = visibleOnly(data.guides).map(function (g) {
        return renderResourceCard(g.filetag, g.title, g.description, g.meta, g.file, true, 'Download');
      }).join('');
    }
    var campaignSection = document.getElementById('campaign-materials-section');
    if (campaignSection) campaignSection.style.display = (data.showCampaignMaterials === false) ? 'none' : '';
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

  /* ---------- Newsroom ---------- */
  function renderNewsroom(data) {
    renderPageHero(data);

    var featuredSection = document.getElementById('featured-articles-section');
    if (featuredSection) featuredSection.style.display = (data.showFeaturedArticles === false) ? 'none' : '';
    var featuredWrap = document.querySelector('[data-cms-list="featuredStories"]');
    if (featuredWrap && data.featuredStories) {
      featuredWrap.innerHTML = sortByDateDesc(visibleOnly(data.featuredStories)).map(function (s) {
        var thumb = s.image ? '<img class="thumb" src="' + esc(s.image) + '" alt="">' : '';
        // Fall back to the Dhivehi headline/article when there's no
        // English version — this was the bug: checking only the English
        // fields meant a Dhivehi-only story showed a blank headline and
        // a dead "Read more" link (falling through to '#').
        var headline = s.headline || s.headlineDv || '';
        var hasArticle = !!((s.body || s.bodyDv) && s.slug);
        var link = hasArticle ? ('article.html?slug=' + encodeURIComponent(s.slug)) : (s.url || '#');
        return '<div class="resource-card">' + thumb + '<span class="filetag">' + esc(s.tag) + '</span><h3>' + esc(headline) + '</h3><span class="meta">' + esc(formatDate(s.date)) + '</span><a href="' + esc(link) + '" class="btn btn-outline btn-sm">Read more</a></div>';
      }).join('');
    }

    var pressSection = document.getElementById('press-releases-section');
    if (pressSection) pressSection.style.display = (data.showPressReleases === false) ? 'none' : '';
    var pressWrap = document.querySelector('[data-cms-list="pressReleases"]');
    if (pressWrap && data.pressReleases) {
      pressWrap.innerHTML = sortByDateDesc(visibleOnly(data.pressReleases)).map(function (p) {
        return renderResourceCard(formatDate(p.date), p.title, p.summary, '', p.file || '#', true, p.fileLabel || 'Download');
      }).join('');
    }

    var videoSection = document.getElementById('video-messages-section');
    if (videoSection) videoSection.style.display = (data.showVideoMessages === false) ? 'none' : '';
    var videoWrap = document.querySelector('[data-cms-list="videoMessages"]');
    if (videoWrap && data.videoMessages) {
      videoWrap.innerHTML = sortByDateDesc(visibleOnly(data.videoMessages)).map(function (v) {
        var thumb = v.image ? '<img class="thumb" src="' + esc(v.image) + '" alt="">' : '';
        // A self-hosted clip plays directly on the page; otherwise fall
        // back to linking out to wherever the video actually lives.
        if (v.videoFile) {
          return '<div class="resource-card">' + thumb + '<h3>' + esc(v.title) + '</h3><span class="meta">' + esc(formatDate(v.date)) + '</span><video controls preload="metadata" style="width:100%;display:block;background:#000;" src="' + esc(v.videoFile) + '"></video></div>';
        }
        return '<div class="resource-card">' + thumb + '<h3>' + esc(v.title) + '</h3><span class="meta">' + esc(formatDate(v.date)) + '</span><a href="' + esc(v.videoUrl || '#') + '" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Watch video</a></div>';
      }).join('');
    }
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
    fetchJSON('content/campaign.json').then(applyCampaignBanner).catch(function () {});

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
      Promise.all([fetchJSON('content/home.json'), fetchJSON('content/affiliations.json')])
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
    } else if (page === 'newsroom') {
      fetchJSON('content/newsroom.json').then(renderNewsroom).catch(function (err) { console.warn('Content load failed:', err); });
    }
  }
})();
