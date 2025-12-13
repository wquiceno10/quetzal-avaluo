# Sistema Multiagente - Quetzal Avalúo

## ¿Qué es esto?

Este es un sistema de **perfiles de contexto especializados** para desarrollo con AI. Cada "agente" es en realidad un conjunto de reglas, permisos y contratos que guían al agente AI (como yo) cuando trabaja en áreas específicas del proyecto.

---

## Cómo Funciona

### 1. **Arquitectura del Sistema**

```
Usuario Request
      ↓
   Planner ← Lee todos los perfiles
      ↓
   Crea Plan (implementation_plan.md)
      ↓
   Asigna Tareas a Agentes Específicos
      ↓
   Ejecución Secuencial con Validación
      ↓
   Verificación de Contratos JSON
```

### 2. **No son Agentes Separados (Importante)**

**Aclaración crítica**: No estás creando múltiples instancias de AI trabajando en paralelo. En vez de eso:

- **Un solo agente AI** (yo u otro) lee el perfil correspondiente
- Cuando trabajas en tablas, yo cargo `agente_tablas.json` y solo toco esos archivos
- Cuando trabajas en backend, cargo `agente_workers.json` y respeto esos contratos
- El **Planner** coordina qué perfil usar y cuándo

### 3. **Flujo de Trabajo Real**

#### Ejemplo: "Añade una columna nueva a la tabla de comparables"

1. **Tú dices**: "Añade columna 'Año Construcción' a comparables"
2. **Planner activa**:
   - Lee `agente_workers.json` → Ve que hay un contrato `comparable_item`
   - Lee `agente_tablas.json` → Ve que puede modificar `ComparablesTable.jsx`
   - Lee `agente_paginas.json` → Ve que `Step3Results.jsx` usa estas tablas
3. **Planner crea plan**:
   ```
   Tarea 1: agente_Workers
   - Añadir campo "ano_construccion" al schema comparable_item
   - Actualizar worker de análisis para extraer este dato
   - Dependencia: Ninguna
   
   Tarea 2: agente_Tablas (espera Tarea 1)
   - Añadir columna en ComparablesTable.jsx
   - Actualizar formatters si es necesario
   - Dependencia: Tarea 1 completada
   
   Tarea 3: agente_PDF_correo (espera Tarea 2)
   - Añadir campo en tabla de PDF
   - Actualizar template de email si es relevante
   - Dependencia: Tarea 2 completada
   ```
4. **Ejecución**:
   - Agente carga `agente_workers.json` → Modifica worker
   - Agente carga `agente_tablas.json` → Modifica tabla
   - Agente carga `agente_pdf_correo.json` → Actualiza PDF
5. **Validación**:
   - Verifica que el contrato `comparable_item` se actualizó en todos lados
   - Confirma que ningún agente tocó archivos prohibidos
   - Valida que las pruebas pasan

---

## Gestión de Dependencias

### Sistema de Dependencias

```json
{
  "task_id": "T-001",
  "assigned_agent": "agente_Workers",
  "dependencies": [],
  "description": "Añadir campo ano_construccion a comparable_item"
}

{
  "task_id": "T-002",
  "assigned_agent": "agente_Tablas",
  "dependencies": ["T-001"],
  "description": "Mostrar año de construcción en tabla"
}

{
  "task_id": "T-003",
  "assigned_agent": "agente_PDF_correo",
  "dependencies": ["T-002"],
  "description": "Incluir año de construcción en PDF"
}
```

### Tipos de Dependencias

1. **Secuencial**: Una tarea debe completarse antes que otra
   - Backend cambia schema → Frontend consume schema
   
2. **Paralela**: Tareas independientes pueden ejecutarse simultáneamente
   - agente_Tablas actualiza tabla + agente_Paginas actualiza formulario

3. **Condicional**: Tarea se ejecuta solo si otra cumple condición
   - Si Backend cambia contrato → Frontend DEBE actualizarse

---

## Implementación Práctica

### Opción 1: Uso Manual (Recomendado al inicio)

Cuando me pidas algo, tú especificas qué agente usar:

```
Tú: "Como agente_Workers, añade validación de área máxima"
Yo: *Cargo agente_workers.json, respeto sus reglas*
```

### Opción 2: Detección Automática

Yo detecto automáticamente qué perfil usar basado en tu request:

```
Tú: "La tabla de comparables no se ve bien en móvil"
Yo: *Detecto que es agente_Tablas, cargo ese perfil*
```

### Opción 3: Orquestación Completa (Avanzado)

Para cambios grandes, usas el Planner:

```
Tú: "Como Planner, ayúdame a implementar filtros en la tabla de comparables"
Yo: 
1. Analizo qué agentes se necesitan
2. Creo implementation_plan.md con tareas
3. Te pido aprobación
4. Ejecuto secuencialmente cada tarea con su perfil
5. Valido contratos entre tareas
```

---

## Validación de Contratos JSON

### ¿Qué son los Contratos?

Los **contratos JSON** son esquemas de datos que TODOS los agentes deben respetar. Si Backend define `comparable_item`, Frontend **DEBE** consumirlo exactamente así.

### Ejemplo de Contrato

**Backend define** (en `agente_workers.json`):
```json
"comparable_item": {
  "titulo": "string",
  "precio_publicado": "number",
  "area_m2": "number"
}
```

