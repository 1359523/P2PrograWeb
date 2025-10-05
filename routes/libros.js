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
    let { title, author, year, id } = req.body;

    // No permitir que el cliente fije el id
    if (id) {
      return res.status(400).json({ error: "No envíes 'id' en el body" });
    }

    if (!title || !author) {
      return res.status(400).json({ error: "Faltan title y/o author" });
    }

    // Normalizar para validar correctamente
    title = String(title).trim();
    author = String(author).trim();

    if (title.length < 2 || title.length > 100) {
      return res.status(400).json({ error: "title debe tener 2–100 chars" });
    }
    if (author.length < 5) {
      return res.status(400).json({ error: "author debe tener al menos 5 chars" });
    }

    // Validación year si viene
    if (year !== undefined) {
      const y = Number(year);
      const current = new Date().getFullYear();
      if (!Number.isInteger(y) || y < 1900 || y > current) {
        return res.status(400).json({ error: "year inválido" });
      }
      year = y;
    }

    const libros = leerLibros();

    // Evitar duplicados (title + year) – normalizando
    if (
      year !== undefined &&
      libros.some(l =>
        String(l.title).trim().toLowerCase() === title.toLowerCase() &&
        Number(l.year) === Number(year)
      )
    ) {
      return res.status(409).json({ error: "Duplicado (mismo title y year)" });
    }

    const nuevo = { id: uuidv4(), title, author, ...(year !== undefined ? { year } : {}) };
    libros.push(nuevo);
    escribirLibros(libros);

    return res.status(201).json(nuevo); 
  } catch (e) {
    return next({ status: 500, message: "Error al crear libro" });
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
    return res.status(400).json({ error: "Id inválido" });
  }

  try {
    const libros = leerLibros();
    const idx = libros.findIndex(l => l.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: "Libro no existe" }); 
    }

    libros.splice(idx, 1);
    escribirLibros(libros);
    return res.status(200).json({ message: "Libro eliminado correctamente" }); 
  } catch (e) {
    return next({ status: 500, message: "Error al eliminar libro" });
  }
});


module.exports = router;
