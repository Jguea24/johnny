"use client";

type CategoryOption = { id: string; name: string };

export default function CatalogFilters({
  categories,
  categoryId,
  query,
  onCategoryChange,
  onQueryChange,
}: {
  categories: CategoryOption[];
  categoryId: string;
  query: string;
  onCategoryChange: (value: string) => void;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="surface-card mt-8 grid min-w-0 gap-4 p-4 sm:mt-10 sm:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)] sm:p-5">
      <div>
        <label
          htmlFor="catalog-category"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          Categoría
        </label>
        <select
          id="catalog-category"
          value={categoryId}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="field-control"
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="catalog-search"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          Buscar
        </label>
        <input
          id="catalog-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por nombre o descripción"
          className="field-control"
        />
      </div>
    </div>
  );
}
