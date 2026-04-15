import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, Package, Store, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import type { Product, Store as StoreType } from "@shared/schema";
import { resolveMediaUrl } from "@/lib/apiBase";

interface SearchResult {
  products: Product[];
  stores: StoreType[];
  query: string;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback(
    (v: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDebounced(v), delay);
    },
    [delay],
  );

  return { debounced, update };
}

interface SearchBarProps {
  className?: string;
  inputClassName?: string;
  onSearch?: (q: string) => void;
}

export function SearchBar({ className = "", inputClassName = "", onSearch }: SearchBarProps) {
  const [, setLocation] = useLocation();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const { debounced, update } = useDebounce(value, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery<SearchResult>({
    queryKey: ["/api/search", debounced],
    enabled: debounced.length >= 2 && focused,
  });

  const hasResults =
    data && (data.products.length > 0 || data.stores.length > 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    update(e.target.value);
  };

  const navigateTo = (url: string) => {
    setValue("");
    setFocused(false);
    setLocation(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    if (onSearch) onSearch(q);
    navigateTo(`/explore?q=${encodeURIComponent(q)}`);
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setTimeout(() => setFocused(false), 150);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      onBlur={handleBlur}
    >
      <form onSubmit={handleSubmit} className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Buscar productos, marcas y más..."
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          className={`pl-10 ${inputClassName}`}
          data-testid="input-search"
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={() => { setValue(""); update(""); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {focused && debounced.length >= 2 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-[200] bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-border overflow-hidden"
          data-testid="search-dropdown"
        >
          {!hasResults ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              {debounced.length >= 2
                ? `Sin resultados para "${debounced}"`
                : "Escribe al menos 2 caracteres..."}
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {data!.stores.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/50">
                    Tiendas
                  </div>
                  {data!.stores.map((store) => (
                    <button
                      key={store.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/70 transition-colors text-left"
                      onClick={() => navigateTo(`/store/${store.id}`)}
                      data-testid={`search-result-store-${store.id}`}
                    >
                      {store.logoUrl ? (
                        <img
                          src={resolveMediaUrl(store.logoUrl) ?? store.logoUrl}
                          alt={store.name}
                          className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Store className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{store.name}</div>
                        {store.description && (
                          <div className="text-xs text-muted-foreground truncate">{store.description}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {data!.products.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/50">
                    Productos
                  </div>
                  {data!.products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/70 transition-colors text-left"
                      onClick={() => navigateTo(`/explore?q=${encodeURIComponent(product.name)}`)}
                      data-testid={`search-result-product-${product.id}`}
                    >
                      {product.imageUrl ? (
                        <img
                          src={resolveMediaUrl(product.imageUrl) ?? product.imageUrl}
                          alt={product.name}
                          className="h-8 w-8 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ${parseFloat(product.price).toLocaleString("es-AR")}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-border">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors"
                  onClick={() => navigateTo(`/explore?q=${encodeURIComponent(value.trim())}`)}
                  data-testid="search-view-all"
                >
                  <Search className="h-4 w-4" />
                  Ver todos los resultados para "{value.trim()}"
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
