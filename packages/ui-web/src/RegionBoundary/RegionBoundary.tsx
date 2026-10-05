import { Component, type ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import s from "./RegionBoundary.module.css";

export interface RegionBoundaryProps {
  /** O que esta área é, para leitor de tela ("Detalhes do atendimento"). */
  label: string;
  children: ReactNode;
  /** Quando muda (outra rota, outra conversa), a área tenta de novo sozinha. */
  resetKey?: unknown;
}
interface RegionBoundaryState { error: Error | null; resetKey: unknown }

/**
 * Barreira de erro por área: um pedaço da tela que quebra mostra o erro só
 * nele, com «Tentar de novo» — menu, lista e o resto continuam. Sem isso,
 * qualquer erro de renderização derruba o app inteiro na barreira da raiz.
 */
export class RegionBoundary extends Component<RegionBoundaryProps, RegionBoundaryState> {
  override state: RegionBoundaryState = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<RegionBoundaryState> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  static getDerivedStateFromProps(props: RegionBoundaryProps, state: RegionBoundaryState): Partial<RegionBoundaryState> | null {
    return Object.is(props.resetKey, state.resetKey) ? null : { error: null, resetKey: props.resetKey };
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <section role="alert" aria-label={`Erro em: ${this.props.label}`} className={s.root}>
      <span className={s.icon} aria-hidden="true"><Icon name="alert" /></span>
      <span className={s.title}>Esta parte não carregou</span>
      <span className={s.copy}>Houve um erro só nesta área; o resto da tela segue funcionando.</span>
      <code className={s.detail}>{error.message}</code>
      <Button size="sm" variant="secondary" icon={<Icon name="refresh" />} onClick={() => this.setState({ error: null })}>Tentar de novo</Button>
    </section>;
  }
}
