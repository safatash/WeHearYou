"use client";

export function CampaignSubmitButton() {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const form = (e.currentTarget as HTMLButtonElement).closest("form") as HTMLFormElement;
    const contactCheckboxes = Array.from(
      form?.querySelectorAll('input[name="contactIds"]') ?? [],
    ) as HTMLInputElement[];
    const channelCheckboxes = Array.from(
      form?.querySelectorAll('input[name="channels"]') ?? [],
    ) as HTMLInputElement[];

    if (!contactCheckboxes.some((cb) => cb.checked)) {
      e.preventDefault();
      alert("Please select at least one contact");
      return;
    }

    if (!channelCheckboxes.some((cb) => cb.checked)) {
      e.preventDefault();
      alert("Please select at least one request channel");
    }
  }

  return (
    <button
      type="submit"
      onClick={handleClick}
      className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white"
    >
      Send Review Request
    </button>
  );
}
