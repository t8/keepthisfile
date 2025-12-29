import clientPromise from './db.js';

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
  status: 'pending' | 'paid' | 'uploaded' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ShareLink {
  _id?: string;
  userId: string;
  fileId: string;
  shareId: string; // unique short ID
  arweaveUrl: string;
  createdAt: Date;
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
  return await db.collection<File>('files')
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getFileById(fileId: string): Promise<File | null> {
  const client = await clientPromise;
  const db = client.db();
  return await db.collection<File>('files').findOne({ _id: fileId });
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
  status: UploadRequest['status']
): Promise<void> {
  const client = await clientPromise;
  const db = client.db();
  await db.collection<UploadRequest>('uploadRequests').updateOne(
    { _id: requestId },
    { $set: { status, updatedAt: new Date() } }
  );
}

export async function getUploadRequestById(requestId: string): Promise<UploadRequest | null> {
  const client = await clientPromise;
  const db = client.db();
  return await db.collection<UploadRequest>('uploadRequests').findOne({ _id: requestId });
}

export async function createShareLink(shareLink: Omit<ShareLink, '_id' | 'createdAt'>): Promise<ShareLink> {
  const client = await clientPromise;
  const db = client.db();
  const shareLinkDoc: ShareLink = {
    ...shareLink,
    createdAt: new Date(),
  };
  const result = await db.collection<ShareLink>('shareLinks').insertOne(shareLinkDoc);
  return { ...shareLinkDoc, _id: result.insertedId.toString() };
}

export async function getShareLinkByShareId(shareId: string): Promise<ShareLink | null> {
  const client = await clientPromise;
  const db = client.db();
  return await db.collection<ShareLink>('shareLinks').findOne({ shareId });
}

export async function getShareLinksByUserId(userId: string): Promise<ShareLink[]> {
  const client = await clientPromise;
  const db = client.db();
  return await db.collection<ShareLink>('shareLinks')
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
}

