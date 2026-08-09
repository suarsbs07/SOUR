// ============================================================================
// recuperar.js — Lógica de recuperar.html: la página a la que llega el
// usuario desde el enlace del correo de "olvidé mi contraseña", para
// escribir y guardar una contraseña nueva.
// ============================================================================
const recuperarForm = document.getElementById("recuperarForm");
const recuperarSubtitulo = document.getElementById("recuperarSubtitulo");
const nuevaPassword = document.getElementById("nuevaPassword");
const confirmarNuevaPassword = document.getElementById("confirmarNuevaPassword");
const recuperarBtn = document.getElementById("recuperarBtn");
const recuperarMensaje = document.getElementById("recuperarMensaje");

function mostrarMensaje(elemento, texto, tipo){ elemento.textContent = texto; elemento.className = `mensaje ${tipo || ""}`; }

function habilitarFormulario(){
  recuperarSubtitulo.textContent = "Escribe tu nueva contraseña.";
  nuevaPassword.disabled = false;
  confirmarNuevaPassword.disabled = false;
  recuperarBtn.disabled = false;
  nuevaPassword.focus();
}

// Supabase detecta el token de recuperación en la URL automáticamente (detectSessionInUrl)
// y dispara este evento cuando el enlace del correo es válido.
supabaseClient.auth.onAuthStateChange((evento) => {
  if(evento === "PASSWORD_RECOVERY") habilitarFormulario();
});

// Si el enlace ya se procesó y la sesión ya existe al cargar, también habilitamos el formulario.
supabaseClient.auth.getSession().then(({ data: { session } }) => {
  if(session) habilitarFormulario();
  else {
    setTimeout(() => {
      if(nuevaPassword.disabled){
        mostrarMensaje(recuperarMensaje, "Este enlace no es válido o ya expiró. Solicita uno nuevo desde 'Olvidé mi contraseña'.", "error");
        recuperarSubtitulo.textContent = "Enlace inválido o vencido.";
      }
    }, 3000);
  }
});

recuperarForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const p1 = nuevaPassword.value;
  const p2 = confirmarNuevaPassword.value;

  if(p1.length < 6){ mostrarMensaje(recuperarMensaje, "La contraseña debe tener mínimo 6 caracteres.", "error"); return; }
  if(p1 !== p2){ mostrarMensaje(recuperarMensaje, "Las contraseñas no coinciden.", "error"); return; }

  const textoOriginal = recuperarBtn.textContent;
  recuperarBtn.disabled = true;
  recuperarBtn.textContent = "Guardando...";
  mostrarMensaje(recuperarMensaje, "Guardando tu nueva contraseña...", "");

  const { error } = await supabaseClient.auth.updateUser({ password: p1 });

  if(error){
    mostrarMensaje(recuperarMensaje, "No se pudo actualizar la contraseña. Intenta solicitar el enlace de nuevo.", "error");
    recuperarBtn.disabled = false;
    recuperarBtn.textContent = textoOriginal;
    return;
  }

  mostrarMensaje(recuperarMensaje, "Contraseña actualizada. Ya puedes ingresar con tu nueva contraseña.", "exito");
  await supabaseClient.auth.signOut();
  setTimeout(() => { window.location.href = "login.html"; }, 1600);
});
