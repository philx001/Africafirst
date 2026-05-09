import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient;
  private readonly adminClient: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL');
    const anonKey = this.config.getOrThrow<string>('SUPABASE_ANON_KEY');
    const serviceRoleKey = this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    // Client public (lecture seule non authentifiée)
    this.client = createClient(supabaseUrl, anonKey);

    // Client admin (service role — contourne les RLS, pour usage serveur uniquement)
    this.adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log(`Supabase initialisé : ${supabaseUrl}`);
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  /**
   * Génère une URL signée pour un fichier Supabase Storage
   */
  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.adminClient.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  }

  /**
   * Upload un fichier dans Supabase Storage
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string> {
    const { error } = await this.adminClient.storage
      .from(bucket)
      .upload(path, file, { contentType, upsert: false });

    if (error) throw error;
    return path;
  }

  /**
   * Supprime un fichier de Supabase Storage
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.adminClient.storage.from(bucket).remove([path]);
    if (error) throw error;
  }
}
