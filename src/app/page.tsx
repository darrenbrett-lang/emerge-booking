import { Holding } from "@/components/Holding";
import { Invitation } from "@/components/Invitation";
import { gate } from "@/lib/gate";

export default async function Home() {
  const a = await gate();
  if (a.phase === "holding") return <Holding />;
  return <Invitation availability={a} />;
}
