import express from "express";
import cors from "cors";
import profileRoutes from "./routes/profile.routes";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({
    status: "success",
    message: "Profile Service is running"
  });
});

app.use("/api", profileRoutes);

export default app;