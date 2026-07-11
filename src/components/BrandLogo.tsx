import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/brand";

type BrandLogoProps = {
  href?: string | null;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  nameClassName?: string;
};

const sizes = {
  sm: { box: "h-9 w-9", image: 36, text: "text-sm" },
  md: { box: "h-11 w-11", image: 44, text: "text-base" },
  lg: { box: "h-14 w-14", image: 56, text: "text-lg" },
};

export default function BrandLogo({
  href = "/",
  size = "sm",
  showName = true,
  nameClassName = "font-semibold text-emerald-950",
}: BrandLogoProps) {
  const { box, image, text } = sizes[size];

  const content = (
    <>
      <div className={`relative shrink-0 overflow-hidden rounded-xl ${box}`}>
        <Image
          src="/logo.png"
          alt={`${SITE_NAME} logo`}
          width={image}
          height={image}
          className="h-full w-full object-cover"
          priority
        />
      </div>
      {showName && (
        <span className={`${text} ${nameClassName}`}>{SITE_NAME}</span>
      )}
    </>
  );

  if (href != null) {
    return (
      <Link href={href} className="flex items-center gap-2.5">
        {content}
      </Link>
    );
  }

  return <div className="flex flex-col items-center gap-2.5 sm:flex-row">{content}</div>;
}
