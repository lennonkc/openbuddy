/* ==========================================================
   openbuddy.fun — Horizontal Scroll + GSAP Animations
   Works on both desktop and mobile (vertical swipe → horizontal move)
   ========================================================== */

gsap.registerPlugin(ScrollTrigger);

/* ---------- Text Splitting Utilities ---------- */

function splitIntoWords(el) {
  const nodes = [];
  el.childNodes.forEach(function (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const words = node.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      words.forEach(function (w) {
        if (/^\s+$/.test(w)) {
          frag.appendChild(document.createTextNode(w));
          return;
        }
        if (w === "") return;
        const span = document.createElement("span");
        span.className = "word";
        span.style.display = "inline-block";
        span.textContent = w;
        frag.appendChild(span);
      });
      nodes.push({ original: node, replacement: frag });
    }
  });
  nodes.forEach(function (n) {
    n.original.parentNode.replaceChild(n.replacement, n.original);
  });
  return el.querySelectorAll(".word");
}

function splitIntoChars(el) {
  var words = el.querySelectorAll(".word");
  if (!words.length) words = splitIntoWords(el);
  words.forEach(function (word) {
    var text = word.textContent;
    word.textContent = "";
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement("span");
      span.className = "char";
      span.style.display = "inline-block";
      span.textContent = text[i];
      word.appendChild(span);
    }
  });
  return el.querySelectorAll(".char");
}

/* ---------- Responsive helper ---------- */

const isNarrow = window.innerWidth <= 900;

/* ---------- Core: Horizontal Scroll (always active) ---------- */

let scrollTween;
const progressFill = document.querySelector(".progress__fill");

function initHorizontalScroll() {
  const track = document.querySelector(".h-track");

  const getScrollAmount = function () {
    return track.scrollWidth - window.innerWidth;
  };

  scrollTween = gsap.to(track, {
    x: function () {
      return -getScrollAmount();
    },
    ease: "none",
    scrollTrigger: {
      trigger: ".h-wrapper",
      pin: true,
      scrub: isNarrow ? 0.6 : 1,
      end: function () {
        return "+=" + getScrollAmount();
      },
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        if (progressFill) progressFill.style.width = (self.progress * 100).toFixed(1) + "%";
      },
    },
  });
}

/* ---------- Helper: Create containerAnimation trigger ---------- */

function animateIn(selector, fromVars, triggerEl) {
  if (!scrollTween) return;

  const config = {
    trigger: triggerEl || selector,
    start: "left 85%",
    toggleActions: "play none none reset",
    containerAnimation: scrollTween,
  };

  gsap.from(selector, Object.assign({}, fromVars, { scrollTrigger: config }));
}

/* ---------- Helper: Parallax within horizontal scroll ---------- */

function addParallax(el, yOffset) {
  if (!scrollTween) return;

  gsap.to(el, {
    y: yOffset,
    ease: "none",
    scrollTrigger: {
      containerAnimation: scrollTween,
      trigger: el,
      start: "left right",
      end: "right left",
      scrub: 1,
    },
  });
}

/* ---------- Panel 1: Hero ---------- */

function initHero() {
  const title = document.querySelector(".hero__title");
  const tagline = document.querySelector(".hero__tagline");

  let mainText = null;
  title.childNodes.forEach(function (node) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      mainText = node;
    }
  });
  if (mainText) {
    const frag = document.createDocumentFragment();
    const text = mainText.textContent;
    for (let i = 0; i < text.length; i++) {
      const span = document.createElement("span");
      span.className = "char";
      span.style.display = "inline-block";
      span.textContent = text[i];
      frag.appendChild(span);
    }
    mainText.parentNode.replaceChild(frag, mainText);
  }

  const chars = title.querySelectorAll(".char");
  const dot = title.querySelector(".hero__dot");
  const words = splitIntoWords(tagline);

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  /* Rainbow Cascade: chars enter with 3D flip + color cycle */
  tl.from(chars, {
    y: 100,
    opacity: 0,
    rotateX: -120,
    scale: 0.3,
    duration: 1.4,
    stagger: 0.07,
    ease: "back.out(1.7)",
  });

  tl.to(
    chars,
    {
      keyframes: [
        { color: "#3cc7b4", duration: 0.25 },
        { color: "#fcd757", duration: 0.25 },
        { color: "#f5a0b8", duration: 0.25 },
        { color: "#b39ddb", duration: 0.25 },
        { color: "#2d3436", duration: 0.5 },
      ],
      stagger: 0.06,
    },
    "-=0.6"
  );

  if (dot) {
    tl.from(
      dot,
      {
        scale: 0,
        opacity: 0,
        rotation: -360,
        duration: 1,
        ease: "elastic.out(1, 0.4)",
      },
      "-=1.2"
    );
  }

  tl.from(
    words,
    {
      y: 50,
      opacity: 0,
      rotateZ: -8,
      duration: 1,
      stagger: 0.12,
    },
    "-=0.8"
  );

  tl.to(
    words,
    {
      keyframes: [
        { color: "#3cc7b4", duration: 0.3 },
        { color: "#636e72", duration: 0.5 },
      ],
      stagger: 0.12,
    },
    "-=0.8"
  );

  tl.from(
    ".hero__desc",
    {
      y: 30,
      opacity: 0,
      duration: 0.8,
    },
    "-=0.6"
  );

  tl.from(
    ".hero__device",
    {
      y: 60,
      opacity: 0,
      scale: 0.85,
      rotation: 5,
      duration: 1.2,
      ease: "back.out(1.4)",
    },
    "-=0.5"
  );

  tl.from(
    ".hero__scroll-hint",
    {
      opacity: 0,
      x: -10,
      duration: 0.5,
    },
    "-=0.3"
  );

  gsap.to(".hero__device", {
    y: -12,
    duration: 2.5,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
    delay: 2,
  });
}

