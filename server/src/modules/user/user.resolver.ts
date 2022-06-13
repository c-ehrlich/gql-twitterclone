import { ApolloError } from 'apollo-server-core';
import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { Context } from '../../utils/createServer';
import { LoginInput, RegisterUserInput, User } from './user.dto';
import {
  createUser,
  findUserByEmailOrUsername,
  verifyPassword,
} from './user.service';

@Resolver(() => User)
class UserResolver {
  @Mutation(() => User)
  async register(@Arg('input') input: RegisterUserInput) {
    try {
      const user = await createUser(input);
      return user;
    } catch (e) {
      // TODO check if violates unique constraint
      throw e;
    }
  }

  @Query(() => User)
  me(@Ctx() context: Context) {
    return context.user;
  }

  @Mutation(() => String)
  async login(@Arg('input') input: LoginInput, @Ctx() context: Context) {
    const user = await findUserByEmailOrUsername(
      input.usernameOrEmail.toLowerCase()
    );

    if (!user) {
      throw new ApolloError('Invalid credentials');
    }

    const isValid = await verifyPassword({
      password: user.password,
      candidatePassword: input.password,
    });

    if (!isValid) {
      throw new ApolloError('Invalid credentials');
    }

    const token = await context.reply?.jwtSign({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    if (!token) {
      throw new ApolloError('Error signing token');
    }

    context.reply?.setCookie('token', token, {
      // TODO put in env
      domain: 'localhost',
      path: '/',
      // needs to be sent over HTTPS
      secure: false,
      httpOnly: true,
      sameSite: false,
    });

    return token;
  }
}

export default UserResolver;
