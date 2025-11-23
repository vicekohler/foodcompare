// server/src/server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import "dotenv/config";
import path from "node:path";

import productsRouter from "./routes/products.routes.js";
import openfoodfactsRouter from "./routes/openfoodfacts.routes.js";
import pricesRouter from "./routes/prices.routes.js";
import storesRouter from "./routes/stores.routes.js";
import authRouter from "./routes/auth.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import aiRouter from "./routes/ai.routes.js"; // IA (Gemini)

const app = express();

/* ============================================
   FIX PARA EVITAR RESPUESTAS 304 / CACHE
   ============================================ */
app.disable("etag");
app.set("etag", false);

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

/* ============================================
   MIDDLEWARES
   ============================================ */
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

/* ============================================
   RUTAS
   ============================================ */
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/stores", storesRouter);
app.use("/api/products", productsRouter);
app.use("/api/openfoodfacts", openfoodfactsRouter);
app.use("/api/prices", pricesRouter);
app.use("/api/auth", authRouter);
app.use("/api/cart", cartRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRouter); // rutas de IA (sustitutos + nutrición)

/* ============================================
   404 POR DEFECTO
   ============================================ */
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

/* ============================================
   SERVIDOR
   ============================================ */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API up on :${PORT}`);
});
