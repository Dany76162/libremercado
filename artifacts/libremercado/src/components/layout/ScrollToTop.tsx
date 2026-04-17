import { useEffect } from "react";
import { useLocation } from "wouter";

export function ScrollToTop() {
  const [pathname] = useLocation();

  useEffect(() => {
    // 1. Principal: Resetea el scroll global de la ventana
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
    
    // 2. Respaldo: Si la app en móvil envuelve el scroll en el body
    document.body.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // 3. Respaldo: Resetea el posible scroll interno de algún container (por si acaso un modal u overlay dejó el scroll trabado)
    const scrollableContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto');
    scrollableContainers.forEach(container => {
      // Ignorar contenedores que pertenecen a modales activos (ui/dialog, sheet, etc.)
      if (!container.closest('[role="dialog"]') && !container.closest('.sheet-content')) {
         container.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    });

  }, [pathname]);

  return null;
}
