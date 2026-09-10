import { Injectable, NotFoundException } from "@nestjs/common";
import type { User } from "@spark/core";
import { UsersRepository } from "../infrastructure/users.repository.js";

/**
 * "Login" em si é a Supabase Auth (e-mail/senha, magic link...). O que
 * acontece aqui é a PRIMEIRA coisa depois disso: resolver de qual usuário
 * local (e de qual organização) o JWT verificado corresponde.
 *
 * Propositalmente NÃO cria usuário novo na primeira vez que aparece um JWT
 * desconhecido — decidir a que organização alguém pertence é política de
 * produto (convite, onboarding), não algo pra inventar aqui. 404 é a
 * resposta certa até esse fluxo existir de verdade.
 */
@Injectable()
export class GetCurrentUserUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(supabaseUserId: string): Promise<User> {
    const user = await this.usersRepository.findBySupabaseUserId(supabaseUserId);
    if (!user) {
      throw new NotFoundException(
        "Nenhum usuário local associado a este login — provisionamento pendente.",
      );
    }
    return user;
  }
}
