// Central configuration, limits, catalogs and messages.
// Municipalities (Anexo II) and GPC segments (Anexo III) are copied from the
// SEFAZ/AL "Manual de Orientação do Desenvolvedor" v1.0.

export const LIMITS = {
  descricaoMin: 3,
  descricaoMax: 50,
  gtinLengths: [8, 12, 13, 14],
  cnpjLengths: [8, 14],
  raioMin: 1,
  raioMax: 15,
  diasMin: 1,
  diasMax: 10,
  paginaMin: 1,
  paginaMax: 9999,
  registrosMin: 50,
  registrosMax: 5000,
  registrosDefault: 100,
  diasDefault: 7,
  raioDefault: 5,
  compareMax: 4,
  basketConcurrency: 3,
} as const;

export const CACHE = {
  ttlMs: 5 * 60 * 1000,
  maxEntries: 300,
} as const;

export const NET = {
  timeoutMs: 15_000,
  retries: 1,
  retryDelayMs: 600,
  rateLimitPerMinute: 40,
} as const;

export const DATA_NOTICE =
  "Preços registrados em vendas anteriores. O valor atual e a disponibilidade podem variar.";

export const TIMEZONE = "America/Maceio";

export type Municipio = { codigo: number; nome: string };

const RAW_MUNICIPIOS: Array<[number, string]> = [
  [2700102, "Água Branca"], [2700201, "Anadia"], [2700300, "Arapiraca"], [2700409, "Atalaia"],
  [2700508, "Barra de Santo Antônio"], [2700607, "Barra de São Miguel"], [2700706, "Batalha"],
  [2700805, "Belém"], [2700904, "Belo Monte"], [2701001, "Boca da Mata"], [2701100, "Branquinha"],
  [2701209, "Cacimbinhas"], [2701308, "Cajueiro"], [2701357, "Campestre"], [2701407, "Campo Alegre"],
  [2701506, "Campo Grande"], [2701605, "Canapi"], [2701704, "Capela"], [2701803, "Carneiros"],
  [2701902, "Chã Preta"], [2702009, "Coité do Nóia"], [2702108, "Colônia Leopoldina"],
  [2702207, "Coqueiro Seco"], [2702306, "Coruripe"], [2702355, "Craíbas"], [2702405, "Delmiro Gouveia"],
  [2702504, "Dois Riachos"], [2702553, "Estrela de Alagoas"], [2702603, "Feira Grande"],
  [2702702, "Feliz Deserto"], [2702801, "Flexeiras"], [2702900, "Girau do Ponciano"],
  [2703007, "Ibateguara"], [2703106, "Igaci"], [2703205, "Igreja Nova"], [2703304, "Inhapi"],
  [2703403, "Jacaré dos Homens"], [2703502, "Jacuípe"], [2703601, "Japaratinga"], [2703700, "Jaramataia"],
  [2703759, "Jequiá da Praia"], [2703809, "Joaquim Gomes"], [2703908, "Jundiá"], [2704005, "Junqueiro"],
  [2704104, "Lagoa da Canoa"], [2704203, "Limoeiro de Anadia"], [2704302, "Maceió"],
  [2704401, "Major Isidoro"], [2704906, "Mar Vermelho"], [2704500, "Maragogi"], [2704609, "Maravilha"],
  [2704708, "Marechal Deodoro"], [2704807, "Maribondo"], [2705002, "Mata Grande"],
  [2705101, "Matriz de Camaragibe"], [2705200, "Messias"], [2705309, "Minador do Negrão"],
  [2705408, "Monteirópolis"], [2705507, "Murici"], [2705606, "Novo Lino"],
  [2705705, "Olho d'Água das Flores"], [2705804, "Olho d'Água do Casado"],
  [2705903, "Olho d'Água Grande"], [2706000, "Olivença"], [2706109, "Ouro Branco"],
  [2706208, "Palestina"], [2706307, "Palmeira dos Índios"], [2706406, "Pão de Açúcar"],
  [2706422, "Pariconha"], [2706448, "Paripueira"], [2706505, "Passo de Camaragibe"],
  [2706604, "Paulo Jacinto"], [2706703, "Penedo"], [2706802, "Piaçabuçu"], [2706901, "Pilar"],
  [2707008, "Pindoba"], [2707107, "Piranhas"], [2707206, "Poço das Trincheiras"],
  [2707305, "Porto Calvo"], [2707404, "Porto de Pedras"], [2707503, "Porto Real do Colégio"],
  [2707602, "Quebrangulo"], [2707701, "Rio Largo"], [2707800, "Roteiro"],
  [2707909, "Santa Luzia do Norte"], [2708006, "Santana do Ipanema"], [2708105, "Santana do Mundaú"],
  [2708204, "São Brás"], [2708303, "São José da Laje"], [2708402, "São José da Tapera"],
  [2708501, "São Luís do Quitunde"], [2708600, "São Miguel dos Campos"],
  [2708709, "São Miguel dos Milagres"], [2708808, "São Sebastião"], [2708907, "Satuba"],
  [2708956, "Senador Rui Palmeira"], [2709004, "Tanque d'Arca"], [2709103, "Taquarana"],
  [2709152, "Teotônio Vilela"], [2709202, "Traipu"], [2709301, "União dos Palmares"],
  [2709400, "Viçosa"],
];

