import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * NavigationHelper:
 * 1. Resetea el scroll a 0 al cambiar de ruta.
 * 2. Gestiona la barra de progreso de lectura superior.
 */
export function ScrollToTop() {
  const [pathname] = useLocation();

  useEffect(() => {
    // RESET SCROLL LOGIC
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.body.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: "instant" });

    const scrollableContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto');
    scrollableContainers.forEach(container => {
      if (!container.closest('[role="dialog"]') && !container.closest('.sheet-content')) {
         container.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    });

    // PROGRESS BAR LOGIC
    const updateProgress = () => {
      const progressBar = document.getElementById("scroll-progress");
      if (!progressBar) return;
      
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / scrollHeight) * 100;
      progressBar.style.width = `${progress}%`;
    };

    window.addEventListener("scroll", updateProgress);
    // Reset bar width on page change
    const progressBar = document.getElementById("scroll-progress");
    if (progressBar) progressBar.style.width = "0%";

    return () => window.removeEventListener("scroll", updateProgress);
  }, [pathname]);

  return <div id="scroll-progress" aria-hidden="true" />;
}
