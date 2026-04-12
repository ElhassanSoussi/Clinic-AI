import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return (
    <div className="min-h-dvh min-w-0 overflow-x-hidden bg-background">
      <RouterProvider router={router} />
    </div>
  );
}