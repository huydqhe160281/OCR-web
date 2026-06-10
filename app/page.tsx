import { listJobs } from "@/lib/jobs/job-store";
import { JobList } from "@/components/job-list";
import { UploadZone } from "@/components/upload-zone";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jobs = await listJobs(20);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          OCR Web
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Upload documents, extract text with Gemini, download structured DOCX.
        </p>
      </header>

      <section className="mb-10">
        <UploadZone />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Recent jobs</h2>
        <JobList jobs={jobs} />
      </section>

      <footer className="mt-10 text-xs text-zinc-500">
        Vietnamese & Japanese · Vercel + Gemini
      </footer>
    </main>
  );
}
