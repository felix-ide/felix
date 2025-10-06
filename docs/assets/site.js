(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const current = document.body?.dataset?.page;

    if (current) {
      document
        .querySelectorAll('.nav-link')
        .forEach((link) => link.classList.remove('active'));

      const activeLink = document.querySelector(`.nav-link[data-nav="${current}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
      }
    }

    document.querySelectorAll('.audience-block').forEach((block) => {
      const buttons = block.querySelectorAll('.audience-switch button[data-audience]');
      const panels = block.querySelectorAll('.audience-panel[data-audience]');
      if (!buttons.length || !panels.length) {
        return;
      }

      const setActive = (audience) => {
        buttons.forEach((btn) => {
          const isActive = btn.dataset.audience === audience;
          btn.setAttribute('aria-selected', String(isActive));
          btn.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        panels.forEach((panel) => {
          panel.hidden = panel.dataset.audience !== audience;
        });
      };

      const defaultAudience = block.dataset.defaultAudience || buttons[0].dataset.audience;
      setActive(defaultAudience);

      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          setActive(btn.dataset.audience);
        });
      });
    });

    const lightbox = document.querySelector('.lightbox-backdrop');
    const lightboxImage = lightbox?.querySelector('img');
    const lightboxCaption = lightbox?.querySelector('.lightbox-caption');
    const lightboxClose = lightbox?.querySelector('.lightbox-close');
    let lastFocusedTrigger = null;

    const closeLightbox = (focusTrigger = true) => {
      if (!lightbox) return;
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lightbox-open');
      if (lightboxImage) {
        lightboxImage.src = '';
        lightboxImage.alt = '';
      }
      if (lightboxCaption) {
        lightboxCaption.textContent = '';
      }
      if (focusTrigger && lastFocusedTrigger) {
        lastFocusedTrigger.focus();
      }
    };

    if (lightbox && lightboxImage && lightboxClose) {
      document.querySelectorAll('figure.screenshot a').forEach((link) => {
        link.addEventListener('click', (event) => {
          event.preventDefault();
          lastFocusedTrigger = link;
          const figure = link.closest('figure');
          const img = link.querySelector('img');
          const caption = figure?.querySelector('figcaption');

          if (img) {
            lightboxImage.src = link.href;
            lightboxImage.alt = img.alt || '';
          } else {
            lightboxImage.src = link.href;
            lightboxImage.alt = '';
          }

          if (lightboxCaption) {
            lightboxCaption.textContent = caption?.textContent?.trim() || '';
          }

          lightbox.setAttribute('aria-hidden', 'false');
          document.body.classList.add('lightbox-open');
          lightboxClose.focus();
        });
      });

      lightboxClose.addEventListener('click', () => closeLightbox());

      lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) {
          closeLightbox();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && lightbox.getAttribute('aria-hidden') === 'false') {
          closeLightbox();
        }
      });

      lightboxClose.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          closeLightbox();
        }
      });
    }

    // Page Navigation System
    initPageNavigation();

    // Scroll to Top Button
    initScrollToTop();
  });

  // Initialize Page Navigation (Floating Mini-Nav or Sidebar)
  function initPageNavigation() {
    const main = document.querySelector('main');
    if (!main) return;

    // Check if page should have floating mini-nav or sidebar
    const pageType = document.body.dataset.page;
    const miniNavPages = ['explore', 'rules', 'guardrails'];
    const sidebarPages = ['getting-started'];

    if (miniNavPages.includes(pageType)) {
      initFloatingMiniNav(main);
    } else if (sidebarPages.includes(pageType)) {
      initStickySidebar(main);
    }
  }

  // Floating Mini-Nav for Feature Pages
  function initFloatingMiniNav(main) {
    const sections = main.querySelectorAll('.section');
    if (sections.length < 2) return; // Only show if multiple sections

    // Create nav container
    const nav = document.createElement('nav');
    nav.className = 'page-nav';
    nav.setAttribute('aria-label', 'Page sections');

    // Generate links from h2 section titles
    sections.forEach((section, index) => {
      const heading = section.querySelector('.section-title');
      if (!heading) return;

      const id = heading.textContent
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      section.id = id;

      const link = document.createElement('a');
      link.href = `#${id}`;
      link.className = 'page-nav-link';
      link.textContent = heading.textContent;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      nav.appendChild(link);
    });

    document.body.appendChild(nav);

    // Show nav after scrolling past hero
    let navVisible = false;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && !navVisible) {
            nav.classList.add('active');
            navVisible = true;
          } else if (entry.isIntersecting && navVisible) {
            nav.classList.remove('active');
            navVisible = false;
          }
        });
      },
      { threshold: 0.1 }
    );

    const hero = main.querySelector('.hero');
    if (hero) {
      observer.observe(hero);
    } else {
      nav.classList.add('active');
    }

    // Highlight active section on scroll
    const links = nav.querySelectorAll('.page-nav-link');
    const sectionElements = Array.from(sections);

    function updateActiveLink() {
      let currentSection = null;
      const scrollPosition = window.scrollY + window.innerHeight / 3;

      sectionElements.forEach((section) => {
        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;

        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
          currentSection = section;
        }
      });

      links.forEach((link) => {
        link.classList.remove('active');
        if (currentSection && link.href.includes(currentSection.id)) {
          link.classList.add('active');
        }
      });
    }

    window.addEventListener('scroll', updateActiveLink, { passive: true });
    updateActiveLink();
  }

  // Sticky Sidebar for Documentation Pages
  function initStickySidebar(main) {
    // Check if sidebar already exists
    if (main.querySelector('.docs-sidebar')) return;

    const sections = main.querySelectorAll('section');
    if (sections.length < 3) return; // Only show if enough content

    // Create sidebar
    const sidebar = document.createElement('aside');
    sidebar.className = 'docs-sidebar';
    sidebar.setAttribute('aria-label', 'Documentation navigation');

    const title = document.createElement('div');
    title.className = 'docs-sidebar-title';
    title.textContent = 'On this page';

    const navList = document.createElement('nav');
    navList.className = 'docs-sidebar-nav';

    // Generate links from h2 headings
    sections.forEach((section) => {
      const heading = section.querySelector('h2, .section-title');
      if (!heading) return;

      const id = heading.textContent
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      section.id = id;

      const link = document.createElement('a');
      link.href = `#${id}`;
      link.className = 'docs-sidebar-link';
      link.textContent = heading.textContent;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      navList.appendChild(link);
    });

    sidebar.appendChild(title);
    sidebar.appendChild(navList);

    // Wrap main content in layout grid
    const wrapper = document.createElement('div');
    wrapper.className = 'docs-layout';
    main.parentNode.insertBefore(wrapper, main);
    wrapper.appendChild(sidebar);
    wrapper.appendChild(main);

    main.classList.add('docs-content');

    // Mobile: collapsible sidebar
    title.addEventListener('click', () => {
      if (window.innerWidth <= 1024) {
        sidebar.classList.toggle('collapsed');
      }
    });

    // Highlight active section on scroll
    const links = navList.querySelectorAll('.docs-sidebar-link');
    const sectionElements = Array.from(sections).filter(s => s.id);

    function updateActiveLink() {
      let currentSection = null;
      const scrollPosition = window.scrollY + 150;

      sectionElements.forEach((section) => {
        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;

        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
          currentSection = section;
        }
      });

      links.forEach((link) => {
        link.classList.remove('active');
        if (currentSection && link.href.includes(currentSection.id)) {
          link.classList.add('active');
        }
      });
    }

    window.addEventListener('scroll', updateActiveLink, { passive: true });
    updateActiveLink();
  }

  // Scroll to Top Button
  function initScrollToTop() {
    const button = document.createElement('button');
    button.className = 'scroll-to-top';
    button.setAttribute('aria-label', 'Scroll to top');
    button.innerHTML = '↑';
    document.body.appendChild(button);

    // Show/hide based on scroll position
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        button.classList.add('visible');
      } else {
        button.classList.remove('visible');
      }
    }, { passive: true });

    // Scroll to top on click
    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
