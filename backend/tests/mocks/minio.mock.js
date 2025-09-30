/**
 * MinIO Mock
 * Mock MinIO client for testing without actual MinIO server
 */

const { TestDataGenerator } = require('../helpers');

/**
 * In-memory store for mock MinIO
 */
class MockMinIOStore {
  constructor() {
    this.buckets = new Map();
    this.objects = new Map();
  }

  clear() {
    this.buckets.clear();
    this.objects.clear();
  }

  getBucket(bucketName) {
    return this.buckets.get(bucketName);
  }

  getObject(bucketName, objectName) {
    const key = `${bucketName}/${objectName}`;
    return this.objects.get(key);
  }

  setObject(bucketName, objectName, data, metadata = {}) {
    const key = `${bucketName}/${objectName}`;
    this.objects.set(key, {
      data,
      metadata,
      etag: TestDataGenerator.randomString(32),
      versionId: TestDataGenerator.randomUUID(),
      size: Buffer.isBuffer(data) ? data.length : data.toString().length,
      lastModified: new Date(),
    });
  }

  deleteObject(bucketName, objectName) {
    const key = `${bucketName}/${objectName}`;
    return this.objects.delete(key);
  }

  listObjects(bucketName, prefix = '') {
    const results = [];
    this.objects.forEach((obj, key) => {
      const [bucket, name] = key.split('/');
      if (bucket === bucketName && name.startsWith(prefix)) {
        results.push({
          name,
          lastModified: obj.lastModified,
          etag: obj.etag,
          size: obj.size,
        });
      }
    });
    return results;
  }
}

/**
 * Create mock MinIO client
 */
