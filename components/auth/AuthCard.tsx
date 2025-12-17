type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function AuthCard({ title, subtitle, children }: Props) {
  return (
    <section className="relative">
      {/* Soft brand background ring */}
      <div className="absolute -inset-1 rounded-2xl bg-linear-to-b from-pcolor/5 to-scolor/5 blur-2xl" aria-hidden />
      <div className="relative rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <header className="px-6 pt-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-hcolor">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </header>

        <div className="px-6 pb-6 pt-4">{children}</div>
      </div>
    </section>
  );
}
