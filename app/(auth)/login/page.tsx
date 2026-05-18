// "use client";

// import { useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { createClient } from "@/lib/supabase/client";
// import { Logo } from "@/components/layout/logo";

// export default function LoginPage() {
//   const router = useRouter();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setError("");
//     setLoading(true);
//     const supabase = createClient();
//     const { error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });
//     if (error) {
//       setError(error.message);
//       setLoading(false);
//     } else {
//       router.push("/dashboard");
//       router.refresh();
//     }
//   }

//   return (
//     <div className="flex flex-col gap-6">
//       <div>
//         <Logo />
//         <p className="mt-1 text-sm text-foreground/60">
//           Sign in to your account
//         </p>
//       </div>
//       <form onSubmit={handleSubmit} className="flex flex-col gap-4">
//         <input
//           type="email"
//           placeholder="Email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           required
//           className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-pulse/60"
//         />
//         <input
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           required
//           className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-pulse/60"
//         />
//         {error && <p className="text-sm text-red-400">{error}</p>}
//         <button
//           type="submit"
//           disabled={loading}
//           className="rounded-lg bg-pulse py-3 font-semibold text-void transition-opacity disabled:opacity-50"
//         >
//           {loading ? "Signing in…" : "Sign in"}
//         </button>
//       </form>
//       <p className="text-center text-sm text-foreground/60">
//         No account?{" "}
//         <Link href="/signup" className="text-pulse hover:underline">
//           Sign up
//         </Link>
//       </p>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/layout/logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [callbackError] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("error") ?? ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)] flex flex-col gap-6">
      <div>
        <Logo />
        <p className="mt-1 text-sm text-foreground/60">
          Sign in to your account
        </p>
      </div>
      {callbackError && (
        <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {callbackError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-green-500/60"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-green-500/60"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg cursor-pointer bg-green-600 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-foreground/60">
        No account?{" "}
        <Link href="/signup" className="text-green-400 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
