import JoinForm from "@/components/JoinForm";

export default function JoinPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-emerald-950">Join the Community</h1>
        <p className="mt-2 text-emerald-700/70">
          Fill in your details to join the next available matrix position
        </p>
        <p className="mt-2 text-sm text-emerald-600">
          Already a member?{" "}
          <a href="/login" className="font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
      <div className="mt-8 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm sm:p-8">
        <JoinForm />
      </div>
    </div>
  );
}
