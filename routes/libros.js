const express = require("express");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4, validate: uuidValidate } = require("uuid");

const router = express.Router();
const dataPath = path.join(__dirname, "../data/libros_1000.json");

function leerLibros() {
  // Si falla la lectura, lla ruta responde 500
  const raw = fs.readFileSync(dataPath, "utf-8");
  return JSON.parse(raw);
}

function escribirLibros(libros) {
  fs.writeFileSync(dataPath, JSON.stringify(libros, null, 2));
}

/**
 * 1) GET /api/libros
 * 200 OK: lista de libros
 * 500: error al leer datos
 */
router.get("/", (req, res, next) => {
  try {
    const libros = leerLibros();
    return res.status(200).json(libros); // 200 OK
  } catch (e) {
    // 500 Internal Server Error (error al leer datos)
    return next({ status: 500, message: "Error al leer datos" });
  }
});

/**
 * 2) GET /api/libros/:id
 * 200 OK: libro encontrado
 * 404 Not Found: no existe
 * 400 Bad Request: id inválido (no UUID)
 */
router.get("/:id", (req, res, next) => {
  const { id } = req.params;
  if (!uuidValidate(id)) {
    return res.status(400).json({ error: "Id inválido" }); // 400
  }

  try {
    const libros = leerLibros();
    const libro = libros.find((l) => l.id === id);
    if (!libro) {
      return res.status(404).json({ error: "Libro no existe" }); // 404
    }
    return res.status(200).json(libro); // 200
  } catch (e) {
    return next({ status: 500, message: "Error al leer datos" }); // Paracaídas 500
  }
});

/**
 * 3) POST /api/libros
 * Body: { title, author, year? }
 * 201 Created: creado
 * 400 Bad Request: faltan obligatorios o datos inválidos
 * 409 Conflict: duplicado (mismo title y year) [opcional]
 */
router.post("/", (req, res, next) => {
  try {
    const { title, author, year } = req.body;

    // Validaciones mínimas: title y author requeridos
    if (!title || !author) {
      return res
        .status(400)
        .json({ error: "Faltan campos obligatorios: title y author" }); // 400
    }

    // Validación de year (si viene)
    if (year !== undefined) {
      const num = Number(year);
      if (!Number.isInteger(num) || num < 0) {
        return res.status(400).json({ error: "year inválido" }); // 400
      }
    }

    const libros = leerLibros();

    // 409 (opcional): duplicado por (title + year)
    if (
      year !== undefined &&
      libros.some((l) => l.title === title && l.year === year)
    ) {
      return res
        .status(409)
        .json({ error: "Ya existe un libro con el mismo título y año" }); // 409
    }

    const nuevo = {
      id: uuidv4(),
      title,
      author,
      ...(year !== undefined ? { year: Number(year) } : {})
    };

    libros.push(nuevo);
    escribirLibros(libros);

    return res.status(201).json(nuevo); // 201 Created
  } catch (e) {
    return next({ status: 500, message: "Error al crear libro" }); // Paracaídas 500
  }
});

/**
 * 4) DELETE /api/libros/:id
 * 200 OK: eliminado
 * 404 Not Found: no existe
 * 400 Bad Request: id inválido
 */
router.delete("/:id", (req, res, next) => {
  const { id } = req.params;
  if (!uuidValidate(id)) {
    return res.status(400).json({ error: "Id inválido" }); // 400
  }

  try {
    const libros = leerLibros();
    const idx = libros.findIndex((l) => l.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Libro no existe" }); // 404
    }
    libros.splice(idx, 1);
    escribirLibros(libros);
    return res.status(200).json({ message: "Libro eliminado correctamente" }); // 200
  } catch (e) {
    return next({ status: 500, message: "Error al eliminar libro" }); // Paracaídas 500
  }
});

module.exports = router;
