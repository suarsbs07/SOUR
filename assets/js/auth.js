// ============================================================================
// auth.js — Lógica de login.html y register.html: iniciar sesión, crear
// cuenta y el enlace de "olvidé mi contraseña". Se usa en ambas páginas;
// cada bloque "if(loginForm)/if(registerForm)" solo corre en la página donde
// exista ese formulario.
// ============================================================================

// Referencias a los formularios (uno de los dos será null según la página)
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const forgotLink = document.getElementById("forgotLink");

// Antes esto estaba fijo a "https://suor.vercel.app". Con window.location.origin
// funciona igual en producción, en previews de Vercel y en local sin tocar código.
const BASE_URL = window.location.origin + window.location.pathname.replace(/[^/]+$/, "");

// Quita espacios y pasa a minúsculas, para que "Correo@X.com " y "correo@x.com" se traten igual
function normalizarCorreo(correo){ return correo.trim().toLowerCase(); }
// Muestra un mensaje de estado (info/error/éxito) debajo de un formulario
function mostrarMensaje(elemento,texto,tipo){ elemento.textContent=texto; elemento.className=`mensaje ${tipo||""}`; }

// Traduce los errores más comunes de Supabase a mensajes claros en español
function traducirError(error){
  const msg = error?.message || "";
  if(msg.includes("Invalid login credentials")) return "Correo o contraseña incorrectos.";
  if(msg.includes("Email not confirmed")) return "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.";
  if(msg.includes("User already registered")) return "Ya existe una cuenta con este correo.";
  if(msg.includes("Password should be at least")) return "La contraseña debe tener mínimo 6 caracteres.";
  if(msg.includes("rate limit")) return "Demasiados intentos. Espera un momento y vuelve a intentar.";
  if(msg.includes("Failed to fetch") || msg.includes("NetworkError")) return "No se pudo conectar. Revisa tu conexión a internet.";
  return msg || "Ocurrió un error inesperado. Intenta de nuevo.";
}

// Bloquea un botón mientras dura una acción async, y lo restaura después (evita doble envío)
async function conBotonBloqueado(boton, textoCargando, accion){
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = textoCargando;
  try{
    await accion();
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

// ---------- Formulario de inicio de sesión (login.html) ----------
if(loginForm){
  const loginBtn = loginForm.querySelector("button[type=submit]");
  loginForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = normalizarCorreo(document.getElementById("loginEmail").value);
    const password = document.getElementById("loginPassword").value;
    const mensaje = document.getElementById("loginMensaje");

    if(!email || !password){ mostrarMensaje(mensaje,"Completa tu correo y contraseña.","error"); return; }

    await conBotonBloqueado(loginBtn, "Ingresando...", async ()=>{
      mostrarMensaje(mensaje,"Ingresando...","");
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if(error){ mostrarMensaje(mensaje,traducirError(error),"error"); return; }
      window.location.href = "app.html";
    });
  });
}

// ---------- Enlace "Olvidé mi contraseña" (envía el correo de recuperación) ----------
if(forgotLink){
  forgotLink.addEventListener("click", async (e)=>{
    e.preventDefault();
    const mensaje = document.getElementById("loginMensaje");
    const emailInput = document.getElementById("loginEmail");
    const email = normalizarCorreo(emailInput.value);
    if(!email){
      mostrarMensaje(mensaje,"Escribe tu correo arriba y vuelve a presionar 'Olvidé mi contraseña'.","error");
      emailInput.focus();
      return;
    }
    mostrarMensaje(mensaje,"Enviando enlace de recuperación...","");
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${BASE_URL}recuperar.html`
    });
    if(error){ mostrarMensaje(mensaje,traducirError(error),"error"); return; }
    mostrarMensaje(mensaje,"Si el correo existe, te enviamos un enlace para restablecer tu contraseña.","exito");
  });
}

// ---------- Formulario de creación de cuenta (register.html) ----------
if(registerForm){
  const registerBtn = registerForm.querySelector("button[type=submit]");
  registerForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const birthDate = document.getElementById("birthDate").value;
    const email = normalizarCorreo(document.getElementById("email").value);
    const confirmEmail = normalizarCorreo(document.getElementById("confirmEmail").value);
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const mensaje = document.getElementById("registerMensaje");

    if(!username || !firstName || !lastName || !birthDate || !email || !confirmEmail || !password || !confirmPassword){ mostrarMensaje(mensaje,"Completa todos los campos.","error"); return; }
    if(email !== confirmEmail){ mostrarMensaje(mensaje,"Los correos no coinciden.","error"); return; }
    if(password !== confirmPassword){ mostrarMensaje(mensaje,"Las contraseñas no coinciden.","error"); return; }
    if(password.length < 6){ mostrarMensaje(mensaje,"La contraseña debe tener mínimo 6 caracteres.","error"); return; }

    const hoy = new Date(); const nacimiento = new Date(birthDate);
    if(nacimiento > hoy){ mostrarMensaje(mensaje,"La fecha de nacimiento no puede ser futura.","error"); return; }

    await conBotonBloqueado(registerBtn, "Creando cuenta...", async ()=>{
      mostrarMensaje(mensaje,"Creando cuenta...","");
      const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options:{
            emailRedirectTo: `${BASE_URL}app.html`,
            data:{
              username,
              first_name:firstName,
              last_name:lastName
            }
          }
        });
      if(error){ mostrarMensaje(mensaje,traducirError(error),"error"); return; }
      if(data.user){
        const { error: errorPerfil } = await supabaseClient.from("perfiles").upsert({
          id:data.user.id,
          nombre_usuario:username,
          nombres:firstName,
          apellidos:lastName,
          fecha_nacimiento:birthDate,
          correo:email
        }, { onConflict: "id" });
        if(errorPerfil) console.error("No se pudo completar el perfil:", errorPerfil);
      }
      mostrarMensaje(mensaje,"Cuenta creada. Revisa tu correo si Supabase pide confirmación.","exito");
      setTimeout(()=>{ window.location.href="login.html"; },1400);
    });
  });
}
