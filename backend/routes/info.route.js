import express from 'express';
import { createInfo, deleteInfo, getInfos, updateInfo } from '../controller/info.controller.js';    // Import the controller functions for handling info operations
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router(); //create a new router instance    

router.use(requireAuth); //apply authentication middleware to all routes in this router
//this middleware ensures that the user is authenticated before accessing any of the routes defined below
//the requireAuth middleware checks if the user is authenticated and can be used to protect routes from unauthorized access
//if the user is not authenticated, they will be redirected or receive an error response
//this is useful for routes that require user authentication, such as creating, updating, or deleting

router.get('/', getInfos); //route to get all infos
router.post('/', createInfo); //route to create a new info
router.patch('/:id', updateInfo); //route to update an existing info by ID
router.delete('/:id', deleteInfo); //route to delete an info by ID

export default router; // Export the router to use in other parts of the application
//this file defines the routes for handling information-related operations in the application.
//it uses Express.js to create a router and defines routes for getting, creating, updating, and deleting info documents.
//the router is then exported to be used in the main application file.