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
    <div className="mt-10 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[minmax(12rem,0.65fr)_minmax(16rem,1fr)]">
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
          className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
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
          className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-white outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-400"
        />
      </div>
    </div>
  );
}
