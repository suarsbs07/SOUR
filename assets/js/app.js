// ============================================================================
// app.js — Lógica del panel principal (app.html): tareas, calendario y
// finanzas mensuales. Todo el archivo está comentado por bloques para que
// sea fácil ubicar qué parte hace qué.
// ============================================================================

// Atajo para document.getElementById, se usa en todo el archivo.
const $ = (id)=>document.getElementById(id);

// ---------- Referencias a elementos del encabezado ----------
const fechaActual=$("fechaActual"), usuarioActivoTexto=$("usuarioActivo"), cerrarSesionBtn=$("cerrarSesionBtn");

// ---------- Referencias del formulario "Agregar tarea" ----------
const nombreTarea=$("nombreTarea"), seccionTarea=$("seccionTarea"), fechaInicioTarea=$("fechaInicioTarea"), fechaFinTarea=$("fechaFinTarea"), horaInicio=$("horaInicio"), horaFin=$("horaFin"), agregarTareaBtn=$("agregarTareaBtn");
// Contenedores/labels que se muestran u ocultan según la sección elegida (ver aplicarConfigSeccion)
const campoFechaFin=$("campoFechaFin"), campoHoraInicio=$("campoHoraInicio"), campoHoraFin=$("campoHoraFin"), labelFechaInicio=$("labelFechaInicio"), labelHoraInicio=$("labelHoraInicio"), ayudaSeccion=$("ayudaSeccion");

// ---------- Referencias del calendario, secciones rápidas y próximas tareas ----------
const calendario=$("calendario"), mesActual=$("mesActual"), mesAnterior=$("mesAnterior"), mesSiguiente=$("mesSiguiente"), botonesSecciones=$("botonesSecciones"), listaProximas=$("listaProximas");

// ---------- Referencias del modal (ventana emergente) que lista tareas ----------
const modal=$("modal"), cerrarModal=$("cerrarModal"), modalTitulo=$("modalTitulo"), modalLista=$("modalLista");

// ---------- Referencias del módulo de finanzas ----------
const mesFinanza=$("mesFinanza"), ingresoMensual=$("ingresoMensual"), guardarIngresoBtn=$("guardarIngresoBtn"), nombreGasto=$("nombreGasto"), categoriaGasto=$("categoriaGasto"), campoCategoriaOtro=$("campoCategoriaOtro"), categoriaOtro=$("categoriaOtro"), montoGasto=$("montoGasto"), fechaLimiteGasto=$("fechaLimiteGasto"), fechaPagoGasto=$("fechaPagoGasto"), agregarGastoBtn=$("agregarGastoBtn");
const dashIngreso=$("dashIngreso"), dashGastado=$("dashGastado"), dashRestante=$("dashRestante"), dashPorcentaje=$("dashPorcentaje"), barraGasto=$("barraGasto"), barrasCategorias=$("barrasCategorias"), listaGastos=$("listaGastos"), tituloGastosMes=$("tituloGastosMes"), tituloMesDashboard=$("tituloMesDashboard");

// ---------- Estado de la aplicación (se llena al cargar los datos de Supabase) ----------
let usuarioActivo=null, perfilActivo=null, tareas=[], finanzaMes=null, gastos=[], fechaCalendario=new Date();

// Lista de secciones disponibles para clasificar una tarea
const secciones=["Estudio","Trabajo","Personal","Económico","Cumpleaños","Gastos fijos","Suscripciones","Pagos pendientes","Exámenes / entregas","Trabajo / turnos","Metas personales"];
// Un emoji representativo por sección, usado en selects, tarjetas y botones
const iconos={"Estudio":"📚","Trabajo":"💼","Personal":"🏠","Económico":"💰","Cumpleaños":"🎂","Gastos fijos":"🏦","Suscripciones":"📱","Pagos pendientes":"🧾","Exámenes / entregas":"📝","Trabajo / turnos":"🕒","Metas personales":"🎯"};
// Cada sección "cae" dentro de una categoría más general (se usa para agrupar en la base de datos)
const categoriasBase={"Estudio":"Estudio","Trabajo":"Trabajo","Personal":"Personal","Económico":"Económico","Cumpleaños":"Personal","Gastos fijos":"Económico","Suscripciones":"Económico","Pagos pendientes":"Económico","Exámenes / entregas":"Estudio","Trabajo / turnos":"Trabajo","Metas personales":"Personal"};

