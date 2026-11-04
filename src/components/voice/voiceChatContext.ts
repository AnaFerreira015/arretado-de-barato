import { createContext, useContext } from "react";
import type { SearchMode } from "@/lib/voice/flow";

export const ChatContext = createContext<(mode?: SearchMode) => void>(() => {});
export const useVoiceChat = () => useContext(ChatContext);