/* ---------- Panel 2: Problem ---------- */

function initProblem() {
  const heading = document.querySelector(".panel--problem .panel__heading");
  if (heading) splitIntoWords(heading);

  /* Glitch Shake: label flickers like broken signal */
  if (scrollTween) {
    const labelTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".panel--problem",
        start: "left 85%",
        toggleActions: "play none none reset",
        containerAnimation: scrollTween,
      },
    });
    labelTl.fromTo(
      ".panel--problem .panel__label",
      { opacity: 0 },
      { opacity: 1, duration: 0.2, repeat: 5, yoyo: true, ease: "steps(1)" }
    );
    labelTl.to(".panel--problem .panel__label", {
      opacity: 1,
      duration: 0.27,
    });
  }

  /* Heading words: glitch shake + red flash */
  const words = document.querySelectorAll(
    ".panel--problem .panel__heading .word"
  );
  if (words.length && scrollTween) {
    const headTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".panel--problem .panel__heading",
        start: "left 85%",
        toggleActions: "play none none reset",
        containerAnimation: scrollTween,
      },
    });
    headTl.from(words, {
      opacity: 0,
      duration: 0,
      stagger: 0.27,
    });
    headTl.to(
      words,
      {
        keyframes: [
          { x: -8, color: "#e74c3c", duration: 0.11 },
          { x: 12, duration: 0.11 },
          { x: -6, duration: 0.11 },
          { x: 10, color: "#e74c3c", duration: 0.11 },
          { x: -4, duration: 0.08 },
          { x: 0, color: "#2d3436", duration: 0.4 },
        ],
        stagger: 0.27,
      },
      0.03
    );
  }

  animateIn(
    ".panel--problem .panel__sub",
    {
      opacity: 0,
      y: 20,
      duration: 0.8,
      delay: 0.4,
    },
    ".panel--problem .panel__heading"
  );

  const items = document.querySelectorAll(".problem__item");
  if (items.length) {
    animateIn(
      items,
      {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
      },
      ".problem__items"
    );
  }

  document.querySelectorAll(".problem__strike").forEach(function (strike, i) {
    if (!scrollTween) return;
    gsap.to(strike, {
      width: "80%",
      duration: 0.67,
      ease: "power2.inOut",
      delay: 0.8 + i * 0.27,
      scrollTrigger: {
        containerAnimation: scrollTween,
        trigger: strike.closest(".problem__item"),
        start: "left 70%",
        toggleActions: "play none none reset",
      },
    });
  });
}

/* ---------- Panel 3: Solution ---------- */