**Frontend consume** (en `agente_tablas.json`):
```json
"comparable_item": {
  "must_match": "agente_workers.json -> comparable_item"
}
```

### Validación Automática

Cuando un agente termina su tarea, el Planner:
1. Lee todos los contratos afectados
2. Verifica que las estructuras coinciden
3. Si hay discrepancia → ERROR, rollback y notificación

---

## Archivos Clave del Sistema

```
.agent/
├── profiles/
│   ├── planner.json                  ← Orquestador
│   ├── agente_workers.json           ← Backend APIs
│   ├── agente_prompts.json           ← Prompts AI
│   ├── agente_tablas.json            ← Componentes tabla
│   ├── agente_paginas.json           ← Páginas principales
│   └── agente_pdf_correo.json        ← PDF y emails
└── orchestrator.md                   ← Este archivo (guía)
```

---

## Ejemplos de Uso

### Ejemplo 1: Cambio Solo en Frontend

```
Request: "Cambia el color de header de las tablas a azul"

Agente: agente_Tablas
Archivos: src/styles/tables.css
Validación: Verificar design system tokens
Dependencias: Ninguna
```

### Ejemplo 2: Cambio que Cruza Backend y Frontend

```
Request: "Añade campo 'estado_juridico' a la ficha técnica"

Plan:
1. agente_Workers (T-001)
   - Añadir estado_juridico a ficha_tecnica schema
   - Actualizar worker de análisis
   
2. agente_Paginas (T-002, depende T-001)
   - Añadir estado_juridico en Step1Form
   - Actualizar validaciones
   
3. agente_PDF_correo (T-003, depende T-001)
   - Añadir campo en tabla de ficha técnica del PDF
   - Actualizar email si es relevante

Validación:
- Verificar que ficha_tecnica.estado_juridico existe en:
  ✓ Backend response
  ✓ Formulario frontend
  ✓ PDF generado
  ✓ Email (si aplica)
```

### Ejemplo 3: Solo Prompts

```
Request: "Mejora la explicación del método residual para lotes"

Agente: agente_Prompts
Archivos: workers/avaluos-api-analysis/src/prompts/*.js
Validación: Probar con datos de Lote
Dependencias: Ninguna (no cambia estructura de datos)
```

---

## Reglas de Oro

### ✅ Hacer

1. **Siempre especificar** qué agente debe trabajar (o dejar que Planner decida)
2. **Validar contratos** después de cada cambio
3. **Documentar** qué perfil se usó y por qué
4. **Probar** según los requisitos de cada perfil
5. **Coordinar** cambios que afecten múltiples agentes

### ❌ No Hacer

1. **NO mezclar** responsabilidades (Ej: agente_Tablas tocando workers)
2. **NO romper** contratos JSON sin coordinación
3. **NO saltarse** validaciones de dependencias
4. **NO modificar** archivos `forbidden_actions` de cada perfil
5. **NO ignorar** reglas de validación específicas

---

## Ventajas de Este Sistema

### 🎯 **Enfoque**
Cada perfil tiene un scope claro. No hay confusión sobre qué archivos tocar.

### 🔒 **Seguridad**
Los contratos JSON previenen cambios que rompan la integración.

### 📋 **Trazabilidad**
Cada cambio está asociado a un perfil específico, fácil de auditar.

### ⚡ **Eficiencia**
El agente no necesita "entender todo el proyecto", solo el contexto relevante.

### 🧪 **Testabilidad**
Cada perfil tiene requisitos de testing específicos.

---

## Próximos Pasos

### Para empezar a usar:

1. **Familiarízate** con cada perfil (lee los 6 JSONs)
2. **Identifica** qué perfil necesitas para tu próxima tarea
3. **Especifica** el perfil cuando me hagas un request:
   - "Como agente_Tablas, ..."
   - "Como agente_Workers, ..."
4. **Deja que Planner coordine** para cambios grandes

### Comandos útiles:

```
"Como Planner, analiza este request: [tu idea]"
→ Crea plan con tareas y dependencias

"Como [Agente], implementa: [tarea específica]"
→ Ejecuta con ese perfil

"Valida contratos JSON"
→ Verifica que todos los schemas coinciden
```

---

## Preguntas Frecuentes

### ¿Esto crea múltiples AIs trabajando en paralelo?
**No**. Es un solo AI (yo) que cambia de "sombrero" según el perfil activo.

### ¿Cómo se implementan las dependencias?
A través del Planner, que crea un grafo de tareas y las ejecuta en orden.

### ¿Qué pasa si rompo un contrato JSON?
El Planner detecta la inconsistencia y notifica antes de continuar.

### ¿Puedo crear nuevos agentes?
Sí, solo crea un nuevo JSON siguiendo la estructura de los existentes.

### ¿Es esto como microservicios?
Conceptualmente similar: responsabilidad única, contratos claros, independencia.

---

## Soporte

Si tienes dudas sobre:
- **Qué agente usar** → Pregunta al Planner
- **Cómo modificar un perfil** → Revisa los JSONs existentes
- **Dependencias complejas** → Usa el Planner para crear un plan

**¡Listo para usar el sistema multiagente!** 🚀
