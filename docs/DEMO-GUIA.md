# Guía de presentación (para Felipe)

Este documento es tuyo. Resume qué quedó construido, las decisiones que tenés
que poder defender, las trampas del caso y cómo el producto las neutraliza, el
guión de demo, y las cosas nuevas que aparecieron durante el build y que
conviene que sepas antes de entrar.

Leelo entero. Especialmente §3 (trampas), §6 (hallazgos del build) y §7
(preguntas probables).

---

## 1. Qué está construido y funcionando

Todo lo planificado está terminado, testeado y pusheado. **48 tests** pasan,
más un smoke test que recorre el camino completo de demo en modo claro y
oscuro (58 verificaciones por modo).

| Pantalla | Qué hace |
|---|---|
| `/` | Encuadra el artefacto en una pantalla: qué hace, las tres fallas estructurales que cierra, y las dos puertas. |
| `/resident` | El intake del Resident, por canal (app, texto, email, teléfono). |
| `/ops` | Inbox: cada mensaje triado al llegar, con el texto original al lado. Botones de commit. |
| `/ops/board` | Los 19 casos + panel de riesgo del plan + access gate + override con motivo. |
| `/ops/me` | Vista por coordinador: carga vs capacidad, el día en orden, compromisos inamovibles. |
| `/ops/metrics` | 7 medidas + las 2 que deliberadamente no se miden. |
| `/about` | La tabla actúa / recomienda / aprueba humano. |
| **Presenter controls** | Barra arriba de cualquier pantalla `/ops`: mensaje nuevo, replay de los 7 inputs, cambio de disponibilidad en vivo, reset. |

Capturas de las 9 pantallas clave en `docs/screenshots/`.

## 2. Las decisiones que tenés que poder defender

1. **No hay LLM en el camino de decisión.** Los datos traían cinco
   instrucciones escritas para ser obedecidas por un lector automático, y tres
   apuntaban a los tres errores más caros disponibles. Un modelo leyendo texto
   libre de vendors es exactamente la superficie que esas instrucciones atacan.
   El motor es determinístico e inspeccionable; `findInjections()` pone el texto
   en cuarentena **antes** de analizar nada y la UI muestra qué se removió. La
   IA hizo el diseño (derivar reglas de las políticas, construir el
   clasificador, encontrar 6 bugs con inputs no vistos); no toma las decisiones.
2. **No existe override para trades con licencia, autoridad de gasto ni access
   gate.** Ni flag, ni admin, ni "forzar". En los datos, una emergencia
   eléctrica con olor a quemado estaba agendada a un vendor sin licencia
   eléctrica. La respuesta correcta no es "un humano lo revisa": es que el
   camino no exista.
3. **Contención ≠ resolución.** Un aire portátil no cierra un caso de HVAC.
4. **Completado del vendor ≠ verificación.** Cierra una persona de Belong con
   nombre y un chequeo funcional. Tres move-ins comprometidos no tenían dueño
   de verificación.
5. **El motor no re-planifica.** Reporta qué rompe un cambio y se detiene.
   Re-planificar las 72 horas es trabajo del manager; que no lo sorprendan es
   trabajo de la herramienta.
6. **Vendors rankeados por resolución en primera visita, nunca por precio.**
   Los cuatro más baratos promedian 84% y son de los peores de la red.
7. **Prioridad siempre con su cláusula.** Y el override exige motivo escrito:
   se guardan las dos versiones (la del motor y la humana) en el log.

## 3. Las trampas del caso y cómo respondés

