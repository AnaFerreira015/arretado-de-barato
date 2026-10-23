import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { DATA_NOTICE, MESSAGES } from "@/lib/economiza/constants";
import { useApiStatus } from "@/components/eal/Notices";
import { clearDeviceData, prefsStore } from "@/lib/store";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre os dados — Economiza AL" },
      { name: "description", content: "De onde vêm os preços do Economiza AL, seus limites e como seus dados ficam no aparelho." },
      { property: "og:title", content: "Sobre os dados — Economiza AL" },
      { property: "og:description", content: "Preços de vendas registradas em notas fiscais de Alagoas, via SEFAZ/AL." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const prefs = prefsStore.use();
  const status = useApiStatus().data?.status;
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold md:text-3xl">Sobre os dados</h1>
      <section className="card-surface space-y-3 p-5">
        <h2 className="text-xl font-bold">De onde vêm os preços</h2>
        <p>
          Os preços vêm do serviço público Economiza Alagoas, da Secretaria da Fazenda de Alagoas (SEFAZ/AL). Eles são
          tirados de notas fiscais eletrônicas emitidas nos últimos 10 dias.
        </p>
        <p className="font-semibold">{DATA_NOTICE}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Mostramos o valor da última venda registrada em cada estabelecimento, não um preço em tempo real.</li>
          <li>Não sabemos se o produto ainda está disponível.</li>
          <li>Cada loja escreve a descrição do seu jeito, com abreviações. Algumas notas têm erros.</li>
          <li>O preço pode ter vindo de promoção ou de programa de fidelidade da loja.</li>
          <li>Horários são mostrados no horário de Alagoas.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          O Economiza AL é um aplicativo independente e não é um aplicativo oficial do governo.
        </p>
      </section>

      <section className="card-surface space-y-3 p-5">
        <h2 className="text-xl font-bold">Situação da consulta</h2>
        <p>
          {status === "ready" ? "A consulta ao serviço da SEFAZ/AL está configurada." : status ? MESSAGES[status] : "Verificando…"}
        </p>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
          <Switch checked={prefs.demo} onCheckedChange={(c) => prefsStore.set((p) => ({ ...p, demo: c }))} />
          <FlaskConical aria-hidden className="size-5" /> Modo demonstração (dados fictícios)
        </label>
        <p className="text-sm text-muted-foreground">
          No modo demonstração todos os preços são inventados e as telas mostram esse aviso. Use apenas para conhecer o aplicativo.
        </p>
      </section>

      <section className="card-surface space-y-3 p-5">
        <h2 className="text-xl font-bold">Seus dados neste aparelho</h2>
        <p>
          Lista de compras, favoritos e preferências ficam guardados só neste navegador. Não há conta nem sincronização
          entre aparelhos nesta versão. Sua localização é usada apenas na hora da pesquisa e não é salva.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive"><Trash2 aria-hidden /> Apagar dados deste aparelho</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar todos os dados?</AlertDialogTitle>
              <AlertDialogDescription>
                A lista de compras, os favoritos, a comparação e as preferências serão apagados deste aparelho. Isso não pode ser desfeito.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
              <AlertDialogAction className="min-h-11" onClick={() => { clearDeviceData(); toast.success("Dados apagados deste aparelho."); }}>
                Apagar tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
