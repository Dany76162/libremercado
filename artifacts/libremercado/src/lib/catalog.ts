export type CatalogCategoryId =
  | "all"
  | "food"
  | "grocery"
  | "pharmacy"
  | "electronics"
  | "fashion"
  | "home"
  | "beauty"
  | "pets";

export interface CatalogCategory {
  id: Exclude<CatalogCategoryId, "all">;
  name: string;
  shortDescription: string;
  href: string;
  aliases: string[];
}

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  {
    id: "food",
    name: "Comida",
    shortDescription: "Restaurantes, delivery y preparados",
    href: "/explore?category=food",
    aliases: ["comida", "pizzas", "pizza", "empanadas", "hamburguesas", "delivery", "gastronomia", "gastronomía", "restaurant", "restaurante", "combos"],
  },
  {
    id: "grocery",
    name: "Supermercado",
    shortDescription: "Despensa, bebidas y compras del hogar",
    href: "/explore?category=grocery",
    aliases: ["supermercado", "almacen", "almacén", "bebidas", "lacteos", "lácteos", "panaderia", "panadería", "infusiones", "limpieza"],
  },
  {
    id: "pharmacy",
    name: "Farmacia",
    shortDescription: "Salud, bienestar y suplementos",
    href: "/explore?category=pharmacy",
    aliases: ["farmacia", "medicamentos", "medicamento", "suplementos", "suplemento", "salud", "vitaminas"],
  },
  {
    id: "electronics",
    name: "Electrónica",
    shortDescription: "Tecnología, audio y computación",
    href: "/explore?category=electronics",
    aliases: ["electronica", "electrónica", "tecnologia", "tecnología", "audio", "accesorios", "televisores", "computacion", "computación", "celulares", "tablet", "tablets", "smartphone", "notebook", "gaming"],
  },
  {
    id: "fashion",
    name: "Moda",
    shortDescription: "Ropa, calzado y accesorios",
    href: "/explore?category=fashion",
    aliases: ["moda", "ropa", "remeras", "pantalones", "vestidos", "camperas", "calzado", "zapatillas", "indumentaria"],
  },
  {
    id: "home",
    name: "Hogar",
    shortDescription: "Muebles, deco y soluciones para tu casa",
    href: "/explore?category=home",
    aliases: ["hogar", "muebles", "decoracion", "decoración", "electrohogar", "cocina"],
  },
  {
    id: "beauty",
    name: "Belleza",
    shortDescription: "Cuidado personal y cosmética",
    href: "/explore?category=beauty",
    aliases: ["belleza", "cosmetica", "cosmética", "perfumeria", "perfumería", "cuidado personal"],
  },
  {
    id: "pets",
    name: "Mascotas",
    shortDescription: "Alimentos, higiene y accesorios",
    href: "/explore?category=pets",
    aliases: ["mascotas", "alimentos", "higiene", "juguetes", "descanso", "veterinaria", "pet", "perros", "gatos"],
  },
];

export const EXPLORE_CATEGORY_OPTIONS: { id: CatalogCategoryId; name: string }[] = [
  { id: "all", name: "Todos" },
  ...CATALOG_CATEGORIES.map(({ id, name }) => ({ id, name })),
];

function normalizeText(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getCatalogCategory(categoryId?: string | null): CatalogCategory | undefined {
  return CATALOG_CATEGORIES.find((category) => category.id === categoryId);
}

export function normalizeCatalogCategory(rawValue?: string | null): Exclude<CatalogCategoryId, "all"> | undefined {
  const normalized = normalizeText(rawValue);
  if (!normalized) return undefined;

  const exact = CATALOG_CATEGORIES.find((category) => category.id === normalized || normalizeText(category.name) === normalized);
  if (exact) return exact.id;

  const aliasMatch = CATALOG_CATEGORIES.find((category) =>
    category.aliases.some((alias) => normalized === normalizeText(alias) || normalized.includes(normalizeText(alias))),
  );

  return aliasMatch?.id;
}

export function productMatchesCategory(productCategory: string | null | undefined, selectedCategory: CatalogCategoryId): boolean {
  if (selectedCategory === "all") return true;
  return normalizeCatalogCategory(productCategory) === selectedCategory;
}

export function storeMatchesCategory(storeCategory: string | null | undefined, selectedCategory: CatalogCategoryId): boolean {
  if (selectedCategory === "all") return true;
  return normalizeCatalogCategory(storeCategory) === selectedCategory;
}
