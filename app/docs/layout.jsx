import DocsSidebar from "./sidebar";

export const metadata = {
  title: "Docs | Streamwear",
};

export default function DocsLayout({ children }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl gap-8 px-5 py-12">
        <aside className="hidden w-64 shrink-0 lg:block">
          <DocsSidebar />
        </aside>
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </main>
  );
}


