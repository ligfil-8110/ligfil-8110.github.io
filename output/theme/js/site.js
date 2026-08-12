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
}());
