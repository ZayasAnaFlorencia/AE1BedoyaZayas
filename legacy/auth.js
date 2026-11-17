/* =========================================================
   auth.js — Login, registro y estado de sesión vía API PHP
   Usa TS_API (api.js) con async/await + fetch.
   ========================================================= */

(() => {
  const mensajeEl = (form) => {
    let el = form.querySelector(".auth-mensaje");
    if (!el) {
      el = document.createElement("div");
      el.className = "auth-mensaje";
      el.setAttribute("aria-live", "polite");
      form.appendChild(el);
    }
    return el;
  };

  function mostrar(form, texto, esError) {
    const el = mensajeEl(form);
    el.className = "auth-mensaje " + (esError ? "mensaje-error" : "mensaje-exito");
    el.textContent = texto;
  }

  /* ---------- Login ---------- */
  const formLogin = document.querySelector("form");
  if (document.body && location.pathname.endsWith("login.html") && formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (formLogin.querySelector("#email") || {}).value?.trim() || "";
      const password = (formLogin.querySelector("#password") || {}).value || "";

      if (!email || !password) {
        mostrar(formLogin, "Completá e-mail y contraseña.", true);
        return;
      }

      const boton = formLogin.querySelector('button[type="submit"]');
      if (boton) boton.disabled = true;
      mostrar(formLogin, "Ingresando…", false);

      try {
        const usuario = await TS_API.login(email, password);
        mostrar(formLogin, `¡Hola, ${usuario.nombre}! Redirigiendo…`, false);
        setTimeout(() => {
          const dest = new URLSearchParams(location.search).get("next") || "mis_tickets.html";
          location.href = dest;
        }, 700);
      } catch (err) {
        mostrar(formLogin, err.message || "No se pudo iniciar sesión.", true);
        if (boton) boton.disabled = false;
      }
    });
  }

  /* ---------- Registro ---------- */
  if (document.body && location.pathname.endsWith("registro.html") && formLogin) {
    // formLogin is the first form on the page
    const form = formLogin;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (form.querySelector("#email") || {}).value?.trim() || "";
      const password = (form.querySelector("#password") || {}).value || "";
      const password2 = (form.querySelector("#password2") || {}).value || "";
      const nombre = (form.querySelector("#nombre") || {}).value?.trim() || "";
      const apellido = (form.querySelector("#apellido") || {}).value?.trim() || "";
      const paisSel = form.querySelector("#pais");
      const pais = paisSel ? paisSel.options[paisSel.selectedIndex]?.text || paisSel.value : "";
      const telefono = (form.querySelector("#telefono") || {}).value?.trim() || null;
      const tipoDoc = (form.querySelector("#tipo_doc") || form.querySelector("#tipo-doc") || {}).value || null;
      const documento = (form.querySelector("#documento") || {}).value?.trim() || null;
      const nacimiento = (form.querySelector("#nacimiento") || {}).value || null;
      const genero = (form.querySelector("#genero") || {}).value || null;
      const newsletter = !!(form.querySelector("#newsletter") && form.querySelector("#newsletter").checked);

      if (!email || !password || !nombre) {
        mostrar(form, "E-mail, contraseña y nombre son obligatorios.", true);
        return;
      }
      if (password !== password2) {
        mostrar(form, "Las contraseñas no coinciden.", true);
        return;
      }
      if (password.length < 8) {
        mostrar(form, "La contraseña debe tener al menos 8 caracteres.", true);
        return;
      }

      const boton = form.querySelector('button[type="submit"]');
      if (boton) boton.disabled = true;
      mostrar(form, "Creando cuenta…", false);

      try {
        await TS_API.registro({
          email,
          password,
          nombre,
          apellido: apellido || null,
          pais: pais || null,
          telefono: telefono || null,
          tipo_doc: tipoDoc || null,
          documento: documento || null,
          nacimiento: nacimiento || null,
          genero: genero || null,
          newsletter
        });
        // Tras registrarse, iniciamos sesión automáticamente
        await TS_API.login(email, password);
        mostrar(form, "Cuenta creada. Redirigiendo…", false);
        setTimeout(() => { location.href = "mis_tickets.html"; }, 800);
      } catch (err) {
        let msg = err.message || "No se pudo registrar.";
        if (err.datos && err.datos.errores) {
          msg = Object.values(err.datos.errores).join(" ");
        }
        mostrar(form, msg, true);
        if (boton) boton.disabled = false;
      }
    });
  }

  /* ---------- Indicador de sesión en el encabezado ---------- */
  async function actualizarCuentaHeader() {
    const cuenta = document.querySelector(".site-header__cuenta");
    if (!cuenta || typeof TS_API === "undefined") return;

    try {
      const sesion = await TS_API.getSesion();
      if (sesion.autenticado && sesion.usuario) {
        const nombre = sesion.usuario.nombre || "Cuenta";
        // Reemplaza el enlace "Ingresar" por nombre + salir
        const links = Array.from(cuenta.querySelectorAll("a"));
        const loginLink = links.find((a) => /login\.html/i.test(a.getAttribute("href") || ""));
        if (loginLink) {
          loginLink.textContent = nombre;
          loginLink.href = "mis_tickets.html";
          loginLink.removeAttribute("aria-current");
        }
        if (!cuenta.querySelector("[data-logout]")) {
          const btn = document.createElement("a");
          btn.href = "#";
          btn.dataset.logout = "1";
          btn.textContent = "Salir";
          btn.addEventListener("click", async (ev) => {
            ev.preventDefault();
            try { await TS_API.logout(); } catch (_) { /* ignore */ }
            location.href = "index.html";
          });
          cuenta.appendChild(btn);
        }
      }
    } catch (_) {
      // API no disponible: se deja el menú estático
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", actualizarCuentaHeader);
  } else {
    actualizarCuentaHeader();
  }
})();
