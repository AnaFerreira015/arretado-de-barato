import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceAssistant } from "@/lib/voice/useVoiceAssistant";
import type { SearchMode } from "@/lib/voice/flow";
import { draftSummary } from "@/lib/voice/flow";
import { voicePrice } from "@/lib/voice/fuel";
import { formatDateTime } from "@/lib/economiza/format";
import { MUNICIPIOS, FUEL_TYPES } from "@/lib/economiza/constants";

export { VoiceChatProvider } from "./VoiceChatProvider";

export function ChatConversation({ initialMode = "produto" }: { initialMode?: SearchMode }) {
  const assistant = useVoiceAssistant({}, initialMode);
  const { state, results, canLoadMore } = assistant;
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const listening = state.audio === "listening";
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "nearest" });
  }, [state.messages, state.stage, results.length]);
  const answer = (value: string) => {
    void assistant.answer(value);
    input.current?.focus();
  };
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div
          role="log"
          aria-label="Conversa de busca"
          aria-live="polite"
          aria-relevant="additions"
          className="space-y-3"
        >
          {state.messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-8 rounded-2xl rounded-br-sm bg-primary p-3 text-primary-foreground"
                  : "mr-5 rounded-2xl rounded-bl-sm border bg-card p-3"
              }
            >
              <span className="sr-only">{m.role === "user" ? "Você: " : "Arretado: "}</span>
              {m.text}
            </div>
          ))}
        </div>
        {state.stage === "place" && (
          <div className="mt-3 space-y-2">
            <label className="block text-sm font-semibold" htmlFor="chat-city">
              Município
            </label>
            <select
              id="chat-city"
              disabled={!!state.busy}
              value=""
              onChange={(e) => {
                if (e.target.value) answer(e.target.value);
              }}
              className="min-h-11 w-full rounded-xl border-2 border-input bg-card px-3"
            >
              <option value="">Escolha o município</option>
              {MUNICIPIOS.map((m) => (
                <option key={m.codigo} value={m.nome}>
                  {m.nome}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              disabled={!!state.busy}
              onClick={() => void assistant.requestLocation()}
            >
              Usar minha localização
            </Button>
          </div>
        )}
        {state.stage === "fuel" && (
          <select
            aria-label="Tipo de combustível"
            value=""
            disabled={!!state.busy}
            onChange={(e) => {
              if (e.target.value) answer(e.target.value);
            }}
            className="mt-3 min-h-11 w-full rounded-xl border-2 border-input bg-card px-3"
          >
            <option value="">Escolha o combustível</option>
            {FUEL_TYPES.map((f) => (
              <option key={f.codigo} value={f.nome}>
                {f.nome}
              </option>
            ))}
          </select>
        )}
        {state.stage === "confirm" && !state.busy && (
          <Button className="mt-3" onClick={() => answer("confirmar busca")}>
            Pesquisar
          </Button>
        )}
        {state.stage === "results" && (
          <section aria-label="Preços encontrados" className="mt-4 space-y-3">
            {state.resultDemo && (
              <p className="rounded-xl bg-warning-soft p-3 font-semibold">
                Demonstração: preços fictícios.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Preços de vendas passadas entre os registros consultados; confirme preço e estoque na
              loja.
              {state.draft.mode === "produto" && !state.draft.embalagem
                ? " Confira também o tamanho das embalagens."
                : ""}
            </p>
            {results.slice(0, 3).map((r) => (
              <article key={r.id} className="rounded-2xl border bg-card p-3">
                <h3 className="font-bold">{r.descricao}</h3>
                <p className="price-text my-1 text-2xl">{voicePrice(r)}</p>
                <p className="font-semibold">{r.store.nome}</p>
                <p className="text-sm">
                  {[r.store.logradouro, r.store.numero, r.store.bairro, r.store.municipio]
                    .filter(Boolean)
                    .join(", ") || "Endereço não informado"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Venda em {formatDateTime(r.dataVendaUtc)}
                </p>
              </article>
            ))}
            {canLoadMore && (
              <Button
                variant="outline"
                disabled={!!state.busy}
                onClick={() => answer("carregar mais resultados")}
              >
                Carregar mais resultados
              </Button>
            )}
          </section>
        )}
        <details className="mt-4 text-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-primary">
            Opções da conversa
          </summary>
          <div className="space-y-3 pb-3">
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={state.spoken}
                disabled={!state.canSpeak}
                onChange={(e) => assistant.setSpoken(e.target.checked)}
              />
              Respostas faladas
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={state.automaticSearch}
                onChange={(e) => assistant.setAutomaticSearch(e.target.checked)}
              />
              Pesquisar automaticamente
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={state.automaticAi}
                onChange={(e) => assistant.setAutomaticAi(e.target.checked)}
              />
              Usar IA para entender pedidos
            </label>
            <p className="text-muted-foreground">
              O navegador pode processar a voz em seu serviço. A IA recebe apenas o texto e os
              campos da busca. A conversa fica nesta sessão e é encerrada ao fechar o chat.
            </p>
            <p>{draftSummary(state.draft)}</p>
            <Button variant="outline" onClick={() => answer("nova busca")}>
              Nova busca
            </Button>
          </div>
        </details>
        <div ref={end} />
      </div>
      <form
        className="shrink-0 space-y-2 border-t bg-card p-3 pb-[max(12px,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!state.busy && text.trim()) {
            answer(text);
            setText("");
          }
        }}
      >
        <p role="status" className="text-sm text-muted-foreground">
          {listening
            ? "Gravando… fale no seu ritmo e toque em Enviar áudio ao terminar."
            : state.busy
              ? "Buscando uma resposta…"
              : !state.canListen
                ? "Voz indisponível neste navegador. Você pode digitar."
                : "Toque no microfone para falar."}
        </p>
        {listening && state.transcript && (
          <p
            className="max-h-24 overflow-y-auto rounded-lg bg-muted p-2 text-sm"
            aria-label="Transcrição em andamento"
          >
            {state.transcript}
          </p>
        )}
        {state.error && state.transcript && !listening && (
          <div className="rounded-lg bg-muted p-2 text-sm">
            <p>{state.transcript}</p>
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setText(state.transcript);
                input.current?.focus();
              }}
            >
              Editar texto reconhecido
            </Button>
          </div>
        )}
        {listening ? (
          <div className="flex gap-2">
            <Button type="button" className="flex-1" onClick={assistant.finishRecording}>
              <Send aria-hidden />
              Enviar áudio
            </Button>
            <Button type="button" variant="outline" onClick={assistant.stop}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <label htmlFor="chat-mensagem" className="w-full text-sm font-semibold">
              Mensagem para o Arretado
            </label>
            <textarea
              id="chat-mensagem"
              ref={input}
              aria-label="Mensagem para o Arretado"
              value={text}
              maxLength={500}
              rows={2}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ex.: leite de 1 litro em Maceió"
              className="min-w-0 flex-1 resize-none rounded-xl border-2 border-input bg-background p-2"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Gravar pedido por voz"
              disabled={!state.canListen || !!state.busy}
              onClick={assistant.listen}
            >
              <Mic aria-hidden />
            </Button>
            <Button
              type="submit"
              size="icon"
              aria-label="Enviar mensagem"
              disabled={!text.trim() || !!state.busy}
            >
              <Send aria-hidden />
            </Button>
          </div>
        )}
        {state.busy && (
          <Button type="button" variant="ghost" onClick={assistant.stop}>
            <Square aria-hidden />
            Cancelar busca
          </Button>
        )}
      </form>
    </>
  );
}
