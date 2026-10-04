import type { ServiceStatus } from "../schema/serviceConfiguration.js";

/** Base inicial editável para consultoria; não substitui prazos contratados. */
export const CONSULTING_LEVELS = ["Alto", "Médio", "Baixo"] as const;
export const CONSULTING_COLORS = ["red", "amber", "green"] as const;
export const CONSULTING_PRIORITY_MATRIX = [[0,0,1],[0,1,2],[1,2,2]] as const;
export const CONSULTING_SLA = [
  { name:"Alto",firstResponseMinutes:120,totalMinutes:360 },
  { name:"Médio",firstResponseMinutes:120,totalMinutes:960 },
  { name:"Baixo",firstResponseMinutes:120,totalMinutes:1440 },
] as const;
export const CONSULTING_STATUSES = [
  {name:"Em atendimento",operationalType:"active",color:"blue",pauseFirstResponse:false,pauseTotal:false,resumeOnInbound:false,budgetMinutes:null},
  {name:"Aguardando atendimento",operationalType:"active",color:"neutral",pauseFirstResponse:false,pauseTotal:false,resumeOnInbound:false,budgetMinutes:120},
  {name:"Em triagem",operationalType:"active",color:"amber",pauseFirstResponse:false,pauseTotal:false,resumeOnInbound:false,budgetMinutes:120},
  {name:"Aguardando cliente",operationalType:"waiting",color:"amber",pauseFirstResponse:true,pauseTotal:true,resumeOnInbound:true,budgetMinutes:null},
  {name:"Aguardando fornecedor",operationalType:"waiting",color:"purple",pauseFirstResponse:true,pauseTotal:true,resumeOnInbound:false,budgetMinutes:null},
  {name:"Em validação pelo cliente",operationalType:"waiting",color:"amber",pauseFirstResponse:true,pauseTotal:true,resumeOnInbound:true,budgetMinutes:null},
  {name:"Concluído",operationalType:"closed",color:"green",pauseFirstResponse:false,pauseTotal:false,resumeOnInbound:false,budgetMinutes:null},
  {name:"Cancelado",operationalType:"closed",color:"neutral",pauseFirstResponse:false,pauseTotal:false,resumeOnInbound:false,budgetMinutes:null},
] satisfies Omit<ServiceStatus,"id"|"orgId"|"createdAt"|"updatedAt"|"sortOrder"|"archived">[];
export const CONSULTING_CATALOG: Readonly<Record<string,Readonly<Record<string,readonly string[]>>>> = {
  "Comercial e contratação": {
    "Conhecer os serviços": [
      "Solicitar diagnóstico inicial",
      "Avaliar solução para o negócio",
      "Agendar apresentação dos serviços"
    ],
    "Propostas e contratos": [
      "Solicitar proposta e escopo",
      "Esclarecer condições comerciais",
      "Renovar ou ampliar contratação"
    ]
  },
  "Estratégia e consultoria de negócios": {
    "Diagnóstico e planejamento": [
      "Avaliar maturidade do negócio e de IA",
      "Mapear oportunidades e priorizar casos de uso",
      "Definir plano de implantação de IA"
    ],
    "Resultados e gestão": [
      "Definir indicadores e metas",
      "Avaliar retorno e viabilidade",
      "Revisar estratégia e plano de ação"
    ]
  },
  "Processos e automação com IA": {
    "Mapeamento e melhoria de processos": [
      "Mapear processo atual",
      "Identificar gargalos e retrabalho",
      "Desenhar processo com apoio de IA"
    ],
    "Automação de processos": [
      "Automatizar aprovações e tarefas",
      "Automatizar leitura e tratamento de documentos",
      "Automatizar rotinas comerciais e de atendimento"
    ]
  },
  "Agentes e assistentes de IA": {
    "Desenvolvimento de soluções": [
      "Criar assistente para a equipe",
      "Criar agente de atendimento ao cliente",
      "Criar agente para executar tarefas"
    ],
    "Conhecimento e qualidade das respostas": [
      "Preparar base de conhecimento",
      "Ajustar instruções e comportamento",
      "Avaliar respostas e encaminhamento humano"
    ]
  },
  "Dados e integrações": {
    "Conexão entre sistemas": [
      "Integrar CRM e canais de atendimento",
      "Integrar ERP e sistemas de gestão",
      "Integrar APIs e ferramentas de trabalho"
    ],
    "Preparação e análise de dados": [
      "Organizar e qualificar dados",
      "Preparar dados para uso por IA",
      "Criar indicadores e painéis de acompanhamento"
    ]
  },
  "Governança e segurança de IA": {
    "Políticas e controles de uso": [
      "Definir política de uso de IA",
      "Configurar acessos e revisão humana",
      "Avaliar ferramentas e fornecedores de IA"
    ],
    "Riscos e proteção de dados": [
      "Avaliar riscos de um caso de uso",
      "Revisar tratamento de dados pessoais",
      "Definir rastreabilidade e critérios de qualidade"
    ]
  },
  "Capacitação e adoção": {
    "Treinamento e orientação": [
      "Treinar lideranças para uso de IA",
      "Treinar equipes nas ferramentas",
      "Orientar aplicação de IA na rotina"
    ],
    "Adoção e mudança organizacional": [
      "Planejar comunicação e implantação",
      "Acompanhar adoção pelas equipes",
      "Ajustar práticas e responsabilidades"
    ]
  },
  "Suporte e evolução": {
    "Incidentes e dúvidas de operação": [
      "Corrigir automação ou integração com falha",
      "Investigar resposta incorreta de IA",
      "Resolver acesso ou dúvida de utilização"
    ],
    "Manutenção e melhoria contínua": [
      "Solicitar melhoria em solução existente",
      "Atualizar conteúdo ou regra de negócio",
      "Revisar desempenho e custos de operação"
    ]
  }
};
export function consultingCategoryDefaults(name: string, root: string) {
  if (name === "Corrigir automação ou integração com falha") return { impact:"Alto",urgency:"Alto" };
  if (name === "Investigar resposta incorreta de IA") return { impact:"Médio",urgency:"Alto" };
  if (root === "Capacitação e adoção" || name === "Resolver acesso ou dúvida de utilização") return { impact:"Baixo",urgency:"Baixo" };
  if (["Comercial e contratação","Governança e segurança de IA","Suporte e evolução"].includes(root)) return { impact:"Médio",urgency:"Médio" };
  return { impact:"Médio",urgency:"Baixo" };
}