function initSolution() {
  const heading = document.querySelector(".panel--solution .panel__heading");
  if (heading) splitIntoWords(heading);

  /* Elastic Pop: label scales up */
  animateIn(".panel--solution .panel__label", {
    opacity: 0,
    scale: 0.3,
    duration: 1,
    ease: "back.out(1.7)",
  });

  /* Heading words: elastic pop from center outward + teal burst */
  const words = document.querySelectorAll(
    ".panel--solution .panel__heading .word"
  );
  if (words.length && scrollTween) {
    const solTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".panel--solution .panel__heading",
        start: "left 85%",
        toggleActions: "play none none reset",
        containerAnimation: scrollTween,
      },
    });
    solTl.from(words, {
      scale: 0,
      opacity: 0,
      rotation: gsap.utils.wrap([-25, 18, -18, 25]),
      duration: 1.2,
      stagger: { each: 0.15, from: "center" },
      ease: "elastic.out(1, 0.35)",
    });
    solTl.to(
      words,
      {
        keyframes: [
          { color: "#3cc7b4", duration: 0.4 },
          { color: "#2d3436", duration: 0.6 },
        ],
        stagger: { each: 0.15, from: "center" },
      },
      "-=0.6"
    );
  }

  /* Solution cards: staggered entrance with icon/title color */
  const cards = document.querySelectorAll(".solution__card");
  const cardColors = ["#3cc7b4", "#fcd757", "#f5a0b8"];
  if (cards.length && scrollTween) {
    const deckTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".solution__cards",
        start: "left 85%",
        toggleActions: "play none none reset",
        containerAnimation: scrollTween,
      },
    });

    /* Cards: fan out from below */
    cards.forEach(function (card, i) {
      deckTl.fromTo(
        card,
        {
          opacity: 0,
          y: 180,
          scale: 0.6,
          rotation: -10 + i * 10,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotation: 0,
          duration: 1.4,
          ease: "back.out(1.4)",
        },
        i * 0.25
      );
    });

    /* Icons: bounce in after cards arrive */
    var icons = document.querySelectorAll(".solution__icon");
    deckTl.fromTo(
      icons,
      { opacity: 0, y: -30, scale: 1.3 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1.2,
        stagger: 0.2,
        ease: "bounce.out",
      },
      "-=1.2"
    );

    /* Title color accent */
    cards.forEach(function (card, i) {
      var title = card.querySelector(".solution__title");
      if (title) {
        deckTl.to(
          title,
          {
            keyframes: [
              { color: cardColors[i], duration: 0.5 },
              { color: "#2d3436", duration: 0.7 },
            ],
          },
          "-=0.8"
        );
      }
    });

    /* Continuous icon float */
    icons.forEach(function (icon, i) {
      gsap.to(icon, {
        y: -4,
        scale: 1.03,
        duration: gsap.utils.wrap([1.8, 2.2, 2])(i),
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 4 + i * 0.4,
      });
    });
  }
}

/* ---------- Panel 4: Showcase ---------- */

function initShowcase() {
  const heading = document.querySelector(".panel--showcase .panel__heading");
  if (heading) splitIntoWords(heading);

  /* 3D Flip Reveal: label slides from right */
  animateIn(".panel--showcase .panel__label", {
    opacity: 0,
    x: 70,
    duration: 0.8,
    ease: "power2.out",
  });

  /* Heading words: 3D rotateX flip + color sweep purple→pink→teal→dark */
  const words = document.querySelectorAll(
    ".panel--showcase .panel__heading .word"
  );
  if (words.length && scrollTween) {
    gsap.set(".panel--showcase .panel__heading", { perspective: 600 });

    const showTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".panel--showcase .panel__heading",
        start: "left 85%",
        toggleActions: "play none none reset",
        containerAnimation: scrollTween,
      },
    });
    showTl.from(words, {
      rotationX: -120,
      opacity: 0,
      y: -40,
      transformOrigin: "50% 100%",
      duration: 1.2,
      stagger: 0.18,
      ease: "power3.out",
    });
    showTl.to(
      words,
      {
        keyframes: [
          { color: "#b39ddb", duration: 0.3 },
          { color: "#f5a0b8", duration: 0.3 },
          { color: "#3cc7b4", duration: 0.3 },
          { color: "#2d3436", duration: 0.6 },
        ],
        stagger: 0.15,
      },
      "-=0.8"
    );
  }

  animateIn(
    ".panel--showcase .panel__sub",
    {
      opacity: 0,
      y: 20,
      duration: 0.6,
      delay: 0.2,
    },
    ".panel--showcase .panel__heading"
  );

  /* Device items: staggered entrance, parallax on inner image */
  const items = document.querySelectorAll(".showcase__item");
  if (items.length && scrollTween) {
    const itemTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".showcase__gallery",
        start: "left 85%",
        toggleActions: "play none none reset",
        containerAnimation: scrollTween,
      },
    });

    items.forEach(function (item, i) {
      var offset = parseFloat(item.dataset.parallax) || 0;
      itemTl.fromTo(
        item,
        {
          opacity: 0,
          y: 150,
          scale: 0.5,
          rotation: offset > 0 ? -8 : 8,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotation: 0,
          duration: 1.2,
          ease: "back.out(1.4)",
        },
        i * 0.2
      );

      var img = item.querySelector(".showcase__device");
      if (img) addParallax(img, offset);
    });
  }
}

