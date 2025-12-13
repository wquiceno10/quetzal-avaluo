# 🎯 Guía Visual Rápida - Sistema Multiagente

## 🚀 ¿Cómo empezar?

### Paso 1: Identifica tu necesidad

| Si necesitas... | Usa este agente |
|----------------|-----------------|
| 🧮 Cambiar cálculos o lógica | **agente_Workers** |
| 💬 Mejorar textos de AI | **agente_Prompts** |
| 📊 Modificar tablas | **agente_Tablas** |
| 📝 Cambiar formularios/páginas | **agente_Paginas** |
| 🖨️ Ajustar PDFs o emails | **agente_PDF_correo** |
| 🤔 No estoy seguro | **Planner** |

### Paso 2: Usa el comando correcto

```
"Como [Agente], [describe tu tarea]"
```

Ejemplos:
- `Como agente_Tablas, cambia el color del header a #2C5F2D`
- `Como agente_Prompts, simplifica la explicación del método residual`
- `Como Planner, ayúdame a implementar filtros en la tabla`

---

## 📊 Matriz de Responsabilidades

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUETZAL AVALÚO - SISTEMA                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  🧠 PLANNER      │     │ ⚙️ BACKEND       │     │ 💬 BACKEND   │
│                  │     │    WORKERS       │     │    PROMPTS   │
├──────────────────┤     ├──────────────────┤     ├──────────────┤
│ • Coordina todo  │────▶│ • Cloudflare     │────▶│ • DeepSeek   │
│ • Crea planes    │     │   Workers        │     │ • Perplexity │
│ • Valida         │     │ • Cálculos       │     │ • Optimiza   │
│   contratos      │     │ • APIs           │     │   prompts    │
└──────────────────┘     └──────────────────┘     └──────────────┘
                                  │
                                  │ avaluo_response
                                  ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│ 📊 FRONTEND      │     │ 📄 FRONTEND      │     │ 🖨️ FRONTEND  │
│    TABLES        │     │    PAGES         │     │    PDF/EMAIL │
├──────────────────┤     ├──────────────────┤     ├──────────────┤
│ • Comparables    │────▶│ • Wizard         │────▶│ • PDF gen    │
│   Table          │     │ • Formulario     │     │ • Email      │
│ • Diseño         │     │ • Results        │     │   templates  │
│ • Responsive     │     │ • Historial      │     │ • Design     │
└──────────────────┘     └──────────────────┘     └──────────────┘
```

---

## 🔄 Flujo de Datos (Contratos JSON)

```
form_data ─────────────────────────┐
  (agente_Paginas)                 │
                                   ▼
                        ┌─────────────────────┐
                        │  agente_Workers     │
                        │  procesa request    │
                        └─────────────────────┘
                                   │
                                   ▼
                        avaluo_response ────┬──────┬────────┐
                                            │      │        │
                             ┌──────────────┘      │        │
                             ▼                     ▼        ▼
                    agente_Paginas      agente_Tablas   agente_PDF_correo
                    (muestra results)   (renderiza tabla) (genera PDF)
                                            │
                                            │ comparable_item
                                            ▼
                                    (usado por todos)
```

---

## ✅ Checklist Pre-Cambio

Antes de hacer un cambio, pregúntate:

- [ ] ¿Qué agente debería hacer esto?
- [ ] ¿Este cambio afecta un contrato JSON?
- [ ] ¿Necesito coordinar con otros agentes?
- [ ] ¿Es simple o necesito un plan del Planner?

---

## 🎨 Ejemplos Visuales

### Ejemplo A: Cambio Aislado ✨
```
Usuario: "Cambia color de tabla"
   ↓
agente_Tablas (SOLO)
   ↓
Modifica: tables.css
   ↓
✅ Listo (5 min)
```

### Ejemplo B: Cambio con Dependencias 🔧
```
Usuario: "Añade campo 'piso'"
   ↓
Planner analiza
   ↓
