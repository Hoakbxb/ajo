import type { ReactNode } from "react";
import BrandLogo from "@/components/BrandLogo";
import { SITE_NAME } from "@/lib/brand";

export const authInputClass =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

export const authSelectClass = `${authInputClass} appearance-none`;

export const authPrimaryBtnClass =
  "inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";

export const authSecondaryBtnClass =
  "inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  aside?: ReactNode;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  aside,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[44%] max-w-xl flex-col justify-between bg-slate-950 p-10 text-white lg:flex xl:p-14">
        <BrandLogo
          href="/"
          size="md"
          nameClassName="font-semibold text-white"
        />
        <div className="space-y-4">
          {aside ?? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {SITE_NAME}
              </p>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
                Community contributions, made simple.
              </h2>
              <p className="max-w-sm text-sm leading-relaxed text-slate-400">
                Join voluntarily, contribute to your assigned member, and receive
                rewards when your matrix completes.
              </p>
            </>
          )}
        </div>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </aside>

      <div className="flex flex-1 flex-col bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 lg:hidden">
          <BrandLogo href="/" size="sm" nameClassName="font-semibold text-slate-900" />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {description}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              {children}
            </div>

            {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function StepIndicator({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center">
        {steps.map((label, index) => {
          const done = index < currentStep;
          const active = index === currentStep;
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    done || active
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {done ? "✓" : index + 1}
                </div>
                <span
                  className={`hidden max-w-[5rem] truncate text-center text-[11px] font-medium sm:block ${
                    active ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-2 mb-6 h-px flex-1 ${
                    index < currentStep ? "bg-slate-900" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs font-medium text-slate-500 sm:hidden">
        Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
      </p>
    </div>
  );
}

export function AuthLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="font-medium text-slate-900 underline-offset-4 hover:underline"
    >
      {children}
    </a>
  );
}
