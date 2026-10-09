(function () {
  var header = document.getElementById('top');
  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var items = document.querySelectorAll('.reveal, .timeline');

  // Stagger children of any [data-stagger] group
  items.forEach(function (el) {
    var parent = el.parentElement;
    if (parent && parent.hasAttribute('data-stagger')) {
      var index = Array.prototype.indexOf.call(parent.children, el);
      el.style.setProperty('--d', (index * 0.09) + 's');
    }
  });

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

  items.forEach(function (el) { observer.observe(el); });
})();