/**
 * Redis Mock
 * Mock Redis client for testing without actual Redis server
 */

/**
 * In-memory store for mock Redis
 */
class MockRedisStore {
  constructor() {
    this.store = new Map();
    this.expirations = new Map();
  }

  clear() {
    this.store.clear();
    this.expirations.clear();
  }

  checkExpiration(key) {
    const expiry = this.expirations.get(key);
    if (expiry && Date.now() > expiry) {
      this.store.delete(key);
      this.expirations.delete(key);
      return true;
    }
    return false;
  }
}

/**
 * Create mock Redis client
 */
function createMockRedis() {
  const store = new MockRedisStore();

  const client = {
    // Connection status
    isOpen: true,
    isReady: true,

    // Connection methods
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    quit: jest.fn().mockResolvedValue(true),

    // Basic commands
    get: jest.fn(async (key) => {
      if (store.checkExpiration(key)) {
        return null;
      }
      return store.store.get(key) || null;
    }),

    set: jest.fn(async (key, value, options = {}) => {
      store.store.set(key, value);

      if (options.EX) {
        const expiry = Date.now() + (options.EX * 1000);
        store.expirations.set(key, expiry);
      }

      return 'OK';
    }),

    del: jest.fn(async (...keys) => {
      let count = 0;
      keys.forEach(key => {
        if (store.store.has(key)) {
          store.store.delete(key);
          store.expirations.delete(key);
          count++;
        }
      });
      return count;
    }),

    exists: jest.fn(async (...keys) => {
      let count = 0;
      keys.forEach(key => {
        if (!store.checkExpiration(key) && store.store.has(key)) {
          count++;
        }
      });
      return count;
    }),

    expire: jest.fn(async (key, seconds) => {
      if (store.store.has(key)) {
        const expiry = Date.now() + (seconds * 1000);
        store.expirations.set(key, expiry);
        return 1;
      }
      return 0;
    }),

    ttl: jest.fn(async (key) => {
      const expiry = store.expirations.get(key);
      if (!expiry) return -1;
      if (!store.store.has(key)) return -2;
      const remaining = Math.floor((expiry - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    }),

    keys: jest.fn(async (pattern) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Array.from(store.store.keys()).filter(key => {
        return !store.checkExpiration(key) && regex.test(key);
      });
    }),

    // Hash commands
    hSet: jest.fn(async (key, field, value) => {
      let hash = store.store.get(key);
      if (!hash || typeof hash !== 'object') {
        hash = {};
      }
      const isNew = !hash.hasOwnProperty(field);
      hash[field] = value;
      store.store.set(key, hash);
      return isNew ? 1 : 0;
    }),

    hGet: jest.fn(async (key, field) => {
      if (store.checkExpiration(key)) {
        return null;
      }
      const hash = store.store.get(key);
      return (hash && hash[field]) || null;
    }),

    hGetAll: jest.fn(async (key) => {
      if (store.checkExpiration(key)) {
        return {};
      }
      const hash = store.store.get(key);
      return hash || {};
    }),

    hDel: jest.fn(async (key, ...fields) => {
      const hash = store.store.get(key);
      if (!hash) return 0;
      let count = 0;
      fields.forEach(field => {
        if (hash.hasOwnProperty(field)) {
          delete hash[field];
          count++;
        }
      });
      return count;
    }),

    hExists: jest.fn(async (key, field) => {
      if (store.checkExpiration(key)) {
        return 0;
      }
      const hash = store.store.get(key);
      return (hash && hash.hasOwnProperty(field)) ? 1 : 0;
    }),

    hKeys: jest.fn(async (key) => {
      if (store.checkExpiration(key)) {
        return [];
      }
      const hash = store.store.get(key);
      return hash ? Object.keys(hash) : [];
    }),

    hVals: jest.fn(async (key) => {
      if (store.checkExpiration(key)) {
        return [];
      }
      const hash = store.store.get(key);
      return hash ? Object.values(hash) : [];
    }),

    hLen: jest.fn(async (key) => {
      if (store.checkExpiration(key)) {
        return 0;
      }
      const hash = store.store.get(key);
      return hash ? Object.keys(hash).length : 0;
    }),

    // List commands
    lPush: jest.fn(async (key, ...values) => {
      let list = store.store.get(key);
      if (!Array.isArray(list)) {
        list = [];
      }
      list.unshift(...values);
      store.store.set(key, list);
      return list.length;
    }),

    rPush: jest.fn(async (key, ...values) => {
      let list = store.store.get(key);
      if (!Array.isArray(list)) {
        list = [];
      }
      list.push(...values);
      store.store.set(key, list);
      return list.length;
    }),

    lPop: jest.fn(async (key) => {
      const list = store.store.get(key);
      if (!Array.isArray(list) || list.length === 0) {
        return null;
      }
      return list.shift();
    }),

    rPop: jest.fn(async (key) => {
      const list = store.store.get(key);
      if (!Array.isArray(list) || list.length === 0) {
        return null;
      }
      return list.pop();
    }),

    lRange: jest.fn(async (key, start, stop) => {
      if (store.checkExpiration(key)) {
        return [];
      }
      const list = store.store.get(key);
      if (!Array.isArray(list)) {
        return [];
      }
      return list.slice(start, stop === -1 ? undefined : stop + 1);
    }),

    lLen: jest.fn(async (key) => {
      if (store.checkExpiration(key)) {
        return 0;
      }
      const list = store.store.get(key);
      return Array.isArray(list) ? list.length : 0;
    }),

    // Set commands
    sAdd: jest.fn(async (key, ...members) => {
      let set = store.store.get(key);
      if (!(set instanceof Set)) {
        set = new Set();
      }
      let added = 0;
      members.forEach(member => {
        if (!set.has(member)) {
          set.add(member);
          added++;
        }
      });
      store.store.set(key, set);
      return added;
    }),

    sRem: jest.fn(async (key, ...members) => {
      const set = store.store.get(key);
      if (!(set instanceof Set)) {
        return 0;
      }
      let removed = 0;
      members.forEach(member => {
        if (set.has(member)) {
          set.delete(member);
          removed++;
        }
      });
      return removed;
    }),

    sMembers: jest.fn(async (key) => {
      if (store.checkExpiration(key)) {
        return [];
      }
      const set = store.store.get(key);
      return (set instanceof Set) ? Array.from(set) : [];
    }),

    sIsMember: jest.fn(async (key, member) => {
      if (store.checkExpiration(key)) {
        return 0;
      }
      const set = store.store.get(key);
      return (set instanceof Set && set.has(member)) ? 1 : 0;
    }),

    sCard: jest.fn(async (key) => {
      if (store.checkExpiration(key)) {
        return 0;
      }
      const set = store.store.get(key);
      return (set instanceof Set) ? set.size : 0;
    }),

    // Pub/Sub commands
    publish: jest.fn().mockResolvedValue(0),
    subscribe: jest.fn().mockResolvedValue(true),
    unsubscribe: jest.fn().mockResolvedValue(true),

    // Utility commands
    ping: jest.fn().mockResolvedValue('PONG'),
    echo: jest.fn(async (message) => message),
    flushAll: jest.fn(async () => {
      store.clear();
      return 'OK';
    }),
    flushDb: jest.fn(async () => {
      store.clear();
      return 'OK';
    }),

    // Event emitter
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),

    // Expose store for testing
    __store: store,
  };

  return client;
}

/**
 * Reset mock Redis client
 */
function resetMockRedis(client) {
  if (client && client.__store) {
    client.__store.clear();
  }

  // Reset all jest mocks
  Object.values(client).forEach(value => {
    if (value && typeof value.mockReset === 'function') {
      value.mockReset();
    }
  });
}

module.exports = {
  createMockRedis,
  resetMockRedis,
  MockRedisStore,
};