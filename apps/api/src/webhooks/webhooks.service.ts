import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

export interface WebhookDispatchOptions {
  url: string;
  payload: unknown;
  secret?: string;
  headers?: Record<string, string>;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  /**
   * Envoie un webhook sortant (compatible Make, n8n, Zapier)
   * Signe la requête avec HMAC-SHA256 si un secret est fourni
   */
  async dispatch(options: WebhookDispatchOptions): Promise<void> {
    const { url, payload, secret, headers = {} } = options;
    const body = JSON.stringify(payload);
    const timestamp = Date.now().toString();

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CRM-Timestamp': timestamp,
      ...headers,
    };

    // Signature HMAC pour vérification côté destinataire
    if (secret) {
      const signature = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${body}`)
        .digest('hex');
      requestHeaders['X-CRM-Signature'] = `sha256=${signature}`;
    }

    try {
      const response = await axios.post(url, payload, {
        headers: requestHeaders,
        timeout: 10000,
      });

      this.logger.log(`Webhook envoyé → ${url} [${response.status}]`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Webhook échec → ${url}: ${msg}`);
      throw error;
    }
  }
}
