import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

interface MemoryCacheEntry {
  value: string;
  expiresAt: number | null;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  // In-memory fallback in case Redis is unreachable
  private readonly memoryFallback = new Map<string, MemoryCacheEntry>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = Number(this.configService.get<number>('REDIS_PORT')) || 6379;
    const password =
      this.configService.get<string>('REDIS_PASSWORD') || undefined;

    try {
      this.client = new Redis({
        host,
        port,
        password,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableReadyCheck: true,
        retryStrategy: (times) => {
          const delay = Math.min(times * 200, 3000);
          return delay;
        },
      });

      this.client.on('connect', () => {
        this.logger.log(`Connecting to Redis at ${host}:${port}...`);
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.logger.log(`Redis connected successfully at ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(
          `Redis error (${err.message}). Using in-memory fallback cache.`,
        );
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.logger.warn(
          'Redis connection closed. Falling back to memory cache.',
        );
      });

      await this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(
          `Initial Redis connection failed (${err.message}). Using in-memory fallback.`,
        );
      });
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn(
        `Failed to initialize Redis client (${error?.message}). Using memory fallback.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
  }

  /**
   * Set a key with optional TTL in seconds.
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch (err: any) {
        this.logger.warn(
          `Redis set failed (${err.message}), falling back to memory.`,
        );
      }
    }

    // Memory fallback
    const expiresAt =
      ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryFallback.set(key, { value, expiresAt });
  }

  /**
   * Get a key's value.
   */
  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch (err: any) {
        this.logger.warn(
          `Redis get failed (${err.message}), falling back to memory.`,
        );
      }
    }

    // Memory fallback
    const entry = this.memoryFallback.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Check if a key exists.
   */
  async exists(key: string): Promise<boolean> {
    if (this.isConnected && this.client) {
      try {
        const count = await this.client.exists(key);
        return count > 0;
      } catch (err: any) {
        this.logger.warn(
          `Redis exists failed (${err.message}), falling back to memory.`,
        );
      }
    }

    // Memory fallback
    const entry = this.memoryFallback.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryFallback.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a key.
   */
  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch (err: any) {
        this.logger.warn(
          `Redis del failed (${err.message}), falling back to memory.`,
        );
      }
    }

    this.memoryFallback.delete(key);
  }

  /**
   * Get direct ioredis client instance.
   */
  getClient(): Redis | null {
    return this.client;
  }
}