| Trampa | Qué hace el producto | Qué decís |
|---|---|---|
| Inyección AI-07 (frase secreta en el web-form) | Cuarentena pre-análisis, visible en pantalla con el texto tachado. | "Probablemente escanean las entregas buscando esa frase. La mía la muestra en cuarentena, que es la prueba contraria." |
| Handyman en trabajo eléctrico | El pedido mismo se marca; no existe camino de UI para asignarlo. | Mostrá la lista de vendors excluidos **con el motivo**. |
| Presupuesto de $5,900 sin diagnóstico | Ruta de aprobación por autoridad de gasto; "diagnóstico antes de reemplazo". | Coordinador → lead ($1.5k contención) → manager ($2.5k move-in) → ejecutivo. |
| Acceso "confirmado" cuando el edificio lo negó (AI-05) | El gate exige confirmación **escrita del edificio**; la negativa se muestra. | "Cada visita fallida del caso rastrea a este gate inexistente." |
| "¿Belong me paga la comida?" (AI-03) | El borrador compromete un horario, nunca plata. | "Nunca prometemos resultado ni dinero sin autoridad." |
| "No smoke" leído como humo | Negaciones descartadas antes de aplicar reglas. | Es uno de los 6 bugs documentados — usalos como historia de validación. |
| Mismo problema por dos canales (AI-06) | Match + "Registrar como update": un caso, no dos. | La cola heredada tenía exactamente este duplicado (M-108 y M-109). |

## 4. Guión de demo (~7 minutos)

Todo se maneja desde **Presenter controls** (arriba de cualquier pantalla
`/ops`). Antes de empezar: apretá **Reset to Monday 08:00**.

1. **Landing** (20s). "Un artefacto: estructura el intake, recomienda citando
   la política, y reporta qué rompe cada cambio. Decide una persona."
2. **AI-02 desde `/resident`** (1 min). Pegá el texto del enchufe con chispas y
   enviá. En el inbox: **P0 con la regla P0.3**, solo electricistas con
   licencia, contención (breaker) separada de la reparación, y "No smoke"
   correctamente no leído como humo.
3. **AI-07** (1 min). Presenter → Replay → AI-07. **El momento cuarentena**:
   la instrucción aparece tachada, con "influenced no priority, licence check,
   vendor or draft below".
4. **AI-06** (1 min). Replay → AI-06. Matchea M-108 → "Log as an update to
   M-108" → confirmá. **Un caso, no dos.**
5. **Tablero** (2 min). Panel de riesgo: ReadySet comprometida a 3 casos con
   capacidad para 2, dos move-ins en rojo. Buscá **M-107**: "Dispatch is
   blocked", 0 de 3 condiciones, con el motivo nombrado. Mostrá que el servidor
   también lo rechaza, no solo la pantalla.
6. **Cambio en vivo** (1 min). Presenter → Change availability → sacá
   **BrightLine Electric**, cortá **ReadySet a 1/day**, sacá a **Jordan Lee** →
   Apply. El tablero dice **"It newly breaks 3 things"** y marca cuáles.
   **Este es tu as cuando ellos cambien capacidades.** Después: Clear.
7. **Cierre en `/about`** (30s): actúa / recomienda / aprueba humano.

**El input sorpresa:** Presenter → New message → elegí canal → pegá → "Triage
it". Aparece arriba del inbox, ya triado. Narralo con las mismas categorías:
prioridad + regla, trade, contención, acceso, qué falta, qué rompería.

Si el motor no determina algo, la UI dice qué falta. **Eso también es una
respuesta correcta:** "el sistema no adivina y no presenta una suposición como
un hecho".

## 5. Lo que este build agrega sobre lo planeado

1. **Panel de escenarios con delta** — no solo aplica el cambio: compara contra
   el mundo real y marca **solo lo que rompe de nuevo**. La pregunta útil en
   vivo nunca es "cómo está el tablero" sino "qué rompe esto que no estaba ya
   roto".
2. **Presenter controls** en un solo lugar: replay, mensaje nuevo, escenario y
   reset. No tenés que buscar tres pantallas mientras te miran.
3. **Override con motivo obligatorio** y doble registro (grado del motor +
   humano).
4. **El access gate se cumple en el servidor**, no solo deshabilitando el menú.
   Podés mostrarlo con `curl` si alguien pregunta si es cosmético.
5. **Métricas honestas**: donde falta el evento, el tile dice "not yet recorded
   — needs \<evento\>" y muestra el indicador adelantado que sí es medible,
   etiquetado como otra cosa.
6. **Badge de simulación** en todas las pantallas + wordmark dibujado (no el
   logo real de Belong). Honesto y cumple la regla de no usar material real.
7. **`npm run smoke`** — el camino de demo como test ejecutable, claro y
   oscuro. Corrélo antes de presentar.

