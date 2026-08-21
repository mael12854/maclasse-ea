"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded-full border border-ardoise/30 px-3 py-1.5 text-xs text-ardoise hover:border-rouge hover:text-rouge"
    >
      Imprimer
    </button>
  );
}
