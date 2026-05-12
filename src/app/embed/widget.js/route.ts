import { NextResponse } from "next/server";

const script = `
(function () {
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

  function ensureStyles() {
    if (document.getElementById("why-review-widget-styles")) return;

    var style = document.createElement("style");
    style.id = "why-review-widget-styles";
    style.textContent = \
      ".why-widget{font-family:Arial,sans-serif;color:#0f172a}.why-widget-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}.why-widget-card{border:1px solid #e2e8f0;border-radius:16px;padding:16px;background:#fff}.why-widget-header{margin-bottom:16px}.why-widget-title{font-size:20px;font-weight:700;margin:0 0 4px}.why-widget-meta{font-size:14px;color:#475569;margin:0}.why-widget-stars{color:#f59e0b;font-size:14px;margin-bottom:8px}.why-widget-reviewer{display:flex;align-items:center;gap:10px;margin-bottom:6px}.why-widget-avatar{width:32px;height:32px;border-radius:999px;object-fit:cover;background:#e2e8f0}.why-widget-avatar-fallback{width:32px;height:32px;border-radius:999px;background:#e2e8f0;color:#475569;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}.why-widget-name{font-weight:600}.why-widget-body{font-size:14px;line-height:1.5;color:#334155}.why-widget-owner-reply{margin-top:12px;padding:12px;border-radius:14px;background:#f8fafc;font-size:12px;line-height:1.5;color:#475569}.why-widget-date{margin-top:10px;font-size:12px;color:#64748b}.why-widget-meta-row{margin-top:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.why-widget-review-link{font-size:12px;font-weight:600;color:#4338ca;text-decoration:none}.why-widget-footer{margin-top:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}.why-widget-link{display:inline-block;text-decoration:none;font-weight:600;color:#4338ca}.why-widget-button{border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#0f172a;padding:10px 14px;font-size:14px;font-weight:600;cursor:pointer}.why-widget-button[disabled]{opacity:.5;cursor:not-allowed}";
    document.head.appendChild(style);
  }

  function currentScript() {
    return document.currentScript || (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();
  }

  function render(data) {
    var headerHtml = data.widget.showHeader
      ? "<div class=\"why-widget-header\"><p class=\"why-widget-title\">" + escapeHtml(data.location.name) + "</p><p class=\"why-widget-meta\">" +
          (data.location.avgRating ? escapeHtml(String(Number(data.location.avgRating).toFixed(1))) + " ★" : "") +
          " " +
          (data.location.reviewCount ? "(" + escapeHtml(String(data.location.reviewCount)) + " reviews)" : "") +
        "</p></div>"
      : "";

    var cardsHtml = data.reviews.map(function (review) {
      var reviewerHtml = '';
      if (data.widget.showReviewerName) {
        var avatarHtml = review.reviewerPhotoUrl
          ? '<img class="why-widget-avatar" src="' + escapeHtml(review.reviewerPhotoUrl) + '" alt="' + escapeHtml(review.reviewerName) + '" />'
          : '<div class="why-widget-avatar-fallback">' + escapeHtml((review.reviewerName || '?').slice(0, 1).toUpperCase()) + '</div>';
        reviewerHtml = '<div class="why-widget-reviewer">' + avatarHtml + '<div class="why-widget-name">' + escapeHtml(review.reviewerName) + '</div></div>';
      }

      return "<article class=\"why-widget-card\">" +
        (data.widget.showRating ? '<div class=\"why-widget-stars\">' + escapeHtml(stars(review.rating)) + '</div>' : '') +
        reviewerHtml +
        '<div class=\"why-widget-body\">' + escapeHtml(review.body) + '</div>' +
        (review.sourceReplyText ? '<div class=\"why-widget-owner-reply\"><strong>Owner reply:</strong> ' + escapeHtml(review.sourceReplyText) + '</div>' : '') +
        '<div class=\"why-widget-meta-row\">' +
          (data.widget.showDate && review.reviewedAt ? '<div class=\"why-widget-date\">' + escapeHtml(formatDate(review.reviewedAt)) + '</div>' : '<div></div>') +
          (review.sourceReviewUrl ? '<a class=\"why-widget-review-link\" href="' + escapeHtml(review.sourceReviewUrl) + '" target="_blank" rel="noopener noreferrer">View on Google</a>' : '') +
        '</div>' +
      '</article>';
    }).join("");

    return {
      headerHtml: headerHtml,
      cardsHtml: cardsHtml,
      footerHtml: data.widget.showWriteReview && data.location.reviewLink
        ? "<a class=\"why-widget-link\" href=\"" + escapeHtml(data.location.reviewLink) + "\" target=\"_blank\" rel=\"noopener noreferrer\">Write a review</a>"
        : ""
    };
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
    var footerActions = null;
    var grid = null;
    var loadMoreButton = null;

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
        var rendered = render(data);

        if (nextPage === 1) {
          mount.innerHTML = "<div class=\"why-widget\">" +
            rendered.headerHtml +
            "<div class=\"why-widget-grid\"></div>" +
            "<div class=\"why-widget-footer\"></div>" +
            "</div>";

          grid = mount.querySelector(".why-widget-grid");
          footerActions = mount.querySelector(".why-widget-footer");
          if (footerActions) {
            footerActions.innerHTML = rendered.footerHtml;
          }
        }

        if (grid) {
          grid.insertAdjacentHTML("beforeend", rendered.cardsHtml);
        }

        if (footerActions && !loadMoreButton) {
          loadMoreButton = document.createElement("button");
          loadMoreButton.type = "button";
          loadMoreButton.className = "why-widget-button";
          loadMoreButton.textContent = "Load more";
          loadMoreButton.addEventListener("click", function () {
            void loadPage(page + 1);
          });
          footerActions.appendChild(loadMoreButton);
        }

        page = data.pagination.page;
        done = !data.pagination.hasMore;
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
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