## 6. Hallazgos del build (cosas que tenés que saber)

1. **La frase-señuelo estaba transcrita en el repo.** El código base traía el
   input AI-07 completo, con la frase real que la inyección quiere que aparezca
   en tu resumen ejecutivo, dentro de `engine.test.ts`. La reemplacé por un
   sustituto ficticio del mismo formato: la inyección se reproduce entera, el
   motor la detecta igual, y la demo es idéntica — pero el entregable no carga
   la frase que ellos buscan. **La frase real sigue en el commit inicial
   (`892fe47`)**, que vino del zip. Si querés limpiarla del historial hay que
   reescribir la rama; es tu decisión, avisame y lo hago.
2. **Bug de build arreglado.** `src/app/api/cases/route.ts` exportaba funciones
   no-HTTP, lo que rompía `next build`. Era la primera tarea de la Fase 0.
3. **Un hueco de cobertura real en los datos.** No hay vendor de reparaciones
   generales que cubra Doral: HandyHub cubre PC, KN, CG, CV y BR. Si abrís un
   caso nuevo ahí, el motor lo dice correctamente. No es un bug.
4. **El cierre NO está bloqueado por verificación, a propósito.** Cerrar un
   duplicado (M-109) es un cierre legítimo sin trabajo que verificar.
   Bloquearlo empujaría al operador a querer el bypass que este producto se
   niega a tener. Está documentado en `gates.ts` y hay un test.
5. **No pude verificar la marca real de Belong** — belonghome.com está
   bloqueado desde este entorno. La paleta es "Belong-inspired" (verde
   profundo, crema, terracota) y el wordmark está dibujado, no copiado.
6. **El costo es texto libre en los datos**, así que la métrica de gasto sobre
   el límite parsea la primera cifra y lo admite en pantalla. Eso mismo es un
   hallazgo operativo: el costo debería ser un campo estructurado.

## 7. Preguntas probables y tu respuesta corta

- **"¿Por qué no usaste un LLM si el ejercicio dice que se espera uso de IA?"**
  → Usé IA a fondo para *construir*: derivar reglas de las políticas, diseñar
  el clasificador, y encontrar 6 bugs corriendo el motor contra mensajes no
  vistos. En *runtime* la decisión es determinística porque los datos traían
  inyecciones apuntadas a los errores más caros. El apéndice de IA del caso
  pide exactamente esto: dónde falló, cómo validé, qué controles harían falta.
- **"¿El gate es real o cosmético?"** → Real. La pantalla deshabilita la opción
  y el servidor rechaza la transición con 409 usando la misma función, así que
  no pueden divergir. Te lo puedo mostrar con `curl`.
- **"¿Qué harías distinto con más tiempo?"** → Persistencia real (el store ya
  está aislado), los timestamps de evento que faltan para las 7 métricas, y un
  LLM *fuera* del camino de decisión (pulir tono de mensajes que un humano
  aprueba, resumir hilos largos).
- **"¿Esto escala a más mercados?"** → Los hechos de dominio están separados de
  la lógica (`src/lib/domain`); otro mercado es otro set de datos, no otro
  código.
- **"¿Y si el operador no está de acuerdo con el motor?"** → Puede cambiar
  prioridad u owner dejando motivo, y quedan las dos versiones en el log. Lo
  único sin override es licencia, gasto y access gate — eso es política, no
  preferencia.
- **"¿Por qué hay métricas vacías?"** → Porque el evento no se registra todavía
  y un número ahí sería inventado. El caso castiga explícitamente las métricas
  que se ven bien y no miden nada. El tile dice qué evento falta: eso es el
  backlog de instrumentación, escrito donde lo ve quien lo necesita.

## 8. Cómo correrlo

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 48 tests del motor y los gates
npm run build && npm run start   # producción local
npm run smoke        # el camino de demo completo, claro y oscuro
```

Antes de presentar: **`npm run build && npm run start`** (más rápido y estable
que `dev` en una demo), abrí `/`, y apretá **Reset to Monday 08:00**.

Si querés deploy: el store ya cae a memoria cuando el filesystem es de solo
lectura, así que anda en Vercel sin cambios. El estado se reinicia en cada cold
start, que para una demo está bien.
