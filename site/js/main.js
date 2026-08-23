// ===========================================================
// MHPU site — shared behaviour
// ===========================================================

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Accordion (Know your rights page) ---------- */
  document.querySelectorAll('.accordion-trigger').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      if (panel) {
        panel.style.maxHeight = expanded ? null : panel.scrollHeight + 'px';
      }
    });
  });

  /* ---------- News filter chips ---------- */
  var chips = document.querySelectorAll('.chip[data-filter]');
  var newsItems = document.querySelectorAll('[data-category]');
  if (chips.length && newsItems.length) {
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

  /* ---------- Google Apps Script backend config ---------- */
  // ⚠️ REPLACE THIS with your deployed Apps Script Web App URL once you've
  // set up the backend (see the accompanying Code.gs + deployment steps).
  // Every form with the data-appscript attribute will POST here.
  var APPSCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";

  // Apps Script web apps don't send CORS headers, so a normal fetch() can't
  // read the response from a different origin (like our Netlify site). The
  // reliable workaround is a real (non-AJAX) form submission targeting a
  // hidden iframe: the browser is allowed to POST cross-origin and navigate
  // the iframe there, we just can't read what comes back — so we show a
  // success message optimistically once the submission has been fired.
  var hiddenFrame = document.querySelector('iframe[name="hidden-submit-frame"]');
  if (!hiddenFrame) {
    hiddenFrame = document.createElement('iframe');
    hiddenFrame.name = 'hidden-submit-frame';
    hiddenFrame.style.display = 'none';
    hiddenFrame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(hiddenFrame);
  }

  document.querySelectorAll('form[data-appscript]').forEach(function (form) {
    form.setAttribute('action', APPSCRIPT_URL);
    form.setAttribute('method', 'POST');
    form.setAttribute('target', 'hidden-submit-frame');
  });

  /* ---------- Generic form validation + submission handling ---------- */
  // Two backends are supported per-form:
  //  - data-netlify="true"  -> submitted via fetch to Netlify Forms
  //  - data-appscript       -> submitted as a real form POST (see above)
  //  - neither              -> just demos the success flow locally

  function encodeFormData(data) {
    return Object.keys(data)
      .map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]); })
      .join('&');
  }

  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    var alertBox = form.parentElement.querySelector('.form-alert') || form.querySelector('.form-alert');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      var firstInvalid = null;

      form.querySelectorAll('[required]').forEach(function (input) {
        var fieldWrap = input.closest('.field');
        var ok = true;

        if (input.type === 'checkbox') {
          ok = input.checked;
        } else if (input.type === 'email') {
          ok = input.value.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
        } else {
          ok = input.value.trim() !== '';
        }

        if (fieldWrap) {
          fieldWrap.classList.toggle('has-error', !ok);
        }
        if (!ok) {
          valid = false;
          if (!firstInvalid) firstInvalid = input;
        }
      });

      if (!valid) {
        if (alertBox) {
          alertBox.textContent = 'Please check the highlighted fields and try again.';
          alertBox.className = 'form-alert error show';
        }
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; }

      var formData = {};
      new FormData(form).forEach(function (value, key) { formData[key] = value; });

      var showSuccess = function () {
        if (alertBox) {
          var successMsg = form.getAttribute('data-success') || 'Thank you — your submission has been received.';
          alertBox.textContent = successMsg;
          alertBox.className = 'form-alert success show';
        }
        form.reset();
        form.querySelectorAll('.has-error').forEach(function (f) { f.classList.remove('has-error'); });
        if (submitBtn) { submitBtn.disabled = false; }
      };

      var showError = function () {
        if (alertBox) {
          alertBox.textContent = "Something went wrong sending this — please try again, or use the advice line if it's urgent.";
          alertBox.className = 'form-alert error show';
        }
        if (submitBtn) { submitBtn.disabled = false; }
      };

      if (form.hasAttribute('data-appscript')) {
        // Honeypot check — real users never fill this hidden field.
        var honeypot = form.querySelector('[name="bot-field"]');
        if (honeypot && honeypot.value) {
          showSuccess(); // pretend success to the bot, submit nothing
          return;
        }
        if (!APPSCRIPT_URL || APPSCRIPT_URL.indexOf('PASTE_YOUR') === 0) {
          if (alertBox) {
            alertBox.textContent = 'This form is not connected to a backend yet — set APPSCRIPT_URL in js/main.js once deployed.';
            alertBox.className = 'form-alert error show';
          }
          if (submitBtn) { submitBtn.disabled = false; }
          return;
        }
        // Real cross-origin POST, targeting the hidden iframe. We can't read
        // the response, so we optimistically show success shortly after.
        form.submit();
        setTimeout(showSuccess, 900);
      } else if (form.hasAttribute('data-netlify')) {
        fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: encodeFormData(formData)
        })
          .then(function (res) {
            if (res.ok) { showSuccess(); } else { showError(); }
          })
          .catch(function () {
            // Not running on Netlify (e.g. opened locally) — no real
            // endpoint exists to receive this, so just demo the success flow.
            showSuccess();
          });
      } else {
        showSuccess();
      }
    });
  });

});
