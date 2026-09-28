/**
 * Mola perceptual da Apple, em uma implementação só para o build dos tokens e
 * para o runtime do design system.
 *
 * A Apple (WWDC23 "Animate with springs") troca massa/rigidez/amortecimento
 * por dois parâmetros que uma pessoa consegue sentir:
 *
 * - `duration`: quanto tempo a animação PARECE levar até parar (segundos).
 *   Não é a duração total; a mola continua se acomodando um pouco depois.
 * - `bounce`: 0 é crítica (chega e para, sem passar do alvo); > 0 passa do
 *   alvo e oscila; < 0 chega mais devagar, sem oscilar.
 *
 * Com massa 1: rigidez = (2π / duration)² e amortecimento = 4π(1 − bounce) /
 * duration para bounce ≥ 0, ou 4π / (duration(1 + bounce)) para bounce < 0.
 * Em bounce 0 os dois dão 4π / duration, que é exatamente o amortecimento
 * crítico (2·ω₀). É essa continuidade que torna o par fácil de ajustar.
 *
 * O resultado principal é `springLinear`, que amostra a curva e devolve uma
 * função de easing CSS `linear(...)`: assim a mola roda como transição ou
 * animação CSS, fora da thread principal, sem biblioteca. A velocidade inicial
 * (em unidades relativas por segundo, isto é, velocidade do gesto dividida
 * pela distância até o alvo) faz a animação continuar do movimento do dedo,
 * que é a costura entre arrastar e soltar.
 */

export interface SpringSpec {
  /** Duração perceptual, em segundos. */
  duration: number;
  /** Entre -1 e 1 (exclusivo). 0 = sem sobressalto. */
  bounce: number;
}

export interface SpringPhysics {
  mass: number;
  stiffness: number;
  damping: number;
}

export interface SpringSolution {
  /** Posição normalizada em t (0 = início, 1 = alvo). */
  at: (t: number) => number;
  /** Instante em que a mola fica dentro da tolerância e não sai mais. */
  settleTime: number;
}

export interface SpringLinear {
  /** Valor para `transition-timing-function` ou `animation-timing-function`. */
  easing: string;
  /** Duração total em milissegundos, para o `transition-duration` correspondente. */
  durationMs: number;
}

export function springPhysics({ duration, bounce }: SpringSpec): SpringPhysics {
  if (!(duration > 0)) throw new RangeError("duration deve ser positiva");
  if (!(bounce > -1 && bounce < 1)) throw new RangeError("bounce deve estar entre -1 e 1");
  const mass = 1;
  const stiffness = (2 * Math.PI / duration) ** 2 * mass;
  const damping = bounce >= 0
    ? (4 * Math.PI * (1 - bounce) * mass) / duration
    : (4 * Math.PI * mass) / (duration * (1 + bounce));
  return { mass, stiffness, damping };
}

/**
 * Resolve a mola de 0 até 1 com velocidade inicial `velocity` (unidades
 * relativas por segundo). Solução fechada do oscilador amortecido; nada de
 * integração numérica, então a curva é a mesma em qualquer taxa de quadros.
 */
export function solveSpring(spec: SpringSpec, velocity = 0, tolerance = 0.001): SpringSolution {
  const { mass, stiffness, damping } = springPhysics(spec);
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const x0 = -1;
  const v0 = velocity;

  let displacement: (t: number) => number;
  if (Math.abs(zeta - 1) < 1e-6) {
    const b = v0 + omega0 * x0;
    displacement = (t) => (x0 + b * t) * Math.exp(-omega0 * t);
  } else if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const b = (v0 + zeta * omega0 * x0) / omegaD;
    displacement = (t) => Math.exp(-zeta * omega0 * t) * (x0 * Math.cos(omegaD * t) + b * Math.sin(omegaD * t));
  } else {
    const root = Math.sqrt(zeta * zeta - 1);
    const r1 = -omega0 * (zeta - root);
    const r2 = -omega0 * (zeta + root);
    const b = (v0 - r1 * x0) / (r2 - r1);
    const a = x0 - b;
    displacement = (t) => a * Math.exp(r1 * t) + b * Math.exp(r2 * t);
  }

  const at = (t: number) => (t <= 0 ? 0 : 1 + displacement(t));

  // Acomodação: último instante em que o deslocamento ainda passa da
  // tolerância, varrendo do fim para o começo com um passo fino.
  const horizon = spec.duration * 3;
  const step = 1 / 240;
  let settleTime = 0;
  for (let t = horizon; t >= 0; t -= step) {
    if (Math.abs(displacement(t)) > tolerance) {
      settleTime = Math.min(horizon, t + step);
      break;
    }
  }
  return { at, settleTime };
}

/**
 * Amostra a mola e devolve `linear(...)` pronto para CSS. `samplesPerSecond`
 * em 120 dá um ponto a cada ~8 ms: liso a 120 Hz e curto o bastante para
 * viver numa variável CSS.
 */
export function springLinear(spec: SpringSpec, velocity = 0, samplesPerSecond = 120): SpringLinear {
  const { at, settleTime } = solveSpring(spec, velocity);
  const total = Math.max(settleTime, 1 / samplesPerSecond);
  const count = Math.max(2, Math.ceil(total * samplesPerSecond));
  const stops: string[] = [];
  for (let i = 0; i <= count; i += 1) {
    const progress = i / count;
    const value = i === count ? 1 : at(progress * total);
    const rounded = Math.round(value * 10_000) / 10_000;
    stops.push(i === 0 || i === count ? `${rounded}` : `${rounded} ${Math.round(progress * 1000) / 10}%`);
  }
  return { easing: `linear(${stops.join(", ")})`, durationMs: Math.round(total * 1000) };
}

/**
 * Velocidade relativa: o gesto anda em px/s, a mola pensa em "alvos por
 * segundo". Dividir pela distância que falta converte um no outro; sem
 * distância não há o que continuar, então devolve zero.
 */
export function relativeVelocity(velocityPx: number, distancePx: number): number {
  if (!Number.isFinite(velocityPx) || !Number.isFinite(distancePx) || Math.abs(distancePx) < 0.5) return 0;
  return velocityPx / distancePx;
}

/**
 * Projeção de momento (Designing Fluid Interfaces, WWDC18): onde um flick
 * pararia sozinho com desaceleração exponencial. 0.998 é a sensação de
 * rolagem padrão; 0.99 freia mais cedo.
 */
export function projectMomentum(velocityPxPerSecond: number, decelerationRate = 0.998): number {
  return ((velocityPxPerSecond / 1000) * decelerationRate) / (1 - decelerationRate);
}
