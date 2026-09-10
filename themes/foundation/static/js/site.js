(function () {
    "use strict";

    document.querySelectorAll(".highlight").forEach(function (block) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "copy-code-button";
        button.textContent = "コピー";
        button.addEventListener("click", function () {
            var code = block.querySelector("pre");
            if (!code || !navigator.clipboard) return;
            navigator.clipboard.writeText(code.innerText).then(function () {
                button.textContent = "コピーしました";
                window.setTimeout(function () { button.textContent = "コピー"; }, 1600);
            });
        });
        block.appendChild(button);
    });

    var lightbox = document.getElementById("image-lightbox");
    var lightboxImage = document.getElementById("image-lightbox-image");
    var lightboxCaption = document.getElementById("image-lightbox-caption");
    var lightboxClose = lightbox && lightbox.querySelector(".image-lightbox-close");
    var lastFocusedImage = null;

    function isLightboxOpen() {
        return lightbox && !lightbox.hidden;
    }

    function closeLightbox() {
        if (!isLightboxOpen()) return;
        lightbox.classList.remove("is-open");
        lightbox.hidden = true;
        lightboxImage.removeAttribute("src");
        lightboxCaption.textContent = "";
        document.body.classList.remove("is-lightbox-open");
        if (lastFocusedImage) lastFocusedImage.focus();
    }

    function openLightbox(image) {
        if (!lightbox || !lightboxImage) return;
        lastFocusedImage = image;
        lightboxImage.src = image.currentSrc || image.src;
        lightboxImage.alt = image.alt || "拡大画像";
        lightboxCaption.textContent = image.alt || "画像を拡大表示しています";
        lightbox.hidden = false;
        document.body.classList.add("is-lightbox-open");
        window.requestAnimationFrame(function () {
            lightbox.classList.add("is-open");
        });
        lightboxClose.focus();
    }

    document.querySelectorAll(".article-body img").forEach(function (image) {
        image.classList.add("zoomable-image");
        image.tabIndex = 0;
        image.setAttribute("role", "button");
        image.setAttribute("aria-label", (image.alt || "画像") + "を拡大表示");
        image.addEventListener("click", function () { openLightbox(image); });
        image.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openLightbox(image);
            }
        });
    });

    document.querySelectorAll("a[rel~='sponsored']").forEach(function (link) {
        link.addEventListener("click", function () {
            if (typeof window.gtag !== "function") return;
            window.gtag("event", "affiliate_click", {
                affiliate_network: link.dataset.affiliateNetwork || new URL(link.href).hostname,
                affiliate_product: link.dataset.affiliateProduct || "",
                link_position: link.dataset.affiliatePlacement || "本文内",
                link_url: link.href,
                link_text: (link.textContent || link.querySelector("img")?.alt || "").trim(),
                page_path: window.location.pathname
            });
        });
    });

    if (lightbox) {
        lightbox.addEventListener("click", function (event) {
            if (event.target === lightbox) closeLightbox();
        });
        lightboxClose.addEventListener("click", closeLightbox);
        document.addEventListener("keydown", function (event) {
            if (!isLightboxOpen()) return;
            if (event.key === "Escape") {
                event.preventDefault();
                closeLightbox();
                return;
            }
            if (event.key === "Tab") {
                var focusable = Array.prototype.slice.call(lightbox.querySelectorAll("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
                if (!focusable.length) return;
                var first = focusable[0];
                var last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });
    }
}());
