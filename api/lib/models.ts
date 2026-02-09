import clientPromise from './db.js';
import { ObjectId } from 'mongodb';

export interface User {
  _id?: string;
  email: string;
  authProvider: 'magic-link';
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface File {
  _id?: string;
  userId: string | null;
  arweaveTxId: string;
  arweaveUrl: string;
  sizeBytes: number;
  mimeType: string;
  originalFileName: string;
  createdAt: Date;
}

export interface UploadRequest {
  _id?: string;
  userId: string;
  expectedSizeBytes: number;
  stripeSessionId?: string;
  paymentIntentId?: string;
  arweaveTxId?: string;
  tempWalletAddress?: string;
  creditShareExpiry?: Date;
  status: 'pending' | 'paid' | 'uploaded' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}


export async function getUserByEmail(email: string): Promise<User | null> {
  const client = await clientPromise;
  const db = client.db();
  return await db.collection<User>('users').findOne({ email });
}

export async function createUser(email: string): Promise<User> {
  const client = await clientPromise;
  const db = client.db();
  const user: User = {
    email,
    authProvider: 'magic-link',
    createdAt: new Date(),
  };
  const result = await db.collection<User>('users').insertOne(user);
  return { ...user, _id: result.insertedId.toString() };
}

export async function updateUserLastLogin(email: string): Promise<void> {
  const client = await clientPromise;
  const db = client.db();
  await db.collection<User>('users').updateOne(
    { email },
    { $set: { lastLoginAt: new Date() } }
  );
}

export async function createFile(file: Omit<File, '_id' | 'createdAt'>): Promise<File> {
  const client = await clientPromise;
  const db = client.db();
  const fileDoc: File = {
    ...file,
    createdAt: new Date(),
  };
  const result = await db.collection<File>('files').insertOne(fileDoc);
  return { ...fileDoc, _id: result.insertedId.toString() };
}

export async function getFilesByUserId(userId: string): Promise<File[]> {
  const client = await clientPromise;
  const db = client.db();
  const files = await db.collection<File>('files')
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
  
  // Convert all _id fields to strings for consistency
  return files.map(file => ({
    ...file,
    _id: file._id?.toString() || file._id,
  }));
}

export async function getFilesByUserIdPaginated(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ files: File[]; total: number }> {
  const client = await clientPromise;
  const db = client.db();
  
  // Get total count
  const total = await db.collection<File>('files').countDocuments({ userId });
  
  // Get paginated files
  const files = await db.collection<File>('files')
    .find({ userId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray();
  
  // Convert all _id fields to strings for consistency
  return {
    files: files.map(file => ({
      ...file,
      _id: file._id?.toString() || file._id,
    })),
    total,
  };
}

export async function getFileById(fileId: string): Promise<File | null> {
  const client = await clientPromise;
  const db = client.db();
  
  // Try to find by ObjectId first (if it's a valid ObjectId string)
  // Then fall back to string comparison
  let query: any = { _id: fileId };
  
  // If the fileId looks like a MongoDB ObjectId (24 hex characters), try ObjectId lookup
  if (/^[0-9a-fA-F]{24}$/.test(fileId)) {
    try {
      const objectId = new ObjectId(fileId);
      query = { _id: objectId };
    } catch (e) {
      // Invalid ObjectId format, use string query
      query = { _id: fileId };
    }
  }
  
  // Try ObjectId query first, then fallback to string if needed
  let file = await db.collection<File>('files').findOne(query);
  
  // If not found and we used ObjectId query, try string query as fallback
  if (!file && /^[0-9a-fA-F]{24}$/.test(fileId)) {
    file = await db.collection<File>('files').findOne({ _id: fileId });
  }
  
  // Convert _id to string if found
  if (file && file._id) {
    file._id = file._id.toString();
  }
  
  return file;
}

export async function linkFilesToUser(arweaveUrls: string[], userId: string): Promise<number> {
  const client = await clientPromise;
  const db = client.db();
  const result = await db.collection<File>('files').updateMany(
    { 
      arweaveUrl: { $in: arweaveUrls },
      userId: null // Only link files that aren't already linked
    },
    { $set: { userId } }
  );
  return result.modifiedCount;
}

export async function createUploadRequest(
  uploadRequest: Omit<UploadRequest, '_id' | 'createdAt' | 'updatedAt'>
): Promise<UploadRequest> {
  const client = await clientPromise;
  const db = client.db();
  const now = new Date();
  const requestDoc: UploadRequest = {
    ...uploadRequest,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection<UploadRequest>('uploadRequests').insertOne(requestDoc);
  return { ...requestDoc, _id: result.insertedId.toString() };
}

export async function getUploadRequestBySessionId(
  sessionId: string
): Promise<UploadRequest | null> {
  const client = await clientPromise;
  const db = client.db();
  return await db.collection<UploadRequest>('uploadRequests').findOne({
    $or: [
      { stripeSessionId: sessionId },
      { paymentIntentId: sessionId },
    ],
  });
}

export async function updateUploadRequestStatus(
  requestId: string,
  status: UploadRequest['status'],
  arweaveTxId?: string
): Promise<void> {
  const client = await clientPromise;
  const db = client.db();

  // Convert string ID to ObjectId if it's a valid ObjectId format
  let query: any = { _id: requestId };
  if (/^[0-9a-fA-F]{24}$/.test(requestId)) {
    try {
      query = { _id: new ObjectId(requestId) };
    } catch (e) {
      // Invalid ObjectId format, use string query
      query = { _id: requestId };
    }
  }

  const updateFields: Record<string, any> = { status, updatedAt: new Date() };
  if (arweaveTxId) {
    updateFields.arweaveTxId = arweaveTxId;
  }

  await db.collection<UploadRequest>('uploadRequests').updateOne(
    query,
    { $set: updateFields }
  );
}

export async function getUploadRequestById(requestId: string): Promise<UploadRequest | null> {
  const client = await clientPromise;
  const db = client.db();
  return await db.collection<UploadRequest>('uploadRequests').findOne({ _id: requestId });
}

export async function updateUploadRequestTempWallet(
  requestId: string,
  tempWalletAddress: string,
  creditShareExpiry: Date
): Promise<void> {
  const client = await clientPromise;
  const db = client.db();

  let query: any = { _id: requestId };
  if (/^[0-9a-fA-F]{24}$/.test(requestId)) {
    try {
      query = { _id: new ObjectId(requestId) };
    } catch (e) {
      query = { _id: requestId };
    }
  }

  await db.collection<UploadRequest>('uploadRequests').updateOne(
    query,
    { $set: { tempWalletAddress, creditShareExpiry, updatedAt: new Date() } }
  );
}


