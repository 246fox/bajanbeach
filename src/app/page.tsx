type Beach = {
  name: string;
  imageColor: string;
};

const beaches: Beach[] = [
  { name: "Mullins", imageColor: "bg-sky-300" },
  { name: "Carlisle Bay", imageColor: "bg-cyan-300" },
  { name: "Crane Beach", imageColor: "bg-blue-300" },
  { name: "Bathsheba", imageColor: "bg-teal-300" },
  { name: "Accra Beach", imageColor: "bg-indigo-300" }
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-ocean-700">
          Barbados Beach Tracker
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
          BajanBeach
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Live beach condition cards for your favorite Barbados beaches. This starter version uses
          placeholder visuals and a sample condition score.
        </p>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {beaches.map((beach) => (
          <article
            key={beach.name}
            className="overflow-hidden rounded-2xl border border-ocean-100/70 bg-white/75 shadow-sm backdrop-blur-sm"
          >
            <div className={`h-36 w-full ${beach.imageColor}`} />
            <div className="space-y-2 p-5">
              <h2 className="text-xl font-semibold text-slate-800">{beach.name}</h2>
              <p className="text-sm text-slate-600">Condition score</p>
              <p className="inline-flex rounded-full bg-sand-100 px-3 py-1 text-base font-semibold text-ocean-700">
                7/10
              </p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
