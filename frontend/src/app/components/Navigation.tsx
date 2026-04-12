import { useState } from "react";
import { Link } from "react-router";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/app/components/ui/sheet";

const marketingLinks = [
  { to: "/product", label: "Product" },
  { to: "/pricing", label: "Pricing" },
  { to: "/trust", label: "Trust" },
  { to: "/faq", label: "FAQ" },
] as const;

export function Navigation() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 min-w-0">
        <Link to="/" className="flex items-center gap-2 min-w-0 shrink-0" onClick={close}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">CA</span>
          </div>
          <span className="font-bold text-lg text-foreground truncate">Clinic AI</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 lg:gap-8 min-w-0">
          {marketingLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link
            to="/login"
            className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="text-sm px-3 py-2 sm:px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Get Started
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw-2rem,20rem)]">
              <div className="flex flex-col gap-1 pt-6">
                {marketingLinks.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={close}
                    className="py-3 text-base font-medium text-foreground border-b border-border"
                  >
                    {label}
                  </Link>
                ))}
                <Link
                  to="/login"
                  onClick={close}
                  className="py-3 text-base font-medium text-muted-foreground"
                >
                  Log in
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
