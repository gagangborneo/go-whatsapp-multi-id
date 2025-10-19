import { Request, Response, NextFunction } from 'express';
import deviceManager from '../services/newDeviceManager';

// Middleware para resolver a instância do dispositivo
const resolveInstance = async (req: Request, res: Response, next: NextFunction) => {
  const deviceHash = req.query.deviceHash || req.body.deviceHash || req.params.deviceHash || req.get('deviceHash');
  if (!deviceHash || typeof deviceHash !== 'string') {
    return res.status(400).json({ success: false, message: 'deviceHash é obrigatório' });
  }
  // Busca o dispositivo pelo hash
  const device = await deviceManager.getDevice(deviceHash);
  if (!device) {
    return res.status(404).json({ success: false, message: 'Dispositivo não encontrado' });
  }
  (req as any).device = device;
  next();
};

export default resolveInstance;
