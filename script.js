/* ============================================================
   PROFESSIONAL ENTERPRISE WEBSITE — GLOBAL JAVASCRIPT
   Single source of truth for all interactive behavior
   ============================================================ */

(function() {
    'use strict';

    // ----- 1. DETECT REDUCED MOTION -----
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isReducedMotion = prefersReducedMotion.matches;

    // ----- 2. DOM REFS -----
    const header = document.querySelector('.header');
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');
    const navList = document.querySelector('.nav-list');
    const navLinks = document.querySelectorAll('.nav-link');
    const headerHeight = header ? header.offsetHeight : 70;

    // ----- 3. MOBILE NAVIGATION -----
    function toggleNav(open) {
        if (!navToggle || !nav) return;

        const isOpen = typeof open === 'boolean' ? open : nav.classList.contains('open');

        if (typeof open === 'boolean') {
            if (isOpen) {
                nav.classList.add('open');
                navToggle.setAttribute('aria-expanded', 'true');
                navToggle.setAttribute('aria-label', 'Close navigation menu');
            } else {
                nav.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.setAttribute('aria-label', 'Open navigation menu');
            }
            return;
        }

        // Toggle
        nav.classList.toggle('open');
        const nowOpen = nav.classList.contains('open');
        navToggle.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
        navToggle.setAttribute('aria-label', nowOpen ? 'Close navigation menu' : 'Open navigation menu');
    }

    // Toggle click
    if (navToggle) {
        navToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleNav();
        });
    }

    // Close on link click (mobile)
    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            if (nav && nav.classList.contains('open')) {
                toggleNav(false);
            }
        });
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && nav && nav.classList.contains('open')) {
            toggleNav(false);
            if (navToggle) navToggle.focus();
        }
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!nav || !navToggle) return;
        if (nav.classList.contains('open')) {
            const target = e.target;
            if (!nav.contains(target) && !navToggle.contains(target)) {
                toggleNav(false);
            }
        }
    });

    // ----- 4. ACTIVE NAVIGATION STATE (client-side) -----
    function setActiveNavLink() {
        const currentPath = window.location.pathname;
        const pageName = currentPath.split('/').pop() || 'index.html';

        navLinks.forEach(function(link) {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (!href) return;

            // Match exact filename
            const linkFile = href.split('/').pop();
            if (linkFile === pageName) {
                link.classList.add('active');
            }

            // Special case: index.html for root path
            if ((pageName === '' || pageName === 'index.html') && (linkFile === 'index.html' || linkFile === '')) {
                link.classList.add('active');
            }
        });
    }
    setActiveNavLink();

    // ----- 5. HEADER SCROLL BEHAVIOR -----
    let lastScrollY = window.scrollY;
    let ticking = false;

    function handleHeaderScroll() {
        const scrollY = window.scrollY;

        if (header) {
            if (scrollY > 10) {
                header.classList.add('header-scrolled');
            } else {
                header.classList.remove('header-scrolled');
            }
        }

        lastScrollY = scrollY;
        ticking = false;
    }

    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                handleHeaderScroll();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    // Initial check
    handleHeaderScroll();

    // ----- 6. SMOOTH SCROLLING (internal anchor links) -----
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (!targetElement) return;

            e.preventDefault();

            const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight - 10;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        });
    });

    // ----- 7. SCROLL-REVEAL (IntersectionObserver) -----
    let revealObserver;

    function initRevealObserver() {
        const revealElements = document.querySelectorAll('.reveal, .reveal-stagger');

        if (revealElements.length === 0) return;

        // Disable animations if reduced motion is preferred
        if (isReducedMotion) {
            revealElements.forEach(function(el) {
                el.classList.add('visible');
            });
            return;
        }

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -60px 0px',
            threshold: 0.1
        };

        revealObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Unobserve after reveal to improve performance
                    revealObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        revealElements.forEach(function(el) {
            revealObserver.observe(el);
        });
    }

    // Initialize reveal on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRevealObserver);
    } else {
        initRevealObserver();
    }

    // Re-initialize for dynamically added content (if any) — can be called manually
    // Expose a function to re-run reveal on new content
    window.initReveal = function() {
        if (revealObserver) {
            revealObserver.disconnect();
        }
        initRevealObserver();
    };

    // ----- 8. SKIP-TO-CONTENT (keyboard support) -----
    const skipLink = document.querySelector('.skip-to-content');
    if (skipLink) {
        skipLink.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const target = document.querySelector(targetId);
                if (target) {
                    const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 10;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    target.focus({ preventScroll: true });
                }
            }
        });
    }

    // ----- 9. TOUCH / DEVICE FRIENDLY -----
    // Ensure no hover state gets stuck on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.addEventListener('touchstart', function() {}, { passive: true });
    }

    // ----- 10. WINDOW RESIZE: close mobile nav on desktop -----
    function handleResize() {
        if (window.innerWidth > 767 && nav && nav.classList.contains('open')) {
            toggleNav(false);
        }
    }

    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleResize, 150);
    }, { passive: true });

    // ----- 11. REMOVE NO-JS CLASS IF PRESENT (progressive enhancement) -----
    document.documentElement.classList.remove('no-js');
    document.documentElement.classList.add('js');

    console.log('[Enterprise Website] Global script initialized.');

})();