/* ---------- Panel 5: Screenshots ---------- */

function initScreens() {
  const heading = document.querySelector(".panel--screens .panel__heading");
  if (heading) splitIntoWords(heading);

  /* Blur Scale Reveal: label typewriter char-by-char */
  const screenLabel = document.querySelector(".panel--screens .panel__label");
  if (screenLabel && scrollTween) {
    splitIntoWords(screenLabel);
    splitIntoChars(screenLabel);
    const labelChars = screenLabel.querySelectorAll(".char");

    gsap.from(labelChars, {
      opacity: 0,
      duration: 0.05,
      stagger: 0.1,
      ease: "none",
      scrollTrigger: {
        trigger: ".panel--screens",
        start: "left 85%",
        toggleActions: "play none none reset",
        containerAnimation: scrollTween,
      },
    });
  }

  /* Heading words: scale from tiny + blur → focus + purple glow */
  const words = document.querySelectorAll(
    ".panel--screens .panel__heading .word"
  );
  if (words.length && scrollTween) {
    const screenTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".panel--screens .panel__heading",
        start: "left 85%",
        toggleActions: "play none none reset",
        containerAnimation: scrollTween,
      },
    });
    screenTl.from(words, {
      scale: 0.05,
      opacity: 0,
      filter: "blur(15px)",
      duration: 1.3,
      stagger: 0.18,
      ease: "power2.out",
    });
    screenTl.to(
      words,
      {
        keyframes: [
          { color: "#b39ddb", duration: 0.5 },
          { color: "#2d3436", duration: 0.6 },
        ],
        stagger: 0.18,
      },
      "-=0.8"
    );
  }

  document.querySelectorAll(".screens__item").forEach(function (item) {
    const offset = parseFloat(item.dataset.parallax) || 0;

    animateIn(
      item,
      {
        y: 40,
        opacity: 0,
        scale: 0.95,
        duration: 0.7,
        ease: "power3.out",
      },
      item
    );

    addParallax(item, offset);
  });
}

/* ---------- Panel 6: Video ---------- */

const VIDEO_ID = "PxPKkh4E9-Y";

function initVideo() {
  const heading = document.querySelector(".panel--video .panel__heading");
  if (heading) splitIntoWords(heading);

  /* Cinematic Slide: label drops from above with bounce */
  animateIn(".panel--video .panel__label", {
    opacity: 0,
    y: -50,
    duration: 1,
    ease: "bounce.out",
  });

  /* Heading words: alternating left/right slide + golden flash */
  const words = document.querySelectorAll(".panel--video .panel__heading .word");
  if (words.length && scrollTween) {
    const vidTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".panel--video .panel__heading",
        start: "left 85%",
        toggleActions: "play none none reset",
        containerAnimation: scrollTween,
      },
    });
    words.forEach(function (word, i) {
      var fromX = i % 2 === 0 ? -100 : 100;
      vidTl.from(
        word,
        {
          x: fromX,
          opacity: 0,
          rotation: i % 2 === 0 ? -15 : 15,
          duration: 0.9,
          ease: "power3.out",
        },
        i * 0.18
      );
    });
    vidTl.to(
      words,
      {
        keyframes: [
          { color: "#fcd757", duration: 0.4 },
          { color: "#2d3436", duration: 0.6 },
        ],
        stagger: 0.12,
      },
      "-=0.5"
    );
  }

  animateIn(
    ".panel--video .panel__sub",
    {
      opacity: 0,
      y: 20,
      duration: 0.6,
      delay: 0.2,
    },
    ".panel--video .panel__heading"
  );

  animateIn(
    ".video__wrapper",
    {
      y: 50,
      opacity: 0,
      scale: 0.9,
      duration: 1,
      ease: "power3.out",
    },
    ".video__wrapper"
  );

  gsap.to(".video__play", {
    scale: 1.08,
    duration: 1,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
  });

  const playBtn = document.getElementById("videoPlay");
  if (playBtn) {
    playBtn.addEventListener("click", function () {
      if (VIDEO_ID === "VIDEO_ID_HERE") return;

      const wrapper = playBtn.closest(".video__wrapper");
      const iframe = document.createElement("iframe");
      iframe.src =
        "https://www.youtube.com/embed/" + VIDEO_ID + "?autoplay=1&rel=0";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.style.cssText =
        "position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:20px;";

      wrapper.innerHTML = "";
      wrapper.appendChild(iframe);
    });
  }
}