Plan:
├─ agente_Workers: añade "piso" a ficha_tecnica
├─ agente_Paginas: añade campo en formulario
└─ agente_PDF_correo: añade a PDF
   ↓
Ejecuta secuencialmente
   ↓
Valida contratos
   ↓
✅ Listo (45 min)
```

### Ejemplo C: Feature Completo 🚀
```
Usuario: "Implementa filtros avanzados"
   ↓
Planner crea plan completo
   ↓
implementation_plan.md (4 tareas)
   ↓
Usuario aprueba
   ↓
Ejecución orquestada:
├─ T1: agente_Workers (backend)
├─ T2: agente_Paginas (UI filtros) [espera T1]
├─ T3: agente_Tablas (badges) [espera T2]
└─ T4: agente_PDF_correo (PDF) [espera T1]
   ↓
Validación final
   ↓
✅ Listo (2-3 horas)
```

---

## 🔒 Contratos Críticos - Referencia Rápida

### 1️⃣ `avaluo_response`
**Dueño**: agente_Workers  
**Consumers**: agente_Paginas, agente_PDF_correo  
**Crítico**: ⚠️ Cualquier cambio requiere coordinación

### 2️⃣ `comparable_item`
**Dueño**: agente_Workers  
**Consumers**: agente_Tablas, agente_PDF_correo  
**Crítico**: ⚠️ Cambios afectan tablas y PDFs

### 3️⃣ `form_data`
**Dueño**: agente_Paginas  
**Consumer**: agente_Workers  
**Crítico**: ⚠️ Cambios requieren validar backend

---

## 🚨 Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `undefined` en frontend | Backend añadió campo, frontend no lo lee | Sincronizar contrato |
| PDF sin datos | agente_PDF_correo no mapeó campo | Actualizar PDFDocument.jsx |
| Backend error 400 | Frontend no envía campo requerido | Actualizar Step1Form.jsx |
| Tabla rota | Backend cambió comparable_item | Actualizar ComparablesTable.jsx |

---

## 📁 Archivos del Sistema

```
.agent/
├── 📘 README.md                    ← Empieza aquí
├── 📖 orchestrator.md              ← Guía completa
├── 💡 examples.json                ← Casos prácticos
├── ✅ contract-validator.json      ← Validación
├── 🗺️ quick-guide.md               ← Esta guía
└── profiles/
    ├── planner.json
    ├── agente_workers.json
    ├── agente_prompts.json
    ├── agente_tablas.json
    ├── agente_paginas.json
    └── agente_pdf_correo.json
```

---

## 🎯 Comandos Más Usados

```bash
# Planificar feature
Como Planner, ayúdame a implementar [feature]

# Cambio directo
Como [Agente], [tarea específica]

# Diagnosticar problema
Como Planner, diagnostica: [describe problema]

# Validar consistencia
Valida contratos JSON

# Ver permisos de agente
Revisa qué archivos puede modificar [Agente]
```

---

## 💡 Tips Pro

### ✨ Tip 1: Divide y Vencerás
Si un cambio parece complejo, pide al Planner que lo divida en tareas pequeñas.

### ✨ Tip 2: Valida Siempre
Después de cambios multi-agente, valida contratos JSON antes de deploy.

### ✨ Tip 3: Documenta
Anota qué agente usaste y por qué en tus commits.

### ✨ Tip 4: Empieza Simple
Si no estás seguro, empieza pidiendo un plan al Planner.

---

## 🎓 Recursos de Aprendizaje

1. **Novato**: Lee `README.md`
2. **Intermedio**: Revisa `examples.json`
3. **Avanzado**: Estudia `orchestrator.md`
4. **Experto**: Crea tu propio agente

---

## ✅ Próximo Paso

**Prueba ahora mismo:**

```
Como Planner, muéstrame qué agente usarías para:
"Cambiar el logo en el header del PDF"
```

---

**¡Sistema Multiagente Listo!** 🎉

Ahora tienes un sistema organizado, escalable y mantenible para trabajar en Quetzal Avalúo.
