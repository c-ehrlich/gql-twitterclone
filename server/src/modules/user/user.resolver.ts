import { ApolloError } from 'apollo-server-core';
import {
  Arg,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
} from 'type-graphql';
import { Context } from '../../utils/createServer';
import {
  FollowUserInput,
  LoginInput,
  RegisterUserInput,
  User,
  UserFollowers,
} from './user.dto';
import {
  createUser,
  findUserByEmailOrUsername,
  findUserFollowedBy,
  findUserFollowing,
  findUsers,
  followUser,
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

  @Query(() => [User])
  async users() {
    return findUsers();
  }

  @Mutation(() => User)
  async followUser(
    @Arg('input') input: FollowUserInput,
    @Ctx() context: Context
  ) {
    try {
      const result = await followUser({ ...input, userId: context.user?.id! });
      return result;
    } catch (e: any) {
      throw new ApolloError(e);
    }
  }

  @FieldResolver(() => UserFollowers)
  async followers(@Ctx() context: Context) {
    const data = await findUserFollowedBy(context.user?.id!);

    return {
      count: data?.followedBy.length,
      items: data?.followedBy,
    };
  }

  @FieldResolver(() => UserFollowers)
  async following(@Ctx() context: Context) {
    const data = await findUserFollowing(context.user?.id!);

    return {
      count: data?.following.length,
      items: data?.following,
    };
  }
}

export default UserResolver;
