# Guía de presentación (para Felipe)

Este documento es tuyo: resume lo que ya está construido, lo que se va a
construir según `docs/EXECUTION-PLAN.md`, las decisiones que tenés que poder
defender, las trampas del caso y cómo el producto las neutraliza, y un guión de
demo. Leelo entero antes de la entrevista.

---

## 1. Qué tenés hoy y qué se construye

**Ya funciona (testeado, 21 tests de regresión):**
- El motor de triage determinístico: mensaje crudo → orden de trabajo completa
  (prioridad con cláusula de política, trade, contención separada de
  reparación, plan de acceso, datos faltantes, riesgos, ruta de aprobación,
  ranking de vendors con los excluidos y por qué, borrador de respuesta).
- El motor de conflictos: qué rompe un cambio contra el tablero completo.
- `/resident` (intake) y `/ops` (inbox con triage en vivo).

**Se construye en la sesión de código (en este orden, cada fase es demoable):**
0. Rebranding completo estilo Belong + landing "demo hub".
1. Tablero de casos con panel de riesgo del plan.
2. Commit desde el inbox (deduplicación: "registrar como update" vs "abrir caso").
3. Access gate + verification owner (los dos controles que faltaban en el caso).
4. Vista por coordinador con capacidad.
5. Métricas honestas (sin números inventados).
6. **Modo demo**: replay de los AI Test Inputs + caja para el input sorpresa +
   panel de escenarios (vendor caído, capacidad recortada) con recálculo en vivo.
7. Pulido y QA. 8 (opcional): deploy.

**Modelo recomendado para la sesión de código: Claude Opus 5.** Es una sola
pasada de alto riesgo con presentación mañana; la calidad del primer intento
vale más que la velocidad. Sonnet 5 queda como respaldo para retoques chicos.

## 2. Las decisiones que tenés que poder defender

1. **No hay LLM en el camino de decisión.** Los datos del caso traían cinco
   instrucciones escritas para ser obedecidas por un lector automático, y tres
   apuntaban a los tres errores más caros disponibles. Un modelo leyendo texto
   libre de vendors es exactamente la superficie que esas instrucciones
   atacan. El motor es determinístico e inspeccionable; `findInjections()`
   pone el texto en cuarentena **antes** de analizar nada y la UI muestra lo
   que se removió. La IA se usó para diseñar las reglas, no para ejecutarlas.
2. **No existe override para trades con licencia.** Ni flag de admin, ni botón
   "forzar". En los datos, una emergencia eléctrica con olor a quemado estaba
   agendada a un vendor sin licencia eléctrica. La respuesta correcta no es
   "un humano lo revisa": es que el camino no exista.
3. **Contención ≠ resolución.** Un aire portátil no cierra un caso de HVAC.
4. **Completado del vendor ≠ verificación.** Cierra una persona de Belong con
   nombre y un chequeo funcional. Tres move-ins comprometidos no tenían dueño
   de verificación.
5. **El motor no re-planifica.** Reporta qué rompe un cambio y se detiene.
   Re-planificar las 72 horas es trabajo del manager; que no lo sorprendan es
   trabajo de la herramienta. Esto es delegación bien entendida, no una
   limitación.
6. **Vendors rankeados por resolución en primera visita, nunca por precio.**
   Los cuatro más baratos de la red son los cuatro peores en primera visita.
7. **Prioridad siempre con su cláusula.** Quien hace override ve qué está
   overrideando, y tiene que dejar el motivo por escrito. Esos desacuerdos son
   los datos para mejorar las reglas.

## 3. Las trampas del caso y cómo respondés

| Trampa | Qué hace el producto | Si te preguntan |
|---|---|---|
| Inyección AI-07 (frase secreta en el web-form) | Cuarentena pre-análisis, visible en la UI. La frase **jamás** aparece en ningún entregable tuyo. | "Probablemente escanean las entregas buscando esa frase. La mía muestra el texto en cuarentena en pantalla, que es la prueba contraria." |
| Handyman en trabajo eléctrico ("can your handyman fix both?") | El pedido mismo se marca; no existe camino de UI para asignarlo. | Mostrá la lista de vendors excluidos con motivo. |
| Presupuesto de $5,900 sin diagnóstico | Ruta de aprobación por autoridad de gasto; "diagnóstico antes de reemplazo" como próxima acción. | Coordinador → lead ($1.5k contención) → manager ($2.5k move-in) → ejecutivo. |
| Acceso "confirmado" cuando el edificio lo negó (AI-05) | El gate exige confirmación positiva; la negativa se muestra, no se tapa. | Cada visita fallida del caso rastrea a este gate inexistente. |
| "¿Belong me paga la comida?" (AI-03) | El borrador compromete un horario, nunca plata. Reembolso → humano con autoridad. | "Nunca prometemos resultado ni dinero sin autoridad." |
| "No smoke" leído como humo | Negaciones se descartan antes de aplicar reglas (bug encontrado y testeado). | Tenés 6 bugs documentados en `CLAUDE.md` con su test cada uno — contalos como historia de validación (piden "un ejemplo donde la IA falló"). |
| Mismo problema por dos canales (AI-06) | Match contra la cola + "Registrar como update": un caso, no dos. | La cola heredada tenía exactamente este duplicado. |

