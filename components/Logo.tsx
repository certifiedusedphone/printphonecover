import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="brand">
      <span className="ink" aria-hidden="true">
        <i style={{ background: "#00A0E9" }} /><i style={{ background: "#E4007C" }} />
        <i style={{ background: "#FFD400" }} /><i style={{ background: "#17141C", outline: "1px solid #fff4" }} />
      </span>
      PrintPhoneCover
    </Link>
  );
}