export const MUNICIPIOS: Municipio[] = RAW_MUNICIPIOS.map(([codigo, nome]) => ({ codigo, nome })).sort(
  (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
);
export const MUNICIPIO_CODES = new Set(MUNICIPIOS.map((m) => m.codigo));
export const municipioNome = (codigo: number) =>
  MUNICIPIOS.find((m) => m.codigo === codigo)?.nome ?? String(codigo);

export type GpcSegment = { codigo: string; nome: string };
export const GPC_SEGMENTS: GpcSegment[] = [
  ["74000000", "Acampamento"], ["64000000", "Acessórios pessoais"],
  ["50000000", "Alimentos, bebidas e tabaco"], ["89000000", "Animais vivos"],
  ["78000000", "Aparelhos elétricos"], ["70000000", "Artes, artesanato e bordado"],
  ["62000000", "Papelaria e escritório"], ["68000000", "Audiovisual e fotografia"],
  ["86000000", "Brinquedos e jogos"], ["63000000", "Calçados"], ["87000000", "Combustíveis e gases"],
  ["66000000", "Comunicação"], ["94000000", "Cultivos agrícolas (Crops)"],
  ["10000000", "Animais de estimação e ração"],
  ["79000000", "Encanamento, aquecimento e ar-condicionado"], ["71000000", "Equipamentos esportivos"],
  ["84000000", "Oficina e armazenagem de ferramentas"], ["82000000", "Ferramentas elétricas"],
  ["80000000", "Ferramentas manuais"], ["53000000", "Higiene pessoal e beleza"],
  ["65000000", "Informática"], ["88000000", "Lubrificantes"],
  ["60000000", "Livros e materiais impressos"], ["81000000", "Jardinagem"],
  ["75000000", "Móveis para casa e escritório"], ["61000000", "Música"],
  ["93000000", "Plantas de horticultura"], ["47000000", "Produtos de limpeza"],
  ["83000000", "Construção"], ["92000000", "Recipientes de armazenagem e transporte"],
  ["58000000", "Segmento transversal"], ["85000000", "Segurança e proteção (faça você mesmo)"],
  ["91000000", "Segurança e vigilância"], ["77000000", "Automotivo"], ["51000000", "Saúde"],
  ["73000000", "Utensílios de cozinha"], ["72000000", "Utensílios domésticos"], ["67000000", "Vestuário"],
].map(([codigo, nome]) => ({ codigo: codigo!, nome: nome! }));
export const GPC_CODES = new Set(GPC_SEGMENTS.map((g) => g.codigo));

export const FUEL_TYPES = [
  { codigo: 1, nome: "Gasolina comum" },
  { codigo: 2, nome: "Gasolina aditivada" },
  { codigo: 3, nome: "Etanol" },
  { codigo: 4, nome: "Diesel comum" },
  { codigo: 5, nome: "Diesel aditivado (S10)" },
  { codigo: 6, nome: "GNV" },
] as const;
export const fuelName = (c: number) => FUEL_TYPES.find((f) => f.codigo === c)?.nome ?? `Tipo ${c}`;

export const SEARCH_EXAMPLES = ["arroz", "leite", "café", "feijão", "açúcar"];

export const MESSAGES = {
  not_configured:
    "A consulta de preços ainda não foi configurada neste site. Falta o token de acesso fornecido pela SEFAZ/AL.",
  insecure_transport:
    "A consulta real está desativada: o serviço da SEFAZ/AL não oferece conexão segura (HTTPS) confirmada, e o token não pode ser enviado sem proteção.",
  auth: "O acesso ao serviço da SEFAZ/AL foi recusado. O token pode estar inválido ou sem autorização.",
  timeout: "O serviço da SEFAZ/AL demorou demais para responder. Tente novamente em instantes.",
  unavailable: "O serviço da SEFAZ/AL está indisponível no momento. Tente novamente mais tarde.",
  unexpected: "O serviço respondeu de um jeito inesperado. Tente novamente mais tarde.",
  rate_limited: "Muitas pesquisas em pouco tempo. Aguarde um minuto e tente de novo.",
  validation: "Alguns dados da pesquisa precisam ser corrigidos.",
  api_error: "O serviço da SEFAZ/AL recusou a pesquisa.",
} as const;
export type ErrorCode = keyof typeof MESSAGES;
