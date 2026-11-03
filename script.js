/* =========================================================
   PLATINUM GULF GENERAL TRADING — script.js
   ---------------------------------------------------------
   QUICK EDIT GUIDE:
   • Change WhatsApp number             → CONFIG.whatsappNumber (line 13)
   • Link real Company Profile PDF     → CONFIG.companyProfileUrl (line 14)
   • Link real Product Datasheet PDFs  → CONFIG.datasheetBaseUrl (line 15)
                                        + filenames in CONFIG.datasheets
   • Change RFQ form validation rules  → validators object (line ~75)
   • Send RFQ data to your backend     → search for "isValid" inside form submit handler
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     1. CONFIG — change these values to plug in real assets
     ========================================================= */
  const CONFIG = {
    whatsappNumber: '971508844588',                       // WhatsApp number (digits only, with country code)
    companyProfileUrl: '#',                                // TODO: replace with 'assets/company-profile.pdf'
    datasheetBaseUrl: 'Product-Catalog-pdf-files/',          // Folder containing your PDF file structure
    datasheets: {                                          // TODO: each product's PDF filename
      'aggregates-crushed-stones': 'aggregates-crushed-stones-datasheet.pdf',
      'gravel-boulders': 'gravel-boulders-datasheet.pdf',
      'limestone': 'limestone-datasheet.pdf',
      'calcium-carbonate': 'calcium-carbonate-datasheet.pdf',
      'building-materials': 'Outdoor and Urban Solutions Catalog.pdf'
    }
  };

  /* =========================================================
     2. INIT — runs once when DOM is ready
     ========================================================= */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setYear();              // Footer: dynamic current year
    initMobileNav();        // Mobile hamburger menu
    initStickyHeader();     // Header shadow on scroll
    initScrollSpy();        // Highlight active nav link based on visible section
    initRfqForm();          // RFQ form validation + success message
    initDownloadProfile();  // "Download Company Profile" button behavior
    initDatasheets();       // Per-product datasheet download buttons
    initPrivacyPolicy();    // Privacy policy placeholder
  }

  /* =========================================================
     3. FOOTER YEAR — auto-updates the © year in footer
     ========================================================= */
  function setYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* =========================================================
     4. MOBILE NAVIGATION — hamburger toggle + drawer behavior
     ========================================================= */
  function initMobileNav() {
    const toggle = document.getElementById('navToggle');   // hamburger button
    const closeBtn = document.getElementById('navClose');  // X button inside drawer
    const nav = document.getElementById('mainNav');        // the nav drawer itself
    if (!toggle || !nav) return;

    const openNav = () => {
      nav.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');     // for accessibility
      document.body.style.overflow = 'hidden';          // prevent background scroll
    };
    const closeNav = () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    // Hamburger click → toggle drawer
    toggle.addEventListener('click', () => {
      nav.classList.contains('open') ? closeNav() : openNav();
    });

    // X button click → close
    if (closeBtn) closeBtn.addEventListener('click', closeNav);

    // When user clicks any nav link, close the drawer
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeNav);
    });

    // Press Escape → close drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) closeNav();
    });

    // Click outside drawer → close
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('open')) return;
      if (!nav.contains(e.target) && !toggle.contains(e.target)) closeNav();
    });

    // If user resizes to desktop, close the drawer
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeNav();
    });
  }

  /* =========================================================
     5. STICKY HEADER — add shadow when user scrolls down
     ========================================================= */
  function initStickyHeader() {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    };
    onScroll();   // run once on load
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* =========================================================
     6. SCROLL-SPY — highlight the nav link of the section
         currently in view (uses IntersectionObserver)
     ========================================================= */
  function initScrollSpy() {
    const sections = document.querySelectorAll('main section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    if (!sections.length || !navLinks.length) return;

    const setActive = (id) => {
      navLinks.forEach(link => {
        const target = link.getAttribute('href').replace('#', '');
        link.classList.toggle('active', target === id);
      });
    };

    // Watch each section; when it enters the middle of the viewport, mark active
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, {
      rootMargin: '-40% 0px -55% 0px',   // trigger when section is in middle band
      threshold: 0
    });

    sections.forEach(s => observer.observe(s));
  }

  /* =========================================================
     7. RFQ FORM — validation + WhatsApp direct submission
   ========================================================= */
