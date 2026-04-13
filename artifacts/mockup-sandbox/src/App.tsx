import { useEffect, useState, type ComponentType } from "react";
import { modules as discoveredModules } from "./.generated/mockup-components";

// 👇 Importa un componente UI para mostrar algo por defecto
import { Button } from "./components/ui/button";

type ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;

function _resolveComponent(
  mod: Record<string, unknown>,
  name: string,
): ComponentType | undefined {
  const fns = Object.values(mod).filter(
    (v) => typeof v === "function",
  ) as ComponentType[];
  return (
    (mod.default as ComponentType) ||
    (mod.Preview as ComponentType) ||
    (mod[name] as ComponentType) ||
    fns[fns.length - 1]
  );
}

function PreviewRenderer({
  componentPath,
  modules,
}: {
  componentPath: string;
  modules: ModuleMap;
}) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setComponent(null);
    setError(null);

    async function loadComponent(): Promise<void> {
      const key = `./components/mockups/${componentPath}.tsx`;
      const loader = modules[key];

      if (!loader) {
        setError(`No component found at ${componentPath}.tsx`);
        return;
      }

      try {
        const mod = await loader();
        if (cancelled) return;

        const name = componentPath.split("/").pop()!;
        const comp = _resolveComponent(mod, name);

        if (!comp) {
          setError(
            `No exported React component found in ${componentPath}.tsx`,
          );
          return;
        }

        setComponent(() => comp);
      } catch (e) {
        if (cancelled) return;

        const message = e instanceof Error ? e.message : String(e);
        setError(`Failed to load preview.\n${message}`);
      }
    }

    void loadComponent();

    return () => {
      cancelled = true;
    };
  }, [componentPath, modules]);

  if (error) {
    return (
      <pre style={{ color: "red", padding: "2rem" }}>
        {error}
      </pre>
    );
  }

  if (!Component) return <p style={{ padding: 40 }}>Loading...</p>;

  return <Component />;
}

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

function getPreviewPath(): string | null {
  const basePath = getBasePath();
  const { pathname } = window.location;

  const local =
    basePath && pathname.startsWith(basePath)
      ? pathname.slice(basePath.length) || "/"
      : pathname;

  const match = local.match(/^\/preview\/(.+)$/);
  return match ? match[1] : null;
}

// 👇 Vista por defecto mejorada
function DefaultView() {
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>LibreMercado UI Sandbox</h1>
      <p>El entorno está funcionando correctamente 🚀</p>

      <div style={{ marginTop: 20 }}>
        <Button>Botón de prueba</Button>
      </div>

      <p style={{ marginTop: 20, color: "#666" }}>
        Para ver previews, usa:
      </p>

      <code>/preview/NombreDelComponente</code>

      <p style={{ marginTop: 10 }}>
        (Debes crear archivos en <b>components/mockups</b>)
      </p>
    </div>
  );
}

function App() {
  const previewPath = getPreviewPath();

  if (previewPath) {
    return (
      <PreviewRenderer
        componentPath={previewPath}
        modules={discoveredModules}
      />
    );
  }

  return <DefaultView />;
}

export default App;