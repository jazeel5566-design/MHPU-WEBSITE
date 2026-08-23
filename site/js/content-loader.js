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
    if (el && value != null) el.textContent = value;
  }

  function setHTML(selector, value) {
    var el = document.querySelector(selector);
    if (el && value != null) el.innerHTML = value;
  }

  /* ---------- Homepage ---------- */
  function renderHome(home, stats) {
    setText('[data-cms="heroKicker"]', home.heroKicker);
    setHTML('[data-cms="heroHeadline"]', esc(home.heroHeadlinePlain) + '<span style="color:var(--red);">' + esc(home.heroHeadlineRed) + '</span>');
    setText('[data-cms="slogan"]', home.slogan);
    setText('[data-cms="heroSubtext"]', home.heroSubtext);
    setText('[data-cms="actionTag"]', home.actionTag);
    setText('[data-cms="actionHeadline"]', home.actionHeadline);
    setText('[data-cms="actionText"]', home.actionText);

    var pillarWrap = document.querySelector('[data-cms-list="pillars"]');
    if (pillarWrap && home.pillars) {
      pillarWrap.innerHTML = home.pillars.map(function (p) {
        return '<div class="pillar"><div class="mark-sm"></div><h3>' + esc(p.title) + '</h3><p>' + esc(p.text) + '</p></div>';
      }).join('');
    }

    var whyJoinWrap = document.querySelector('[data-cms-list="whyJoin"]');
    if (whyJoinWrap && home.whyJoin) {
      whyJoinWrap.innerHTML = home.whyJoin.map(function (w) {
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

    // Homepage news preview — first 3 posts
    var newsWrap = document.querySelector('[data-cms-list="news-preview"]');
    fetchJSON('content/news.json').then(function (news) {
      if (newsWrap && news.posts) {
        newsWrap.innerHTML = news.posts.slice(0, 3).map(function (p) {
          return '<div class="news-row"><div><h4>' + esc(p.title) + '</h4></div><span class="date">' + esc(p.date) + '</span></div>';
        }).join('');
      }
    }).catch(function () {});
  }

  /* ---------- News & campaigns page ---------- */
  function renderNews(news) {
    setText('[data-cms="campaignTag"]', news.campaignTag);
    setText('[data-cms="campaignHeadline"]', news.campaignHeadline);
    setText('[data-cms="campaignText"]', news.campaignText);

    var listWrap = document.querySelector('[data-cms-list="posts"]');
    if (listWrap && news.posts) {
      listWrap.innerHTML = news.posts.map(function (p) {
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
      execWrap.innerHTML = data.executive.map(function (m) {
        return '<div class="team-card">' + avatarHTML(m) + '<h4>' + esc(m.name) + '</h4><p>' + esc(m.role) + '</p></div>';
      }).join('');
    }
    var genWrap = document.querySelector('[data-cms-list="generalMembers"]');
    if (genWrap && data.generalMembers) {
      genWrap.innerHTML = data.generalMembers.map(function (m) {
        return '<div class="team-card">' + avatarHTML(m) + '<h4>' + esc(m.name) + '</h4><p>' + esc(m.role) + '</p></div>';
      }).join('');
    }
    var repWrap = document.querySelector('[data-cms-list="regionalReps"]');
    if (repWrap && data.regionalReps) {
      repWrap.innerHTML = data.regionalReps.map(function (r) {
        return '<div class="team-card">' + avatarHTML(r) + '<h4>' + esc(r.name) + '</h4><p>' + esc(r.area) + '</p></div>';
      }).join('');
    }
  }

  /* ---------- Resources page ---------- */
  function renderResources(data) {
    var guidesWrap = document.querySelector('[data-cms-list="guides"]');
    if (guidesWrap && data.guides) {
      guidesWrap.innerHTML = data.guides.map(renderResourceCard).join('');
    }
    var campaignWrap = document.querySelector('[data-cms-list="campaignMaterials"]');
    if (campaignWrap && data.campaignMaterials) {
      campaignWrap.innerHTML = data.campaignMaterials.map(renderResourceCard).join('');
    }
  }

  function renderResourceCard(r) {
    return '<div class="resource-card"><span class="filetag">' + esc(r.filetag) + '</span><h3>' + esc(r.title) + '</h3><p>' + esc(r.description) + '</p><span class="meta">' + esc(r.meta) + '</span><a href="' + esc(r.file) + '" class="btn btn-outline btn-sm" download>Download</a></div>';
  }

  /* ---------- Hero image swap (every page) ---------- */
  // The hero's diagonal red stripe can be replaced with an uploaded photo,
  // per page, from /admin. Falls back to the original stripe pattern
  // automatically when no image has been set for that page.
  function applyHeroImage(images) {
    var page = document.body.getAttribute('data-cms-page');
    var stripeEl = document.querySelector('.stripe');
    if (!page || !stripeEl || !images) return;
    var url = images[page];
    if (url) {
      stripeEl.style.background = 'center / cover no-repeat url("' + url + '")';
      stripeEl.style.opacity = '1';
    }
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-cms-page');
    if (!page) return;

    fetchJSON('content/hero-images.json').then(applyHeroImage).catch(function () {});

    if (page === 'home') {
      Promise.all([fetchJSON('content/home.json'), fetchJSON('content/stats.json')])
        .then(function (results) { renderHome(results[0], results[1]); })
        .catch(function (err) { console.warn('Content load failed:', err); });
    } else if (page === 'news') {
      fetchJSON('content/news.json').then(renderNews).catch(function (err) { console.warn('Content load failed:', err); });
    } else if (page === 'about') {
      fetchJSON('content/leadership.json').then(renderLeadership).catch(function (err) { console.warn('Content load failed:', err); });
    } else if (page === 'contact') {
      fetchJSON('content/leadership.json').then(renderLeadership).catch(function (err) { console.warn('Content load failed:', err); });
    } else if (page === 'resources') {
      fetchJSON('content/resources.json').then(renderResources).catch(function (err) { console.warn('Content load failed:', err); });
    }
  });
})();
