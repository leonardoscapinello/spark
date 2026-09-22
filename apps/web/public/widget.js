/**
 * Spark — script de embed do chat. Cola no site do cliente:
 *   <script async src="https://app.exemplo.com/widget.js" data-spark-widget="PUBLIC_KEY"></script>
 * Injeta um único <iframe> (mesma origem do app, nunca a do site do
 * cliente — sem CORS pra abrir) e redimensiona ele por postMessage,
 * conforme o próprio conteúdo do chat manda (bolha fechada / painel
 * aberto). Nunca acessa cookie ou storage do site do cliente.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var publicKey = script.getAttribute("data-spark-widget");
  if (!publicKey) { console.error("[Spark widget] data-spark-widget ausente no <script>."); return; }
  var origin = new URL(script.src).origin;
  var BUBBLE = 64;

  var iframe = document.createElement("iframe");
  iframe.src = origin + "/widget/" + encodeURIComponent(publicKey);
  iframe.title = "Chat";
  iframe.style.position = "fixed";
  iframe.style.bottom = "20px";
  iframe.style.right = "20px";
  iframe.style.left = "auto";
  iframe.style.width = BUBBLE + "px";
  iframe.style.height = BUBBLE + "px";
  iframe.style.border = "0";
  iframe.style.background = "transparent";
  iframe.style.zIndex = "2147483000";
  iframe.style.colorScheme = "light";
  document.body.appendChild(iframe);

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.source !== "spark-widget" || event.source !== iframe.contentWindow) return;
    if (data.type === "size") {
      iframe.style.width = data.width + "px";
      iframe.style.height = data.height + "px";
    }
    if (data.type === "position") {
      if (data.position === "left") { iframe.style.left = "20px"; iframe.style.right = "auto"; }
      else { iframe.style.right = "20px"; iframe.style.left = "auto"; }
    }
  });
})();
