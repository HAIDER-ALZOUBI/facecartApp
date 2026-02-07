import dotenv from "dotenv";
import path from "path";

// Load env relative to the backend working directory (you run: cd backend && ...)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.example") });

import express from "express";
import cors from "cors";
import intakeRoutes from "./routes/intake";
import analysisRoutes from "./routes/analysis";
import productsRoutes from "./routes/products";
import cartRoutes from "./routes/cart";
import routineRoutes from "./routes/routine";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// API routes
app.use("/api/intake", intakeRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/existing", productsRoutes);
app.use("/api/routine", routineRoutes);

// Quick health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Serve frontend build ONLY in production
if (process.env.NODE_ENV === "production") {
  const frontendBuild = path.join(__dirname, "../../frontend/dist");
  app.use(express.static(frontendBuild));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendBuild, "index.html"));
  });
}

app.listen(PORT, () => {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  const hasKey = key.length > 0 && key !== "your_key_here";

  console.log(`SkinSync API running on http://localhost:${PORT}`);
  console.log(`OpenAI: ${hasKey ? "configured" : "not configured (using fallback)"}`);
});

export default app;