// Cada sección tiene su propia forma de manejar fechas y horas, según tenga sentido para ese tipo de tarea:
// modo "rango"  -> pide fecha inicio Y fecha fin (tareas que duran varios días)
// modo "limite" -> pide una sola fecha, mostrada como "Fecha límite" (pagos, metas, suscripciones)
// modo "unica"  -> pide una sola fecha, mostrada como "Fecha" (cumpleaños, turnos, exámenes)
// horas "rango"   -> hora inicio y hora fin (ej. turno de trabajo)
// horas "simple"  -> una sola hora (ej. hora del examen)
// horas "ninguna" -> sin campos de hora (ej. cumpleaños, pagos, metas)
const configSecciones={
  "Estudio":            {modo:"rango",  horas:"rango",   ayuda:"Ideal para tareas o proyectos que abarcan varios días."},
  "Trabajo":            {modo:"rango",  horas:"rango",   ayuda:"Ideal para tareas o proyectos que abarcan varios días."},
  "Personal":           {modo:"rango",  horas:"rango",   ayuda:"Ideal para tareas o proyectos que abarcan varios días."},
  "Económico":          {modo:"limite", horas:"ninguna", ayuda:"Solo necesita una fecha límite, sin rango ni hora."},
  "Cumpleaños":         {modo:"unica",  horas:"ninguna", ayuda:"Solo la fecha del cumpleaños."},
  "Gastos fijos":       {modo:"limite", horas:"ninguna", ayuda:"Solo necesita una fecha límite, sin rango ni hora."},
  "Suscripciones":      {modo:"limite", horas:"ninguna", ayuda:"Solo necesita una fecha límite, sin rango ni hora."},
  "Pagos pendientes":   {modo:"limite", horas:"ninguna", ayuda:"Solo necesita una fecha límite, sin rango ni hora."},
  "Exámenes / entregas":{modo:"unica",  horas:"simple",  ayuda:"Una fecha y una hora puntual."},
  "Trabajo / turnos":   {modo:"unica",  horas:"rango",   ayuda:"Un día con hora de inicio y hora de fin del turno."},
  "Metas personales":   {modo:"limite", horas:"ninguna", ayuda:"Solo necesita una fecha límite, sin rango ni hora."},
};

// Agrupación de secciones para que "Secciones rápidas" sea más fácil de navegar
const gruposSecciones=[
  {titulo:"General", secciones:["Estudio","Trabajo","Personal","Económico"]},
  {titulo:"Fechas importantes", secciones:["Cumpleaños","Exámenes / entregas"]},
  {titulo:"Financiero", secciones:["Gastos fijos","Suscripciones","Pagos pendientes"]},
  {titulo:"Organización", secciones:["Trabajo / turnos","Metas personales"]},
];

// ============================================================================
// Utilidades generales de fecha, texto y dinero
// ============================================================================

