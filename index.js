// index.js
const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const librosRoutes = require("./routes/libros");

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json());

// Rutas
app.use("/api/libros", librosRoutes);

// Middleware global de errores (paracaídas)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
