import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import "./index.css";
import { Toaster } from "./components/ui/sonner";
import { AppThemeProvider } from "./context/AppThemeProvider";

function App() {
  return (
    <AppThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AppThemeProvider>
  );
}

export default App;
