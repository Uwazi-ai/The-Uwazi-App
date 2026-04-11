export default function MarqueeSection() {
  const items = ["Civic Intelligence", "For All", "Community Driven", "Public Trust"];
  const repeated = [...items, ...items, ...items, ...items];

  return (
    <section className="py-10 overflow-hidden border-y border-white/[0.06]">
      <div className="relative">
        <div className="flex animate-marquee whitespace-nowrap">
          {repeated.map((text, i) => (
            <span
              key={i}
              className="font-heading text-4xl sm:text-5xl md:text-6xl text-white/[0.07] uppercase tracking-tight mx-8 shrink-0 select-none"
            >
              {text}
              <span className="text-primary/20 mx-6">·</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}