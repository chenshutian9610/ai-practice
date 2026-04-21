import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './services/database.js';
import sessionRoutes from './routes/session.js';
import chatRoutes from './routes/chat.js';
import settingsRoutes from './routes/settings.js';
import { getMCPClientManager } from './mcp/manager.js';
import * as models from './services/models.js';

// GraphQL Schema
const typeDefs = `#graphql
  type Session {
    id: ID!
    title: String!
    created_at: String!
    updated_at: String!
    messages: [Message!]!
  }

  type Message {
    id: ID!
    session_id: String!
    role: String!
    content: String!
    created_at: String!
  }

  type Settings {
    api_endpoint: String
    model: String
    system_prompt: String
    theme: String
  }

  type Query {
    sessions: [Session!]!
    session(id: ID!): Session
    settings: Settings
  }

  input SettingsInput {
    api_endpoint: String
    api_key: String
    model: String
    system_prompt: String
    theme: String
  }

  type Mutation {
    createSession(title: String!): Session!
    updateSessionTitle(id: ID!, title: String!): Session
    deleteSession(id: ID!): Boolean!
    importSession(json: String!): Session!
    updateSettings(input: SettingsInput!): Settings!
  }
`;

// GraphQL Resolvers
const resolvers = {
  Query: {
    sessions: () => {
      const { getAllSessions, getMessagesBySessionId } = require('./services/models.js');
      const sessions = getAllSessions();
      return sessions.map(s => ({
        ...s,
        messages: getMessagesBySessionId(s.id)
      }));
    },
    session: (parent: any, { id }: { id: string }) => {
      const { getSessionById, getMessagesBySessionId } = require('./services/models.js');
      const session = getSessionById(id);
      if (!session) return null;
      return {
        ...session,
        messages: getMessagesBySessionId(id)
      };
    },
    settings: () => {
      const { getSettings } = require('./services/models.js');
      const s = getSettings();
      return {
        api_endpoint: s.api_endpoint,
        model: s.model,
        system_prompt: s.system_prompt,
        theme: s.theme,
      };
    },
  },
  Mutation: {
    createSession: (parent: any, { title }: { title: string }) => {
      const { createSession, getMessagesBySessionId } = require('./services/models.js');
      const session = createSession(title);
      return { ...session, messages: [] };
    },
    updateSessionTitle: (parent: any, { id, title }: { id: string; title: string }) => {
      const { getSessionById, updateSessionTitle } = require('./services/models.js');
      updateSessionTitle(id, title);
      return getSessionById(id);
    },
    deleteSession: (parent: any, { id }: { id: string }) => {
      const { deleteSession } = require('./services/models.js');
      deleteSession(id);
      return true;
    },
    importSession: (parent: any, { json }: { json: string }) => {
      const { importSession } = require('./services/models.js');
      const data = JSON.parse(json);
      return importSession({
        session: { title: data.session.title },
        messages: data.messages.map((m: any) => ({
          session_id: '',
          role: m.role,
          content: m.content,
        })),
      });
    },
    updateSettings: (parent: any, { input }: { input: any }) => {
      const { updateSettings, getSettings } = require('./services/models.js');
      const updates: any = {};
      if (input.api_endpoint !== undefined) updates.api_endpoint = input.api_endpoint;
      if (input.api_key !== undefined) updates.api_key = input.api_key;
      if (input.model !== undefined) updates.model = input.model;
      if (input.system_prompt !== undefined) updates.system_prompt = input.system_prompt;
      if (input.theme !== undefined) updates.theme = input.theme;
      const s = updateSettings(updates);
      return {
        api_endpoint: s.api_endpoint,
        model: s.model,
        system_prompt: s.system_prompt,
        theme: s.theme,
      };
    },
  },
};

async function startServer() {
  const app = express();
  const PORT = 4000;

  // Initialize database
  await initDatabase();

  // Initialize MCP client manager with saved servers
  const mcpManager = getMCPClientManager();
  const settings = models.getSettings();
  if (settings.mcpServers.length > 0) {
    console.log(`Initializing ${settings.mcpServers.filter(s => s.enabled).length} MCP server(s)...`);
    await mcpManager.initialize(settings.mcpServers);
    console.log(`MCP servers connected: ${mcpManager.getConnectedServers().join(', ') || 'none'}`);
  }

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });
  await server.start();

  app.use(cors());
  app.use(express.json());

  // GraphQL endpoint
  app.use('/graphql', expressMiddleware(server));

  // REST routes
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/settings', settingsRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
  });
}

startServer().catch(console.error);