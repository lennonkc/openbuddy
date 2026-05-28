import { AppRouter } from "@/router";
import { IconMapProvider } from "@/lib/icons";

export default function App() {
  return (
    <IconMapProvider>
      <AppRouter />
    </IconMapProvider>
  );
}
