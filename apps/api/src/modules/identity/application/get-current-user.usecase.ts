import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { User } from "@spark/core";
import { UsersRepository } from "../infrastructure/users.repository.js";

/**
 * "Login" itself is Supabase Auth (email/password, magic link...). What
 * happens here is the FIRST thing after that: resolving which local user
 * (and which organization) the verified JWT corresponds to.
 *
 * Deliberately does NOT create a new user the first time an unknown JWT
 * shows up — deciding which organization someone belongs to is product
 * policy (invite, onboarding), not something to invent here. 404 is the
 * right response until that flow actually exists.
 */
@Injectable()
export class GetCurrentUserUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(supabaseUserId: string): Promise<User> {
    const user = await this.usersRepository.findBySupabaseUserId(supabaseUserId);
    if (!user) {
      throw new NotFoundException(
        "No local user linked to this login — provisioning pending.",
      );
    }
    if (user.deactivatedAt) {
      throw new ForbiddenException("This user no longer has access.");
    }
    return user;
  }
}
