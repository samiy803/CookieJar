import { MongoClient, ServerApiVersion } from "mongodb";


export const getClient = (uri: string | undefined) => {
    if (!uri) {
        throw new Error("MongoDB URI is not defined");
    }
    const client = new MongoClient(uri, {
        serverApi: ServerApiVersion.v1,
      });
      return client;
}