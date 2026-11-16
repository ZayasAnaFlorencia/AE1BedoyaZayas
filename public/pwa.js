/* =========================================================
   pwa.js — Registro del service worker y botón "Instalar app"
   (En la app nativa de Capacitor no hace falta: ya está instalada)
   ========================================================= */

(() => {
  const enAppNativa = !!window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform();
  if (enAppNativa) return;

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((e) => console.warn("Service worker no registrado:", e));
    });
  }

  let eventoInstalar = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    eventoInstalar = e;
    if (document.querySelector(".enlace-instalar")) return;
    const pie = document.querySelector(".footer-idiomas");
    if (!pie) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "enlace-accion enlace-instalar";
    b.textContent = "📲 Instalar app";
    b.addEventListener("click", async () => {
      b.remove();
      eventoInstalar.prompt();
      await eventoInstalar.userChoice;
      eventoInstalar = null;
    });
    pie.prepend(b);
  });
  window.addEventListener("appinstalled", () => {
    const b = document.querySelector(".enlace-instalar");
    if (b) b.remove();
  });
})();
