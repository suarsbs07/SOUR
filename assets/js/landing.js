// ============================================================================
// landing.js — Lógica de index.html (página de inicio): botones dinámicos
// según haya sesión o no, menú móvil, animación de "revelado" al hacer
// scroll, efecto parallax del mockup y el mini calendario decorativo.
// ============================================================================
const $ = (id) => document.getElementById(id);

// ---------- Botones según si hay sesión activa ----------
// El botón principal siempre lleva a las tareas y finanzas reales:
// si ya iniciaste sesión antes, un solo clic te lleva directo a app.html.
function botonesSinSesion(){
  return `
    <a href="login.html" class="btn btn-secundario">Iniciar sesión</a>
    <a href="register.html" class="btn btn-primario">Crear cuenta gratis</a>
  `;
}
function botonesConSesion(){
  return `<a href="app.html" class="btn btn-primario">Ir a mi panel →</a>`;
}

async function pintarBotonesSegunSesion(){
  let haySesion = false;
  try{
    const { data:{ session } } = await supabaseClient.auth.getSession();
    haySesion = !!session;
  }catch(e){ console.error(e); }

  const htmlBotones = haySesion ? botonesConSesion() : botonesSinSesion();
  $("heroCta").innerHTML = htmlBotones;
  $("ctaFinal").innerHTML = htmlBotones;
  $("navAcciones").innerHTML = htmlBotones;
  $("navMobileAcciones").innerHTML = htmlBotones;
  $("heroNota").textContent = haySesion
    ? "Ya iniciaste sesión antes: entra directo a tus tareas y finanzas."
    : "Gratis. Sin tarjeta. Tus datos quedan protegidos solo para tu cuenta.";
}
pintarBotonesSegunSesion();

// ---------- Menú móvil ----------
const nav = $("nav"), navBurger = $("navBurger");
navBurger.addEventListener("click", () => {
  const abierto = nav.classList.toggle("abierto");
  navBurger.setAttribute("aria-expanded", abierto ? "true" : "false");
});
document.querySelectorAll(".nav-mobile a").forEach(a => a.addEventListener("click", () => nav.classList.remove("abierto")));

// ---------- Revelado al hacer scroll ----------
const elementosReveal = document.querySelectorAll(".reveal");
if("IntersectionObserver" in window){
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
      if(entrada.isIntersecting){
        entrada.target.classList.add("visto");
        observador.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.15 });
  elementosReveal.forEach(el => observador.observe(el));
} else {
  elementosReveal.forEach(el => el.classList.add("visto"));
}

// ---------- Parallax suave del mockup del hero (se ignora en mobile / reduced motion) ----------
const mockupStack = $("mockupStack"), heroVisual = $("heroVisual");
const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if(mockupStack && heroVisual && !prefiereMenosMovimiento && window.matchMedia("(min-width: 981px)").matches){
  heroVisual.addEventListener("mousemove", (e) => {
    const rect = heroVisual.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mockupStack.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  });
  heroVisual.addEventListener("mouseleave", () => { mockupStack.style.transform = "rotateY(0) rotateX(0)"; });
}

// ---------- Mini calendario decorativo (resalta el día de hoy) ----------
const mockupGrid = $("mockupGrid");
if(mockupGrid){
  const hoy = new Date().getDate();
  const diasDelMes = 31;
  const diasConTarea = new Set([3, 8, 14, 21, 27]);
  for(let d = 1; d <= diasDelMes; d++){
    const span = document.createElement("span");
    if(d === hoy) span.style.background = "linear-gradient(135deg,#0f766e,#2563eb)";
    else if(diasConTarea.has(d)) span.style.background = "#c7d9ff";
    mockupGrid.appendChild(span);
  }
}
