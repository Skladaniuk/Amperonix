// Scroll animations + "blackout" theme for the #calc section.
// Runs outside the dc runtime, so it waits until the page has rendered.
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var css = [
    '#fx-dark{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:0;transition:opacity .6s ease;',
    'background:radial-gradient(ellipse 60% 50% at 70% 35%,#1C2114 0%,#0A0B09 70%)}',
    'body.fx-dark ~ #fx-dark{opacity:1}',
    'body{transition:color .6s}',
    'header{transition:background .6s,border-color .6s,color .6s}',
    'header img{transition:filter .6s}',
    'body.fx-dark header{background:rgba(10,11,9,.88)!important;border-color:#26281F!important;color:#F2F3EE}',
    'body.fx-dark header img{filter:brightness(0) invert(1)}',
    '#calc>div:first-child *{transition:color .6s}',
    'body.fx-dark #calc>div:first-child h2{color:#F2F3EE!important}',
    'body.fx-dark #calc>div:first-child p{color:#B9BCAE!important}',
    'body.fx-dark #calc>div:first-child span{color:#8E927F!important}',
    '#calc>div:nth-child(2)>div{transition:box-shadow .9s ease}',
    'body.fx-dark #calc>div:nth-child(2)>div{box-shadow:0 0 0 1px rgba(184,255,74,.14),0 24px 70px rgba(184,255,74,.09)}'
  ];
  if (!reduce) css.push(
    '.fx-rev{transition:opacity .9s cubic-bezier(.2,.7,.2,1) var(--d,0s),transform .9s cubic-bezier(.2,.7,.2,1) var(--d,0s)}',
    '.fx-pre{opacity:0;transform:translate3d(0,36px,0)}',
    '.fx-pre.fx-l{transform:translate3d(-56px,0,0)}',
    '.fx-pre.fx-r{transform:translate3d(56px,0,0)}',
    '.fx-in{opacity:1;transform:none}',
    '.fx-zoom img{transform:scale(1.14);transition:transform 1.5s cubic-bezier(.2,.7,.2,1) var(--d,0s)}',
    '.fx-zoom.fx-in img{transform:scale(1)}'
  );
  var st = document.createElement('style');
  st.textContent = css.join('\n');
  document.head.appendChild(st);

  var ios = [];
  function prep() {
    var targets = [];
    function add(el, cls, i) {
      if (!el || el.classList.contains('fx-rev')) return;
      el.classList.add('fx-rev', 'fx-pre');
      if (cls) el.classList.add(cls);
      el.style.setProperty('--d', Math.min(i || 0, 5) * 0.09 + 's');
      targets.push(el);
    }
    var secs = document.querySelectorAll('main > section');
    secs.forEach(function (sec, si) {
      var root = sec;
      while (root.children.length === 1) root = root.firstElementChild;
      var kids = Array.prototype.slice.call(root.children);
      if (si === 0) {
        // hero: copy slides in from the left, photo from the right
        var left = kids[0], right = kids[1];
        if (left) Array.prototype.forEach.call(left.children, function (c, i) { add(c, 'fx-l', i); });
        add(right, 'fx-r', 1);
        return;
      }
      kids.forEach(function (k, i) {
        var cs = getComputedStyle(k);
        var many = k.children.length >= 3;
        if (cs.display === 'grid' && many) {
          Array.prototype.forEach.call(k.children, function (c, j) { add(c, null, j); });
        } else {
          add(k, null, i === 0 ? 0 : 1);
        }
      });
    });
    // photos: slow zoom-out inside their frame
    document.querySelectorAll('main img').forEach(function (img) {
      if (getComputedStyle(img).objectFit !== 'cover') return;
      var f = img.parentElement;
      f.classList.add('fx-zoom');
      if (targets.indexOf(f) < 0) targets.push(f);
    });
    // fx-zoom frames nested in revealed blocks still need to be observed
    void document.body.offsetHeight;

    if (!('IntersectionObserver' in window)) { targets.forEach(function (t) { t.classList.add('fx-in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('fx-pre');
        e.target.classList.add('fx-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    ios.push(io);
    targets.forEach(function (t) { io.observe(t); });
  }

  // Dark only while #calc owns the screen, so neighbouring sections (dark text
  // on light bg) are never visible on the dark background for long.
  var offScroll = null;
  function blackout(calc) {
    var ov = document.getElementById('fx-dark');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'fx-dark';
      document.documentElement.appendChild(ov);
    }
    if (offScroll) offScroll();
    var raf = 0;
    function check() {
      raf = 0;
      var r = calc.getBoundingClientRect(), vh = window.innerHeight;
      document.body.classList.toggle('fx-dark', r.top <= vh * 0.15 && r.bottom >= vh * 0.3);
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(check); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    offScroll = function () {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    check();
  }

  var current = null;
  function init() {
    var calc = document.getElementById('calc');
    if (!calc || !document.querySelector('main > section:nth-child(3)')) return;
    if (calc === current) return;
    // the dc runtime may re-render the page: drop old observers and rebuild
    current = calc;
    ios.forEach(function (o) { o.disconnect(); });
    ios = [];
    if (!reduce) prep();
    blackout(calc);
  }

  var timer;
  new MutationObserver(function () {
    clearTimeout(timer);
    timer = setTimeout(init, 120);
  }).observe(document.body, { childList: true, subtree: true });
  init();
})();
