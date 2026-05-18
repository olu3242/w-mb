// "use client";

// import { useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { createClient } from "@/lib/supabase/client";
// import { Logo } from "@/components/layout/logo";

// export default function SignupPage() {
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
//     const { error } = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
//       },
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
//         <p className="mt-1 text-sm text-foreground/60">Create your account</p>
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
//           placeholder="Password (min 8 chars)"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           required
//           minLength={8}
//           className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-pulse/60"
//         />
//         {error && <p className="text-sm text-red-400">{error}</p>}
//         <button
//           type="submit"
//           disabled={loading}
//           className="rounded-lg bg-pulse py-3 font-semibold text-void transition-opacity disabled:opacity-50"
//         >
//           {loading ? "Creating account…" : "Get started"}
//         </button>
//       </form>
//       <p className="text-center text-sm text-foreground/60">
//         Have an account?{" "}
//         <Link href="/login" className="text-pulse hover:underline">
//           Sign in
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

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/api/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setMessage("Check your email to confirm your account, then you will be sent to your dashboard.");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)] flex flex-col gap-6">
      <div>
        <Logo />
        <p className="mt-1 text-sm text-foreground/60">Create your account</p>
      </div>
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
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-green-500/60"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-green-300">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg cursor-pointer bg-green-600 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Get started"}
        </button>
      </form>
      <p className="text-center text-sm text-foreground/60">
        Have an account?{" "}
        <Link href="/login" className="text-green-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
