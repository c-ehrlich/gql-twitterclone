import argon2 from 'argon2';
import prisma from '../../utils/prisma';
import { LoginInput, RegisterUserInput } from './user.dto';

export async function createUser(input: RegisterUserInput) {
  // hash the password
  const password = await argon2.hash(input.password);

  // insert the user
  return prisma.user.create({
    data: {
      ...input,
      email: input.email.toLowerCase(),
      username: input.username.toLowerCase(),
      password,
    },
  });
}

export async function findUserByEmailOrUsername(
  input: LoginInput['usernameOrEmail']
) {
  return prisma.user.findFirst({
    where: {
      OR: [{ username: input }, { email: input }],
    },
  });
}

export async function verifyPassword({
  password,
  candidatePassword,
}: {
  password: string;
  candidatePassword: string;
}) {
  return argon2.verify(password, candidatePassword);
}