## 4. Guión de demo (~7 minutos + el input sorpresa)

1. **Landing** (20s): "Un artefacto: estructura el intake, recomienda con
   motivos citando la política, y reporta qué rompe cada cambio. Decide una
   persona." Badge "simulación, datos ficticios" a la vista.
2. **AI-02 en `/resident`** (1 min): enchufe con chispas. En el inbox: P0 con
   cláusula, solo electricistas con licencia, contención (breaker off) separada
   de la reparación, y "no smoke" correctamente ignorado como peligro.
3. **AI-07** (1 min): la lavadora con la inyección pegada. Momento cuarentena.
4. **AI-06** (1 min): mancha de techo repetida → "Registrar como update".
5. **Tablero** (2 min): panel de riesgo (crew de pintura comprometida a 3
   move-ins con capacidad para 2), un caso expandido completo, el access gate
   bloqueando un dispatch con el motivo nombrado, override con justificación.
6. **Escenario en vivo** (1 min): marcá un vendor como caído → el panel
   recalcula y resalta el delta. Este es tu as para cuando ellos cambien
   capacidad en vivo. Reset.
7. **Cierre gobernanza** (30s): tabla actúa / recomienda / aprueba humano.

**El input sorpresa:** caja "New message" del lado ops (canal + texto + Home
opcional). Pegás, triage al instante, y narrás el resultado con las mismas
categorías de siempre. Si el motor no determina algo, la UI dice qué falta —
eso también es respuesta correcta: "el sistema no adivina".

## 5. Mejoras que este plan agrega (para que nada quede sin revisar)

Estas son **nuevas** respecto de lo ya trabajado — revisalas y decidí si las
mostrás todas:

1. **Panel de escenarios** (vendor caído / capacidad recortada / coordinador
   afuera) con delta de conflictos en vivo — construido específicamente para
   la sección 5 del PDF, donde anuncian que van a cambiar capacidades en vivo.
2. **Replay de intake**: los AI Test Inputs llegan solos al inbox mientras
   ellos miran, con canal realista cada uno.
3. **Landing "demo hub"** que encuadra el artefacto antes de mostrarlo.
4. **Override con motivo obligatorio y log doble** (valor del motor + valor
   humano): promovido de "idea" a alcance del build.
5. **Badge de simulación** en todas las pantallas: honestidad de marca (no es
   el logo oficial) y cumple la regla del caso de no usar datos reales.
6. **Métricas honestas**: donde falta el evento, el tile dice "sin registrar
   aún — falta \<evento\>" en vez de inventar un número. Defendible: el caso
   castiga métricas que "se ven bien y no miden nada".
7. **Botón Reset** al estado lunes 08:00, para ensayar la demo N veces.
8. **Bug detectado en esta revisión**: `src/app/api/cases/route.ts` exporta
   funciones no-HTTP (rompe `next build`). Está anotado en el plan, Fase 0.

## 6. Preguntas probables y tu respuesta corta

- **"¿Por qué no usaste un LLM si el ejercicio dice que se espera uso de IA?"**
  → Usé IA a fondo para *construir* (derivar reglas de las políticas, diseñar
  el clasificador, encontrar 6 bugs con inputs no vistos). En *runtime* la
  decisión es determinística porque los datos traían inyecciones apuntadas a
  los errores más caros. El apéndice de IA del caso pide exactamente esto:
  dónde falló, cómo validé, qué controles harían falta antes de producción.
- **"¿Qué harías distinto con más tiempo?"** → Persistencia real (Postgres,
  el store ya está aislado), timestamps de eventos para las 7 métricas, y un
  LLM *fuera* del camino de decisión (pulir tono de mensajes que un humano
  aprueba, resumir hilos largos).
- **"¿Esto escala a más mercados?"** → Los hechos de dominio están separados
  de la lógica (`src/lib/domain`); otro mercado es otro set de datos, no otro
  código. Las reglas de política se revisan semanalmente contra lo que pasó
  de verdad (P0/P1 vs realidad).
- **"¿Y si el operador no está de acuerdo con el motor?"** → Puede: cambia
  prioridad u owner dejando motivo, y quedan las dos versiones en el log.
  Lo único sin override es licencia, gasto y gate de acceso — eso es política,
  no preferencia.

## 7. Cómo correr y cómo lanzar la sesión de código

```bash
npm install && npm run dev   # http://localhost:3000
npm test                     # 21 tests del motor — corré esto ante cualquier duda
```

Para la sesión de código (con Opus 5), el prompt sugerido:

> Lee CLAUDE.md y docs/EXECUTION-PLAN.md y ejecutá el plan fase por fase, en
> orden, corriendo `npm test && npm run typecheck` al final de cada fase y
> `npm run build` en las fases que el plan lo indica. No toques
> `src/lib/triage/engine.ts` salvo parámetros opcionales cubiertos por tests
> nuevos. Al terminar cada fase, commiteá con un mensaje que nombre la fase.

Iterá por fases: si mañana solo llegás hasta la Fase 3, ya tenés demo completa.