function initRfqForm() {
  const form = document.getElementById('rfqForm');
  if (!form) return;
  const successMsg = document.getElementById('formSuccess');

  // VALIDATION RULES — edit these to change what's accepted
  const validators = {
    material:  (v) => v ? '' : 'Please select a material.',
    quantity:  (v) => {
      if (!v) return 'Please enter a quantity.';
      if (parseFloat(v) <= 0 || isNaN(parseFloat(v))) return 'Quantity must be greater than 0.';
      return '';
    },
    location:  (v) => v ? '' : 'Please select a delivery location.',
    name:      (v) => v.trim().length >= 2 ? '' : 'Please enter your name.',
    email:     (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Please enter a valid email.',
    phone:     (v) => {
      const cleaned = v.replace(/[\s\-()+]/g, '');   // strip spaces, dashes, parens
      return /^[0-9]{7,15}$/.test(cleaned) ? '' : 'Please enter a valid phone number.';
    }
  };

  // Helper: show/clear error message for one field
  const showError = (field, msg) => {
    const input = form.querySelector(`#${field}`);
    const errEl = form.querySelector(`[data-error-for="${field}"]`);
    if (input) input.classList.toggle('invalid', !!msg);
    if (errEl) errEl.textContent = msg;
  };

  // LIVE VALIDATION — validate on blur (when user leaves a field)
  Object.keys(validators).forEach(field => {
    const input = form.querySelector(`#${field}`);
    if (!input) return;
    input.addEventListener('blur', () => {
      showError(field, validators[field](input.value));
    });
    input.addEventListener('input', () => {
      if (input.classList.contains('invalid')) {
        showError(field, validators[field](input.value));
      }
    });
  });

  // FORM SUBMIT
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let isValid = true;

    // Validate every field; if any fails, mark invalid
    Object.keys(validators).forEach(field => {
      const input = form.querySelector(`#${field}`);
      if (!input) return;
      const msg = validators[field](input.value);
      showError(field, msg);
      if (msg) isValid = false;
    });

    if (!isValid) {
      const firstInvalid = form.querySelector('.invalid');
      if (firstInvalid) firstInvalid.focus();
      if (successMsg) {
        successMsg.textContent = 'Please correct the highlighted fields and try again.';
        successMsg.style.color = 'var(--color-error)';
      }
      return;
    }

    // Capture structured values from form fields
    const data = {
      material: form.material.options[form.material.selectedIndex].text,
      quantity: form.quantity.value,
      location: form.location.options[form.location.selectedIndex].text,
      notes:    form.notes.value.trim() || 'None',
      name:     form.name.value.trim(),
      company:  form.company.value.trim() || 'N/A',
      email:    form.email.value.trim(),
      phone:    form.phone.value.trim()
    };

   // Build the clean, ordered message layout with explicit new lines
    const waText = 
      "NEW REQUEST FOR QUOTATION (RFQ)\n" +
      "-----------------------------------\n" +
      "Material Required: " + data.material + ".\n" +
      "Quantity / Volume: " + data.quantity + " metric tons\n" +
      "Delivery Location: " + data.location + "\n" +
      "Additional Notes: " + data.notes + "\n" +
      "Name: " + data.name + "\n" +
      "Company: " + data.company + "\n" +
      "Email: " + data.email + "\n" +
      "Phone / WhatsApp: " + data.phone + "\n" +
      "-----------------------------------";

    // Target WhatsApp phone number requested: +971508844588
    const whatsappNumber = '971508844588';
    const waLink = `https://wa.me/${whatsappNumber}?text=` + encodeURIComponent(waText);

    if (successMsg) {
      successMsg.textContent = 'Opening WhatsApp with your formatted request...';
      successMsg.style.color = 'var(--color-success)';
    }

    // RELIABLE BYPASS METHOD: Create a temporary anchor element and click it programmatically.
    // This completely prevents browser popup blockers from stopping WhatsApp from opening.
    const tempAnchor = document.createElement('a');
    tempAnchor.href = waLink;
    tempAnchor.target = '_blank';
    tempAnchor.rel = 'noopener noreferrer';
    document.body.appendChild(tempAnchor);
    tempAnchor.click();
    document.body.removeChild(tempAnchor);

    // Reset form fields
    form.reset();
    Object.keys(validators).forEach(f => showError(f, ''));

      // After 800ms, ask if user also wants to send via WhatsApp for instant response
      setTimeout(() => {
        if (confirm('Your RFQ is submitted. Would you also like to send the same details via WhatsApp for a faster response?')) {
          window.open(waLink, '_blank', 'noopener');
        }
      }, 800);
    });
  }

  /* =========================================================
     8. DOWNLOAD COMPANY PROFILE
         Triggers when user clicks "Download Company Profile"
         in the Supply Network section OR in the footer.
     ========================================================= */
  function initDownloadProfile() {
    const btns = [
      document.getElementById('downloadProfileBtn'),     // button in supply-network section
      document.getElementById('downloadProfileFooter')   // link in footer
    ].filter(Boolean);

    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (CONFIG.companyProfileUrl && CONFIG.companyProfileUrl !== '#') {
          window.open(CONFIG.companyProfileUrl, '_blank', 'noopener');
        } else {
          alert(
            'Company Profile PDF will be added here.\n\n' +
            'Drop your file at /assets/company-profile.pdf ' +
            'and update CONFIG.companyProfileUrl in script.js to enable the download.'
          );
        }
      });
    });
  }

  /* =========================================================
     9. PRODUCT DATASHEETS
         Each "Download Datasheet" link in the products grid.
     ========================================================= */
  function initDatasheets() {
    const links = document.querySelectorAll('.product-datasheet');
    
    if (links.length === 0) return;

    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const product = link.getAttribute('data-product');           // e.g. "building-materials"
        const filename = CONFIG.datasheets[product];                // e.g. PDF filename from map
        
        if (filename && CONFIG.datasheetBaseUrl && CONFIG.datasheetBaseUrl !== '#') {
          const fullUrl = encodeURI(CONFIG.datasheetBaseUrl + filename);
          window.open(fullUrl, '_blank', 'noopener');
        } else {
          alert(
            `Datasheet for "${product ? product.replace(/-/g, ' ') : 'product'}" will be added here.\n\n` +
            `Check your CONFIG.datasheetBaseUrl and file mapping.`
          );
        }
      });
    });
  }

  /* =========================================================
     10. PRIVACY POLICY — placeholder until you publish
         a real /privacy-policy.html page
     ========================================================= */
  function initPrivacyPolicy() {
    const link = document.getElementById('privacyPolicyLink');
    if (!link) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Privacy Policy page will be available here.\n\nPlease link to /privacy-policy.html once published.');
    });
  }

})();