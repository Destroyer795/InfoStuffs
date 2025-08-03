import express from 'express';
import { createInfo, deleteInfo, getInfos, updateInfo } from '../controller/info.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router(); //create a new router instance    

router.use(requireAuth); //apply authentication middleware to all routes in this router
//this middleware ensures that the user is authenticated before accessing any of the routes defined below
//the requireAuth middleware checks if the user is authenticated and can be used to protect routes from unauthorized access
//if the user is not authenticated, they will be redirected

router.get('/', getInfos); //route to get all infos
router.post('/', createInfo); //route to create a new info
router.patch('/:id', updateInfo); //route to update an existing info by ID
router.delete('/:id', deleteInfo); //route to delete an info by ID

export default router;
