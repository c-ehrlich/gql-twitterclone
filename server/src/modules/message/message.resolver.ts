import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  Mutation,
  Resolver,
  Root,
} from 'type-graphql';
import { Context } from '../../utils/createServer';
import { findUserById } from '../user/user.service';
import { CreateMessageInput, Message } from './message.dto';
import { createMessage } from './message.service';

@Resolver(Message)
class MessageResolver {
  @Authorized()
  @Mutation(() => Message)
  async createMessage(
    @Arg('input') input: CreateMessageInput,
    @Ctx() context: Context
  ) {
    const result = await createMessage({ ...input, userId: context.user?.id! });

    return result;
  }

  @FieldResolver()
  // root object... Message in this case
  async user(@Root() message: Message) {
    return findUserById(message.userId);
  }
}

export default MessageResolver;
