/* editorial.js — motion and small behaviours for the lookbook shell.
 * Everything is optional: without IntersectionObserver or with reduced motion
 * the page stays fully visible and static. */

(() => {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  /* ---- Scroll reveal with a hard fallback so content never stays hidden ---- */
  const sections = [...document.querySelectorAll('.section')];
  if (!reduceMotion && 'IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });

    sections.forEach(section => {
      section.classList.add('reveal-pending');
      observer.observe(section);
    });

    setTimeout(() => {
      sections.forEach(section => section.classList.add('is-visible'));
    }, 1600);
  }

  /* ---- Top bar gains a hairline shadow once the page moves ---- */
  const topbar = document.querySelector('.topbar');
  if (topbar) {
    const onScroll = () => topbar.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Hero CTA: open the wardrobe and land on today's look ---- */
  document.getElementById('heroLookBtn')?.addEventListener('click', () => {
    if (typeof switchTab === 'function') switchTab('tab-armario');
    const target = document.getElementById('lookTitleArmario')?.closest('.section');
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ---- Week strip: highlight today and keep the day letters useful ---- */
  const weekDays = document.getElementById('weekDays');
  function markWeekDays() {
    if (!weekDays) return;
    const from = document.getElementById('weekFrom')?.value;
    const links = [...weekDays.querySelectorAll('a[data-day]')];
    if (!from || !links.length) return;
    const plans = typeof store !== 'undefined' ? store.getPlans() : [];
    const today = typeof localDateKey === 'function' ? localDateKey() : '';
    links.forEach((link, index) => {
      const date = new Date(Date.parse(from + 'T12:00:00Z') + index * 86400000).toISOString().slice(0, 10);
      const hasPlan = plans.some(plan => plan.date === date);
      link.classList.toggle('has-plan', hasPlan);
      link.classList.toggle('is-today', date === today);
      if (date === today) link.setAttribute('aria-current', 'date');
      else link.removeAttribute('aria-current');
      link.title = date;
    });
  }

  if (weekDays) {
    weekDays.addEventListener('click', event => {
      const link = event.target.closest('a[data-day]');
      if (!link) return;
      const target = document.getElementById('week-day-' + link.dataset.day);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center', inline: 'center' });
      target.classList.add('is-highlight');
      setTimeout(() => target.classList.remove('is-highlight'), 1400);
    });
    markWeekDays();
    window.addEventListener('stylingu:plans', markWeekDays);
    document.getElementById('weekFrom')?.addEventListener('change', markWeekDays);
  }
})();
