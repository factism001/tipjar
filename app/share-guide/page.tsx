import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Where to put your TipJar link — TipJar",
  description: "Paste your TipJar link on TikTok, YouTube, Instagram, Facebook and X so fans can tip you.",
};

const PLATFORMS: { name: string; tag: string; steps: string[]; note: string }[] = [
  {
    name: "TikTok",
    tag: "Bio + pinned comment",
    steps: [
      "Profile → Edit profile → add your tipjar link in Website / bio (Business or Creator account, follower minimum applies).",
      "After posting a video: comment your video tip link, then long-press the comment → Pin comment.",
      "Say it in the video: “link in bio, my pinned comment takes you straight to this video's tip page.”",
    ],
    note: "Links in captions and comments are not tappable — the pinned comment is copy-and-open, bio link is one tap.",
  },
  {
    name: "YouTube",
    tag: "Description + end screen",
    steps: [
      "Paste your tipjar link at the top of every video description, plus pin it as the first comment.",
      "YouTube Studio → video → End screen → Link element → point it at your tipjar page (channel must meet YouTube's external-linking criteria).",
      "Mention it in the outro: “tip link is on the end screen and in the description.”",
    ],
    note: "Best platform for TipJar — description, pinned comment and end-screen links are all one-tap.",
  },
  {
    name: "Instagram",
    tag: "Story sticker + bio",
    steps: [
      "Stories and Reels: add a Link sticker pointing at your tipjar page — viewers tap it directly.",
      "Put your main tipjar link in your bio link slot.",
      "Feed posts: captions are not tappable — write “tap the link sticker in my story / link in bio.”",
    ],
    note: "Link stickers work for everyone now — no follower minimum.",
  },
  {
    name: "Facebook",
    tag: "Bio + story sticker",
    steps: [
      "Add your tipjar link to your profile/page bio and About section.",
      "Stories and Reels support link stickers — point them at your current video tip page.",
      "Post captions: paste the full link; the Facebook app usually renders it tappable.",
    ],
    note: "Facebook Stars exist natively, but your TipJar link pays straight to your OPay / PalmPay.",
  },
  {
    name: "X (Twitter)",
    tag: "Bio + pinned post",
    steps: [
      "Put your tipjar link in your profile website field.",
      "Post your video tip link and pin that post to the top of your profile.",
      "Quote-post it when a video goes viral so new visitors see it first.",
    ],
    note: "Links in posts are tappable, but they compete with the timeline — the pinned post does the heavy lifting.",
  },
];

export default function ShareGuidePage() {
  return (
    <div className="py-8">
      <p className="font-mono text-xs text-anon-gray">Share guide</p>
      <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-ink">
        Where to put your TipJar link
      </h1>
      <p className="mt-2 text-sm text-anon-gray max-w-[52ch]">
        One link works everywhere. Put it in these spots on each app you use and fans can reach your tip page in one or two taps.
      </p>

      <div className="mt-6 space-y-4">
        {PLATFORMS.map((p) => (
          <section key={p.name} className="rounded-lg border border-slate-line p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-brand-ink">{p.name}</h2>
              <span className="font-mono text-xs text-brand-blue">{p.tag}</span>
            </div>
            <ol className="mt-3 space-y-2 text-sm text-charcoal list-decimal list-inside">
              {p.steps.map((s, i) => (
                <li key={i} className="leading-relaxed">{s}</li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-anon-gray border-t border-slate-line pt-3">{p.note}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-brand-ink text-white p-4 sm:p-5">
        <p className="text-sm font-semibold">New here?</p>
        <p className="mt-1 text-sm opacity-80">Claim your handle and connect your bank first — then share the link everywhere above.</p>
        <a href="/onboard" className="mt-3 inline-block rounded-md bg-white px-4 py-2 text-sm font-bold text-brand-ink min-h-[44px] leading-[28px]">
          Claim your handle
        </a>
      </div>
    </div>
  );
}
