// server/src/server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import "dotenv/config";

import productsRouter from "./routes/products.routes.js";
import openfoodfactsRouter from "./routes/openfoodfacts.routes.js";
import pricesRouter from "./routes/prices.routes.js";
import storesRouter from "./routes/stores.routes.js";
import authRouter from "./routes/auth.routes.js";
import cartRoutes from "./routes/cart.routes.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/stores", storesRouter);
app.use("/api/products", productsRouter);
app.use("/api/openfoodfacts", openfoodfactsRouter);
app.use("/api/prices", pricesRouter);
app.use("/api/auth", authRouter);
app.use("/api/cart", cartRoutes);

// 404 básico
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API up on :${PORT}`));
