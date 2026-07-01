import { useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";

export default function NotFoundScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/" && location.search) {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get("token");
      const type = urlParams.get("type");

      if (token && type === "recovery") {
        navigate({ to: "/" });
        return;
      }
    }

    navigate({ to: "/" });
  }, [navigate, location]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-register-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  );
}
