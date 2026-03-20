import { Router, type IRouter } from "express";
import healthRouter from "./health";
import searchRouter from "./search";
import sageRouter from "./sage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(searchRouter);
router.use(sageRouter);

export default router;
