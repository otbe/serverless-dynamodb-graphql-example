import { DynamoDB } from 'aws-sdk';
import { DataMapper } from '@aws/dynamodb-data-mapper';
import {
  table,
  hashKey,
  attribute
} from '@aws/dynamodb-data-mapper-annotations';
import { graphqlLambda } from 'apollo-server-lambda';
import { makeExecutableSchema } from 'graphql-tools';

const client = new DynamoDB({
  region: 'localhost',
  endpoint: 'http://localhost:8000'
});
const mapper = new DataMapper({ client });

@table(process.env.TABLE)
class User {
  @hashKey() email: string;
  @attribute() name: string;
}

const schema = makeExecutableSchema({
  typeDefs: `
  type User {
    email: String!
    name: String!
  }

  type Mutation {
    createUser(email: String!, name: String!): User
  }

  type Query {
    users: [User]
  }`,
  resolvers: {
    Query: {
      users: async () => toArray(await mapper.scan(User))
    },
    Mutation: {
      createUser: (_, args: { email: string; name: string }) => {
        const user = new User();
        user.email = args.email;
        user.name = args.name;
        return mapper.put(user);
      }
    }
  }
});

export const handle = graphqlLambda({ schema });

const toArray = async <T>(asyncIterable: AsyncIterableIterator<T>) => {
  const result: Array<T> = [];
  for await (const u of asyncIterable) {
    result.push(u);
  }
  return result;
};
