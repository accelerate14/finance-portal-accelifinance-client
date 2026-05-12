import { Outlet } from "react-router-dom";
import UiPathAssistant from "../UiPath/UiPathAssistant";

/**
 * Layout component for all underwriter routes.
 * Renders the underwriter page content via Outlet and
 * includes the floating UiPath Assistant chatbot.
 */
export default function UnderwriterLayout() {
  return (
    <>
      <Outlet />
      <UiPathAssistant />
    </>
  );
}