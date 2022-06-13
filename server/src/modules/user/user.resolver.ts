import { Query, Resolver } from 'type-graphql';
import { User } from './user.dto';

@Resolver(() => User)
class UserResolver {
  @Query(() => User)
  user() {
    return {
      id: '123123',
      email: 'a@a.a',
      username: 'safdasdf',
    };
  }
}

export default UserResolver;
