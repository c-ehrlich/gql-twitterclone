import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
  PubSub,
  PubSubEngine,
  Subscription,
} from 'type-graphql';
import { Context } from '../../utils/createServer';
import PubSubEnum from '../../utils/pubSub';
import { findUserById } from '../user/user.service';
import { CreateMessageInput, Message } from './message.dto';
import { createMessage, findMessages } from './message.service';

@Resolver(Message)
class MessageResolver {
  @Authorized()
  @Mutation(() => Message)
  async createMessage(
    @Arg('input') input: CreateMessageInput,
    @Ctx() context: Context,
    @PubSub() pubSub: PubSubEngine
  ) {
    const result = await createMessage({ ...input, userId: context.user?.id! });

    await pubSub.publish(PubSubEnum.newMessage, result);

    return result;
  }

  @FieldResolver()
  // root object... Message in this case
  async user(@Root() message: Message) {
    return findUserById(message.userId);
  }

  @Query(() => [Message])
  async messages() {
    return findMessages();
  }

  @Subscription(() => Message, {
    topics: PubSubEnum.newMessage
  })
  newMessage(@Root() message: Message): Message {
    return message;
  }
}

export default MessageResolver;
