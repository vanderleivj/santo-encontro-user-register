import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import logo from "../assets/logo.png";
import ScreenLayout from "./ScreenLayout";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";

interface User {
  user: any;
  access_token: string;
  refresh_token: string;
}

export default function DeleteAccountScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const navigate = useNavigate();

  // Mock user data - em um app real, isso viria do contexto de autenticação
  const user: User = {
    user: { id: "mock-user-id", email: "user@example.com" },
    access_token: "mock-token",
    refresh_token: "mock-refresh-token",
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "EXCLUIR") {
      setMessage(
        "Por favor, digite 'EXCLUIR' para confirmar a exclusão da conta."
      );
      setMessageType("error");
      return;
    }

    setIsLoading(true);

    try {
      // Excluir conta via Supabase
      const response = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users/${user.user.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao excluir conta");
      }

      // Sucesso na exclusão
      setMessage("Conta excluída com sucesso!");
      setMessageType("success");

      // Logout após exclusão
      setTimeout(() => {
        navigate({ to: "/" });
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao excluir conta:", error);
      setMessage(error.message || "Erro ao excluir conta. Tente novamente.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenLayout>
      {/* Header elegante */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img
              src={logo}
              alt="Santo Encontro"
              className="h-20 w-20 object-contain drop-shadow-lg"
            />
            <div className="absolute -inset-2 bg-gradient-to-r from-red-400 to-orange-500 rounded-full blur opacity-20"></div>
          </div>
        </div>
        <h1 className="santo-text-gradient text-4xl font-bold mb-3 tracking-tight">
          Santo Encontro
        </h1>
        <p className="text-gray-600 italic mb-6 text-lg tracking-wide">
          Juntos na fé, unidos pelo amor
        </p>
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-lg">
          <span className="text-lg">🗑️</span>
          Exclusão de Conta
        </div>
      </div>

      {/* Informações do usuário */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 mb-8 shadow-lg">
        <h3 className="text-blue-900 font-bold text-xl mb-6 text-center flex items-center justify-center gap-2">
          <span className="text-2xl">👤</span>
          Informações da Conta
        </h3>
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Email:</p>
            <p className="font-semibold text-gray-800">{user.user.email}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Data de Criação:</p>
            <p className="font-semibold text-gray-800">
              {new Date(user.user.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
      </div>

      {/* Mensagem de status */}
      {message && (
        <div
          className={`p-6 rounded-2xl mb-8 shadow-lg ${
            messageType === "error"
              ? "bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 text-red-700"
              : "bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 text-green-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {messageType === "error" ? "⚠️" : "✅"}
            </span>
            <span className="font-medium">{message}</span>
          </div>
        </div>
      )}

      {/* Aviso de perigo */}
      <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-8 mb-8 shadow-lg">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-red-900 font-bold text-2xl mb-4">
            ATENÇÃO: Ação Irreversível
          </h3>
          <p className="text-red-800 mb-6 leading-relaxed">
            A exclusão da conta é <strong>permanente e irreversível</strong>.
            Todos os dados associados à conta serão perdidos definitivamente.
          </p>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h4 className="font-bold text-red-900 mb-4">
              O que será excluído:
            </h4>
            <ul className="text-left text-red-800 space-y-2">
              <li>• Perfil e informações pessoais</li>
              <li>• Histórico de conversas</li>
              <li>• Conexões e relacionamentos</li>
              <li>• Configurações e preferências</li>
              <li>• Todos os dados associados</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Botão de exclusão */}
      {!showConfirmation ? (
        <button
          onClick={() => setShowConfirmation(true)}
          className="w-full py-4 text-lg font-bold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-red-600 via-pink-600 to-red-700 text-white"
        >
          <span className="flex items-center justify-center gap-3">
            <span className="text-xl">🗑️</span>
            Excluir Conta Permanentemente
          </span>
        </button>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
            <h4 className="font-bold text-yellow-900 mb-4 text-center">
              Confirmação Final
            </h4>
            <p className="text-yellow-800 mb-4 text-center">
              Digite <strong>"EXCLUIR"</strong> para confirmar a exclusão:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digite EXCLUIR"
              className="w-full px-4 py-3 text-base rounded-full border border-yellow-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-white shadow-sm text-center font-mono"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setShowConfirmation(false);
                setConfirmText("");
                setMessage("");
              }}
              className="flex-1 py-3 text-base font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-500 text-white hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isLoading || confirmText !== "EXCLUIR"}
              className="flex-1 py-3 text-base font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-gradient-to-r from-red-600 to-pink-600 text-white"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Excluindo...
                </div>
              ) : (
                "Confirmar Exclusão"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Botão de logout */}
      <div className="mt-8 text-center">
        <button
          onClick={() => navigate({ to: "/" })}
          className="text-gray-600 hover:text-gray-800 underline text-sm transition-colors duration-200"
        >
          ← Voltar ao Login
        </button>
      </div>
    </ScreenLayout>
  );
}
