// "No. 047": the guest's place, three digits.
export const formatPlace = (n: number) => `No. ${String(n).padStart(3, "0")}`;
