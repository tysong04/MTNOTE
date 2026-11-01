import { db as defaultDb, OctonoteDatabase } from './db';
import { ExtractedResource } from '../extractor/types';

/**
 * Retrieves all extracted resources across all chats ordered by timestamp descending.
 */
export async function getAllResources(
  targetDb: OctonoteDatabase = defaultDb
): Promise<ExtractedResource[]> {
  const resources = await targetDb.resources.toArray();
  return resources.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Retrieves all extracted resources associated with a specific chat.
 */
export async function getResourcesByChat(
  chatId: string,
  targetDb: OctonoteDatabase = defaultDb
): Promise<ExtractedResource[]> {
  const resources = await targetDb.resources.where('chatId').equals(chatId).toArray();
  return resources.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Retrieves extracted resources filtered by domain name.
 */
export async function getResourcesByDomain(
  domain: string,
  targetDb: OctonoteDatabase = defaultDb
): Promise<ExtractedResource[]> {
  const resources = await targetDb.resources.where('domain').equals(domain).toArray();
  return resources.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Retrieves aggregate resource statistics.
 */
export async function getResourceStats(
  targetDb: OctonoteDatabase = defaultDb
): Promise<{ total: number; uniqueDomains: number }> {
  const resources = await targetDb.resources.toArray();
  const domains = new Set(resources.map((r) => r.domain));
  return {
    total: resources.length,
    uniqueDomains: domains.size,
  };
}
