import express from 'express';
import { HelpService } from '../../features/help/services/HelpService.js';

const router = express.Router();

router.get('/help', async (_req: any, res: any) => {
  try {
    const sections = HelpService.listSections();
    res.json({ sections });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/help/:section', async (req: any, res: any) => {
  try {
    const section = String(req.params.section) as any;
    const pack = HelpService.get(section);
    res.json(pack);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;

