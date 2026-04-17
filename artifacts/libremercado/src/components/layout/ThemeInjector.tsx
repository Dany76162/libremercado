import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

// Helper para convertir Hex a HSL que requiere Tailwind/Shadcn
function hexToHSL(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function ThemeInjector() {
  const { data: theme } = useQuery<{ primary: string; navbar: string }>({
    queryKey: ["/api/config/site_theme"],
    // Polling opcional para ver cambios en vivo si se tienen dos pestañas abiertas
    refetchInterval: 5000 
  });

  useEffect(() => {
    if (!theme) return;

    const styleId = "dynamic-site-theme";
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    // Convertir hex a componentes HSL para las variables de Tailwind
    const primaryHsl = hexToHSL(theme.primary || "#ff4500");
    
    // Aplicar al :root
    styleElement.innerHTML = `
      :root {
        --primary: ${primaryHsl};
        --ring: ${primaryHsl};
        --navbar-custom-bg: ${theme.navbar || "#ffffff"};
      }
      
      /* Aplicar color al Navbar de forma dinámica */
      header[data-testid="main-header"], 
      .main-navbar-container {
        background-color: var(--navbar-custom-bg) !important;
      }
    `;

    return () => {
      // Opcional: limpiar al desmontar
    };
  }, [theme]);

  return null; // Este componente no renderiza nada visual
}