function createMockMinIO() {
  const store = new MockMinIOStore();

  const client = {
    // Bucket operations
    makeBucket: jest.fn(async (bucketName, region = 'us-east-1') => {
      if (store.buckets.has(bucketName)) {
        throw new Error('Bucket already exists');
      }
      store.buckets.set(bucketName, {
        name: bucketName,
        region,
        createdAt: new Date(),
      });
      return true;
    }),

    bucketExists: jest.fn(async (bucketName) => {
      return store.buckets.has(bucketName);
    }),

    removeBucket: jest.fn(async (bucketName) => {
      if (!store.buckets.has(bucketName)) {
        throw new Error('Bucket does not exist');
      }

      // Check if bucket has objects
      const objects = store.listObjects(bucketName);
      if (objects.length > 0) {
        throw new Error('Bucket is not empty');
      }

      store.buckets.delete(bucketName);
      return true;
    }),

    listBuckets: jest.fn(async () => {
      return Array.from(store.buckets.values()).map(bucket => ({
        name: bucket.name,
        creationDate: bucket.createdAt,
      }));
    }),

    setBucketPolicy: jest.fn(async (bucketName, policy) => {
      const bucket = store.buckets.get(bucketName);
      if (!bucket) {
        throw new Error('Bucket does not exist');
      }
      bucket.policy = policy;
      return true;
    }),

    getBucketPolicy: jest.fn(async (bucketName) => {
      const bucket = store.buckets.get(bucketName);
      if (!bucket) {
        throw new Error('Bucket does not exist');
      }
      return bucket.policy || null;
    }),

    // Object operations
    putObject: jest.fn(async (bucketName, objectName, stream, size, metaData = {}) => {
      if (!store.buckets.has(bucketName)) {
        throw new Error('Bucket does not exist');
      }

      let data = stream;
      if (typeof stream.read === 'function') {
        // Handle stream
        data = Buffer.from('mock-stream-data');
      }

      store.setObject(bucketName, objectName, data, metaData);

      return {
        etag: TestDataGenerator.randomString(32),
        versionId: TestDataGenerator.randomUUID(),
      };
    }),

    getObject: jest.fn(async (bucketName, objectName) => {
      if (!store.buckets.has(bucketName)) {
        throw new Error('Bucket does not exist');
      }

      const obj = store.getObject(bucketName, objectName);
      if (!obj) {
        throw new Error('Object does not exist');
      }

      // Return a mock stream
      const stream = {
        read: jest.fn(() => obj.data),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(obj.data), 0);
          }
          if (event === 'end') {
            setTimeout(callback, 0);
          }
          return stream;
        }),
        pipe: jest.fn(),
      };

      return stream;
    }),

    removeObject: jest.fn(async (bucketName, objectName) => {
      if (!store.buckets.has(bucketName)) {
        throw new Error('Bucket does not exist');
      }

      if (!store.deleteObject(bucketName, objectName)) {
        throw new Error('Object does not exist');
      }

      return true;
    }),

    statObject: jest.fn(async (bucketName, objectName) => {
      if (!store.buckets.has(bucketName)) {
        throw new Error('Bucket does not exist');
      }

      const obj = store.getObject(bucketName, objectName);
      if (!obj) {
        throw new Error('Object does not exist');
      }

      return {
        size: obj.size,
        etag: obj.etag,
        lastModified: obj.lastModified,
        metaData: obj.metadata,
        versionId: obj.versionId,
      };
    }),

    copyObject: jest.fn(async (bucketName, objectName, sourceObject, conditions) => {
      const [sourceBucket, sourceKey] = sourceObject.split('/');

      if (!store.buckets.has(sourceBucket)) {
        throw new Error('Source bucket does not exist');
      }

      if (!store.buckets.has(bucketName)) {
        throw new Error('Destination bucket does not exist');
      }

      const sourceObj = store.getObject(sourceBucket, sourceKey);
      if (!sourceObj) {
        throw new Error('Source object does not exist');
      }

      store.setObject(bucketName, objectName, sourceObj.data, sourceObj.metadata);

      return {
        etag: TestDataGenerator.randomString(32),
        lastModified: new Date(),
      };
    }),

    // List objects
    listObjects: jest.fn((bucketName, prefix = '', recursive = false) => {
      if (!store.buckets.has(bucketName)) {
        return null;
      }

      const objects = store.listObjects(bucketName, prefix);

      // Return a mock stream
      const stream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            objects.forEach(obj => setTimeout(() => callback(obj), 0));
          }
          if (event === 'end') {
            setTimeout(callback, 0);
          }
          if (event === 'error') {
            // No error in mock
          }
          return stream;
        }),
      };

      return stream;
    }),

    listObjectsV2: jest.fn((bucketName, prefix = '', recursive = false) => {
      if (!store.buckets.has(bucketName)) {
        return null;
      }

      const objects = store.listObjects(bucketName, prefix);

      // Return a mock stream
      const stream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            objects.forEach(obj => setTimeout(() => callback(obj), 0));
          }
          if (event === 'end') {
            setTimeout(callback, 0);
          }
          return stream;
        }),
      };

      return stream;
    }),

    // Presigned URLs
    presignedUrl: jest.fn(async (method, bucketName, objectName, expiry = 7 * 24 * 60 * 60) => {
      if (!store.buckets.has(bucketName)) {
        throw new Error('Bucket does not exist');
      }

      return `http://localhost:9000/${bucketName}/${objectName}?signature=mock-signature`;
    }),

    presignedGetObject: jest.fn(async (bucketName, objectName, expiry = 7 * 24 * 60 * 60) => {
      if (!store.buckets.has(bucketName)) {
        throw new Error('Bucket does not exist');
      }

      return `http://localhost:9000/${bucketName}/${objectName}?signature=mock-get-signature`;
    }),

    presignedPutObject: jest.fn(async (bucketName, objectName, expiry = 7 * 24 * 60 * 60) => {
      if (!store.buckets.has(bucketName)) {
        throw new Error('Bucket does not exist');
      }

      return `http://localhost:9000/${bucketName}/${objectName}?signature=mock-put-signature`;
    }),

    // Expose store for testing
    __store: store,
  };

  return client;
}

/**
 * Reset mock MinIO client
 */
function resetMockMinIO(client) {
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
  createMockMinIO,
  resetMockMinIO,
  MockMinIOStore,
};