import { useId, useRef, useState } from "react";
import { Mic, Search, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MUNICIPIOS, FUEL_TYPES } from "@/lib/economiza/constants";
import { formatDateTime } from "@/lib/economiza/format";
import { draftSummary, promptFor, type SearchMode } from "@/lib/voice/flow";
import { useVoiceAssistant } from "@/lib/voice/useVoiceAssistant";

import { voicePrice } from "@/lib/voice/fuel";

export function VoiceAssistant({ initialMode = "produto" }: { initialMode?: SearchMode }) {
  const assistant = useVoiceAssistant({}, initialMode);
  const { state, results, canLoadMore } = assistant;
  const [text, setText] = useState("");
  const [aiText, setAiText] = useState("");
  const responseRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const busy = !!state.busy;
  const action = (command: string) => {
    void assistant.answer(command);
    responseRef.current?.focus();
  };
  const selected = results[state.selected];

  return (
    <div className="space-y-5">
      <div className="card-surface p-4 md:p-6">
        <fieldset className="min-w-0">
          <legend className="mb-3 text-lg font-bold">O que pesquisar?</legend>
          <div className="flex flex-wrap gap-5">
            {(["produto", "combustivel"] as const).map((mode) => (
              <label key={mode} className="flex min-h-11 items-center gap-2 font-semibold">
                <input
                  type="radio"
                  name={`${id}-mode`}
                  value={mode}
                  checked={state.draft.mode === mode}
                  onChange={() => assistant.setMode(mode)}
                  className="size-5 accent-primary"
                />
                {mode === "produto" ? "Produtos" : "Combustíveis"}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <section className="card-surface space-y-4 p-4 md:p-6" aria-labelledby={`${id}-settings`}>
        <h2 id={`${id}-settings`} className="text-lg font-bold">
          Você escolhe como conversar
        </h2>
        <p>Responda por texto, teclado ou voz. A busca guiada funciona sem IA.</p>
        <label className="flex min-h-11 items-center gap-3 font-semibold">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={state.spoken}
            disabled={!state.canSpeak}
            onChange={(e) => assistant.setSpoken(e.target.checked)}
          />
          Ativar respostas faladas
        </label>
        <p className="text-sm text-muted-foreground">
          Se você usa leitor de tela, pode deixar as respostas faladas desligadas para evitar duas
          vozes ao mesmo tempo.
        </p>
        <label className="flex min-h-11 items-center gap-3 font-semibold">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={state.automaticAi}
            onChange={(e) => assistant.setAutomaticAi(e.target.checked)}
            aria-describedby={`${id}-ai-help`}
          />
          Usar IA para entender frases complexas
        </label>
        <p id={`${id}-ai-help`} className="text-sm text-muted-foreground">
          Fale do seu jeito. Quando necessário, o texto e os campos atuais da busca são enviados à
          IA da Cloudflare. Não enviamos coordenadas, áudio nem resultados à IA. Se ela estiver
          indisponível ou atingir o limite, você pode continuar pelos controles.
        </p>
        <p id={`${id}-microphone`} className="text-sm text-muted-foreground">
          Ao clicar em Falar, o navegador pode enviar seu áudio ao serviço de reconhecimento de voz
          dele. O microfone não fica sempre ligado. Não guardamos gravações nem transcrições.
        </p>
        {!state.canListen && (
          <p className="rounded-lg bg-muted p-3 text-sm">
            Este navegador não oferece reconhecimento de voz. Você pode completar toda a busca
            digitando.
          </p>
        )}
      </section>

      <section className="card-surface space-y-4 p-4 md:p-6" aria-labelledby={`${id}-guide`}>
        <h2 id={`${id}-guide`} className="text-lg font-bold">
          Busca guiada
        </h2>
        <div
          className={`rounded-xl border-2 p-4 ${state.error ? "border-destructive" : "border-primary bg-primary-soft"}`}
        >
          <p className="mb-2 text-sm font-semibold">
            {state.audio === "listening"
              ? "Microfone ligado — ouvindo"
              : state.audio === "speaking"
                ? "Lendo em voz alta"
                : busy
                  ? "Aguarde…"
                  : "Sua vez"}
          </p>
          <p
            id={`${id}-status`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="font-semibold"
          >
            {state.message}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={assistant.listen}
            disabled={!state.canListen || busy || state.audio === "listening"}
            aria-describedby={`${id}-microphone`}
          >
            <Mic aria-hidden /> Falar
          </Button>
          <Button type="button" variant="outline" onClick={assistant.stop}>
            <Square aria-hidden /> Parar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!state.canSpeak || busy}
            onClick={() => action("repetir")}
          >
            <Volume2 aria-hidden /> Repetir
          </Button>
          <Button type="button" variant="ghost" onClick={() => action("ajuda")} disabled={busy}>
            Ajuda
          </Button>
        </div>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void assistant.answer(text);
            setText("");
          }}
        >
          <label htmlFor={`${id}-answer`} className="block font-semibold">
            Sua resposta ou comando
          </label>
          <p id={`${id}-hint`} className="text-sm text-muted-foreground">
            {promptFor(state.stage, state.draft)}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`${id}-answer`}
              ref={responseRef}
              value={text}
              maxLength={500}
              autoComplete="off"
              onChange={(e) => setText(e.target.value)}
              aria-describedby={`${id}-hint ${id}-status`}
              aria-invalid={!!state.error}
              className="min-h-12 flex-1 border-2"
            />
            <Button type="submit" disabled={!text.trim()}>
              Enviar resposta
            </Button>
          </div>
        </form>
        {state.transcript && (
          <p className="break-words text-sm text-muted-foreground">
            Última frase: <span className="font-medium">{state.transcript}</span>
          </p>
        )}

        {state.stage === "fuel" && (
          <div className="space-y-2">
            <label htmlFor={`${id}-fuel`} className="block font-semibold">
              Tipo de combustível
            </label>
            <select
              id={`${id}-fuel`}
              value=""
              disabled={busy}
              className="min-h-12 w-full rounded-lg border-2 border-input bg-card px-3"
              onChange={(e) => {
                if (e.target.value) action(e.target.value);
              }}
            >
              <option value="">Escolha o tipo</option>
              {FUEL_TYPES.map((f) => (
                <option key={f.codigo} value={f.nome}>
                  {f.nome}
                </option>
              ))}
            </select>
            {state.draft.tipoCombustivel && (
              <Button variant="outline" disabled={busy} onClick={() => action("manter")}>
                Manter tipo identificado
              </Button>
            )}
          </div>
        )}
        {state.stage === "size" && (
          <div className="flex flex-wrap gap-2">
            {state.draft.embalagem && (
              <Button variant="outline" disabled={busy} onClick={() => action("manter")}>
                Manter {state.draft.embalagem}
              </Button>
            )}
            <Button variant="outline" disabled={busy} onClick={() => action("qualquer embalagem")}>
              Qualquer embalagem
            </Button>
          </div>
        )}
        {state.stage === "variant" && (
          <div className="flex flex-wrap gap-2">
            {state.draft.variante && (
              <Button variant="outline" disabled={busy} onClick={() => action("manter")}>
                Manter {state.draft.variante}
              </Button>
            )}
            <Button variant="outline" disabled={busy} onClick={() => action("qualquer variante")}>
              Qualquer variante
            </Button>
          </div>
        )}
        {state.stage === "place" && (
          <div className="space-y-3">
            <label htmlFor={`${id}-city`} className="block font-semibold">
              Município de Alagoas
            </label>
            <select
              id={`${id}-city`}
              value=""
              disabled={busy}
              className="min-h-12 w-full rounded-lg border-2 border-input bg-card px-3"
              onChange={(e) => {
                if (e.target.value) action(e.target.value);
              }}
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
              disabled={busy}
              onClick={() => {
                void assistant.requestLocation();
                responseRef.current?.focus();
              }}
            >
              Usar minha localização
            </Button>
            <p className="text-sm text-muted-foreground">
              A localização só é solicitada com sua permissão e não é salva.
            </p>
          </div>
        )}
        {(state.stage === "confirm" || state.stage === "results") && (
          <section className="space-y-3 rounded-xl border p-4" aria-labelledby={`${id}-summary`}>
            <h3 id={`${id}-summary`} className="font-bold">
              Confira sua busca
            </h3>
            <p>{draftSummary(state.draft)}</p>
            <div className="flex flex-wrap gap-2">
              {[
                ...(state.draft.mode === "combustivel"
                  ? ["combustível"]
                  : ["produto", "embalagem", "variante"]),
                "município",
                "período",
                ...(state.draft.coords ? ["raio"] : []),
              ].map((field) => (
                <Button
                  key={field}
                  size="sm"
                  variant="outline"
                  onClick={() => action(`corrigir ${field}`)}
                >
                  Corrigir {field}
                </Button>
              ))}
            </div>
            {state.stage === "confirm" && (
              <Button size="lg" disabled={busy} onClick={() => action("confirmar busca")}>
                <Search aria-hidden /> Confirmar busca
              </Button>
            )}
          </section>
        )}
      </section>

      {state.stage === "results" && (
        <section className="card-surface space-y-4 p-4 md:p-6" aria-labelledby={`${id}-results`}>
          <h2 id={`${id}-results`} className="text-xl font-bold">
            Resultados da busca
          </h2>
          <p>
            {results.length} correspondências entre {state.examined} registros consultados. Até três
            menores preços entre os registros carregados.
          </p>
          {state.draft.mode === "combustivel" && (
            <p>
              Comparação somente entre unidades compatíveis. Registros com unidade não identificada
              ficam fora da ordenação.
            </p>
          )}
          {state.resultDemo && (
            <p className="rounded-lg bg-warning-soft p-3 font-semibold">
              Dados demonstrativos — não são preços reais.
            </p>
          )}
          {state.draft.mode === "produto" && !state.draft.embalagem && (
            <p>Os tamanhos podem variar. Confira as embalagens antes de comparar.</p>
          )}
          <p className="text-sm text-muted-foreground">
            Preços de vendas passadas. Preço atual e estoque não são garantidos.
          </p>
          {!results.length && (
            <p>
              Nenhuma correspondência nas páginas carregadas. Você pode corrigir os filtros
              {canLoadMore ? " ou carregar mais resultados" : ""}.
            </p>
          )}
          <ol className="grid gap-3">
            {results.slice(0, 3).map((record, index) => (
              <li key={record.id} data-testid="voice-result" className="rounded-xl border-2 p-4">
                <h3 className="font-bold">
                  {index + 1}. {record.descricao}
                </h3>
                {record.descricaoSefaz && record.descricaoSefaz !== record.descricao && (
                  <p>{record.descricaoSefaz}</p>
                )}
                <p className="my-2 text-2xl font-extrabold text-primary">{voicePrice(record)}</p>
                <p className="font-semibold">{record.store.nome}</p>
                <p>
                  {[
                    record.store.logradouro,
                    record.store.numero,
                    record.store.bairro,
                    record.store.municipio,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Endereço não informado"}
                </p>
                <p className="mt-1 text-sm">
                  Venda registrada em {formatDateTime(record.dataVendaUtc)}
                </p>
              </li>
            ))}
          </ol>
          {state.selected >= 3 && selected && (
            <p className="rounded-lg border p-3">
              Resultado {state.selected + 1}: {selected.descricao}. {voicePrice(selected)}.{" "}
              {selected.store.nome}. Venda em {formatDateTime(selected.dataVendaUtc)}.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!results.length || !state.canSpeak || busy}
              onClick={() => action("ouvir resultados")}
            >
              <Volume2 aria-hidden /> Ouvir resultados
            </Button>
            <Button
              variant="outline"
              disabled={!results.length || state.selected >= results.length - 1 || busy}
              onClick={() => action("próximo resultado")}
            >
              Próximo resultado
            </Button>
            {canLoadMore && (
              <Button disabled={busy} onClick={() => action("carregar mais resultados")}>
                {state.busy === "more" ? "Carregando…" : "Carregar mais resultados"}
              </Button>
            )}
          </div>
        </section>
      )}

      <details className="card-surface p-4 md:p-6">
        <summary className="cursor-pointer rounded-md py-2 font-bold">
          Interpretar um pedido completo com IA (opcional)
        </summary>
        <div className="mt-4 space-y-3">
          <p>
            Ao interpretar, o texto abaixo é enviado à Cloudflare. Não enviamos gravações,
            localização GPS, histórico ou resultados. Evite incluir dados pessoais.
          </p>
          <p className="text-sm text-muted-foreground">
            A IA tem cota gratuita e pode errar. Você vai conferir os campos antes da pesquisa. Se
            ela não funcionar, continue pela busca guiada.
          </p>
          <label htmlFor={`${id}-ai`} className="block font-semibold">
            Pedido completo para a IA
          </label>
          <textarea
            id={`${id}-ai`}
            value={aiText}
            maxLength={500}
            rows={3}
            onChange={(e) => setAiText(e.target.value)}
            className="w-full rounded-lg border-2 border-input bg-card p-3"
            placeholder="Ex.: Quero encontrar coca zero de 2 litros em Maceió"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || !aiText.trim() || state.aiAttempts >= 5}
              onClick={() => {
                void assistant.interpret(aiText);
                responseRef.current?.focus();
              }}
            >
              Interpretar pedido com IA
            </Button>
            <Button
              variant="outline"
              disabled={!state.transcript || busy}
              onClick={() => setAiText(state.transcript)}
            >
              Usar última frase
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {5 - state.aiAttempts} interpretações restantes nesta visita. O modo guiado não usa essa
            cota.
          </p>
        </div>
      </details>
      <Button
        variant="outline"
        onClick={() => {
          setText("");
          setAiText("");
          action("nova busca");
        }}
      >
        Nova busca
      </Button>
    </div>
  );
}
