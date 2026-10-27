# Guion de demo

**Antes de empezar:** `npm run build && npm run start` → abrir `/` → en
**Presenter controls**, apretar **Reset to Monday 08:00**.

**Cuatro minutos, dos pantallas.** Todo lo demás existe y solo se muestra si
preguntan — que aparezca *porque preguntaron* juega mejor que mostrarlo vos.
Acá: página 1 es qué hacés, página 2 es qué decís cuando te presionan.

---

### 0 · Encuadre (20s) — pantalla `/`

> "Un artefacto con dos superficies: donde el Resident reporta, y el back office
> donde se trabaja. Estructura el pedido, recomienda citando la política, y dice
> qué rompe cada cambio. Decide una persona, siempre."

### 1 · El enchufe con chispas (1 min) — Presenter → Replay → **AI-02**

En el inbox, señalá en este orden:

- **P0**, y al lado la regla **P0.3** con la cláusula de política desplegable.
  → *"La prioridad nunca aparece sola: trae la regla y la cláusula en la que se
  apoya. Quien la overridee ve qué está overrideando."*
- **Licence required** → *"Electricidad exige vendor con licencia. No hay
  override en ningún lado del producto. En los datos originales, esta emergencia
  estaba agendada a un vendor sin licencia eléctrica."*
- **Containment now** (breaker) separado de la reparación → *"Contener no es
  resolver. Son dos estados distintos."*
- *"Y el mensaje dice 'No smoke'. No lo leyó como humo."*

### 2 · La inyección (1 min) — Presenter → Replay → **AI-07**

Dejá que vean el bloque rojo tachado antes de hablar.

> "Los datos traían cinco instrucciones escritas para que las obedezca un lector
> automático. Tres apuntaban a los tres errores más caros de la cola. Esta se
> remueve **antes** de analizar nada, y te muestro qué saqué: una cuarentena que
> nadie puede ver no se distingue de no tener cuarentena. Por esto mismo no hay
> ningún modelo de lenguaje en el camino de decisión."

### 3 · El duplicado (45s) — Presenter → Replay → **AI-06**

Matchea **M-108** → botón **Log as an update to M-108** → confirmar.

> "Misma mancha de techo, segundo canal. Un caso, no dos. La cola heredada tenía
> exactamente este duplicado, porque nadie chequeaba al ingreso."

### 4 · El tablero (1 min) — `/ops/board`

- Panel de riesgo: **ReadySet en 3 casos con capacidad para 2**, dos move-ins en
  rojo. → *"Reporta qué se rompe y se detiene. Re-planificar las 72 horas es mi
  trabajo; que no me sorprendan es el de la herramienta."*
- Buscar **M-107** → **"Dispatch is blocked"**, 0 de 3 condiciones.
  → *"Acá estaba la falla estructural: nada verificaba si la visita era
  ejecutable antes de agendarla. El servidor también lo rechaza, no solo la
  pantalla."*

---

## El input sorpresa

**Presenter controls → New message** → elegir canal → pegar → **Triage it**.

Narralo con las mismas categorías, en orden: **prioridad + regla → trade y si
exige licencia → contención → acceso → qué falta → qué rompería commitearlo.**

Si el motor no determina algo, la pantalla dice qué falta. Eso **también es la
respuesta correcta**: *"no adivina, y no presenta una suposición como un hecho."*

## Si cambian capacidad en vivo

**Presenter → Change availability** → marcar lo que digan → **Apply**.

El tablero dice **"It newly breaks N things"** y marca cuáles.

> "La pregunta útil no es cómo quedó el tablero, sino qué rompe este cambio que
> no estuviera ya roto."

Después: **Clear**.

## Cinco respuestas

| Si preguntan | Respondés |
|---|---|
| ¿Por qué no un LLM, si se esperaba uso de IA? | La usé a fondo para construir: derivar las reglas, el clasificador, y encontrar seis bugs testeando con mensajes no vistos. En runtime es determinístico porque los datos atacaban lectores automáticos. |
| ¿El gate es real o cosmético? | Real. La pantalla deshabilita y el servidor rechaza con la misma función, así que no pueden divergir. Te lo muestro. |
| ¿Dónde falló la IA? | Seis veces, documentadas. La peor: adjuntó un portón a un caso de aire acondicionado con match "confirmado" — confundió identificar la casa con identificar el caso. |
| ¿Por qué hay métricas vacías? | Porque falta el evento y un número ahí sería inventado. El tile dice qué evento falta: ese es el backlog de instrumentación. |
| ¿Y si el operador no está de acuerdo? | Cambia prioridad u owner dejando motivo; quedan las dos versiones en el log. Sin override solo licencia, gasto y acceso: eso es política. |
