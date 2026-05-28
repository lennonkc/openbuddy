import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { ChatPage } from "@/components/chat/ChatPage";

const RoomPage = lazy(() => import("@/components/room/RoomPage").then(m => ({ default: m.RoomPage })));
const SettingsPage = lazy(() => import("@/components/settings/SettingsPage").then(m => ({ default: m.SettingsPage })));
const StickerBookPage = lazy(() => import("@/components/sticker-book/StickerBookPage").then(m => ({ default: m.StickerBookPage })));

function PageFallback() {
  const { t } = useTranslation();
  return <div className="flex items-center justify-center h-full text-sm text-candy-caramel">{t("common.loading")}</div>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/room" element={<Suspense fallback={<PageFallback />}><RoomPage /></Suspense>} />
        <Route path="/sticker-book" element={<Suspense fallback={<PageFallback />}><StickerBookPage /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<PageFallback />}><SettingsPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Route>
    </Routes>
  );
}
