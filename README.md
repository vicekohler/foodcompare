# 🛒 FoodCompare CL  
### Plataforma web para comparar precios, nutrición y sustitutos inteligentes  
**Proyecto del ramo Diseño de Software – UAI, 2025**  

## Integrantes

- Fernando Guaita
- Guillermo Hidalgo
- Vicente Kohler

---

## 📑 Índice
1. [Descripción general](#descripción-general)
2. [Objetivos del proyecto](#objetivos-del-proyecto)
3. [Características principales](#características-principales)
4. [Stack tecnológico](#stack-tecnológico)
5. [Arquitectura del sistema](#arquitectura-del-sistema)
6. [Base de datos (Supabase)](#base-de-datos-supabase)
7. [API Backend (Node + Express)](#api-backend)
8. [Frontend (React + Vite)](#frontend)
9. [Integración con IA (Gemini)](#integración-ia)
10. [Flujos completos del sistema](#flujos-del-sistema)
11. [Problemas conocidos](#problemas-conocidos)
12. [Deployment: Render + Vercel](#deployment)
13. [Variables de entorno](#variables-de-entorno)
14. [Pruebas sugeridas](#pruebas-sugeridas)
15. [Cómo ejecutar localmente](#cómo-ejecutar-localmente)

---

## 🧩 Descripción general

**FoodCompare CL** es una plataforma web que permite:

- Comparar precios entre **Lider, Tottus, Unimarc, Jumbo y Santa Isabel**.
- Ver nutrición completa de cada producto.
- Obtener sustitutos más saludables mediante **Gemini IA**.
- Revisar el ahorro total entre supermercados.
- Iniciar sesión con cuenta propia o Google.
- Usar la app en **3 idiomas**: Español, Inglés y Portugués.

---

## 🎯 Objetivos del proyecto

- Resolver un problema real: *¿Dónde conviene comprar mis productos?*
- Crear un sistema web completo con frontend, backend y base de datos.
- Integrar IA para recomendaciones nutricionales.
- Implementar APIs externas:
  - Supabase
  - OpenFoodFacts
  - Google OAuth
  - Gemini AI
- Cumplir todos los requerimientos del curso:
  - Multilenguaje  
  - CRUD  
  - Hosting  
  - Autenticación + SSO  
  - API IA con token  
  - API externa  
  - Responsive design  
  - Estructura profesional del repositorio  

---

## 💡 Características principales

### ✔️ Comparación de precios  
Comparación automática entre los principales supermercados chilenos.

### ✔️ Carrito inteligente  
- Agrega productos  
- Ve total por supermercado  
- Calcula ahorro  
- Destaca la combinación más económica  

### ✔️ Nutrición  
- Busca en Supabase  
- Si no existe, llama a **OpenFoodFacts** y guarda los datos  

### ✔️ IA con Gemini  
- Sustitutos saludables  
- Resumen nutricional  
- Chatbot para consultas de alimentación  
- Traducción automática al idioma del usuario  

### ✔️ Multilenguaje  
Toda la interfaz está en:
- 🇪🇸 Español  
- 🇺🇸 Inglés  
- 🇧🇷 Portugués  

### ✔️ Perfil de usuario  
- Registro  
- Login  
- **Google SSO**  
- Editar datos  
- Avatar  
- Sesión persistente  

---

## 🏗️ Stack tecnológico

### **Frontend**
- React 18  
- Vite  
- Zustand  
- TailwindCSS  
- i18n  
- Vercel  

### **Backend**
- Node.js + Express  
- Supabase Client  
- Gemini AI SDK  
- Multer  
- Render  

### **Base de datos**
- Supabase PostgreSQL  
- Storage para avatares  
- RLS / Policies  

---

## 🗂️ Arquitectura del sistema

┌──────────────────┐ ┌──────────────────────────┐
│ FRONTEND │ │ BACKEND │
│ React + Vite │<──────>│ Node + Express │
│ Vercel │ │ Render │
└──────────────────┘ └──────────────────────────┘
│ │
▼ ▼
i18n multilenguaje Supabase (DB + Auth)
OpenFoodFacts API
Gemini AI API


---

## 🗃️ Base de datos (Supabase)

### **Tablas principales**
- **products** — catálogo completo  
- **prices** — precios por supermercado  
- **stores** — supermercados chilenos  
- **nutrition** — nutrición manual u obtenida desde OFF  
- **users** — información del usuario  
- **carts** — carritos  
- **cart_items** — productos en carritos  
- **orders / order_items** — estructura para compras simuladas  
- **store_products** — relación producto/supermercado  

Estructura visual basada en tus imágenes exportadas de Supabase.

---

## 🧪 API Backend

### **Productos**

- GET /api/products
- GET /api/products?limit=200
- GET /api/products/search?q=
- GET /api/products/:id/nutrition
- GET /api/products/detail/:id


### **Precios**

- GET /api/prices/by-product/:id
- POST /api/prices/quote


### **IA (Gemini)**

- GET /api/ai/substitutes/:productId
- POST /api/ai/nutrition-advice
- POST /api/ai/chat


### **Auth**

- POST /api/auth/signup
- POST /api/auth/login
- GET /api/auth/me
- PUT /api/auth/me


### **Uploads**

- POST /api/upload/avatar


---

## 🎨 Frontend

### **Páginas**
- Home  
- Detalle de producto  
- Carrito  
- Ahorro  
- Login / Signup  
- Perfil  
- Chatbot  

### **Componentes clave**
- ProductCard  
- PriceComparison  
- NutritionSection  
- SubstitutesIA  
- Navbar con idioma  
- CartPanel  

---

## 🤖 Integración IA (Gemini)

Gemini se usa en tres funciones principales:

### **1. Sustitutos inteligentes**
Analiza el producto y su nutrición, luego recomienda alternativas más saludables.

### **2. Consejos nutricionales**
Genera un resumen en lenguaje natural, destacando:
- calorías  
- azúcares  
- grasas  
- advertencias  
- mejoras posibles  

### **3. Chatbot inteligente**
Permite consultas como:
- “¿Es sano este producto?”  
- “¿Qué puedo comer si soy intolerante a la lactosa?”  
- “Recomiéndame snacks saludables.”  

Funciona en **es/en/pt** automáticamente.

---

## 🛑 Problemas conocidos

### ✔️ 1. OpenFoodFacts no siempre tiene nutrición  
Algunos productos no tienen datos → la API devuelve vacío.

### ✔️ 2. Los nombres de productos no están traducidos  
La UI está traducida, pero los valores vienen desde Supabase en español.


---

## 🚀 Deployment

### **Backend en Render**
- Root: `/server`
- Build: `npm install`
- Start: `node src/server.js`
- CORS configurado con:

- FRONTEND_ORIGIN = https://foodcompare-cl.vercel.app


### **Frontend en Vercel**
- Root: `/client`
- Build: `npm run build`
- Output: `/dist`
- Variables:

- VITE_API_URL = https://foodcompare-api.onrender.com


---

## 🔐 Variables de entorno

### **client/.env.example**

- VITE_API_URL = http://localhost:4000
- VITE_SUPABASE_URL = TU_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY = TU_SUPABASE_ANON_KEY
- VITE_APP_NAME = FoodCompare


### **server/.env.example**

- PORT = 4000
- FRONTEND_ORIGIN = http://localhost:5173
- SUPABASE_URL = TU_SUPABASE_URL
- SUPABASE_SERVICE_KEY = TU_SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET = CAMBIA_ESTO
- GEMINI_API_KEY = TU_GEMINI_API_KEY
- NODE_ENV = development


---

## 🧪 Pruebas sugeridas

1. Registro  
2. Login  
3. Login con Google  
4. Editar perfil  
5. Subir avatar  
6. Buscar productos  
7. Ver detalle  
8. Ver nutrición  
9. Importar datos desde OFF  
10. Precios por supermercado  
11. Agregar al carrito  
12. Ver ahorro  
13. Usar sustitutos IA  
14. Chatbot  
15. Cambiar de idioma  

---

## 🖥️ Cómo ejecutar localmente

### **Backend**
```bash
cd server
npm install
npm run dev

Frontend

cd client
npm install
npm run dev
