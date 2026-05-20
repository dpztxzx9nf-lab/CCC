import { CCCProvider } from "@/context/CCCContext";
import { CommandCenter } from "@/components/ccc/CommandCenter";

export default function Home() {
  return (
    <CCCProvider>
      <CommandCenter />
    </CCCProvider>
  );
}
