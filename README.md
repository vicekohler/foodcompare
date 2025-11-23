# 🛒 FoodCompare CL  
### Plataforma web para comparar precios, nutrición y sustitutos inteligentes  
**Proyecto – Diseño de Software – Universidad Adolfo Ibáñez, 2025**

## 👥 Integrantes  
- **Fernando Guaita**  
- **Guillermo Hidalgo**  
- **Vicente Köhler**

## 📑 Índice  
1. Descripción general  
2. Objetivos del proyecto  
3. Características principales  
4. Stack tecnológico  
5. Arquitectura del sistema  
6. Base de datos (Supabase)  
7. API Backend (Node + Express)  
8. Frontend (React + Vite)  
9. Integración con IA (Gemini)  
10. Flujos del sistema  
11. Problemas conocidos  
12. Deployment  
13. Variables de entorno  
14. Pruebas sugeridas  
15. Ejecución local  

## 🧩 Descripción general

**FoodCompare CL** es una plataforma web que permite comparar precios de alimentos entre supermercados chilenos, revisar su información nutricional y obtener recomendaciones saludables mediante **Gemini IA**.  
Incluye autenticación completa, login con Google, carrito inteligente, i18n y consultas a múltiples APIs.

La plataforma funciona en:

🌐 **Frontend:** https://foodcompare.vercel.app

🛠️ **Backend API:** https://foodcompare-api.onrender.com 

---

## 🎯 Objetivos del proyecto
- Resolver el problema real de comparación de precios en supermercados.  
- Aplicar arquitectura full‑stack moderna.  
- Integrar autenticación Google OAuth + JWT.  
- Implementar IA con Gemini.  
- Desplegar frontend en Vercel y backend en Render.  

---

## 💡 Características principales
- Comparación de precios entre supermercados.  
- Carrito inteligente.  
- Información nutricional + fetch desde OpenFoodFacts.  
- Recomendaciones saludables con IA.  
- Autenticación local y con Google.  
- Perfil de usuario y avatares.  
- Multilenguaje (ES/EN/PT).  

---

## 🏗️ Stack tecnológico

### **Frontend**
- React + Vite  
- Zustand  
- TailwindCSS  
- React Router  
- Supabase JS Client  

### **Backend**
- Node.js  
- Express  
- JWT  
- Supabase  
- Morgan  
- CORS  
- Gemini AI SDK  

### **Base de Datos**
- **Supabase (PostgreSQL + Storage)**  

---

## 🗂️ Arquitectura del sistema

```
                       ARQUITECTURA GENERAL

                   ┌────────────────────────────┐
                   │          FRONTEND          │
                   │   React + Vite (Vercel)    │
                   │   i18n multilenguaje       │
                   └───────────────┬────────────┘
                                   │  HTTPS /api/*
                                   ▼
                   ┌────────────────────────────┐
                   │           BACKEND          │
                   │   Node.js + Express        │
                   │   Web Service (Render)     │
                   └───────────────┬────────────┘
                                   │
                     ┌─────────────┴─────────────────────┐
                     │                                   │
                     ▼                                   ▼
        ┌────────────────────────────┐      ┌────────────────────────────┐
        │   Supabase (DB + Auth)     │      │     OpenFoodFacts API      │
        │   · PostgreSQL             │      │  Datos de productos y      │
        │   · Auth email + Google    │      │  nutrición externos        │
        └───────────────┬────────────┘      └────────────────────────────┘
                        │
                        ▼
        ┌────────────────────────────┐
        │       Gemini IA API        │
        │  Sugerencias y consejos    │
        │  nutricionales (IA)        │
        └────────────────────────────┘




---

## 🧪 API Backend

### Rutas principales:
```
/api/products
/api/prices
/api/auth
/api/upload
/api/ai
```

Incluye:
- CRUD de productos.  
- Comparación de precios.  
- Autenticación local y OAuth.  
- Sistema de carrito inteligente.  
- Integración con IA.  

---

## 🎨 Frontend

### Páginas:
- Login  
- Signup  
- AuthCallback  
- Home  
- Detalle de producto  
- Carrito  
- Perfil  
- Chat IA  
- Sugerencias saludables  

### Funcionalidades destacadas
- Manejo global de estado con Zustand  
- Vistas responsivas con Tailwind  
- Chat nutricional integrado  

---

## 🤖 IA con Gemini

La aplicación utiliza **Google Gemini 1.5 Flash** para:
- Sugerir sustitutos más saludables.  
- Entregar análisis nutricional detallado.  
- Asistir a usuarios mediante chat contextual.  

---

## 🔁 Flujos del sistema

### Flujo principal:
1. Usuario ingresa → login local o Google OAuth.  
2. Explora productos y precios.  
3. Visualiza nutrición y sugerencias IA.  
4. Agrega productos al carrito.  
5. Obtiene cotización inteligente.  

---

## 🛑 Problemas conocidos
- OpenFoodFacts puede entregar información incompleta.  
- Render puede demorar el cold start del backend.  
- Dependencia de APIs externas para nutrición.  

---

## 🚀 Deployment

### **Frontend – Vercel**
🔗 https://foodcompare-cl.vercel.app  

### **Backend – Render**
🔗 https://foodcompare-api.onrender.com  

---

## 🔐 Variables de entorno

### 📌 client/.env
```
- VITE_API_URL=https://foodcompare-api.onrender.com
- VITE_SUPABASE_URL=TU_URL
- VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

### 📌 server/.env
```
- PORT=4000
- FRONTEND_ORIGIN=https://foodcompare-cl.vercel.app
- SUPABASE_URL=TU_URL
- SUPABASE_SERVICE_KEY=TU_SERVICE_KEY
- JWT_SECRET=CLAVE_SECRETA
- GEMINI_API_KEY=TU_GEMINI_KEY
- NODE_ENV=production
```

---

## 🧪 Pruebas sugeridas
- Signup y login local.  
- Login con Google OAuth.  
- Búsqueda de productos.  
- Comparación de precios.  
- Fetch nutricional desde OFF.  
- Recomendaciones IA.  
- Carrito inteligente.  
- Cambio de idioma.  
- Subida de avatar.  

---

## 🖥️ Ejecución local

### Backend
```
cd server
npm install
npm run dev
```

### Frontend
```
cd client
npm install
npm run dev
```

---

## ✔️ Proyecto completo y funcional  
La plataforma fue desarrollada para entregar una experiencia real, moderna y escalable, integrando múltiples tecnologías y flujo de datos consistente entre frontend, backend, Supabase y Gemini.

