"use client";

import { FormEvent, useEffect, useState } from "react";

type Job = {
  id: string;
  status: string;
  model: string;
  industry: string;
  geography: string;
  output_text?: string;
  usage?: unknown;
};

export default function Home() {
  const [industry, setIndustry] = useState("HVAC services");
  const [geography, setGeography] = useState("North Carolina");
  const [thesis, setThesis] = useState("Fragmented founder-owned operators; recurring maintenance; tuck-in acquisition potential");
  const [model, setModel] = useState("gpt-6-astra");
  const [pin, setPin] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runResearch(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setJob(null);
    try {
      const r = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, geography, thesis, model, pin })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not start research");
      setJob(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (!job?.id || ["completed", "failed", "cancelled", "incomplete"].includes(job.status)) return;
    const timer = setInterval(async () => {
      const r = await fetch(`/api/status/${job.id}?pin=${encodeURIComponent(pin)}`);
      const data = await r.json();
      if (r.ok) setJob(prev => prev ? { ...prev, ...data } : prev);
    }, 5000);
    return () => clearInterval(timer);
  }, [job?.id, job?.status, pin]);

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">PRIVATE MARKETS INTELLIGENCE</div>
        <h1>Signal</h1>
        <p>Launch a market screen from your phone. Astra researches the public web in the background and returns an investor-grade brief.</p>
      </section>

      <form className="card" onSubmit={runResearch}>
        <label>Industry<input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. HVAC services" /></label>
        <label>Geography<input value={geography} onChange={e => setGeography(e.target.value)} placeholder="e.g. North Carolina" /></label>
        <label>Investment screen<textarea value={thesis} onChange={e => setThesis(e.target.value)} rows={4} placeholder="What are you looking for?" /></label>
        <label>Model<select value={model} onChange={e => setModel(e.target.value)}>
          <option value="gpt-6-astra">Astra — hardest work</option>
          <option value="gpt-5.6-sol">Sol — strong / lower cost</option>
          <option value="gpt-5.6-terra">Terra — efficient screening</option>
        </select></label>
        <label>Remote PIN<input value={pin} onChange={e => setPin(e.target.value)} type="password" inputMode="numeric" placeholder="Optional deployment PIN" /></label>
        <button disabled={loading}>{loading ? "Launching…" : "Run market screen"}</button>
      </form>

      {error && <div className="error">{error}</div>}

      {job && <section className="card result">
        <div className="statusrow"><strong>{job.industry}</strong><span className={`pill ${job.status}`}>{job.status}</span></div>
        <div className="meta">{job.geography} · {job.model} · {job.id}</div>
        {!job.output_text && <p className="working">Research is running in the background. You can lock your phone and return later.</p>}
        {job.output_text && <article>{job.output_text}</article>}
      </section>}

      <section className="card mini">
        <h2>Phone commands this version supports</h2>
        <p>Run a fresh screen · choose Astra/Sol/Terra · check job status · read the completed brief. Next: saved watchlists, recurring monitors, approval buttons, alerts, and a persistent target database.</p>
      </section>
    </main>
  );
}
