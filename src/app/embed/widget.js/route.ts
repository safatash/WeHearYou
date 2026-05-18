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
      ".why-widget-badge-text{font-size:12px;opacity:.75}";
    document.head.appendChild(style);
  }

  function currentScript() {
    return document.currentScript || (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();
  }

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

  async function init() {
    var scriptEl = currentScript();
    if (!scriptEl) return;

    var token = scriptEl.getAttribute("data-token");
    var mountSelector = scriptEl.getAttribute("data-mount");
    var mount = mountSelector ? document.querySelector(mountSelector) : null;

    if (!token || !mount) return;

    ensureStyles();

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
        if (!response.ok) throw new Error("Failed to load widget");
        var data = await response.json();
        widgetConfig = data.widget;

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
              : "why-widget-grid";

          var listWrapper = data.widget.layout === "slider"
            ? '<div class="why-widget-slider"><div class="' + layoutClass + '"></div><div class="why-widget-slider-controls"><button class="why-widget-slider-btn why-widget-slider-prev" type="button">‹</button><span class="why-widget-slider-label"></span><button class="why-widget-slider-btn why-widget-slider-next" type="button">›</button></div></div>'
            : '<div class="' + layoutClass + '"></div>';

          mount.innerHTML = '<div class="why-widget" style="font-family:' + fontStack(data.widget.fontFamily) + ';background:' + escapeHtml(data.widget.backgroundColor) + ';color:' + escapeHtml(data.widget.textColor) + ';border-radius:18px;padding:20px;border:1px solid rgba(0,0,0,.06)">' +
            renderHeader(data) +
            listWrapper +
            '<div class="why-widget-footer"></div>' +
          '</div>';

          container = mount.querySelector("." + layoutClass);
          footerActions = mount.querySelector(".why-widget-footer");
        }

        if (container) {
          var cardsHtml = data.reviews.map(function (review) { return renderCard(review, data.widget); }).join("");
          if (data.widget.layout === "slider") {
            container.insertAdjacentHTML("beforeend", data.reviews.map(function (review) {
              return '<div class="why-widget-slide">' + renderCard(review, data.widget) + '</div>';
            }).join(""));
          } else {
            container.insertAdjacentHTML("beforeend", cardsHtml);
          }
        }

        if (nextPage === 1 && footerActions) {
          var footerHtml = '';
          if (data.widget.showWriteReview && data.location.reviewLink) {
            footerHtml += '<a class="why-widget-link" href="' + escapeHtml(data.location.reviewLink) + '" target="_blank" rel="noopener noreferrer" style="color:' + escapeHtml(data.widget.primaryColor) + '">Write a review</a>';
          }
          footerActions.innerHTML = footerHtml;
        }

        // Add the Load more button (skip for slider — sliders are typically single-page hero strips)
        if (footerActions && !loadMoreButton && data.widget.layout !== "slider") {
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

        page = data.pagination.page;
        done = !data.pagination.hasMore || data.widget.layout === "slider";
        setLoadingState(false);
      } catch (error) {
        if (nextPage === 1) {
          mount.innerHTML = '<div class="why-widget">Unable to load reviews right now.</div>';
        }
        setLoadingState(false);
      }
    }

    void loadPage(1);
  }

  init();
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