// Devuelve una fecha JS como texto "YYYY-MM-DD" en horario LOCAL (no UTC),
// que es el formato que espera Supabase para columnas tipo date.
function fechaLocal(fecha){return `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,"0")}-${String(fecha.getDate()).padStart(2,"0")}`;}
// Igual que fechaLocal pero solo con año y mes "YYYY-MM" (para el selector de mes de finanzas)
function mesLocal(fecha){return `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,"0")}`;}
// Da formato de moneda peruana a un número, ej. formatoSoles(120.5) -> "S/ 120.50"
function formatoSoles(n){return `S/ ${Number(n||0).toFixed(2)}`;}
// Convierte "YYYY-MM-DD" a un texto largo y legible en español, ej. "jueves, 23 de julio de 2026"
// (el propio locale es-PE ya ordena día, luego mes, luego año)
function formatoFecha(txt){if(!txt)return "Sin fecha"; const [y,m,d]=txt.split("-");return new Date(y,m-1,d).toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long",year:"numeric"});}
// Versión corta para tarjetas y listas, ej. "23 jul 2026" (día, mes, año)
function formatoFechaCorta(txt){if(!txt)return "Sin fecha"; const [y,m,d]=txt.split("-");return new Date(y,m-1,d).toLocaleDateString("es-PE",{day:"numeric",month:"short",year:"numeric"});}
// Convierte "YYYY-MM" a texto de mes y año, ej. "julio 2026"
function formatoMes(mes){const [y,m]=mes.split("-");return new Date(y,m-1,1).toLocaleDateString("es-PE",{month:"long",year:"numeric"});}
// Escapa caracteres especiales para que texto ingresado por el usuario no rompa el HTML (previene inyección)
function escapar(t){return String(t||"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));}
// Dado "YYYY-MM" devuelve el mes siguiente en el mismo formato
function siguienteMesDe(mes){const [y,m]=mes.split("-").map(Number);const f=new Date(y,m,1);return mesLocal(f);}
// Dado "YYYY-MM" devuelve el mes anterior en el mismo formato
function anteriorMesDe(mes){const [y,m]=mes.split("-").map(Number);const f=new Date(y,m-2,1);return mesLocal(f);}
// Deshabilita un botón mientras dura una acción asíncrona (evita doble clic / doble envío)
// y muestra un texto de carga temporal, restaurando el texto original al terminar.
async function conBotonBloqueado(boton,textoCargando,accion){
  if(boton.disabled) return;
  const textoOriginal=boton.textContent;
  boton.disabled=true; boton.textContent=textoCargando;
  try{ await accion(); }
  finally{ boton.disabled=false; boton.textContent=textoOriginal; }
}

// ============================================================================
// Selectores personalizados de fecha, hora y mes
// ----------------------------------------------------------------------------
// Los <input type="date/time/month"> originales se ven distinto en cada
// navegador y son incómodos de usar. Aquí los reemplazamos por un botón que
// muestra el valor en texto (día, mes y año, en ese orden) y que al hacer
// clic abre una ventanita (popup) propia: un mini calendario para fechas,
// un selector de hora/minuto para horas, y una grilla de meses para el mes.
//
// El <input> original SIGUE existiendo en el HTML pero como type="hidden":
// ahí se guarda el valor real en formato ISO (el que necesita Supabase), así
// que el resto del código (agregarTarea, cargarFinanzas, etc.) no cambia en
// absoluto: sigue leyendo/escribiendo con `elemento.value` como siempre.
// ============================================================================

const MESES_CORTOS=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MESES_LARGOS=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

// Texto que se muestra en el botón cuando el campo es una FECHA (día, mes, año)
function textoFechaBonito(valorISO){
  if(!valorISO) return "Elegir fecha";
  const [y,m,d]=valorISO.split("-").map(Number);
  return `${d} ${MESES_CORTOS[m-1]} ${y}`;
}
// Texto que se muestra en el botón cuando el campo es una HORA
function textoHoraBonito(valorHora){
  return valorHora ? valorHora : "Elegir hora";
}
// Texto que se muestra en el botón cuando el campo es un MES (finanzas)
function textoMesBonito(valorMes){
  if(!valorMes) return "Elegir mes";
  const [y,m]=valorMes.split("-").map(Number);
  return `${MESES_LARGOS[m-1]} ${y}`;
}

// Solo puede haber un popup abierto a la vez; se guarda la referencia para poder cerrarlo.
let popupSelectorAbierto=null;
function cerrarPopupSelector(){
  if(popupSelectorAbierto){ popupSelectorAbierto.remove(); popupSelectorAbierto=null; }
}
// Cierra el popup si el usuario hace clic afuera de él (y no sobre el botón que lo abrió)
document.addEventListener("click",(e)=>{
  if(!popupSelectorAbierto) return;
  if(popupSelectorAbierto.contains(e.target)) return;
  if(e.target.closest(".selector-btn")) return;
  cerrarPopupSelector();
});
// También se puede cerrar con la tecla Escape
document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") cerrarPopupSelector(); });

// Abre el mini calendario para elegir una FECHA. inputOculto = el <input type="hidden">
// donde se guarda el valor real; boton = el botón visible; texto = el <span> con el texto.
function abrirSelectorFecha(inputOculto,boton,texto){
  cerrarPopupSelector();
  const base = inputOculto.value ? inputOculto.value.split("-").map(Number) : null;
  let vista = base ? new Date(base[0],base[1]-1,1) : new Date();

  const pop=document.createElement("div");
  pop.className="selector-popup";

  function pintar(){
    const y=vista.getFullYear(), m=vista.getMonth();
    const primerDia=new Date(y,m,1), ultimoDia=new Date(y,m+1,0);
    const inicio=(primerDia.getDay()+6)%7; // lunes=0 ... domingo=6, igual que el calendario grande
    let dias="";
    for(let i=0;i<inicio;i++) dias+='<button type="button" class="mini-dia mini-vacio" disabled></button>';
    for(let d=1;d<=ultimoDia.getDate();d++){
      const iso=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      dias+=`<button type="button" class="mini-dia${iso===inputOculto.value?" mini-dia-activo":""}" data-iso="${iso}">${d}</button>`;
    }
    const nombreMes=MESES_LARGOS[m]; const nombreMesCap=nombreMes.charAt(0).toUpperCase()+nombreMes.slice(1);
    pop.innerHTML=`
      <div class="selector-popup-header">
        <button type="button" class="btn-icon-sm" data-accion="anterior" aria-label="Mes anterior">‹</button>
        <span>${nombreMesCap} ${y}</span>
        <button type="button" class="btn-icon-sm" data-accion="siguiente" aria-label="Mes siguiente">›</button>
      </div>
      <div class="mini-dias-semana"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
      <div class="mini-calendario">${dias}</div>`;
    pop.querySelector('[data-accion="anterior"]').onclick=()=>{vista.setMonth(vista.getMonth()-1); pintar();};
    pop.querySelector('[data-accion="siguiente"]').onclick=()=>{vista.setMonth(vista.getMonth()+1); pintar();};
    pop.querySelectorAll(".mini-dia:not(.mini-vacio)").forEach(b=>{
      b.onclick=()=>{
        inputOculto.value=b.dataset.iso;
        texto.textContent=textoFechaBonito(b.dataset.iso);
        cerrarPopupSelector();
      };
    });
  }
  pintar();
  boton.parentElement.appendChild(pop);
  popupSelectorAbierto=pop;
}

// Abre el selector de HORA (hora + minutos, en pasos de 15 minutos).
function abrirSelectorHora(inputOculto,boton,texto){
  cerrarPopupSelector();
  const [hActual,mActualRaw]=(inputOculto.value||"08:00").split(":");
  // Redondea el minuto actual al múltiplo de 15 más cercano, para que siempre haya una opción seleccionada
  const mActual=String(Math.round(Number(mActualRaw||0)/15)*15 % 60).padStart(2,"0");

  const pop=document.createElement("div");
  pop.className="selector-popup";
  let horas=""; for(let h=0;h<24;h++){const v=String(h).padStart(2,"0"); horas+=`<option value="${v}"${v===hActual?" selected":""}>${v}</option>`;}
  let minutos=""; [0,15,30,45].forEach(mm=>{const v=String(mm).padStart(2,"0"); minutos+=`<option value="${v}"${v===mActual?" selected":""}>${v}</option>`;});
  pop.innerHTML=`
    <div class="selector-popup-header"><span>Elige la hora</span></div>
    <div class="selector-hora-filas">
      <select class="selector-hora-h">${horas}</select><span>:</span><select class="selector-hora-m">${minutos}</select>
    </div>
    <button type="button" class="btn-aceptar-hora">Listo</button>`;
  pop.querySelector(".btn-aceptar-hora").onclick=()=>{
    const h=pop.querySelector(".selector-hora-h").value, m=pop.querySelector(".selector-hora-m").value;
    inputOculto.value=`${h}:${m}`;
    texto.textContent=textoHoraBonito(`${h}:${m}`);
    cerrarPopupSelector();
  };
  boton.parentElement.appendChild(pop);
  popupSelectorAbierto=pop;
}

// Abre el selector de MES (grilla de 12 meses + navegación de año), usado en finanzas.
// alCambiar es una función opcional que se ejecuta después de elegir el mes (para recargar datos).
function abrirSelectorMes(inputOculto,boton,texto,alCambiar){
  cerrarPopupSelector();
  const valorBase=inputOculto.value||mesLocal(new Date());
  let anioVista=Number(valorBase.split("-")[0]);

  const pop=document.createElement("div");
  pop.className="selector-popup";

  function pintar(){
    let botones="";
    MESES_CORTOS.forEach((mm,i)=>{
      const valor=`${anioVista}-${String(i+1).padStart(2,"0")}`;
      botones+=`<button type="button" class="mini-mes${valor===inputOculto.value?" mini-mes-activo":""}" data-valor="${valor}">${mm}</button>`;
    });
    pop.innerHTML=`
      <div class="selector-popup-header">
        <button type="button" class="btn-icon-sm" data-accion="anterior" aria-label="Año anterior">‹</button>
        <span>${anioVista}</span>
        <button type="button" class="btn-icon-sm" data-accion="siguiente" aria-label="Año siguiente">›</button>
      </div>
      <div class="mini-meses">${botones}</div>`;
    pop.querySelector('[data-accion="anterior"]').onclick=()=>{anioVista--; pintar();};
    pop.querySelector('[data-accion="siguiente"]').onclick=()=>{anioVista++; pintar();};
    pop.querySelectorAll(".mini-mes").forEach(b=>{
      b.onclick=async()=>{
        inputOculto.value=b.dataset.valor;
        texto.textContent=textoMesBonito(b.dataset.valor);
        cerrarPopupSelector();
        if(alCambiar) await alCambiar();
      };
    });
  }
  pintar();
  boton.parentElement.appendChild(pop);
  popupSelectorAbierto=pop;
}

// Conecta un <input type="hidden"> con su botón y su texto visible, y deja
// guardada una función "refrescar" en el propio input para poder actualizar
// el texto visible cada vez que el código cambie el valor por su cuenta
// (por ejemplo, al poner la fecha de hoy por defecto).
function inicializarSelector(idInput,tipo,alCambiar){
  const input=$(idInput), boton=$(idInput+"Btn"), texto=$(idInput+"Texto");
  if(!input||!boton||!texto) return;
  const refrescar=()=>{
    if(tipo==="fecha") texto.textContent=textoFechaBonito(input.value);
    else if(tipo==="hora") texto.textContent=textoHoraBonito(input.value);
    else texto.textContent=textoMesBonito(input.value);
  };
  boton.onclick=()=>{
    if(tipo==="fecha") abrirSelectorFecha(input,boton,texto);
    else if(tipo==="hora") abrirSelectorHora(input,boton,texto);
    else abrirSelectorMes(input,boton,texto,alCambiar);
  };
  input._refrescarSelector=refrescar;
  refrescar();
}

// Actualiza el texto visible de todos los selectores (llamar después de que
// el código haya cambiado algún .value "a mano", como al precargar la fecha
// de hoy o al limpiar los campos tras guardar).
function refrescarTodosLosSelectores(){
  [fechaInicioTarea,fechaFinTarea,horaInicio,horaFin,fechaLimiteGasto,fechaPagoGasto,mesFinanza].forEach(inp=>{
    if(inp && inp._refrescarSelector) inp._refrescarSelector();
  });
}

// ============================================================================
// Arranque de la app: sesión, valores por defecto y primera carga de datos
// ============================================================================

// Si venimos de index.html con "?modulo=finanzas", abre directo el módulo de
// finanzas en vez del de tareas (útil para el botón "Ir a mi panel" del inicio).
function activarModuloInicial(){
  const modulo=new URLSearchParams(window.location.search).get("modulo");
  if(modulo!=="finanzas") return;
  const btn=document.querySelector('.module-btn[data-modulo="finanzas"]');
  if(btn) btn.click();
}

async function iniciarApp(){
  // Si no hay sesión activa en Supabase, no se puede usar el panel: se manda a login.
  const {data:{session},error:errorSesion}=await supabaseClient.auth.getSession();
  if(errorSesion || !session){window.location.href="login.html";return;}
  usuarioActivo=session.user;

  // Fecha y valores por defecto: hoy para todas las fechas, mes actual para finanzas.
  const hoy=new Date();
  fechaActual.textContent=hoy.toLocaleDateString("es-PE",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  fechaInicioTarea.value=fechaLocal(hoy);
  fechaFinTarea.value=fechaLocal(hoy);
  fechaLimiteGasto.value=fechaLocal(hoy);
  fechaPagoGasto.value=fechaLocal(hoy);
  mesFinanza.value=mesLocal(hoy);

  llenarSecciones();
  aplicarConfigSeccion();

  // Conecta cada input oculto con su botón/popup personalizado.
  inicializarSelector("fechaInicioTarea","fecha");
  inicializarSelector("fechaFinTarea","fecha");
  inicializarSelector("horaInicio","hora");
  inicializarSelector("horaFin","hora");
  inicializarSelector("fechaLimiteGasto","fecha");
  inicializarSelector("fechaPagoGasto","fecha");
  inicializarSelector("mesFinanza","mes", async()=>{ await cargarFinanzas(); renderDashboard(); });
  refrescarTodosLosSelectores();

  // Antes estas 3 llamadas se esperaban una por una (secuencial). Como son independientes
  // entre sí, cargarlas en paralelo reduce bastante el tiempo hasta que el panel es usable.
  await Promise.all([cargarPerfil(), cargarTareas(), cargarFinanzas()]);
  renderSecciones(); renderCalendario(); renderDashboard(); renderProximas();
  activarModuloInicial();
  document.body.classList.add("app-lista");
}

// Llena el <select> de secciones con un ícono + nombre por cada opción.
function llenarSecciones(){
  seccionTarea.innerHTML="";
  secciones.forEach(sec=>{
    const op=document.createElement("option");
    op.value=sec; op.textContent=`${iconos[sec]||"•"} ${sec}`;
    seccionTarea.appendChild(op);
  });
}

// Muestra/oculta y renombra los campos de fecha y hora del formulario de
// tareas según la configuración (configSecciones) de la sección elegida.
function aplicarConfigSeccion(){
  const cfg=configSecciones[seccionTarea.value]||{modo:"rango",horas:"rango",ayuda:""};

  if(cfg.modo==="rango"){
    labelFechaInicio.textContent="Fecha inicio";
    campoFechaFin.classList.remove("oculto");
  } else {
    labelFechaInicio.textContent = cfg.modo==="limite" ? "Fecha límite" : "Fecha";
    campoFechaFin.classList.add("oculto");
  }

  if(cfg.horas==="rango"){
    labelHoraInicio.textContent="Hora inicio";
    campoHoraInicio.classList.remove("oculto");
    campoHoraFin.classList.remove("oculto");
  } else if(cfg.horas==="simple"){
    labelHoraInicio.textContent="Hora";
    campoHoraInicio.classList.remove("oculto");
    campoHoraFin.classList.add("oculto");
    horaFin.value="";
  } else {
    campoHoraInicio.classList.add("oculto");
    campoHoraFin.classList.add("oculto");
    horaInicio.value=""; horaFin.value="";
  }

  ayudaSeccion.textContent=cfg.ayuda||"";
  refrescarTodosLosSelectores();
}

// ============================================================================
// Carga de datos desde Supabase
// ============================================================================

// Trae el perfil del usuario (nombre, etc.) y arma el texto "Sesión iniciada como ..."
async function cargarPerfil(){
  const {data}=await supabaseClient.from("perfiles").select("*").eq("id",usuarioActivo.id).single();
  perfilActivo=data;
  const visible=data?.nombre_usuario || usuarioActivo.user_metadata?.username || usuarioActivo.email;
  usuarioActivoTexto.textContent=`Sesión iniciada como ${visible}`;
}
// Trae todas las tareas del usuario, ordenadas por fecha y hora de inicio.
async function cargarTareas(){
  const {data,error}=await supabaseClient.from("tareas").select("*").eq("usuario_id",usuarioActivo.id).order("fecha_inicio",{ascending:true}).order("hora_inicio",{ascending:true});
  if(error){console.error(error); tareas=[]; return;} tareas=data||[];
}
// Trae el ingreso mensual y los gastos del mes seleccionado en mesFinanza.
async function cargarFinanzas(){
  const mes=mesFinanza.value;
  const {data}=await supabaseClient.from("finanzas_mensuales").select("*").eq("usuario_id",usuarioActivo.id).eq("mes",`${mes}-01`).maybeSingle();
  finanzaMes=data;
  ingresoMensual.value=data?.ingreso_mensual || "";
  const {data:g}=await supabaseClient.from("gastos_financieros").select("*").eq("usuario_id",usuarioActivo.id).eq("mes_finanza",`${mes}-01`).order("fecha_limite",{ascending:true});
  gastos=g||[];
}

// ============================================================================
// Render: pintar en pantalla el estado actual (secciones, calendario, próximas)
// ============================================================================

// Dibuja los botones de "Secciones rápidas" agrupados, con contador de pendientes.
function renderSecciones(){
  botonesSecciones.innerHTML="";
  gruposSecciones.forEach(grupo=>{
    const bloque=document.createElement("div"); bloque.className="grupo-secciones";
    const titulo=document.createElement("h3"); titulo.className="grupo-titulo"; titulo.textContent=grupo.titulo;
    bloque.appendChild(titulo);
    const grid=document.createElement("div"); grid.className="quick-sections";
    grupo.secciones.forEach(sec=>{
      const pendientes=tareas.filter(t=>t.seccion===sec && !t.completada).length;
      const btn=document.createElement("button"); btn.className="section-btn"; btn.type="button";
      btn.innerHTML=`<span>${iconos[sec]||""} ${escapar(sec)}</span>${pendientes>0?`<span class="badge-count">${pendientes}</span>`:""}`;
      btn.onclick=()=>abrirSeccion(sec); grid.appendChild(btn);
    });
    bloque.appendChild(grid);
    botonesSecciones.appendChild(bloque);
  });
}

// Dibuja la lista de "Próximas tareas": las 5 pendientes más cercanas en el tiempo.
function renderProximas(){
  const hoy=fechaLocal(new Date());
  const proximas=tareas
    .filter(t=>!t.completada && (t.fecha_fin||t.fecha_inicio)>=hoy)
    .sort((a,b)=>((a.fecha_inicio||"")+(a.hora_inicio||"")).localeCompare((b.fecha_inicio||"")+(b.hora_inicio||"")))
    .slice(0,5);
  listaProximas.innerHTML="";
  if(proximas.length===0){ listaProximas.innerHTML='<p class="empty">No tienes tareas próximas pendientes. ¡Vas al día!</p>'; return; }
  proximas.forEach(t=>listaProximas.appendChild(crearTareaCard(t)));
}

// True si una tarea "cubre" una fecha dada (entre su fecha de inicio y fin, inclusive).
function tareaEnFecha(t,fecha){
  const ini=t.fecha_inicio || t.fecha_tarea;
  const fin=t.fecha_fin || ini;
  return fecha>=ini && fecha<=fin;
}

// Dibuja la grilla del calendario del mes actualmente visible (fechaCalendario).
// Colorea cada día según sea: pasado (más oscuro/apagado), hoy (resaltado) o
// futuro (se queda con el estilo claro normal).
function renderCalendario(){
  calendario.innerHTML="";
  const y=fechaCalendario.getFullYear(), m=fechaCalendario.getMonth();
  mesActual.textContent=fechaCalendario.toLocaleDateString("es-PE",{month:"long",year:"numeric"});
  const primerDia=new Date(y,m,1), ultimoDia=new Date(y,m+1,0);
  const inicio=(primerDia.getDay()+6)%7; // lunes=0 ... domingo=6 (la semana empieza en lunes)
  const hoyStr=fechaLocal(new Date());
  for(let i=0;i<inicio;i++){const v=document.createElement("div");v.className="dia vacio";calendario.appendChild(v);}
  for(let d=1;d<=ultimoDia.getDate();d++){
    const fecha=fechaLocal(new Date(y,m,d));
    const cant=tareas.filter(t=>tareaEnFecha(t,fecha)).length;
    const div=document.createElement("div"); div.className="dia";
    if(fecha===hoyStr) div.classList.add("hoy");        // hoy: color destacado
    else if(fecha<hoyStr) div.classList.add("pasado");  // ya pasó: color más oscuro/apagado
    // los días futuros no reciben clase extra: se quedan con el estilo claro normal
    if(cant>0){div.classList.add("con-tareas"); div.dataset.count=cant;}
    div.innerHTML=`<span class="num">${d}</span>`;
    div.tabIndex=0; div.setAttribute("role","button"); div.setAttribute("aria-label",`Ver tareas del ${d}`);
    div.onclick=()=>abrirTareasDia(fecha);
    div.onkeydown=(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();abrirTareasDia(fecha);}};
    calendario.appendChild(div);
  }
}

// Crea la tarjeta visual de una tarea (usada en "Próximas", en el modal de un
// día y en el modal de una sección). Incluye botón de check (completar) y X (eliminar).
function crearTareaCard(t){
  const div=document.createElement("div"); div.className="item-card";
  const ini=t.fecha_inicio || t.fecha_tarea;
  const fin=t.fecha_fin || ini;
  // Fechas mostradas en formato corto y legible: día, mes y año (nunca el ISO crudo)
  const fechas = ini===fin ? formatoFechaCorta(ini) : `${formatoFechaCorta(ini)} → ${formatoFechaCorta(fin)}`;
  let horaTxt="";
  if(t.hora_inicio && t.hora_fin) horaTxt=` · ${t.hora_inicio} - ${t.hora_fin}`;
  else if(t.hora_inicio) horaTxt=` · ${t.hora_inicio}`;
  div.innerHTML=`<div class="${t.completada?'completada':''}"><h4>${escapar(t.nombre_tarea)}</h4><p>${iconos[t.seccion]||""} ${escapar(t.seccion||t.categoria)} · ${fechas}${horaTxt}</p></div><div class="item-actions"><button class="mini-btn" aria-label="Marcar como completada">✓</button><button class="mini-btn danger" aria-label="Eliminar tarea">✕</button></div>`;
  div.querySelector(".mini-btn").onclick=()=>cambiarEstadoTarea(t);
  div.querySelector(".danger").onclick=()=>eliminarTarea(t.id);
  return div;
}

// Abre el modal mostrando todas las tareas de un día del calendario.
function abrirTareasDia(fecha){
  modalTitulo.textContent=`Tareas de ${formatoFecha(fecha)}`; modalLista.innerHTML="";
  const lista=tareas.filter(t=>tareaEnFecha(t,fecha)).sort((a,b)=>(a.hora_inicio||"").localeCompare(b.hora_inicio||""));
  if(lista.length===0) modalLista.innerHTML='<p class="empty">No tienes tareas para esta fecha.</p>';
  lista.forEach(t=>modalLista.appendChild(crearTareaCard(t))); modal.classList.remove("oculto");
}
// Abre el modal mostrando todas las tareas de una sección (ordenadas por fecha).
function abrirSeccion(sec){
  modalTitulo.textContent=`${iconos[sec]||""} ${sec}`; modalLista.innerHTML="";
  const lista=tareas.filter(t=>t.seccion===sec).sort((a,b)=>((a.fecha_inicio||"")+(a.hora_inicio||"")).localeCompare((b.fecha_inicio||"")+(b.hora_inicio||"")));
  if(lista.length===0) modalLista.innerHTML='<p class="empty">Todavía no hay elementos en esta sección.</p>';
  lista.forEach(t=>modalLista.appendChild(crearTareaCard(t))); modal.classList.remove("oculto");
}

// ============================================================================
// Acciones sobre tareas: crear, completar/reabrir, eliminar
// ============================================================================

async function agregarTarea(){
  const seccion=seccionTarea.value;
  const cfg=configSecciones[seccion]||{modo:"rango",horas:"rango"};

  if(!nombreTarea.value.trim() || !fechaInicioTarea.value){alert("Completa el nombre y la fecha.");return;}
  if(cfg.modo==="rango" && !fechaFinTarea.value){alert("Completa la fecha fin.");return;}

  const fechaFinFinal = cfg.modo==="rango" ? fechaFinTarea.value : fechaInicioTarea.value;
  if(cfg.modo==="rango" && fechaFinFinal < fechaInicioTarea.value){alert("La fecha fin no puede ser menor que la fecha inicio.");return;}

  const horaInicioFinal = cfg.horas==="ninguna" ? null : (horaInicio.value||null);
  const horaFinFinal = cfg.horas==="rango" ? (horaFin.value||null) : null;
  if(cfg.horas==="rango" && horaInicioFinal && horaFinFinal && fechaInicioTarea.value===fechaFinFinal && horaFinFinal < horaInicioFinal){alert("La hora fin no puede ser menor que la hora inicio.");return;}

  await conBotonBloqueado(agregarTareaBtn,"Guardando...",async()=>{
    const {error}=await supabaseClient.from("tareas").insert({usuario_id:usuarioActivo.id,nombre_tarea:nombreTarea.value.trim(),categoria:categoriasBase[seccion]||"Personal",seccion,fecha_inicio:fechaInicioTarea.value,fecha_fin:fechaFinFinal,hora_inicio:horaInicioFinal,hora_fin:horaFinFinal});
    if(error){alert("No se pudo guardar la tarea. Intenta de nuevo en unos segundos.");console.error(error);return;}
    nombreTarea.value=""; horaInicio.value=""; horaFin.value="";
    refrescarTodosLosSelectores();
    await cargarTareas(); renderCalendario(); renderSecciones(); renderProximas();
  });
}
// Marca una tarea como completada (o la reabre si ya lo estaba).
async function cambiarEstadoTarea(t){
  const {error}=await supabaseClient.from("tareas").update({completada:!t.completada}).eq("id",t.id).eq("usuario_id",usuarioActivo.id);
  if(error){alert("No se pudo actualizar la tarea. Intenta de nuevo.");console.error(error);return;}
  await cargarTareas(); renderCalendario(); renderSecciones(); renderProximas(); modal.classList.add("oculto");
}
// Elimina una tarea (previa confirmación, porque no se puede deshacer).
async function eliminarTarea(id){
  if(!confirm("¿Seguro que quieres eliminar esta tarea? Esta acción no se puede deshacer.")) return;
  const {error}=await supabaseClient.from("tareas").delete().eq("id",id).eq("usuario_id",usuarioActivo.id);
  if(error){alert("No se pudo eliminar la tarea. Intenta de nuevo.");console.error(error);return;}
  await cargarTareas(); renderCalendario(); renderSecciones(); renderProximas(); modal.classList.add("oculto");
}

// ============================================================================
// Acciones sobre finanzas: ingreso mensual, gastos y dashboard
// ============================================================================

// Guarda (o actualiza) el ingreso mensual del mes seleccionado.
async function guardarIngreso(){
  const monto=Number(ingresoMensual.value||0);
  if(monto<0){alert("El ingreso no puede ser negativo.");return;}
  await conBotonBloqueado(guardarIngresoBtn,"Guardando...",async()=>{
    const mes=`${mesFinanza.value}-01`;
    const payload={usuario_id:usuarioActivo.id,mes,ingreso_mensual:monto};
    const {error}=finanzaMes
      ? await supabaseClient.from("finanzas_mensuales").update({ingreso_mensual:monto}).eq("id",finanzaMes.id)
      : await supabaseClient.from("finanzas_mensuales").insert(payload);
    if(error){alert("No se pudo guardar el ingreso mensual. Intenta de nuevo.");console.error(error);return;}
    await cargarFinanzas(); renderDashboard();
  });
}
// Devuelve la categoría final del gasto: la elegida en el select, o el texto
// escrito a mano si la categoría elegida fue "Otros".
function categoriaFinalGasto(){
  if(categoriaGasto.value!=="Otros") return categoriaGasto.value;
  return categoriaOtro.value.trim() || "Otros";
}
// Agrega un nuevo gasto al mes seleccionado, validando los campos obligatorios.
async function agregarGasto(){
  if(!nombreGasto.value.trim() || !montoGasto.value || !fechaLimiteGasto.value || !fechaPagoGasto.value){alert("Completa nombre, monto, fecha límite y fecha de pago.");return;}
  if(categoriaGasto.value==="Otros" && !categoriaOtro.value.trim()){alert("Escribe el nombre de la categoría en Otros.");return;}
  if(Number(montoGasto.value)<=0){alert("El monto del gasto debe ser mayor que cero.");return;}
  await conBotonBloqueado(agregarGastoBtn,"Guardando...",async()=>{
    const mes=`${mesFinanza.value}-01`;
    const {error}=await supabaseClient.from("gastos_financieros").insert({usuario_id:usuarioActivo.id,mes_finanza:mes,nombre_gasto:nombreGasto.value.trim(),categoria:categoriaFinalGasto(),categoria_personalizada:categoriaGasto.value==="Otros"?categoriaOtro.value.trim():null,monto:Number(montoGasto.value),fecha_limite:fechaLimiteGasto.value,fecha_pago:fechaPagoGasto.value});
    if(error){alert("No se pudo guardar el gasto. Intenta de nuevo.");console.error(error);return;}
    nombreGasto.value=""; montoGasto.value=""; categoriaOtro.value=""; campoCategoriaOtro.classList.add("oculto"); await cargarFinanzas(); renderDashboard();
  });
}
// Elimina un gasto (previa confirmación).
async function eliminarGasto(id){
  if(!confirm("¿Seguro que quieres eliminar este gasto? Esta acción no se puede deshacer.")) return;
  const {error}=await supabaseClient.from("gastos_financieros").delete().eq("id",id).eq("usuario_id",usuarioActivo.id);
  if(error){alert("No se pudo eliminar el gasto. Intenta de nuevo.");console.error(error);return;}
  await cargarFinanzas(); renderDashboard();
}

// Dibuja el dashboard de finanzas: montos (ingreso/gastado/restante/%), barra
// de progreso, barras por categoría y la lista de gastos del mes.
function renderDashboard(){
  const ingreso=Number(finanzaMes?.ingreso_mensual||0), gastado=gastos.reduce((s,g)=>s+Number(g.monto),0), restante=ingreso-gastado, pct=ingreso>0?Math.min(100,(gastado/ingreso)*100):0;
  const mesTxt=formatoMes(mesFinanza.value);
  tituloMesDashboard.textContent=`Resumen de ${mesTxt}`;
  tituloGastosMes.textContent=`Gastos de ${mesTxt}`;
  dashIngreso.textContent=formatoSoles(ingreso); dashGastado.textContent=formatoSoles(gastado); dashRestante.textContent=formatoSoles(restante); dashPorcentaje.textContent=`${pct.toFixed(0)}%`; barraGasto.style.width=`${pct}%`;
  listaGastos.innerHTML=""; if(gastos.length===0) listaGastos.innerHTML='<p class="empty">No hay gastos registrados para este mes.</p>';
  gastos.forEach(g=>{
    const div=document.createElement("div");div.className="item-card";
    // Fechas mostradas en formato corto día-mes-año, no el ISO crudo de la base de datos
    div.innerHTML=`<div><h4>${escapar(g.nombre_gasto)}</h4><p>${escapar(g.categoria)} · límite: ${formatoFechaCorta(g.fecha_limite)} · pagaré: ${formatoFechaCorta(g.fecha_pago)}</p></div><div><strong>${formatoSoles(g.monto)}</strong><button class="mini-btn danger" aria-label="Eliminar gasto">✕</button></div>`;
    div.querySelector("button").onclick=()=>eliminarGasto(g.id); listaGastos.appendChild(div);
  });
  const porCat={}; gastos.forEach(g=>porCat[g.categoria]=(porCat[g.categoria]||0)+Number(g.monto)); barrasCategorias.innerHTML="";
  Object.entries(porCat).forEach(([cat,total])=>{const p=gastado>0?(total/gastado)*100:0; const div=document.createElement("div"); div.className="barra-item"; div.innerHTML=`<p><span>${escapar(cat)}</span><span>${formatoSoles(total)}</span></p><div class="barra-bg"><div style="width:${p}%"></div></div>`; barrasCategorias.appendChild(div);});
}

// ============================================================================
// Conexión de eventos (clics, cambios, atajos de teclado) y arranque final
// ============================================================================

// Cambia entre el módulo de Tareas y el de Finanzas.
document.querySelectorAll(".module-btn").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".module-btn").forEach(b=>b.classList.remove("activo"));btn.classList.add("activo");$("moduloTareas").classList.toggle("oculto",btn.dataset.modulo!=="tareas");$("moduloFinanzas").classList.toggle("oculto",btn.dataset.modulo!=="finanzas");}));
agregarTareaBtn.onclick=agregarTarea;
seccionTarea.onchange=aplicarConfigSeccion;
mesAnterior.onclick=()=>{fechaCalendario.setMonth(fechaCalendario.getMonth()-1);renderCalendario();};
mesSiguiente.onclick=()=>{fechaCalendario.setMonth(fechaCalendario.getMonth()+1);renderCalendario();};
$("irHoyBtn").onclick=()=>{fechaCalendario=new Date();renderCalendario();};
cerrarModal.onclick=()=>modal.classList.add("oculto");
modal.onclick=(e)=>{if(e.target===modal)modal.classList.add("oculto")};
document.addEventListener("keydown",(e)=>{if(e.key==="Escape" && !modal.classList.contains("oculto"))modal.classList.add("oculto");});
guardarIngresoBtn.onclick=guardarIngreso;
agregarGastoBtn.onclick=agregarGasto;
// Botones de mes anterior/siguiente de finanzas: cambian el valor del selector
// de mes directamente y refrescan tanto los datos como el texto del botón.
$("finanzaMesAnteriorBtn").onclick=async()=>{mesFinanza.value=anteriorMesDe(mesFinanza.value); refrescarTodosLosSelectores(); await cargarFinanzas(); renderDashboard();};
$("finanzaMesSiguienteBtn").onclick=async()=>{mesFinanza.value=siguienteMesDe(mesFinanza.value); refrescarTodosLosSelectores(); await cargarFinanzas(); renderDashboard();};
categoriaGasto.onchange=()=>campoCategoriaOtro.classList.toggle("oculto",categoriaGasto.value!=="Otros");
cerrarSesionBtn.onclick=()=>conBotonBloqueado(cerrarSesionBtn,"Saliendo...",async()=>{await supabaseClient.auth.signOut();window.location.href="login.html";});

// Arranca todo el panel.
iniciarApp();