/* ---------- Panel 7: CTA ---------- */

function initCTA() {
  /* Wave Cascade: char-level split for maximum drama */
  const ctaHeading = document.querySelector(".panel--cta .panel__heading");
  if (ctaHeading) {
    splitIntoWords(ctaHeading);
    splitIntoChars(ctaHeading);
  }

  const ctaChars = document.querySelectorAll(
    ".panel--cta .panel__heading .char"
  );
  if (ctaChars.length && scrollTween) {
    const ctaTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".panel--cta .panel__heading",
        start: "left 85%",
        toggleActions: "play none none reset",
        containerAnimation: scrollTween,
      },
    });

    ctaTl.from(ctaChars, {
      y: function (i) {
        return Math.sin(i * 0.5) * 60 + 50;
      },
      opacity: 0,
      scale: 0.3,
      rotateZ: function (i) {
        return Math.sin(i * 0.7) * 25;
      },
      duration: 1,
      stagger: 0.035,
      ease: "power2.out",
    });

    ctaTl.to(
      ctaChars,
      {
        keyframes: [
          { color: "#3cc7b4", duration: 0.2 },
          { color: "#fcd757", duration: 0.2 },
          { color: "#f5a0b8", duration: 0.2 },
          { color: "#b39ddb", duration: 0.2 },
          { color: "#ffffff", duration: 0.4 },
        ],
        stagger: 0.03,
      },
      "-=0.6"
    );
  }

  /* CTA buttons: pop up + flash */
  const links = document.querySelectorAll(".cta__link");
  if (links.length && scrollTween) {
    const linkTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".cta__links",
        start: "left 85%",
        toggleActions: "play none none reset",
        containerAnimation: scrollTween,
      },
    });
    linkTl.from(links, {
      y: 30,
      opacity: 0,
      scale: 0.8,
      duration: 0.6,
      stagger: 0.12,
      ease: "back.out(1.7)",
    });
    linkTl.to(
      links,
      {
        keyframes: [
          { backgroundColor: "rgba(255,255,255,0.45)", duration: 0.3 },
          { backgroundColor: "rgba(255,255,255,0.2)", duration: 0.4 },
        ],
        stagger: 0.1,
      },
      "-=0.3"
    );
  }

  animateIn(
    ".footer",
    {
      opacity: 0,
      y: 10,
      duration: 0.5,
      delay: 0.5,
    },
    ".cta__links"
  );
}

/* ---------- Decorations Parallax ---------- */

function initDecorations() {
  document.querySelectorAll(".deco").forEach(function (el) {
    if (!scrollTween) return;

    gsap.to(el, {
      x: function () {
        return gsap.utils.random(-40, 40);
      },
      y: function () {
        return gsap.utils.random(-30, 30);
      },
      ease: "none",
      scrollTrigger: {
        containerAnimation: scrollTween,
        trigger: el.closest(".panel"),
        start: "left right",
        end: "right left",
        scrub: 1,
      },
    });
  });
}

/* ---------- Click Navigation ---------- */

function initClickNavigation() {
  if (!scrollTween) return;

  var panelCount = document.querySelectorAll(".panel").length;
  var isAnimating = false;

  function getCurrentPanel() {
    return Math.round(scrollTween.scrollTrigger.progress * (panelCount - 1));
  }

  function goToPanel(index) {
    index = Math.max(0, Math.min(panelCount - 1, index));
    if (index === getCurrentPanel() || isAnimating) return;

    var st = scrollTween.scrollTrigger;
    var targetScroll =
      st.start + (index / (panelCount - 1)) * (st.end - st.start);

    isAnimating = true;
    var obj = { y: window.scrollY };
    gsap.to(obj, {
      y: targetScroll,
      duration: 0.8,
      ease: "power2.inOut",
      onUpdate: function () {
        window.scrollTo(0, obj.y);
      },
      onComplete: function () {
        isAnimating = false;
      },
    });
  }

  document.addEventListener("dblclick", function (e) {
    if (e.target.closest("a, button, input, select, textarea, iframe")) return;

    var x = e.clientX;
    var w = window.innerWidth;
    var current = getCurrentPanel();

    if (x < w * 0.35) {
      goToPanel(current - 1);
    } else if (x > w * 0.65) {
      goToPanel(current + 1);
    }
  });
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", function () {
  initHorizontalScroll();
  initHero();
  initProblem();
  initSolution();
  initShowcase();
  initScreens();
  initVideo();
  initCTA();
  initDecorations();
  initClickNavigation();
});
