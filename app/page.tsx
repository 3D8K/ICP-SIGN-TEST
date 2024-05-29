"use client";
import { Playground } from "./Playground";

export default function Home() {

  return (
    <main className="flex min-h-screen flex-col items-center gap-24 p-24">
      <div>NFID test playground</div>
      <Playground />
    </main>
  );
}
