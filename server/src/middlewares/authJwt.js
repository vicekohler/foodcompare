// server/src/middlewares/authJwt.js
import jwt from "jsonwebtoken";

// 🔹 USAR EL MISMO SECRET QUE EN auth.routes.js
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-foodcompare";

export function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  try {
    // 🔹 Mismo secreto que al firmar el token
    const decoded = jwt.verify(token, JWT_SECRET);

    // guardamos el usuario del token por si se necesita
    req.user = decoded;
    req.userId = decoded.id;

    return next();
  } catch (err) {
    console.error("verifyToken error:", err);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}
