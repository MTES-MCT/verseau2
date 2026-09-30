import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DepotStep,
  DepotStatus,
  initializeDepotUpload,
  MAX_DEPOT_FILE_SIZE_BYTES,
  type RouteBody,
  type RouteResponse,
} from '@lib/dossier';
import { S3 } from '@s3/s3';
import { QueueName } from '@queue/queue';
import { sanitizeFilename } from '@shared/schema/filename.service';
import { DepotUploadGateway } from './depotUpload.gateway';
import { DepotModel } from './depot.model';
import { DepotError } from './depotError';
import { UtilisateurDunEnvoi, FichierDeDepot } from './file/file';
import { getDepotUploadKey, getDepotFileKey } from './depotStorageKeys';
import { LoggerService } from '@shared/logger/logger.service';

// Allow uploads already in flight and confirmation retries before cleaning staging objects.
const CLEANUP_DELAY_MS = 5 * 60 * 1000;

@Injectable()
export class DepotUploadService {
  constructor(
    @Inject(DepotUploadGateway) private readonly gateway: DepotUploadGateway,
    @Inject(S3) private readonly s3: S3,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DepotUploadService.name);
  }

  async initialize(
    input: RouteBody<typeof initializeDepotUpload>,
    utilisateur: UtilisateurDunEnvoi,
    itvCdn: number,
  ): Promise<RouteResponse<typeof initializeDepotUpload>> {
    if (
      !input.fileName.toLowerCase().endsWith('.xml') &&
      !['application/xml', 'text/xml'].includes(input.contentType)
    ) {
      throw new BadRequestException('File must be an XML file');
    }
    const expiresIn = Number(this.config.get<string>('S3_UPLOAD_URL_TTL_SECONDS') ?? 900);
    if (!Number.isInteger(expiresIn) || expiresIn < 60 || expiresIn > 3600) {
      throw new Error('S3_UPLOAD_URL_TTL_SECONDS must be an integer between 60 and 3600');
    }
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    return this.gateway.transaction(async (transaction) => {
      const depot = await transaction.create({
        nomOriginalFichier: sanitizeFilename(input.fileName),
        tailleFichier: input.size,
        type: 'application/xml',
        userId: utilisateur.id,
        itvCdn,
        step: DepotStep.UPLOADING_TO_S3,
        stepHistory: [DepotStep.UPLOADING_TO_S3],
        uploadExpiresAt: expiresAt,
      });
      const uploadUrl = await this.s3.createUploadUrl(getDepotUploadKey(depot.id), expiresIn, input.size);
      await transaction.send(
        QueueName.cleanup_depot_upload,
        { depotId: depot.id },
        {
          startAfter: new Date(expiresAt.getTime() + CLEANUP_DELAY_MS),
          retryLimit: 10,
          retryDelay: 60,
          retryBackoff: true,
        },
      );
      return {
        depotId: depot.id,
        uploadUrl,
        headers: { 'Content-Type': 'application/xml' },
        expiresAt: expiresAt.toISOString(),
      };
    });
  }

  async complete(id: string, utilisateur: UtilisateurDunEnvoi): Promise<DepotModel> {
    return this.gateway.transaction(async (transaction) => {
      const depot = await transaction.findForUpdate(id);
      if (!depot) {
        throw new NotFoundException('Dépôt introuvable');
      }
      if (depot.userId !== utilisateur.id) {
        throw new ForbiddenException('Seul le déposant peut confirmer cet upload');
      }
      if (!depot.uploadExpiresAt) {
        throw new ConflictException('Ce dépôt ne peut pas être confirmé');
      }
      // For direct uploads, path is committed atomically with the processing job.
      if (depot.path) {
        return depot;
      }
      if (depot.step !== DepotStep.UPLOADING_TO_S3) {
        throw new ConflictException('Ce dépôt ne peut pas être confirmé');
      }
      if (Date.now() >= depot.uploadExpiresAt.getTime() + CLEANUP_DELAY_MS) {
        throw new GoneException('Le délai de confirmation du dépôt a expiré');
      }
      const uploadKey = getDepotUploadKey(depot.id);
      const object = await this.s3.head(uploadKey);
      if (!object) {
        throw new ConflictException("Le fichier n'a pas encore été reçu");
      }
      if (
        object.size !== Number(depot.tailleFichier) ||
        object.size <= 0 ||
        object.size > MAX_DEPOT_FILE_SIZE_BYTES ||
        object.contentType !== depot.type
      ) {
        throw new BadRequestException('Les métadonnées du fichier reçu ne correspondent pas au dépôt');
      }
      const filePath = getDepotFileKey(depot.id);
      // Freeze the validated object: a still-valid upload URL can only overwrite the staging key.
      await this.s3.copy(uploadKey, filePath, object.etag);
      depot.path = filePath;
      depot.step = DepotStep.PENDING;
      depot.stepHistory = [...(depot.stepHistory ?? []), DepotStep.PENDING];
      const saved = await transaction.save(depot);
      await transaction.send<FichierDeDepot>(QueueName.process_file, { depotId: depot.id, filePath, utilisateur });
      return saved;
    });
  }

  async cleanup(id: string): Promise<void> {
    this.logger.log(`Depot ${id} - Cleaning up upload`);
    await this.gateway.transaction(async (transaction) => {
      const depot = await transaction.findForUpdate(id);
      if (!depot?.uploadExpiresAt) {
        return;
      }
      if (Date.now() < depot.uploadExpiresAt.getTime() + CLEANUP_DELAY_MS) {
        throw new Error('Upload cleanup scheduled before expiration');
      }
      await this.s3.delete(getDepotUploadKey(depot.id));
      this.logger.log(`Depot ${id} - Upload cleanup completed`);
      if (!depot.path) {
        // A confirmation may have copied the object before its DB transaction rolled back.
        await this.s3.delete(getDepotFileKey(depot.id));
        depot.status = DepotStatus.REJETE;
        depot.error = DepotError.UPLOAD_FAILED;
        await transaction.save(depot);
      }
    });
  }
}
