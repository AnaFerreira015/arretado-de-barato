import { lazy, Suspense, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { SearchMode } from "@/lib/voice/flow";
import { ChatContext } from "./voiceChatContext";
const ChatConversation = lazy(() =>
  import("./VoiceChat").then((module) => ({ default: module.ChatConversation })),
);

export function VoiceChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SearchMode>("produto");
  const opener = useRef<HTMLElement | null>(null);
  return (
    <ChatContext.Provider
      value={(next = "produto") => {
        opener.current = document.activeElement as HTMLElement;
        setMode(next);
        setOpen(true);
      }}
    >
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" />
          <Dialog.Content
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              (opener.current?.isConnected
                ? opener.current
                : document.getElementById("conteudo")
              )?.focus();
            }}
            className="fixed inset-x-0 bottom-0 z-50 flex h-[min(92dvh,850px)] flex-col rounded-t-2xl border bg-background shadow-xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(480px,calc(100vw-40px))] sm:rounded-2xl"
          >
            <header className="border-b px-5 py-4 pr-14">
              <Dialog.Title className="text-xl font-extrabold">
                Converse com o Arretado
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Fale ou escreva para encontrar preços.
              </Dialog.Description>
            </header>
            <Dialog.Close
              className="absolute right-3 top-3 grid size-11 cursor-pointer place-items-center rounded-xl hover:bg-accent"
              aria-label="Fechar chat"
            >
              <X aria-hidden />
            </Dialog.Close>
            <Suspense
              fallback={
                <p role="status" className="p-4">
                  Carregando conversa…
                </p>
              }
            >
              <ChatConversation initialMode={mode} />
            </Suspense>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ChatContext.Provider>
  );
}
