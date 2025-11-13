/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { EmailParams, EmailTemplate } from '@notification/notification';

@Injectable()
export class EmailBrevoMockProvider {
  constructor() {}

  async send(template: EmailTemplate, emailParams: EmailParams): Promise<{ response: object; body: object }> {
    return new Promise((resolve, reject) => {
      resolve({
        response: {},
        body: {
          message: 'Email sent successfully (local mock)',
        },
      });
    });
  }
}
