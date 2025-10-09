import { Router } from 'express';
import { body } from 'express-validator';
import { FaqController } from '../controllers';
// import {FaqController} from '../controllers/faq.controller';



const router = Router();


router.post('/',
    // authenticateToken,
    [
        body('question').trim(),
        body('answer').trim()
    ],
    FaqController.createFaqController
);

router.get('/', FaqController.getAllFaqsController);

router.get('/:id', FaqController.getFaqByIdController);

router.put('/:id', FaqController.updateFaqController);

router.delete('/:id', FaqController.deleteFaqController);

export default router;