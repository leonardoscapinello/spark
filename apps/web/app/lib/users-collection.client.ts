import { createUsersCollection, type UsersCollection } from "@spark/data";

let instance: UsersCollection | undefined;

export function getUsersCollection(): UsersCollection {
  instance ??= createUsersCollection();
  return instance;
}
