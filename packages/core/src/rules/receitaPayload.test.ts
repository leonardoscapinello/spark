import { describe, expect, it } from "vitest";
import { parseReceitaPayload } from "./receitaPayload.js";

/**
 * O retorno da Receita é generoso com vazios: `null`, `""` e `"  "` aparecem
 * no mesmo campo dependendo da empresa, e números chegam ora como número, ora
 * como texto. Estes testes fixam o que cada um significa aqui.
 */
describe("parseReceitaPayload", () => {
  it("traz os campos do cadastro para as nossas colunas", () => {
    const { registration } = parseReceitaPayload("00000000000191", {
      razao_social: "BANCO DO BRASIL SA",
      nome_fantasia: "DIRECAO GERAL",
      situacao_cadastral: 2,
      descricao_situacao_cadastral: "ATIVA",
      data_situacao_cadastral: "2005-11-03",
      identificador_matriz_filial: 1,
      data_inicio_atividade: "1966-08-01",
      natureza_juridica: "Sociedade de Economia Mista",
      codigo_natureza_juridica: 2038,
      porte: "DEMAIS",
      municipio: "BRASILIA",
      uf: "DF",
      cep: "70040912",
    });
    expect(registration).toMatchObject({
      taxId: "00000000000191",
      legalName: "BANCO DO BRASIL SA",
      tradeName: "DIRECAO GERAL",
      registrationStatus: "ATIVA",
      registrationStatusCode: 2,
      registrationStatusDate: "2005-11-03",
      headOffice: true,
      openedOn: "1966-08-01",
      legalNatureCode: 2038,
      city: "BRASILIA",
      state: "DF",
      postalCode: "70040912",
    });
  });

  /* Capital social é dinheiro, e dinheiro aqui nunca é ponto flutuante. A
   * fonte manda REAIS; a coluna guarda CENTAVO inteiro. */
  it("converte capital social de reais para centavos inteiros", () => {
    expect(parseReceitaPayload("1", { capital_social: 120_000_000_000 }).registration.shareCapital).toBe(12_000_000_000_000);
    expect(parseReceitaPayload("1", { capital_social: 1500.5 }).registration.shareCapital).toBe(150_050);
    expect(parseReceitaPayload("1", { capital_social: "2500.35" }).registration.shareCapital).toBe(250_035);
    expect(parseReceitaPayload("1", { capital_social: null }).registration.shareCapital).toBeNull();
  });

  it("texto vazio é ausência de valor, não valor em branco", () => {
    const { registration } = parseReceitaPayload("1", {
      situacao_especial: "",
      ente_federativo_responsavel: "   ",
      nome_cidade_no_exterior: "",
      email: null,
    });
    expect(registration.specialStatus).toBeNull();
    expect(registration.federativeEntity).toBeNull();
    expect(registration.foreignCity).toBeNull();
    expect(registration.email).toBeNull();
  });

  it("guarda telefone e CEP só com dígitos, e e-mail em minúsculo", () => {
    const { registration } = parseReceitaPayload("1", {
      ddd_telefone_1: "(61) 3493-9002",
      ddd_telefone_2: "",
      cep: "70.040-912",
      email: "  Contato@Empresa.COM.BR ",
    });
    expect(registration.phone).toBe("6134939002");
    expect(registration.secondaryPhone).toBeNull();
    expect(registration.postalCode).toBe("70040912");
    expect(registration.email).toBe("contato@empresa.com.br");
  });

  /* Um código de matriz/filial desconhecido precisa virar «não sei». Um
   * `false` ali afirmaria que a empresa É filial, que é outra coisa. */
  it("matriz, filial e desconhecido são três respostas diferentes", () => {
    expect(parseReceitaPayload("1", { identificador_matriz_filial: 1 }).registration.headOffice).toBe(true);
    expect(parseReceitaPayload("1", { identificador_matriz_filial: 2 }).registration.headOffice).toBe(false);
    expect(parseReceitaPayload("1", { identificador_matriz_filial: 9 }).registration.headOffice).toBeNull();
    expect(parseReceitaPayload("1", {}).registration.headOffice).toBeNull();
  });

  it("data fora de formato vira ausência em vez de derrubar a gravação", () => {
    expect(parseReceitaPayload("1", { data_inicio_atividade: "0000-00-00T00:00:00" }).registration.openedOn).toBe("0000-00-00");
    expect(parseReceitaPayload("1", { data_inicio_atividade: "não informado" }).registration.openedOn).toBeNull();
    expect(parseReceitaPayload("1", { data_situacao_especial: null }).registration.specialStatusDate).toBeNull();
  });

  it("a atividade principal entra primeiro e marcada, as secundárias em seguida", () => {
    const { activities } = parseReceitaPayload("1", {
      cnae_fiscal: 6422100,
      cnae_fiscal_descricao: "Bancos múltiplos, com carteira comercial",
      cnaes_secundarios: [{ codigo: 6499999, descricao: "Outras atividades" }, { codigo: null }],
    });
    expect(activities).toEqual([
      { code: "6422100", description: "Bancos múltiplos, com carteira comercial", main: true, sortOrder: 0 },
      { code: "6499999", description: "Outras atividades", main: false, sortOrder: 1 },
    ]);
  });

  /* CNAE com menos de sete dígitos existe no arquivo da Receita; perder o zero
   * à esquerda faria dois códigos diferentes virarem o mesmo. */
  it("mantém os sete dígitos do CNAE", () => {
    expect(parseReceitaPayload("1", { cnae_fiscal: 111301 }).activities[0]?.code).toBe("0111301");
  });

  it("guarda o quadro societário em ordem e descarta linha sem nome", () => {
    const { members } = parseReceitaPayload("1", {
      qsa: [
        { nome_socio: "ALAN CARLOS", cnpj_cpf_do_socio: "***550179**", qualificacao_socio: "Diretor", codigo_qualificacao_socio: 10, data_entrada_sociedade: "2023-05-17", faixa_etaria: "Entre 41 a 50 anos", nome_representante_legal: "" },
        { nome_socio: "   " },
        { nome_socio: "MARIANA PIRES" },
      ],
    });
    expect(members).toHaveLength(2);
    expect(members[0]).toMatchObject({ name: "ALAN CARLOS", maskedTaxId: "***550179**", role: "Diretor", roleCode: 10, joinedOn: "2023-05-17", legalRepresentative: null, sortOrder: 0 });
    expect(members[1]).toMatchObject({ name: "MARIANA PIRES", sortOrder: 1 });
  });

  it("ordena os regimes tributários do ano mais recente para o mais antigo", () => {
    const { taxRegimes } = parseReceitaPayload("1", {
      regime_tributario: [
        { ano: 2016, forma_de_tributacao: "LUCRO REAL", quantidade_de_escrituracoes: 1, cnpj_da_scp: null },
        { ano: 2024, forma_de_tributacao: "LUCRO PRESUMIDO", quantidade_de_escrituracoes: 2 },
        { forma_de_tributacao: "SEM ANO" },
      ],
    });
    expect(taxRegimes.map((regime) => regime.year)).toEqual([2024, 2016]);
    expect(taxRegimes[0]).toMatchObject({ taxation: "LUCRO PRESUMIDO", bookkeepingCount: 2, scpTaxId: null });
  });

  it("um retorno vazio não estoura — devolve o CNPJ e nada mais", () => {
    const partes = parseReceitaPayload("11222333000181", {});
    expect(partes.registration.taxId).toBe("11222333000181");
    expect(partes.registration.legalName).toBeNull();
    expect(partes.activities).toEqual([]);
    expect(partes.members).toEqual([]);
    expect(partes.taxRegimes).toEqual([]);
  });
});
