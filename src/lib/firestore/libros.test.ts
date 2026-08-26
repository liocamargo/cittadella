import { describe, expect, it } from "vitest";
import {
  estaVencido,
  generarObraId,
  normalizarAutores,
  ordenarSeleccion,
} from "./libros";
import type { LibroGlobal } from "@/types";

function libro(datos: Partial<LibroGlobal> & Pick<LibroGlobal, "isbn">): LibroGlobal {
  return {
    titulo: "",
    autor: "",
    propietarios: 0,
    ratingPromedio: 0,
    totalResenas: 0,
    ...datos,
  };
}

describe("normalizarAutores", () => {
  it("separa por coma y normaliza cada autor", () => {
    expect(normalizarAutores("García Márquez, Gabriel")).toEqual([
      "garcia_marquez",
      "gabriel",
    ]);
  });

  it("descarta espacios vacíos entre comas y quita puntuación", () => {
    expect(normalizarAutores("Tolkien, , J.R.R.")).toEqual(["tolkien", "jrr"]);
  });

  it("devuelve array vacío para un string vacío", () => {
    expect(normalizarAutores("")).toEqual([]);
  });
});

describe("generarObraId", () => {
  it("agrupa el mismo autor sin importar el orden de nombre/apellido", () => {
    expect(generarObraId("Cien años de soledad", "Gabriel García Márquez")).toBe(
      generarObraId("Cien años de soledad", "García Márquez, Gabriel")
    );
  });

  it("ignora palabras de edición/formato en el título", () => {
    expect(generarObraId("Dune (Edición ilustrada)", "Frank Herbert")).toBe(
      generarObraId("Dune", "Frank Herbert")
    );
  });

  it("da ids distintos para obras distintas", () => {
    expect(generarObraId("Dune", "Frank Herbert")).not.toBe(
      generarObraId("Fundación", "Isaac Asimov")
    );
  });
});

describe("estaVencido", () => {
  it("es false sin fecha límite", () => {
    expect(estaVencido(undefined)).toBe(false);
  });

  it("es true para una fecha límite en el pasado", () => {
    expect(estaVencido("2000-01-01")).toBe(true);
  });

  it("es false para una fecha límite en el futuro", () => {
    expect(estaVencido("2999-01-01")).toBe(false);
  });
});

describe("ordenarSeleccion", () => {
  it("prioriza más propietarios primero", () => {
    const candidatos = [
      libro({ isbn: "poco", propietarios: 1 }),
      libro({ isbn: "mucho", propietarios: 10 }),
      libro({ isbn: "medio", propietarios: 5 }),
    ];
    const orden = ordenarSeleccion(candidatos, [], 42).map((l) => l.isbn);
    expect(orden).toEqual(["mucho", "medio", "poco"]);
  });

  it("con igual cantidad de propietarios, prioriza el que tiene reseñas", () => {
    const candidatos = [
      libro({ isbn: "sin-resenas", propietarios: 3, totalResenas: 0 }),
      libro({ isbn: "con-resenas", propietarios: 3, totalResenas: 2 }),
    ];
    const orden = ordenarSeleccion(candidatos, [], 42).map((l) => l.isbn);
    expect(orden).toEqual(["con-resenas", "sin-resenas"]);
  });

  it("prioriza los géneros favoritos por encima de todo lo demás", () => {
    const candidatos = [
      libro({ isbn: "popular-sin-favorito", propietarios: 100, genero: "Terror" }),
      libro({ isbn: "favorito", propietarios: 1, genero: "Ciencia ficción" }),
    ];
    const orden = ordenarSeleccion(candidatos, ["Ciencia ficción"], 42).map(
      (l) => l.isbn
    );
    expect(orden).toEqual(["favorito", "popular-sin-favorito"]);
  });

  it("nunca devuelve más de 8", () => {
    const candidatos = Array.from({ length: 20 }, (_, i) =>
      libro({ isbn: `libro-${i}`, propietarios: i })
    );
    expect(ordenarSeleccion(candidatos, [], 1)).toHaveLength(8);
  });

  it("con la misma semilla, el desempate es determinístico", () => {
    const candidatos = [
      libro({ isbn: "a", propietarios: 1 }),
      libro({ isbn: "b", propietarios: 1 }),
      libro({ isbn: "c", propietarios: 1 }),
    ];
    const primeraVez = ordenarSeleccion(candidatos, [], 7).map((l) => l.isbn);
    const segundaVez = ordenarSeleccion(candidatos, [], 7).map((l) => l.isbn);
    expect(primeraVez).toEqual(segundaVez);
  });
});
