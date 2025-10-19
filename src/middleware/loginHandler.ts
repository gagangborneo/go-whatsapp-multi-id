import fs from 'fs/promises';
import path from 'path';
import { Request, Response } from 'express';
import { asyncHandler, CustomError } from './errorHandler';
import logger from '../utils/logger';
import { SESSIONS_DIR } from '../utils/paths';

/**
 * Handle login request and intercept QR code generation
 */
const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const device = (req as any).device;
  const proxyResponse = (req as any).proxyResponse;
  
  if (!device || !proxyResponse) {
    throw new CustomError('Device or proxy response not found', 500, 'INVALID_MIDDLEWARE_STATE');
  }

  const deviceHash = device.deviceHash;
  let responseData = proxyResponse.data;

  try {
    // Check if response contains QR code information in results
    if (responseData && responseData.results && responseData.results.qr_link && responseData.results.qr_link.includes('/statics/')) {
      logger.info(`QR code detectado no response para ${deviceHash}`);
      
      try {
        // Extract QR file name from the link
        const qrFileName = responseData.results.qr_link.split('/').pop();
        
        // Sempre usar o caminho direto para o arquivo QR em /app/statics/qrcode/
        const qrFilePath = path.join('/app', 'statics', 'qrcode', qrFileName);
        
        // Log do caminho para debug
        logger.debug(`Caminho original: ${responseData.results.qr_link}, Caminho corrigido: ${qrFilePath}`);
        
        logger.info(`Tentando ler arquivo QR: ${qrFilePath}`);
        
        // Wait a bit for the file to be written
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          // Tentar ler o arquivo QR
          const qrBuffer = await fs.readFile(qrFilePath);
          const qrBase64 = qrBuffer.toString('base64');
          
          // Replace qr_link with base64 data URL
          responseData.results.qr_code = `data:image/png;base64,${qrBase64}`;
          
          // Remove the old qr_link field
          delete responseData.results.qr_link;
          
          logger.info(`QR code convertido com sucesso para base64: ${qrFileName}`);
        } catch (error) {
          logger.warn(`Arquivo QR não encontrado: ${qrFilePath}`);
          
          // Manter o qr_link original para que o cliente possa tentar acessar diretamente
          // Isso permite fallback para o comportamento anterior
          logger.info(`Mantendo qr_link original: ${responseData.results.qr_link}`);
        }
        
      } catch (qrError) {
        logger.error(`Erro ao processar QR code para ${deviceHash}:`, qrError);
        // Continue with original response if QR processing fails
      }
    }

    res.status(proxyResponse.status).json(responseData);
    
  } catch (error) {
    logger.error(`Error processing login response for ${deviceHash}:`, error);
    // Fallback to original response
    res.status(proxyResponse.status).json(proxyResponse.data);
  }
});

export default loginHandler;