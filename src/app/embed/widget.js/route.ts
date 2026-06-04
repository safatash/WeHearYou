import { NextResponse } from "next/server";

const script = `
(function () {
  var FONT_STACKS = {
    system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    sans: "Inter, ui-sans-serif, system-ui, sans-serif",
    serif: "Georgia, 'Times New Roman', serif"
  };

  function fontStack(name) {
    return FONT_STACKS[name] || FONT_STACKS.system;
  }

  function stars(rating) {
    return "★".repeat(Math.max(0, Math.min(5, rating))) + "☆".repeat(Math.max(0, 5 - rating));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return "";
    }
  }

  function truncate(body, maxChars) {
    if (!body) return "";
    if (!maxChars || maxChars <= 0) return body;
    if (body.length <= maxChars) return body;
    var cut = body.slice(0, maxChars).replace(/\\s+$/, "");
    return cut.endsWith(".") ? cut + ".." : cut + "…";
  }

  function ensureStyles() {
    if (document.getElementById("why-review-widget-styles")) return;
    var style = document.createElement("style");
    style.id = "why-review-widget-styles";
    style.textContent =
      ".why-widget{box-sizing:border-box}.why-widget *{box-sizing:border-box}" +
      ".why-widget-header{display:flex;flex-direction:column;gap:4px;margin-bottom:16px}" +
      ".why-widget-header--center{align-items:center;text-align:center}" +
      ".why-widget-title{font-size:20px;font-weight:700;margin:0}" +
      ".why-widget-meta{font-size:14px;margin:0;display:flex;flex-wrap:wrap;gap:8px;align-items:center}" +
      ".why-widget-meta-stars{display:inline-flex;align-items:center;gap:6px}" +
      ".why-widget-meta-rating{font-weight:700}" +
      ".why-widget-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}" +
      ".why-widget-list{display:flex;flex-direction:column;gap:12px}" +
      ".why-widget-slider{position:relative}" +
      ".why-widget-slider-track{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;scrollbar-width:thin}" +
      ".why-widget-slider-track::-webkit-scrollbar{height:6px}" +
      ".why-widget-slider-track::-webkit-scrollbar-thumb{background:rgba(0,0,0,.2);border-radius:999px}" +
      ".why-widget-slide{min-width:80%;scroll-snap-align:start}" +
      "@media(min-width:640px){.why-widget-slide{min-width:55%}}" +
      "@media(min-width:960px){.why-widget-slide{min-width:38%}}" +
      ".why-widget-slider-controls{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;font-size:12px}" +
      ".why-widget-slider-btn{border:1px solid rgba(0,0,0,.1);background:#fff;border-radius:999px;width:28px;height:28px;cursor:pointer;font-weight:700}" +
      ".why-widget-slider-btn[disabled]{opacity:.4;cursor:not-allowed}" +
      ".why-widget-card{display:flex;flex-direction:column;gap:8px;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:16px;background:#fff;height:100%}" +
      ".why-widget-stars{font-size:14px}" +
      ".why-widget-reviewer{display:flex;align-items:center;gap:10px}" +
      ".why-widget-avatar{width:32px;height:32px;border-radius:999px;object-fit:cover;background:#e2e8f0}" +
      ".why-widget-avatar-fallback{width:32px;height:32px;border-radius:999px;background:#e2e8f0;color:#475569;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}" +
      ".why-widget-name{font-weight:600}" +
      ".why-widget-body{font-size:14px;line-height:1.5}" +
      ".why-widget-owner-reply{margin-top:4px;padding:12px;border-radius:14px;background:rgba(0,0,0,.04);font-size:12px;line-height:1.5}" +
      ".why-widget-meta-row{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding-top:6px}" +
      ".why-widget-date{font-size:12px;opacity:.7}" +
      ".why-widget-review-link{font-size:12px;font-weight:600;text-decoration:none}" +
      ".why-widget-footer{margin-top:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}" +
      ".why-widget-link{display:inline-block;text-decoration:none;font-weight:600}" +
      ".why-widget-button{border:1px solid rgba(0,0,0,.15);border-radius:999px;background:#fff;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer}" +
      ".why-widget-button[disabled]{opacity:.5;cursor:not-allowed}" +
      ".why-widget-badge{display:inline-flex;align-items:center;gap:10px;border:1px solid rgba(0,0,0,.08);background:#fff;border-radius:999px;padding:10px 16px;box-shadow:0 1px 2px rgba(0,0,0,.04);text-decoration:none}" +
      ".why-widget-badge-rating{font-size:18px;font-weight:700}" +
      ".why-widget-badge-stars{font-size:16px}" +
      ".why-widget-badge-text{font-size:12px;opacity:.75}" +
      ".why-widget-carousel{position:relative;display:flex;flex-direction:column;gap:16px}" +
      ".why-widget-carousel-item{display:none}" +
      ".why-widget-carousel-item.active{display:block}" +
      ".why-widget-carousel-controls{display:flex;align-items:center;justify-content:center;gap:12px}" +
      ".why-widget-carousel-btn{border:1px solid rgba(0,0,0,.1);background:#fff;border-radius:999px;width:32px;height:32px;cursor:pointer;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .2s}" +
      ".why-widget-carousel-btn:hover{background:rgba(0,0,0,.05)}" +
      ".why-widget-carousel-btn[disabled]{opacity:.4;cursor:not-allowed}" +
      ".why-widget-carousel-pagination{display:flex;gap:6px;justify-content:center;align-items:center}" +
      ".why-widget-carousel-dot{width:8px;height:8px;border-radius:999px;background:rgba(0,0,0,.2);cursor:pointer;transition:all .2s}" +
      ".why-widget-carousel-dot.active{background:rgba(0,0,0,.8)}" +
      ".why-widget-branding{margin-top:12px;text-align:center;font-size:12px;opacity:.6}" +
      ".why-widget-branding a{color:inherit;text-decoration:none}" +
      ".why-widget-branding a:hover{text-decoration:underline}" +
      ".why-video-card{display:flex;flex-direction:column;gap:0;border:1px solid rgba(0,0,0,.08);border-radius:16px;background:#fff;overflow:hidden;cursor:pointer;transition:transform .15s,box-shadow .15s}" +
      ".why-video-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.1)}" +
      ".why-video-thumb{position:relative;background:#0f172a;aspect-ratio:16/9;overflow:hidden;display:flex;align-items:center;justify-content:center}" +
      ".why-video-thumb video{width:100%;height:100%;object-fit:cover;display:block}" +
      ".why-video-play{position:absolute;width:44px;height:44px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;backdrop-filter:blur(2px)}" +
      ".why-video-duration{position:absolute;bottom:6px;right:8px;font-size:11px;color:rgba(255,255,255,.8);background:rgba(0,0,0,.5);padding:1px 5px;border-radius:4px}" +
      ".why-video-info{padding:10px 12px}" +
      ".why-video-name{font-size:13px;font-weight:600}" +
      ".why-widget-masonry{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));align-items:start}";
    document.head.appendChild(style);
  }

  function currentScript() {
    return document.currentScript || (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();
  }

  // ── Collecting Widget helpers ───────────────────────────────────────────────

  function ensureCollectStyles() {
    if (document.getElementById("why-collect-styles")) return;
    var style = document.createElement("style");
    style.id = "why-collect-styles";
    style.textContent =
      ".why-collect-btn{font-family:inherit;border:none;cursor:pointer;font-weight:600;transition:opacity .2s;z-index:2147483646;line-height:1.2}" +
      ".why-collect-pill{position:fixed;padding:12px 20px;border-radius:999px;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.2)}" +
      ".why-collect-pill-br{bottom:24px;right:24px}" +
      ".why-collect-pill-bl{bottom:24px;left:24px}" +
      ".why-collect-tab{position:fixed;top:50%;transform:translateY(-50%);padding:14px 10px;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.15)}" +
      ".why-collect-tab-r{right:0;border-radius:8px 0 0 8px;writing-mode:vertical-rl}" +
      ".why-collect-tab-l{left:0;border-radius:0 8px 8px 0;writing-mode:vertical-lr}" +
      ".why-collect-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px}" +
      ".why-collect-modal{position:relative;width:100%;max-width:520px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.3)}" +
      ".why-collect-close{position:absolute;top:12px;right:12px;background:rgba(0,0,0,.08);border:none;border-radius:50%;width:32px;height:32px;font-size:14px;cursor:pointer;z-index:1;color:#0f172a;font-weight:700;line-height:1}" +
      ".why-collect-iframe{width:100%;height:600px;border:none;display:block}" +
      "@media(max-height:700px){.why-collect-iframe{height:480px}}";
    document.head.appendChild(style);
  }

  function shouldShowCollect(token, freq) {
    if (!freq || freq === "always") return true;
    var key = "why-collect-" + token;
    try {
      var cached = sessionStorage.getItem(key);
      if (cached !== null) return cached === "1";
      var chance = freq === "50pct" ? 0.5 : freq === "33pct" ? 0.333 : 1;
      var show = Math.random() < chance;
      sessionStorage.setItem(key, show ? "1" : "0");
      return show;
    } catch (e) {
      return true;
    }
  }

  function openCollectModal(slug, appOrigin) {
    var overlay = document.createElement("div");
    overlay.className = "why-collect-overlay";
    var modal = document.createElement("div");
    modal.className = "why-collect-modal";
    var closeBtn = document.createElement("button");
    closeBtn.className = "why-collect-close";
    closeBtn.textContent = "\\u2715";
    closeBtn.setAttribute("type", "button");
    closeBtn.setAttribute("aria-label", "Close");
    var iframe = document.createElement("iframe");
    iframe.src = appOrigin + "/f/" + encodeURIComponent(slug) + "?embed=1";
    iframe.className = "why-collect-iframe";
    iframe.setAttribute("title", "Share your feedback");

    function removeOverlay() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) removeOverlay();
    });
    closeBtn.addEventListener("click", removeOverlay);

    // Auto-close when the funnel signals completion via postMessage
    function onMessage(e) {
      if (e.data && e.data.type === "why-collect-done") {
        removeOverlay();
        window.removeEventListener("message", onMessage);
      }
    }
    window.addEventListener("message", onMessage);

    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function renderCollectingWidget(data, token, appOrigin) {
    var w = data.widget;
    var slug = data.location.slug;
    if (!slug) return;

    if (!shouldShowCollect(token, w.collectDisplayFreq)) return;

    var position = w.collectButtonPosition || "bottom-right";
    var theme = w.collectButtonTheme || "default";
    var color = w.collectButtonColor || w.primaryColor || "#4338ca";
    var mobileBehavior = w.collectMobileBehavior || "pill";

    if (window.innerWidth < 640 && mobileBehavior === "hidden") return;

    ensureCollectStyles();

    var btn = document.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("aria-label", "Share Feedback");
    btn.textContent = "Share Feedback";
    btn.className = "why-collect-btn";

    if (theme === "minimal") {
      btn.style.cssText = "background:transparent;color:" + color + ";border:2px solid " + color;
    } else {
      btn.style.cssText = "background:" + color + ";color:#fff;border:none";
    }

    if (position === "right") {
      btn.classList.add("why-collect-tab", "why-collect-tab-r");
    } else if (position === "left") {
      btn.classList.add("why-collect-tab", "why-collect-tab-l");
    } else if (position === "bottom-left") {
      btn.classList.add("why-collect-pill", "why-collect-pill-bl");
    } else {
      btn.classList.add("why-collect-pill", "why-collect-pill-br");
    }

    btn.addEventListener("click", function () { openCollectModal(slug, appOrigin); });
    document.body.appendChild(btn);
  }

  // ── End Collecting Widget helpers ───────────────────────────────────────────

  function renderHeader(data) {
    if (!data.widget.showHeader) return "";
    var rating = typeof data.location.avgRating === "number" ? Number(data.location.avgRating).toFixed(1) : null;
    var roundedStars = data.location.avgRating ? stars(Math.round(data.location.avgRating)) : "";
    var alignClass = data.widget.headerAlign === "center" ? " why-widget-header--center" : "";

    var metaBits = [];
    if (data.widget.showAvgRating && rating) {
      metaBits.push(
        '<span class="why-widget-meta-stars">' +
          '<span style="color:' + escapeHtml(data.widget.starColor) + '">' + escapeHtml(roundedStars) + '</span>' +
          '<span class="why-widget-meta-rating">' + escapeHtml(rating) + '</span>' +
        '</span>'
      );
    }
    if (data.widget.showReviewCount && data.location.reviewCount) {
      metaBits.push('<span>Based on ' + escapeHtml(String(data.location.reviewCount)) + ' review' + (data.location.reviewCount === 1 ? '' : 's') + '</span>');
    }

    return '<div class="why-widget-header' + alignClass + '">' +
      '<p class="why-widget-title">' + escapeHtml(data.location.name) + '</p>' +
      (metaBits.length ? '<p class="why-widget-meta" style="color:rgba(0,0,0,.6)">' + metaBits.join('') + '</p>' : '') +
    '</div>';
  }

  function renderAiSummary(data) {
    if (!data.location.aiReviewSummary) return "";
    var countHtml = data.location.aiReviewSummaryReviewCount
      ? '<p style="margin:0;font-size:10px;color:#a5b4fc">Based on ' + escapeHtml(String(data.location.aiReviewSummaryReviewCount)) + ' reviews</p>'
      : '';
    return '<div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:10px 12px;margin-top:10px;text-align:left">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
        '<p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#4f46e5">✶ AI Summary</p>' +
        countHtml +
      '</div>' +
      '<p style="margin:0;color:#3730a3;font-size:12px;line-height:1.6">' + escapeHtml(data.location.aiReviewSummary) + '</p>' +
    '</div>';
  }

  function renderCard(review, widget) {
    var reviewerHtml = '';
    if (widget.showReviewerName) {
      var avatarHtml = review.reviewerPhotoUrl
        ? '<img class="why-widget-avatar" src="' + escapeHtml(review.reviewerPhotoUrl) + '" alt="' + escapeHtml(review.reviewerName) + '" />'
        : '<div class="why-widget-avatar-fallback">' + escapeHtml((review.reviewerName || '?').slice(0, 1).toUpperCase()) + '</div>';
      reviewerHtml = '<div class="why-widget-reviewer">' + avatarHtml + '<div class="why-widget-name">' + escapeHtml(review.reviewerName) + '</div></div>';
    }

    var body = truncate(review.body || '', widget.bodyMaxChars || 280);

    return '<article class="why-widget-card">' +
      (widget.showRating ? '<div class="why-widget-stars" style="color:' + escapeHtml(widget.starColor) + '">' + escapeHtml(stars(review.rating)) + '</div>' : '') +
      reviewerHtml +
      '<div class="why-widget-body" style="color:rgba(0,0,0,.7)">' + escapeHtml(body) + '</div>' +
      (widget.showResponses && review.sourceReplyText
        ? '<div class="why-widget-owner-reply"><strong>Owner reply:</strong> ' + escapeHtml(review.sourceReplyText) + '</div>'
        : '') +
      '<div class="why-widget-meta-row">' +
        (widget.showDate && review.reviewedAt ? '<div class="why-widget-date">' + escapeHtml(formatDate(review.reviewedAt)) + '</div>' : '<div></div>') +
        (review.sourceReviewUrl
          ? '<a class="why-widget-review-link" href="' + escapeHtml(review.sourceReviewUrl) + '" target="_blank" rel="noopener noreferrer" style="color:' + escapeHtml(widget.primaryColor) + '">View on Google</a>'
          : '') +
      '</div>' +
    '</article>';
  }

  function renderBadge(data) {
    var rating = typeof data.location.avgRating === "number" ? Number(data.location.avgRating).toFixed(1) : "—";
    var roundedStars = data.location.avgRating ? stars(Math.round(data.location.avgRating)) : stars(0);
    var tag = data.location.reviewLink ? "a" : "div";
    var hrefAttr = data.location.reviewLink ? ' href="' + escapeHtml(data.location.reviewLink) + '" target="_blank" rel="noopener noreferrer"' : '';
    var countSuffix = data.location.reviewCount ? ' · ' + escapeHtml(String(data.location.reviewCount)) + ' review' + (data.location.reviewCount === 1 ? '' : 's') : '';

    return '<' + tag + ' class="why-widget-badge"' + hrefAttr + ' style="color:' + escapeHtml(data.widget.textColor) + '">' +
      '<span class="why-widget-badge-rating">' + escapeHtml(rating) + '</span>' +
      '<span class="why-widget-badge-stars" style="color:' + escapeHtml(data.widget.starColor) + '">' + escapeHtml(roundedStars) + '</span>' +
      '<span class="why-widget-badge-text"><strong>' + escapeHtml(data.location.name) + '</strong>' + countSuffix + '</span>' +
    '</' + tag + '>';
  }

  function formatDuration(seconds) {
    if (!seconds) return "";
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m > 0 ? m + ":" + (s < 10 ? "0" : "") + s : s + "s";
  }

  function renderVideoCard(vt) {
    var dur = formatDuration(vt.durationSeconds);
    var name = escapeHtml(vt.submitterName || "Anonymous");
    return '<div class="why-video-card" data-video-url="' + escapeHtml(vt.videoUrl) + '">' +
      '<div class="why-video-thumb">' +
        '<video src="' + escapeHtml(vt.videoUrl) + '#t=0.001" preload="metadata" muted playsinline style="width:100%;height:100%;object-fit:cover"></video>' +
        '<div class="why-video-play">&#9658;</div>' +
        (dur ? '<div class="why-video-duration">' + escapeHtml(dur) + '</div>' : '') +
      '</div>' +
      '<div class="why-video-info"><div class="why-video-name">' + name + '</div></div>' +
    '</div>';
  }

  function openVideoLightbox(url) {
    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:16px";
    var inner = document.createElement("div");
    inner.style.cssText = "position:relative;width:100%;max-width:900px;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden";
    var vid = document.createElement("video");
    vid.src = url;
    vid.controls = true;
    vid.autoplay = true;
    vid.playsInline = true;
    vid.style.cssText = "width:100%;height:100%;object-fit:contain";
    var closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = "position:absolute;top:8px;right:10px;background:rgba(0,0,0,.5);color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;z-index:1";
    closeBtn.addEventListener("click", function () { document.body.removeChild(overlay); });
    overlay.addEventListener("click", function (e) { if (e.target === overlay) document.body.removeChild(overlay); });
    inner.appendChild(vid);
    inner.appendChild(closeBtn);
    overlay.appendChild(inner);
    document.body.appendChild(overlay);
  }

  function attachVideoCardHandlers(container) {
    var cards = container.querySelectorAll(".why-video-card[data-video-url]");
    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        var url = card.getAttribute("data-video-url");
        if (url) openVideoLightbox(url);
      });
    });
  }

  function attachSliderControls(slider) {
    var track = slider.querySelector(".why-widget-slider-track");
    var prev = slider.querySelector(".why-widget-slider-prev");
    var next = slider.querySelector(".why-widget-slider-next");
    var label = slider.querySelector(".why-widget-slider-label");
    if (!track) return;

    function update() {
      var slides = track.querySelectorAll(".why-widget-slide");
      var count = slides.length;
      if (!count) return;
      var slideWidth = slides[0].getBoundingClientRect().width + 16;
      var index = Math.round(track.scrollLeft / slideWidth);
      var clamped = Math.max(0, Math.min(count - 1, index));
      if (label) label.textContent = (clamped + 1) + " / " + count;
      if (prev) prev.disabled = clamped === 0;
      if (next) next.disabled = clamped >= count - 1;
    }

    function step(direction) {
      var slides = track.querySelectorAll(".why-widget-slide");
      if (!slides.length) return;
      var slideWidth = slides[0].getBoundingClientRect().width + 16;
      track.scrollBy({ left: direction * slideWidth, behavior: "smooth" });
    }

    if (prev) prev.addEventListener("click", function () { step(-1); });
    if (next) next.addEventListener("click", function () { step(1); });
    track.addEventListener("scroll", function () {
      window.requestAnimationFrame(update);
    });
    update();
  }

  function attachCarouselControls(carousel, itemCount) {
    var currentIndex = 0;
    var items = carousel.querySelectorAll(".why-widget-carousel-item");
    var prev = carousel.querySelector(".why-widget-carousel-prev");
    var next = carousel.querySelector(".why-widget-carousel-next");
    var pagination = carousel.querySelector(".why-widget-carousel-pagination");

    function updateView() {
      items.forEach(function (item, idx) {
        item.classList.toggle("active", idx === currentIndex);
      });
      if (pagination) {
        var dots = pagination.querySelectorAll(".why-widget-carousel-dot");
        dots.forEach(function (dot, idx) {
          dot.classList.toggle("active", idx === currentIndex);
        });
      }
      if (prev) prev.disabled = currentIndex === 0;
      if (next) next.disabled = currentIndex === itemCount - 1;
    }

    if (prev) {
      prev.addEventListener("click", function () {
        if (currentIndex > 0) {
          currentIndex--;
          updateView();
        }
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        if (currentIndex < itemCount - 1) {
          currentIndex++;
          updateView();
        }
      });
    }

    if (pagination) {
      var dots = pagination.querySelectorAll(".why-widget-carousel-dot");
      dots.forEach(function (dot, idx) {
        dot.addEventListener("click", function () {
          currentIndex = idx;
          updateView();
        });
      });
    }

    updateView();
  }

  // Track initialized mount selectors so we never double-init a widget
  var _initializedMounts = {};

  async function init(scriptEl) {
    var token = scriptEl.getAttribute("data-token");
    var mountSelector = scriptEl.getAttribute("data-mount");
    var mount = mountSelector ? document.querySelector(mountSelector) : null;

    if (!token || !mount) return;
    if (_initializedMounts[mountSelector]) return;
    _initializedMounts[mountSelector] = true;

    // Extract optional data attributes for configuration overrides
    var overrides = {
      layout: scriptEl.getAttribute("data-layout"),
      theme: scriptEl.getAttribute("data-theme"),
      showNav: scriptEl.getAttribute("data-show-nav"),
      showPagination: scriptEl.getAttribute("data-show-pagination"),
      showBranding: scriptEl.getAttribute("data-show-branding"),
      showHeader: scriptEl.getAttribute("data-show-header"),
      showRating: scriptEl.getAttribute("data-show-rating"),
      showReviewerName: scriptEl.getAttribute("data-show-reviewer-name"),
      showDate: scriptEl.getAttribute("data-show-date"),
      showWriteReview: scriptEl.getAttribute("data-show-write-review"),
    };

    var baseUrl = new URL(scriptEl.src, window.location.href);
    var apiBaseUrl = baseUrl.origin + "/api/public/widgets/" + encodeURIComponent(token);
    var page = 1;
    var loading = false;
    var done = false;
    var container = null;
    var footerActions = null;
    var loadMoreButton = null;
    var widgetConfig = null;

    function setLoadingState(isLoading) {
      loading = isLoading;
      if (loadMoreButton) {
        loadMoreButton.disabled = isLoading || done;
        loadMoreButton.textContent = isLoading ? "Loading..." : done ? "All reviews loaded" : "Load more";
      }
    }

    async function loadPage(nextPage) {
      if (loading || done) return;
      setLoadingState(true);

      try {
        var response = await fetch(apiBaseUrl + "?page=" + encodeURIComponent(String(nextPage)), { credentials: "omit" });
        if (response.status === 404) throw new Error("not_found");
        if (!response.ok) throw new Error("failed");
        var data = await response.json();
        widgetConfig = data.widget;

        // Apply data attribute overrides to widget configuration
        if (overrides.layout) data.widget.layout = overrides.layout;
        if (overrides.theme) data.widget.backgroundColor = overrides.theme === "dark" ? "#1e293b" : "#ffffff";
        if (overrides.showNav !== null) data.widget.showNav = overrides.showNav !== "false";
        if (overrides.showPagination !== null) data.widget.showPagination = overrides.showPagination !== "false";
        if (overrides.showBranding !== null) data.widget.showBranding = overrides.showBranding !== "false";
        if (overrides.showHeader !== null) data.widget.showHeader = overrides.showHeader !== "false";
        if (overrides.showRating !== null) data.widget.showRating = overrides.showRating !== "false";
        if (overrides.showReviewerName !== null) data.widget.showReviewerName = overrides.showReviewerName !== "false";
        if (overrides.showDate !== null) data.widget.showDate = overrides.showDate !== "false";
        if (overrides.showWriteReview !== null) data.widget.showWriteReview = overrides.showWriteReview !== "false";

        // Collecting Widget: render floating button, skip review rendering entirely
        if (nextPage === 1 && data.widget.widgetType === "COLLECTING") {
          renderCollectingWidget(data, token, baseUrl.origin);
          done = true;
          setLoadingState(false);
          return;
        }

        var items = [];
        if (data.widget.contentType === "VIDEO") {
          var vts = data.videoTestimonials || [];
          items = vts.map(function (vt) { return { type: "video", data: vt, date: vt.publishedAt || "" }; });
        } else if (data.widget.contentType === "MIXED") {
          var reviewItems = (data.reviews || []).map(function (r) { return { type: "review", data: r, date: r.reviewedAt || "" }; });
          var vtItems = (data.videoTestimonials || []).map(function (vt) { return { type: "video", data: vt, date: vt.publishedAt || "" }; });
          items = reviewItems.concat(vtItems).sort(function (a, b) { return b.date < a.date ? -1 : b.date > a.date ? 1 : 0; });
        } else {
          items = (data.reviews || []).map(function (r) { return { type: "review", data: r, date: r.reviewedAt || "" }; });
        }

        if (nextPage === 1) {
          // Badge layout: render once and bail — no pagination needed.
          if (data.widget.layout === "badge") {
            mount.innerHTML = '<div class="why-widget" style="font-family:' + fontStack(data.widget.fontFamily) + ';color:' + escapeHtml(data.widget.textColor) + '">' + renderBadge(data) + '</div>';
            done = true;
            setLoadingState(false);
            return;
          }

          var layoutClass = data.widget.layout === "list"
            ? "why-widget-list"
            : data.widget.layout === "slider"
              ? "why-widget-slider-track"
              : data.widget.layout === "video" || data.widget.layout === "carousel"
                ? "why-widget-carousel"
                : data.widget.layout === "masonry"
                  ? "why-widget-masonry"
                  : "why-widget-grid";

          var listWrapper = '';
          if (data.widget.layout === "slider") {
            listWrapper = '<div class="why-widget-slider"><div class="' + layoutClass + '"></div>' +
              (data.widget.showNav !== false ? '<div class="why-widget-slider-controls"><button class="why-widget-slider-btn why-widget-slider-prev" type="button">‹</button><span class="why-widget-slider-label"></span><button class="why-widget-slider-btn why-widget-slider-next" type="button">›</button></div>' : '') +
              '</div>';
          } else if (data.widget.layout === "video" || data.widget.layout === "carousel") {
            listWrapper = '<div class="why-widget-carousel">' +
              '<div class="' + layoutClass + '"></div>' +
              (data.widget.showNav !== false ? '<div class="why-widget-carousel-controls"><button class="why-widget-carousel-btn why-widget-carousel-prev" type="button">‹</button><button class="why-widget-carousel-btn why-widget-carousel-next" type="button">›</button></div>' : '') +
              (data.widget.showPagination !== false ? '<div class="why-widget-carousel-pagination"></div>' : '') +
              '</div>';
          } else {
            listWrapper = '<div class="' + layoutClass + '"></div>';
          }

          var titleHtml = data.widget.name ? '<h2 style="font-size:18px;font-weight:700;margin:0 0 12px 0;color:' + escapeHtml(data.widget.textColor) + '">' + escapeHtml(data.widget.name) + '</h2>' : '';
          mount.innerHTML = '<div class="why-widget" style="font-family:' + fontStack(data.widget.fontFamily) + ';background:' + escapeHtml(data.widget.backgroundColor) + ';color:' + escapeHtml(data.widget.textColor) + ';border-radius:18px;padding:20px;border:1px solid rgba(0,0,0,.06)">' +
            titleHtml +
            renderHeader(data) +
            renderAiSummary(data) +
            listWrapper +
            '<div class="why-widget-footer"></div>' +
          '</div>';

          container = mount.querySelector("." + layoutClass);
          footerActions = mount.querySelector(".why-widget-footer");
        }

        if (container) {
          var cardsHtml = items.map(function (item) {
            return item.type === "video" ? renderVideoCard(item.data) : renderCard(item.data, data.widget);
          }).join("");
          if (data.widget.layout === "slider") {
            container.insertAdjacentHTML("beforeend", items.map(function (item) {
              var cardHtml = item.type === "video" ? renderVideoCard(item.data) : renderCard(item.data, data.widget);
              return '<div class="why-widget-slide">' + cardHtml + '</div>';
            }).join(""));
          } else if (data.widget.layout === "video" || data.widget.layout === "carousel") {
            container.insertAdjacentHTML("beforeend", items.map(function (item, idx) {
              var cardHtml = item.type === "video" ? renderVideoCard(item.data) : renderCard(item.data, data.widget);
              return '<div class="why-widget-carousel-item' + (idx === 0 ? ' active' : '') + '">' + cardHtml + '</div>';
            }).join(""));
            // Add pagination dots if pagination is enabled
            var paginationContainer = mount.querySelector(".why-widget-carousel-pagination");
            if (paginationContainer && data.widget.showPagination !== false) {
              var dotsHtml = items.map(function (_, idx) {
                return '<div class="why-widget-carousel-dot' + (idx === 0 ? ' active' : '') + '"></div>';
              }).join("");
              paginationContainer.innerHTML = dotsHtml;
            }
          } else {
            container.insertAdjacentHTML("beforeend", cardsHtml);
          }
          attachVideoCardHandlers(container);
        }

        if (nextPage === 1 && footerActions) {
          var footerHtml = '';
          if (data.widget.showWriteReview && data.location.reviewLink && data.widget.contentType !== "VIDEO") {
            footerHtml += '<a class="why-widget-link" href="' + escapeHtml(data.location.reviewLink) + '" target="_blank" rel="noopener noreferrer" style="color:' + escapeHtml(data.widget.primaryColor) + '">Write a review</a>';
          }
          if (data.widget.showBranding !== false) {
            footerHtml += (footerHtml ? '<div class="why-widget-branding">Powered by <a href="https://www.wehearyou.io" target="_blank" rel="noopener noreferrer">WeHearYou</a></div>' : '<div class="why-widget-branding">Powered by <a href="https://www.wehearyou.io" target="_blank" rel="noopener noreferrer">WeHearYou</a></div>');
          }
          footerActions.innerHTML = footerHtml;
        }

        // Add the Load more button (skip for slider, carousel, VIDEO, and MIXED)
        if (footerActions && !loadMoreButton && data.widget.layout !== "slider" && data.widget.layout !== "carousel" && data.widget.layout !== "video" && data.widget.contentType !== "VIDEO" && data.widget.contentType !== "MIXED") {
          loadMoreButton = document.createElement("button");
          loadMoreButton.type = "button";
          loadMoreButton.className = "why-widget-button";
          loadMoreButton.textContent = "Load more";
          loadMoreButton.addEventListener("click", function () {
            void loadPage(page + 1);
          });
          footerActions.appendChild(loadMoreButton);
        }

        if (data.widget.layout === "slider" && nextPage === 1) {
          var slider = mount.querySelector(".why-widget-slider");
          if (slider) attachSliderControls(slider);
        }

        if ((data.widget.layout === "carousel" || data.widget.layout === "video") && nextPage === 1) {
          var carousel = mount.querySelector(".why-widget-carousel");
          if (carousel && items.length > 0) {
            attachCarouselControls(carousel, items.length);
          }
        }

        page = data.pagination.page;
        done = !data.pagination.hasMore || data.widget.layout === "slider" || data.widget.layout === "carousel" || data.widget.layout === "video" || data.widget.contentType === "VIDEO" || data.widget.contentType === "MIXED";
        setLoadingState(false);
      } catch (error) {
        if (nextPage === 1) {
          var msg = (error && error.message === "not_found")
            ? "This widget is currently unavailable."
            : "Unable to load reviews right now.";
          mount.innerHTML = '<div class="why-widget" style="font-size:14px;color:#64748b;padding:12px">' + msg + '</div>';
        }
        setLoadingState(false);
      }
    }

    void loadPage(1);
  }

  // Initialise every WHY widget script tag on the page in one pass.
  // This handles the case where browsers or optimisers deduplicate the
  // same script src and only execute it once — we still find all tokens.
  function initAll() {
    ensureStyles();
    var scripts = document.querySelectorAll("script[data-token]");
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i];
      if (!s.src || s.src.indexOf("widget.js") === -1) continue;
      void init(s);
    }
  }

  // Run immediately if DOM is ready, otherwise wait.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
`;

export async function GET() {
  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
